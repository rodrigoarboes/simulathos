// shared/js/motor/metricas.js — motor único de métricas (academia + alocacao)
// Contrato v2.0.0 — compatível com <script> sem módulos (var/function + IIFE).
var Metricas = (function () {

  // Versão do motor. Sempre que o contrato mudar, suba aqui.
  var MOTOR_VERSION = '2.0.0';

  // Dias corridos médios por ano (calendário gregoriano).
  var DIAS_ANO_CALENDARIO = 365.2425;

  // Alíquotas de come-cotas por regime tributário.
  var ALIQUOTAS_COME_COTAS = {
    rf_longo: 0.15,      // renda fixa longo prazo
    rf_curto: 0.20,      // renda fixa curto prazo
    multimercado: 0.15   // multimercado longo prazo
    // 'acoes' não tem come-cotas
  };

  function _mean(arr) {
    if (!arr || arr.length === 0) return 0;
    var sum = 0;
    for (var i = 0; i < arr.length; i++) sum += arr[i];
    return sum / arr.length;
  }

  function _stddev(arr) {
    if (!arr || arr.length < 2) return 0;
    var m = _mean(arr);
    var sumSq = 0;
    for (var i = 0; i < arr.length; i++) {
      var d = arr[i] - m;
      sumSq += d * d;
    }
    return Math.sqrt(sumSq / (arr.length - 1));
  }

  function _covariance(a, b) {
    if (!a || !b) return 0;
    var n = Math.min(a.length, b.length);
    if (n < 2) return 0;
    var mA = _mean(a.slice(0, n));
    var mB = _mean(b.slice(0, n));
    var sum = 0;
    for (var i = 0; i < n; i++) {
      sum += (a[i] - mA) * (b[i] - mB);
    }
    return sum / (n - 1);
  }

  // Normaliza o parâmetro de anualização: número finito e positivo, senão 252.
  function _obsPorAno(diasUteisPorAno) {
    if (typeof diasUteisPorAno === 'number' &&
        isFinite(diasUteisPorAno) &&
        diasUteisPorAno > 0) {
      return diasUteisPorAno;
    }
    return 252;
  }

  // Série de excessos sobre o risk-free (MAR). rf pode ser array ou ausente.
  function _excessos(retornosDiarios, retornosDiariosRiskFree) {
    var rfArr = retornosDiariosRiskFree || [];
    var excess = [];
    for (var i = 0; i < retornosDiarios.length; i++) {
      var rf = (typeof rfArr[i] === 'number') ? rfArr[i] : 0;
      excess.push(retornosDiarios[i] - rf);
    }
    return excess;
  }

  function retornoAcumulado(retornosDiarios) {
    if (!retornosDiarios || retornosDiarios.length === 0) return 0;
    var prod = 1;
    for (var i = 0; i < retornosDiarios.length; i++) {
      prod *= (1 + retornosDiarios[i]);
    }
    return prod - 1;
  }

  /**
   * Anualiza um retorno acumulado.
   * Se diasCorridos for informado (> 0), anualiza pelo CALENDÁRIO
   * (expoente 365.2425 / diasCorridos) — é o correto quando as séries
   * misturam calendários (B3 + offshore) e o ano não tem 252 pregões.
   * Sem diasCorridos, mantém o comportamento antigo (252 / numDiasUteis).
   */
  function retornoAnualizado(retAcumulado, numDiasUteis, diasCorridos) {
    if (typeof diasCorridos === 'number' && isFinite(diasCorridos) && diasCorridos > 0) {
      return Math.pow(1 + retAcumulado, DIAS_ANO_CALENDARIO / diasCorridos) - 1;
    }
    if (!numDiasUteis || numDiasUteis === 0) return 0;
    return Math.pow(1 + retAcumulado, 252 / numDiasUteis) - 1;
  }

  function volatilidadeAnualizada(retornosDiarios, diasUteisPorAno) {
    if (!retornosDiarios || retornosDiarios.length < 2) return 0;
    return _stddev(retornosDiarios) * Math.sqrt(_obsPorAno(diasUteisPorAno));
  }

  function drawdownMaximo(retornosDiarios) {
    if (!retornosDiarios || retornosDiarios.length === 0) return 0;
    var equity = 1;
    var peak = 1;
    var maxDD = 0;
    for (var i = 0; i < retornosDiarios.length; i++) {
      equity *= (1 + retornosDiarios[i]);
      if (equity > peak) peak = equity;
      var dd = (equity - peak) / peak;
      if (dd < maxDD) maxDD = dd;
    }
    return maxDD;
  }

  /**
   * Série de drawdown (fração <= 0) ponto a ponto.
   */
  function serieDrawdown(retornosDiarios) {
    if (!retornosDiarios || retornosDiarios.length === 0) return [];
    var equity = 1;
    var peak = 1;
    var serie = [];
    for (var i = 0; i < retornosDiarios.length; i++) {
      equity *= (1 + retornosDiarios[i]);
      if (equity > peak) peak = equity;
      serie.push(peak > 0 ? (equity - peak) / peak : 0);
    }
    return serie;
  }

  function sharpe(retornosDiarios, retornosDiariosRiskFree, diasUteisPorAno) {
    if (!retornosDiarios || retornosDiarios.length < 2) return 0;
    var excess = _excessos(retornosDiarios, retornosDiariosRiskFree);
    var stdExcess = _stddev(excess);
    if (stdExcess === 0) return 0;
    return (_mean(excess) / stdExcess) * Math.sqrt(_obsPorAno(diasUteisPorAno));
  }

  /**
   * Sortino com downside deviation de denominador n (Sortino & van der Meer,
   * Morningstar): dias com excesso >= MAR entram como ZERO no somatório.
   * Retorna null (não 99, não 0) quando a amostra é curta demais (< 60 dias)
   * ou quando não existe nenhum dia abaixo do MAR — nesses casos o índice
   * não é interpretável e a UI deve mostrar "—".
   */
  function sortino(retornosDiarios, retornosDiariosRiskFree, diasUteisPorAno) {
    if (!retornosDiarios || retornosDiarios.length < 60) return null;
    var excess = _excessos(retornosDiarios, retornosDiariosRiskFree);
    var n = excess.length;
    var somaQuadrados = 0;
    var numNegativos = 0;
    for (var i = 0; i < n; i++) {
      if (excess[i] < 0) {
        somaQuadrados += excess[i] * excess[i];
        numNegativos++;
      }
    }
    if (numNegativos === 0) return null;
    var downDev = Math.sqrt(somaQuadrados / n);
    if (downDev === 0) return null;
    return (_mean(excess) / downDev) * Math.sqrt(_obsPorAno(diasUteisPorAno));
  }

  function beta(retornosDiariosAtivo, retornosDiariosMercado) {
    if (!retornosDiariosAtivo || !retornosDiariosMercado) return 0;
    var n = Math.min(retornosDiariosAtivo.length, retornosDiariosMercado.length);
    if (n < 2) return 0;
    // Só pares completos: dias em que qualquer um dos lados não é número
    // (mercado ausente, feriado só de um lado) ficam de fora do cálculo.
    var a = [];
    var m = [];
    for (var i = 0; i < n; i++) {
      var ra = retornosDiariosAtivo[i];
      var rm = retornosDiariosMercado[i];
      if (typeof ra === 'number' && isFinite(ra) &&
          typeof rm === 'number' && isFinite(rm)) {
        a.push(ra);
        m.push(rm);
      }
    }
    if (a.length < 2) return 0;
    var varM = _covariance(m, m);
    if (varM === 0) return 0;
    return _covariance(a, m) / varM;
  }

  function correlacao(retornosA, retornosB) {
    if (!retornosA || !retornosB) return 0;
    var n = Math.min(retornosA.length, retornosB.length);
    if (n < 2) return 0;
    var a = [];
    var b = [];
    for (var i = 0; i < n; i++) {
      var ra = retornosA[i];
      var rb = retornosB[i];
      if (typeof ra === 'number' && isFinite(ra) &&
          typeof rb === 'number' && isFinite(rb)) {
        a.push(ra);
        b.push(rb);
      }
    }
    if (a.length < 2) return 0;
    var sA = _stddev(a);
    var sB = _stddev(b);
    if (sA === 0 || sB === 0) return 0;
    return _covariance(a, b) / (sA * sB);
  }

  function matrizCorrelacao(mapaRetornos) {
    if (!mapaRetornos) return { labels: [], matrix: [] };
    var labels = Object.keys(mapaRetornos);
    if (labels.length === 0) return { labels: [], matrix: [] };
    var matrix = [];
    for (var i = 0; i < labels.length; i++) {
      var row = [];
      for (var j = 0; j < labels.length; j++) {
        if (i === j) {
          row.push(1);
        } else {
          row.push(correlacao(mapaRetornos[labels[i]], mapaRetornos[labels[j]]));
        }
      }
      matrix.push(row);
    }
    return { labels: labels, matrix: matrix };
  }

  /**
   * % do CDI só faz sentido quando os dois retornos são positivos.
   * Carteira negativa (ou CDI <= 0) => null; a UI deve mostrar a diferença
   * em pontos percentuais, não uma porcentagem sem significado.
   */
  function percentualDoCDI(retornoAcumuladoCarteira, retornoAcumuladoCDI) {
    if (typeof retornoAcumuladoCarteira !== 'number' ||
        typeof retornoAcumuladoCDI !== 'number') return null;
    if (!isFinite(retornoAcumuladoCarteira) || !isFinite(retornoAcumuladoCDI)) return null;
    if (retornoAcumuladoCarteira <= 0) return null;
    if (retornoAcumuladoCDI <= 0) return null;
    return (retornoAcumuladoCarteira / retornoAcumuladoCDI) * 100;
  }

  /**
   * ATENÇÃO: isto é uma carteira REBALANCEADA DIARIAMENTE (soma ponderada dos
   * retornos do dia com os pesos-alvo). Não use para buy&hold — para isso use
   * rebalancear(retornos, pesos, Infinity). Mantida por compatibilidade.
   */
  function retornoCarteira(pesos, retornosDiariosAtivos) {
    if (!pesos || !retornosDiariosAtivos) return [];
    var tickers = Object.keys(pesos);
    if (tickers.length === 0) return [];
    var maxLen = 0;
    for (var t = 0; t < tickers.length; t++) {
      var arr = retornosDiariosAtivos[tickers[t]];
      if (arr && arr.length > maxLen) maxLen = arr.length;
    }
    if (maxLen === 0) return [];
    var resultado = [];
    for (var i = 0; i < maxLen; i++) {
      var soma = 0;
      for (var t2 = 0; t2 < tickers.length; t2++) {
        var ticker = tickers[t2];
        var peso = pesos[ticker] || 0;
        var rets = retornosDiariosAtivos[ticker];
        var r = (rets && typeof rets[i] === 'number') ? rets[i] : 0;
        soma += peso * r;
      }
      resultado.push(soma);
    }
    return resultado;
  }

  function curvaPatrimonial(retornosDiarios, valorInicial, aporteMensal, diasPorMes) {
    if (!retornosDiarios || retornosDiarios.length === 0) {
      return [{ dia: 0, valor: valorInicial || 0 }];
    }
    valorInicial = valorInicial || 0;
    aporteMensal = aporteMensal || 0;
    diasPorMes = diasPorMes || 21;
    var valor = valorInicial;
    var curva = [{ dia: 0, valor: valor }];
    for (var i = 0; i < retornosDiarios.length; i++) {
      if (diasPorMes > 0 && i > 0 && i % diasPorMes === 0) {
        valor += aporteMensal;
      }
      valor *= (1 + retornosDiarios[i]);
      curva.push({ dia: i + 1, valor: valor });
    }
    return curva;
  }

  /**
   * Quantos aportes a curva patrimonial faz para n dias de retorno.
   */
  function numeroDeAportes(numDias, diasPorMes) {
    diasPorMes = diasPorMes || 21;
    if (!numDias || numDias < 1 || diasPorMes <= 0) return 0;
    return Math.floor((numDias - 1) / diasPorMes);
  }

  // Simula a trajetória de pesos. frequenciaDias = Infinity => nunca rebalanceia
  // (drift real de buy&hold). Retorna a série de retornos e os pesos do último dia.
  function _simularTrajetoria(retornosDiariosAtivos, pesosAlvo, frequenciaDias) {
    var vazio = { retornos: [], labels: [], pesos: [] };
    if (!retornosDiariosAtivos || !pesosAlvo) return vazio;
    var tickers = Object.keys(pesosAlvo);
    if (tickers.length === 0) return vazio;
    if (frequenciaDias === null || typeof frequenciaDias === 'undefined') frequenciaDias = 21;

    var maxLen = 0;
    var t;
    for (t = 0; t < tickers.length; t++) {
      var arr = retornosDiariosAtivos[tickers[t]];
      if (arr && arr.length > maxLen) maxLen = arr.length;
    }
    if (maxLen === 0) return vazio;

    var pesosAtuais = {};
    for (t = 0; t < tickers.length; t++) {
      pesosAtuais[tickers[t]] = pesosAlvo[tickers[t]] || 0;
    }

    var retornos = [];
    var i;

    for (i = 0; i < maxLen; i++) {
      var rebalanceiaHoje = (typeof frequenciaDias === 'number') &&
                            isFinite(frequenciaDias) &&
                            frequenciaDias > 0 &&
                            i > 0 &&
                            (i % frequenciaDias === 0);
      if (rebalanceiaHoje) {
        for (t = 0; t < tickers.length; t++) {
          pesosAtuais[tickers[t]] = pesosAlvo[tickers[t]] || 0;
        }
      }

      var retornoPortfolio = 0;
      for (t = 0; t < tickers.length; t++) {
        var rets = retornosDiariosAtivos[tickers[t]];
        var r = (rets && typeof rets[i] === 'number' && isFinite(rets[i])) ? rets[i] : 0;
        retornoPortfolio += pesosAtuais[tickers[t]] * r;
      }
      retornos.push(retornoPortfolio);

      var somaPesos = 0;
      for (t = 0; t < tickers.length; t++) {
        var rets2 = retornosDiariosAtivos[tickers[t]];
        var r2 = (rets2 && typeof rets2[i] === 'number' && isFinite(rets2[i])) ? rets2[i] : 0;
        pesosAtuais[tickers[t]] = pesosAtuais[tickers[t]] * (1 + r2);
        somaPesos += pesosAtuais[tickers[t]];
      }
      if (somaPesos !== 0) {
        for (t = 0; t < tickers.length; t++) {
          pesosAtuais[tickers[t]] = pesosAtuais[tickers[t]] / somaPesos;
        }
      }
    }

    var labels = [];
    var pesosFinais = [];
    for (t = 0; t < tickers.length; t++) {
      labels.push(tickers[t]);
      pesosFinais.push(pesosAtuais[tickers[t]]);
    }
    return { retornos: retornos, labels: labels, pesos: pesosFinais };
  }

  /**
   * Série de retornos da carteira com rebalanceamento a cada frequenciaDias.
   * frequenciaDias = Infinity => buy&hold (nunca rebalanceia, pesos driftam).
   */
  function rebalancear(retornosDiariosAtivos, pesosAlvo, frequenciaDias) {
    return _simularTrajetoria(retornosDiariosAtivos, pesosAlvo, frequenciaDias).retornos;
  }

  /**
   * Pesos do ÚLTIMO dia da trajetória efetivamente simulada.
   * @returns {{labels:string[], pesos:number[]}}
   */
  function pesosFinais(retornosDiariosAtivos, pesosAlvo, frequenciaDias) {
    var sim = _simularTrajetoria(retornosDiariosAtivos, pesosAlvo, frequenciaDias);
    return { labels: sim.labels, pesos: sim.pesos };
  }

  function ulcerIndex(retornosDiarios) {
    if (!retornosDiarios || retornosDiarios.length < 2) return 0;
    var equity = 1;
    var peak = 1;
    var sumSqDD = 0;
    for (var i = 0; i < retornosDiarios.length; i++) {
      equity *= (1 + retornosDiarios[i]);
      if (equity > peak) peak = equity;
      var dd = ((equity - peak) / peak) * 100;
      sumSqDD += dd * dd;
    }
    return Math.sqrt(sumSqDD / retornosDiarios.length);
  }

  /**
   * Come-cotas semestral (último pregão de maio e de novembro).
   *
   * @param {number[]} retornosDiarios – retornos diários da carteira/fundo
   * @param {string[]} datas – datas "YYYY-MM-DD" alinhadas com retornosDiarios
   * @param {string} regime – 'rf_longo' (15%), 'rf_curto' (20%),
   *                          'multimercado' (15%) ou 'acoes' (não se aplica)
   * @returns {{aplicavel:boolean, retornoBruto:number, retornoLiquido:number,
   *            perdaPP:number, eventos:Array<{data:string, imposto:number}>}}
   *
   * imposto é expresso em fração do capital inicial (cota parte de 1,0).
   * perdaPP é a diferença bruto-líquido em PONTOS PERCENTUAIS (já x100).
   */
  function comeCotas(retornosDiarios, datas, regime) {
    var bruto = retornoAcumulado(retornosDiarios);
    var naoAplicavel = {
      aplicavel: false,
      retornoBruto: bruto,
      retornoLiquido: bruto,
      perdaPP: 0,
      eventos: []
    };

    var chave = (typeof regime === 'string') ? regime.toLowerCase() : '';
    var aliquota = ALIQUOTAS_COME_COTAS[chave];
    if (typeof aliquota !== 'number') return naoAplicavel;   // inclui 'acoes'
    if (!retornosDiarios || retornosDiarios.length === 0) return naoAplicavel;
    if (!datas || datas.length === 0) return naoAplicavel;

    var n = Math.min(retornosDiarios.length, datas.length);

    // Último pregão presente em cada maio/novembro.
    var indiceEventoPorMes = {};
    for (var i = 0; i < n; i++) {
      var d = datas[i];
      if (typeof d !== 'string' || d.length < 7) continue;
      var mes = d.substring(5, 7);
      if (mes === '05' || mes === '11') {
        indiceEventoPorMes[d.substring(0, 7)] = i;
      }
    }
    var ehEvento = {};
    for (var mesChave in indiceEventoPorMes) {
      if (!indiceEventoPorMes.hasOwnProperty(mesChave)) continue;
      ehEvento[indiceEventoPorMes[mesChave]] = true;
    }

    var v = 1;
    var base = 1;
    var eventos = [];

    for (var j = 0; j < n; j++) {
      var r = (typeof retornosDiarios[j] === 'number' && isFinite(retornosDiarios[j]))
        ? retornosDiarios[j] : 0;
      v *= (1 + r);
      if (ehEvento[j]) {
        var ganho = v - base;
        var imposto = 0;
        if (ganho > 0) {
          imposto = aliquota * ganho;
          v -= imposto;
        }
        base = v;   // a base de cálculo é atualizada a cada evento
        eventos.push({ data: datas[j], imposto: imposto });
      }
    }

    var liquido = v - 1;
    return {
      aplicavel: true,
      retornoBruto: bruto,
      retornoLiquido: liquido,
      perdaPP: (bruto - liquido) * 100,
      eventos: eventos
    };
  }

  return {
    MOTOR_VERSION: MOTOR_VERSION,
    DIAS_ANO_CALENDARIO: DIAS_ANO_CALENDARIO,
    retornoAcumulado: retornoAcumulado,
    retornoAnualizado: retornoAnualizado,
    volatilidadeAnualizada: volatilidadeAnualizada,
    drawdownMaximo: drawdownMaximo,
    serieDrawdown: serieDrawdown,
    sharpe: sharpe,
    sortino: sortino,
    ulcerIndex: ulcerIndex,
    beta: beta,
    correlacao: correlacao,
    matrizCorrelacao: matrizCorrelacao,
    percentualDoCDI: percentualDoCDI,
    retornoCarteira: retornoCarteira,
    curvaPatrimonial: curvaPatrimonial,
    numeroDeAportes: numeroDeAportes,
    rebalancear: rebalancear,
    pesosFinais: pesosFinais,
    comeCotas: comeCotas
  };

})();
