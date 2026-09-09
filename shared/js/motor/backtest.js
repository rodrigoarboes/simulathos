/* ==========================================================================
   Simulathos — Motor de backtest (motor único: academia + alocacao)
   Depende de: Metricas (shared/js/motor/metricas.js)
   Contrato v2.0.0
   ========================================================================== */

var Backtest = (function () {
  'use strict';

  var DIAS_ANO_CALENDARIO = 365.2425;

  // Motivos de validação que INVALIDAM a série (o cálculo sai errado com eles).
  // 'gap_congelado' é sinalizado mas não bloqueia por padrão: preços repetidos
  // são normais em ETFs de caixa (SHV, BIL, TFLO) e em FIIs pouco líquidos.
  // Use config.validarDados = 'estrito' para bloquear em qualquer motivo.
  var MOTIVOS_BLOQUEANTES = { salto_suspeito: true, serie_quebrada: true };

  // -----------------------------------------------------------------------
  // Helpers internos
  // -----------------------------------------------------------------------

  /**
   * Interseção das datas presentes em TODAS as séries do mapa.
   * @param {Object} seriesObj – { "TICKER": [{data:"YYYY-MM-DD", ...}, ...], ... }
   * @returns {string[]} datas ordenadas presentes em todas as séries
   */
  function alinharDatas(seriesObj) {
    var keys = Object.keys(seriesObj);
    if (keys.length === 0) return [];

    var sets = [];
    for (var k = 0; k < keys.length; k++) {
      var arr = seriesObj[keys[k]];
      if (!arr || arr.length === 0) return [];
      var s = {};
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] && arr[i].data) s[arr[i].data] = true;
      }
      sets.push(s);
    }

    var baseKeys = Object.keys(sets[0]);
    var result = [];
    for (var b = 0; b < baseKeys.length; b++) {
      var d = baseKeys[b];
      var inAll = true;
      for (var j = 1; j < sets.length; j++) {
        if (!sets[j][d]) { inAll = false; break; }
      }
      if (inAll) result.push(d);
    }

    result.sort();
    return result;
  }

  /**
   * Converte série de preços [{data, close}] em retornos [{data, retorno}].
   * O primeiro ponto é descartado (não há preço anterior).
   */
  function precosParaRetornos(precos) {
    if (!precos || precos.length < 2) return [];
    var retornos = [];
    for (var i = 1; i < precos.length; i++) {
      var prev = precos[i - 1].close;
      var cur = precos[i].close;
      var ret = (prev !== 0) ? (cur / prev - 1) : 0;
      retornos.push({ data: precos[i].data, retorno: ret });
    }
    return retornos;
  }

  function filtrarPorDatas(series, dateSet) {
    if (!series) return [];
    var result = [];
    for (var i = 0; i < series.length; i++) {
      if (series[i] && dateSet[series[i].data]) {
        result.push(series[i]);
      }
    }
    return result;
  }

  /**
   * Filtra a série para o intervalo [dataInicio, dataFim] (inclusive, string).
   */
  function filtrarIntervalo(series, dataInicio, dataFim) {
    if (!series) return [];
    var result = [];
    for (var i = 0; i < series.length; i++) {
      var d = series[i] && series[i].data;
      if (d && d >= dataInicio && d <= dataFim) {
        result.push(series[i]);
      }
    }
    return result;
  }

  /**
   * Sanidade de uma série de preços [{data, close}].
   *
   * Regras:
   *   - |retorno diário| > 0,5            -> 'salto_suspeito'
   *   - 3+ closes idênticos consecutivos  -> 'gap_congelado'
   *   - queda > 80% e recuperação > 80%
   *     em até 10 pregões                 -> 'serie_quebrada'
   *
   * @returns {{ok:boolean, motivos:string[], bloqueante:boolean,
   *            motivosBloqueantes:string[], detalhes:Object}}
   */
  function validarSerie(serie) {
    var motivos = [];
    var detalhes = {
      pontos: serie ? serie.length : 0,
      maiorSequenciaIgual: 0,
      maiorSaltoAbs: 0,
      primeiroSalto: null,
      primeiraQuebra: null
    };

    if (!serie || serie.length < 2) {
      return {
        ok: true,
        motivos: [],
        bloqueante: false,
        motivosBloqueantes: [],
        detalhes: detalhes
      };
    }

    var temSalto = false;
    var temCongelado = false;
    var temQuebra = false;
    var sequencia = 1;

    for (var i = 1; i < serie.length; i++) {
      var anterior = serie[i - 1] ? serie[i - 1].close : null;
      var atual = serie[i] ? serie[i].close : null;
      if (typeof anterior !== 'number' || typeof atual !== 'number') continue;

      // 3+ closes idênticos consecutivos
      if (atual === anterior) {
        sequencia++;
        if (sequencia > detalhes.maiorSequenciaIgual) detalhes.maiorSequenciaIgual = sequencia;
        if (sequencia >= 3) temCongelado = true;
      } else {
        sequencia = 1;
        if (detalhes.maiorSequenciaIgual < 1) detalhes.maiorSequenciaIgual = 1;
      }

      if (anterior === 0) continue;
      var r = atual / anterior - 1;
      if (Math.abs(r) > detalhes.maiorSaltoAbs) detalhes.maiorSaltoAbs = Math.abs(r);

      // salto suspeito
      if (Math.abs(r) > 0.5) {
        if (!temSalto) {
          detalhes.primeiroSalto = {
            data: serie[i].data,
            de: anterior,
            para: atual,
            retorno: r
          };
        }
        temSalto = true;
      }

      // queda > 80% seguida de recuperação > 80% em <= 10 pregões
      if (atual <= anterior * 0.2 && atual > 0) {
        var limite = Math.min(i + 10, serie.length - 1);
        for (var j = i + 1; j <= limite; j++) {
          var posterior = serie[j] ? serie[j].close : null;
          if (typeof posterior !== 'number') continue;
          if (posterior > atual * 1.8) {
            if (!temQuebra) {
              detalhes.primeiraQuebra = {
                data: serie[i].data,
                de: anterior,
                fundo: atual,
                voltaPara: posterior,
                dataVolta: serie[j].data
              };
            }
            temQuebra = true;
            break;
          }
        }
      }
    }

    if (temSalto) motivos.push('salto_suspeito');
    if (temCongelado) motivos.push('gap_congelado');
    if (temQuebra) motivos.push('serie_quebrada');

    var motivosBloqueantes = [];
    for (var m = 0; m < motivos.length; m++) {
      if (MOTIVOS_BLOQUEANTES[motivos[m]]) motivosBloqueantes.push(motivos[m]);
    }

    return {
      ok: motivos.length === 0,
      motivos: motivos,
      bloqueante: motivosBloqueantes.length > 0,
      motivosBloqueantes: motivosBloqueantes,
      detalhes: detalhes
    };
  }

  /**
   * Série diária de IPCA + 5% a.a.
   * IPCA é mensal ({data:"YYYY-MM", valor: 0.56 = 0,56%}).
   */
  function ipcaMais5Retornos(ipcaMensal, datasUteis) {
    if (!datasUteis || datasUteis.length === 0) return [];

    var ipcaMap = {};
    if (ipcaMensal) {
      for (var i = 0; i < ipcaMensal.length; i++) {
        ipcaMap[ipcaMensal[i].data] = ipcaMensal[i].valor;
      }
    }

    var taxaDiariaReal = Math.pow(1.05, 1 / 252) - 1;
    var retornos = [];

    var ultimoMes = '';
    var taxaDiariaIPCA = 0;

    for (var k = 0; k < datasUteis.length; k++) {
      var d = datasUteis[k];
      var mesAtual = d.substring(0, 7); // "YYYY-MM"

      if (mesAtual !== ultimoMes) {
        ultimoMes = mesAtual;
        var diasNoMes = 0;
        for (var j = k; j < datasUteis.length; j++) {
          if (datasUteis[j].substring(0, 7) === mesAtual) {
            diasNoMes++;
          } else {
            break;
          }
        }
        var ipcaMes = ipcaMap[mesAtual];
        var ipcaDecimal = (typeof ipcaMes === 'number') ? ipcaMes / 100 : 0;
        taxaDiariaIPCA = diasNoMes > 0 ? (Math.pow(1 + ipcaDecimal, 1 / diasNoMes) - 1) : 0;
      }

      retornos.push((1 + taxaDiariaIPCA) * (1 + taxaDiariaReal) - 1);
    }

    return retornos;
  }

  /**
   * Curva patrimonial com os MESMOS aportes da carteira, tolerando buracos:
   * dia sem retorno (null) vira null na curva — a linha para de ser desenhada
   * em vez de congelar num valor que não aconteceu.
   */
  function curvaComAportes(retornosDiarios, valorInicial, aporteMensal) {
    var vals = [];
    if (!retornosDiarios) return vals;
    var valor = valorInicial || 0;
    var aporte = aporteMensal || 0;
    for (var i = 0; i < retornosDiarios.length; i++) {
      if (i > 0 && i % 21 === 0) valor += aporte;
      var r = retornosDiarios[i];
      if (typeof r === 'number' && isFinite(r)) {
        valor *= (1 + r);
        vals.push(valor);
      } else {
        vals.push(null);
      }
    }
    return vals;
  }

  function _diasCorridosEntre(dataInicial, dataFinal) {
    if (!dataInicial || !dataFinal) return null;
    var a = new Date(dataInicial + 'T00:00:00Z').getTime();
    var b = new Date(dataFinal + 'T00:00:00Z').getTime();
    if (isNaN(a) || isNaN(b)) return null;
    var dias = Math.round((b - a) / 86400000);
    return dias > 0 ? dias : null;
  }

  // -----------------------------------------------------------------------
  // Entrada principal
  // -----------------------------------------------------------------------

  /**
   * Roda um backtest completo.
   * @param {Object} config
   * @returns {Object} { resumo, curvas, correlacao, composicao, composicaoAlvo,
   *                     retornosCarteira, retornosPorAtivo }
   */
  function rodar(config) {
    if (!config) throw new Error('Backtest.rodar: config é obrigatório');

    var dados       = config.dados        || {};
    var cdiSeries   = config.cdi          || [];
    var ibovSeries  = config.ibov         || [];
    var ipcaSeries  = config.ipca         || [];
    var pesos       = config.pesos        || {};
    var valorInicial    = config.valorInicial    || 100000;
    var aporteMensal    = config.aporteMensal    || 0;
    var dataInicio  = config.dataInicio    || '';
    var dataFim     = config.dataFim       || '';
    var validarDados = (typeof config.validarDados === 'undefined') ? true : config.validarDados;
    var modoEstrito  = (validarDados === 'estrito');

    // 0, null, undefined ou Infinity => NUNCA rebalancear (buy&hold com drift).
    var rebalRaw = config.rebalanceamento;
    var rebalanceamento = (typeof rebalRaw === 'number' && isFinite(rebalRaw) && rebalRaw > 0)
      ? rebalRaw
      : Infinity;

    var tickers = Object.keys(pesos);
    if (tickers.length === 0) {
      throw new Error('Backtest.rodar: pesos deve conter ao menos um ativo');
    }

    var t, i, ticker;

    // -------------------------------------------------------------------
    // Passo 1: filtrar séries para [dataInicio, dataFim]
    // -------------------------------------------------------------------
    var dadosFiltrados = {};
    for (t = 0; t < tickers.length; t++) {
      ticker = tickers[t];
      var serie = dados[ticker];
      if (!serie || serie.length === 0) {
        throw new Error('Backtest.rodar: dados ausentes para ' + ticker);
      }
      dadosFiltrados[ticker] = filtrarIntervalo(serie, dataInicio, dataFim);
    }

    var cdiFiltrado  = filtrarIntervalo(cdiSeries, dataInicio, dataFim);
    var ibovFiltrado = filtrarIntervalo(ibovSeries, dataInicio, dataFim);

    // -------------------------------------------------------------------
    // Passo 1b: validação de sanidade dos dados
    // -------------------------------------------------------------------
    var validacoes = {};
    if (validarDados) {
      for (t = 0; t < tickers.length; t++) {
        ticker = tickers[t];
        var v = validarSerie(dadosFiltrados[ticker]);
        validacoes[ticker] = v;
        var reprova = modoEstrito ? !v.ok : v.bloqueante;
        if (reprova) {
          var motivosErro = modoEstrito ? v.motivos : v.motivosBloqueantes;
          throw new Error('dado_suspeito:' + ticker + ':' + motivosErro.join(','));
        }
      }
    }

    // -------------------------------------------------------------------
    // Passo 2: alinhar pelas datas comuns (interseção dos ATIVOS)
    // -------------------------------------------------------------------
    // Os benchmarks (CDI/Ibov) de propósito NÃO entram na interseção: eles são
    // consultados por data mais adiante (carry-forward no CDI, null no Ibov),
    // senão um benchmark desatualizado truncaria o backtest inteiro.
    var todasSeries = {};
    for (t = 0; t < tickers.length; t++) {
      todasSeries[tickers[t]] = dadosFiltrados[tickers[t]];
    }

    var datasComuns = alinharDatas(todasSeries);
    if (datasComuns.length < 2) {
      throw new Error('Backtest.rodar: menos de 2 datas comuns encontradas');
    }

    var dateSet = {};
    for (i = 0; i < datasComuns.length; i++) {
      dateSet[datasComuns[i]] = true;
    }

    var dadosAlinhados = {};
    for (t = 0; t < tickers.length; t++) {
      dadosAlinhados[tickers[t]] = filtrarPorDatas(dadosFiltrados[tickers[t]], dateSet);
    }
    var cdiAlinhado  = filtrarPorDatas(cdiFiltrado, dateSet);
    var ibovAlinhado = filtrarPorDatas(ibovFiltrado, dateSet);

    // -------------------------------------------------------------------
    // Passo 3: preços -> retornos diários
    // -------------------------------------------------------------------
    var retornosPorAtivo = {};   // { "TICKER": [number, ...] }
    var retornosComData = {};    // { "TICKER": [{data, retorno}, ...] }

    for (t = 0; t < tickers.length; t++) {
      ticker = tickers[t];
      var rc = precosParaRetornos(dadosAlinhados[ticker]);
      retornosComData[ticker] = rc;
      retornosPorAtivo[ticker] = [];
      for (i = 0; i < rc.length; i++) {
        retornosPorAtivo[ticker].push(rc[i].retorno);
      }
    }

    // Datas dos retornos (perde-se a primeira data, que é o preço de partida)
    var datasRetorno = [];
    for (i = 1; i < datasComuns.length; i++) {
      datasRetorno.push(datasComuns[i]);
    }

    // CDI: taxa diária por data, com carry-forward da última taxa conhecida.
    var cdiPorData = {};
    for (i = 0; i < cdiAlinhado.length; i++) {
      if (typeof cdiAlinhado[i].valor === 'number') {
        cdiPorData[cdiAlinhado[i].data] = cdiAlinhado[i].valor;
      }
    }
    // Se as primeiras datas não têm CDI, usa a primeira taxa conhecida
    // (carry-backward só no início) — nunca 0, que subestimaria o benchmark.
    var primeiraTaxaConhecida = null;
    for (i = 0; i < datasRetorno.length; i++) {
      if (typeof cdiPorData[datasRetorno[i]] === 'number') {
        primeiraTaxaConhecida = cdiPorData[datasRetorno[i]];
        break;
      }
    }

    var cdiRetornos = [];
    var cdiFaltante = 0;
    var ultimaTaxaCDI = (primeiraTaxaConhecida !== null) ? primeiraTaxaConhecida : 0;
    for (i = 0; i < datasRetorno.length; i++) {
      var valCDI = cdiPorData[datasRetorno[i]];
      if (typeof valCDI === 'number') {
        ultimaTaxaCDI = valCDI;
      } else {
        cdiFaltante++;
      }
      cdiRetornos.push(ultimaTaxaCDI);
    }

    // Ibov: retornos por data. Data sem Ibov => null (não entra no beta e a
    // linha do gráfico é interrompida em vez de congelar).
    var ibovRetornosComData = precosParaRetornos(ibovAlinhado);
    var ibovPorData = {};
    for (i = 0; i < ibovRetornosComData.length; i++) {
      ibovPorData[ibovRetornosComData[i].data] = ibovRetornosComData[i].retorno;
    }
    var ibovRetornos = [];
    var ibovFaltante = 0;
    for (i = 0; i < datasRetorno.length; i++) {
      var rIbov = ibovPorData[datasRetorno[i]];
      if (typeof rIbov === 'number' && isFinite(rIbov)) {
        ibovRetornos.push(rIbov);
      } else {
        ibovRetornos.push(null);
        ibovFaltante++;
      }
    }

    var numDias = datasRetorno.length;

    // -------------------------------------------------------------------
    // Passo 3b: janela de calendário e frequência real de observações
    // -------------------------------------------------------------------
    var primeiraData = datasComuns[0];
    var ultimaData = datasComuns[datasComuns.length - 1];
    var diasCorridos = _diasCorridosEntre(primeiraData, ultimaData);
    var observacoesPorAno = (diasCorridos && diasCorridos > 0)
      ? numDias / (diasCorridos / DIAS_ANO_CALENDARIO)
      : null;
    var obsAnualizacao = (observacoesPorAno && isFinite(observacoesPorAno) && observacoesPorAno > 0)
      ? observacoesPorAno
      : 252;

    // -------------------------------------------------------------------
    // Passo 4: retornos diários da carteira (trajetória efetivamente simulada)
    // -------------------------------------------------------------------
    var retornosCarteira = Metricas.rebalancear(retornosPorAtivo, pesos, rebalanceamento);

    // -------------------------------------------------------------------
    // Passo 5: curva patrimonial
    // -------------------------------------------------------------------
    var curvaObj = Metricas.curvaPatrimonial(retornosCarteira, valorInicial, aporteMensal, 21);

    var equityValues = [];
    for (i = 1; i < curvaObj.length; i++) {
      equityValues.push(curvaObj[i].valor);
    }
    while (equityValues.length < datasRetorno.length) {
      equityValues.push(equityValues.length > 0 ? equityValues[equityValues.length - 1] : valorInicial);
    }
    if (equityValues.length > datasRetorno.length) {
      equityValues = equityValues.slice(0, datasRetorno.length);
    }

    // -------------------------------------------------------------------
    // Passo 6: curvas dos benchmarks (mesmos aportes da carteira)
    // -------------------------------------------------------------------
    var cdiValues = curvaComAportes(cdiRetornos, valorInicial, aporteMensal);
    var ibovValues = curvaComAportes(ibovRetornos, valorInicial, aporteMensal);
    var ipcaRetornos = ipcaMais5Retornos(ipcaSeries, datasRetorno);
    var ipcaMais5Values = curvaComAportes(ipcaRetornos, valorInicial, aporteMensal);

    // -------------------------------------------------------------------
    // Passo 7: métricas
    // -------------------------------------------------------------------
    var retAcum     = Metricas.retornoAcumulado(retornosCarteira);
    // Menos de 1 ano de dados não se anualiza: a UI mostra "retorno do período".
    var retAnual    = (numDias >= 252)
      ? Metricas.retornoAnualizado(retAcum, numDias, diasCorridos)
      : null;
    var vol         = Metricas.volatilidadeAnualizada(retornosCarteira, obsAnualizacao);
    var maxDD       = Metricas.drawdownMaximo(retornosCarteira);
    var sharpeVal   = Metricas.sharpe(retornosCarteira, cdiRetornos, obsAnualizacao);
    var sortinoVal  = Metricas.sortino(retornosCarteira, cdiRetornos, obsAnualizacao);
    var ulcerVal    = Metricas.ulcerIndex(retornosCarteira);
    var betaVal     = Metricas.beta(retornosCarteira, ibovRetornos);
    var cdiAcum     = Metricas.retornoAcumulado(cdiRetornos);
    var pctCDI      = Metricas.percentualDoCDI(retAcum, cdiAcum);
    var serieDD     = Metricas.serieDrawdown(retornosCarteira);

    // Matriz de correlação
    var mapaRetornos = {};
    for (t = 0; t < tickers.length; t++) {
      mapaRetornos[tickers[t]] = retornosPorAtivo[tickers[t]];
    }
    var corr = Metricas.matrizCorrelacao(mapaRetornos);

    // -------------------------------------------------------------------
    // Passo 8: composição (pesos do último dia simulado) e alvo
    // -------------------------------------------------------------------
    var composicao = Metricas.pesosFinais(retornosPorAtivo, pesos, rebalanceamento);

    var labelsAlvo = [];
    var pesosAlvoArr = [];
    var pesoInformado = 0;
    for (t = 0; t < tickers.length; t++) {
      labelsAlvo.push(tickers[t]);
      var p = (typeof pesos[tickers[t]] === 'number') ? pesos[tickers[t]] : 0;
      pesosAlvoArr.push(p);
      pesoInformado += p;
    }
    var pesoUtilizado = 0;
    for (i = 0; i < composicao.pesos.length; i++) {
      pesoUtilizado += composicao.pesos[i];
    }

    // -------------------------------------------------------------------
    // Passo 9: diagnóstico
    // -------------------------------------------------------------------
    var primeiraDataPorAtivo = {};
    var ultimaDataPorAtivo = {};
    var ativoLimitante = null;
    var maiorPrimeiraData = '';
    for (t = 0; t < tickers.length; t++) {
      ticker = tickers[t];
      var serieT = dadosFiltrados[ticker];
      var pri = (serieT && serieT.length) ? serieT[0].data : null;
      var ult = (serieT && serieT.length) ? serieT[serieT.length - 1].data : null;
      primeiraDataPorAtivo[ticker] = pri;
      ultimaDataPorAtivo[ticker] = ult;
      if (pri && pri > maiorPrimeiraData) {
        maiorPrimeiraData = pri;
        ativoLimitante = ticker;
      }
    }

    // Menor última data entre TODAS as séries usadas (ativos + benchmarks):
    // é a data em que os dados realmente acabam.
    var dataCorteDados = null;
    for (ticker in ultimaDataPorAtivo) {
      if (!ultimaDataPorAtivo.hasOwnProperty(ticker)) continue;
      var u = ultimaDataPorAtivo[ticker];
      if (u && (dataCorteDados === null || u < dataCorteDados)) dataCorteDados = u;
    }
    if (cdiFiltrado.length) {
      var uCDI = cdiFiltrado[cdiFiltrado.length - 1].data;
      if (uCDI && (dataCorteDados === null || uCDI < dataCorteDados)) dataCorteDados = uCDI;
    }
    if (ibovFiltrado.length) {
      var uIbov = ibovFiltrado[ibovFiltrado.length - 1].data;
      if (uIbov && (dataCorteDados === null || uIbov < dataCorteDados)) dataCorteDados = uIbov;
    }

    var diagnostico = {
      diasUteis: numDias,
      diasCorridos: diasCorridos,
      observacoesPorAno: observacoesPorAno,
      cdiFaltante: cdiFaltante,
      ibovFaltante: ibovFaltante,
      ativoLimitante: ativoLimitante,
      primeiraData: primeiraData,
      ultimaData: ultimaData,
      primeiraDataPorAtivo: primeiraDataPorAtivo,
      pesoInformado: pesoInformado,
      pesoUtilizado: pesoUtilizado,
      motorVersion: Metricas.MOTOR_VERSION,
      dataCorteDados: dataCorteDados,
      rebalanceamento: isFinite(rebalanceamento) ? rebalanceamento : null,
      validacoes: validacoes
    };

    var totalAportado = valorInicial +
      Metricas.numeroDeAportes(numDias, 21) * aporteMensal;
    var valorFinal = equityValues.length
      ? equityValues[equityValues.length - 1]
      : valorInicial;

    // -------------------------------------------------------------------
    // Resultado
    // -------------------------------------------------------------------
    return {
      resumo: {
        retornoAcumulado:  retAcum,
        retornoAnualizado: retAnual,
        volatilidade:      vol,
        sharpe:            sharpeVal,
        sortino:           sortinoVal,
        ulcerIndex:        ulcerVal,
        drawdownMaximo:    maxDD,
        beta:              betaVal,
        percentualCDI:     pctCDI,
        retornoCDI:        cdiAcum,
        diasUteis:         numDias,
        diasCorridos:      diasCorridos,
        observacoesPorAno: observacoesPorAno,
        valorInicial:      valorInicial,
        valorFinal:        valorFinal,
        totalAportado:     totalAportado,
        diagnostico:       diagnostico
      },
      curvas: {
        datas:     datasRetorno,
        carteira:  equityValues,
        cdi:       cdiValues,
        ibov:      ibovValues,
        ipcaMais5: ipcaMais5Values,
        drawdown:  serieDD
      },
      correlacao: {
        labels: corr.labels,
        matrix: corr.matrix
      },
      composicao: {
        labels: composicao.labels,
        pesos:  composicao.pesos
      },
      composicaoAlvo: {
        labels: labelsAlvo,
        pesos:  pesosAlvoArr
      },
      retornosCarteira: retornosCarteira,
      retornosPorAtivo: retornosPorAtivo
    };
  }

  // -----------------------------------------------------------------------
  // API pública
  // -----------------------------------------------------------------------

  return {
    MOTOR_VERSION: '2.0.0',
    rodar: rodar,
    validarSerie: validarSerie,
    alinharDatas: alinharDatas,
    precosParaRetornos: precosParaRetornos
  };

})();
