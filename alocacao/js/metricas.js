// alocacao/js/metricas.js
var Metricas = (function () {

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

  function retornoAcumulado(retornosDiarios) {
    if (!retornosDiarios || retornosDiarios.length === 0) return 0;
    var prod = 1;
    for (var i = 0; i < retornosDiarios.length; i++) {
      prod *= (1 + retornosDiarios[i]);
    }
    return prod - 1;
  }

  function retornoAnualizado(retAcumulado, numDiasUteis) {
    if (!numDiasUteis || numDiasUteis === 0) return 0;
    return Math.pow(1 + retAcumulado, 252 / numDiasUteis) - 1;
  }

  function volatilidadeAnualizada(retornosDiarios) {
    if (!retornosDiarios || retornosDiarios.length < 2) return 0;
    return _stddev(retornosDiarios) * Math.sqrt(252);
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

  function sharpe(retornosDiarios, retornosDiariosRiskFree) {
    if (!retornosDiarios || retornosDiarios.length < 2) return 0;
    if (!retornosDiariosRiskFree) retornosDiariosRiskFree = [];
    var n = retornosDiarios.length;
    var excess = [];
    for (var i = 0; i < n; i++) {
      var rf = i < retornosDiariosRiskFree.length ? retornosDiariosRiskFree[i] : 0;
      excess.push(retornosDiarios[i] - rf);
    }
    var stdExcess = _stddev(excess);
    if (stdExcess === 0) return 0;
    return (_mean(excess) / stdExcess) * Math.sqrt(252);
  }

  function beta(retornosDiariosAtivo, retornosDiariosMercado) {
    if (!retornosDiariosAtivo || !retornosDiariosMercado) return 0;
    var n = Math.min(retornosDiariosAtivo.length, retornosDiariosMercado.length);
    if (n < 2) return 0;
    var a = retornosDiariosAtivo.slice(0, n);
    var m = retornosDiariosMercado.slice(0, n);
    var varM = _covariance(m, m);
    if (varM === 0) return 0;
    return _covariance(a, m) / varM;
  }

  function correlacao(retornosA, retornosB) {
    if (!retornosA || !retornosB) return 0;
    var n = Math.min(retornosA.length, retornosB.length);
    if (n < 2) return 0;
    var a = retornosA.slice(0, n);
    var b = retornosB.slice(0, n);
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

  function percentualDoCDI(retornoAcumuladoCarteira, retornoAcumuladoCDI) {
    if (!retornoAcumuladoCDI || retornoAcumuladoCDI === 0) return 0;
    return (retornoAcumuladoCarteira / retornoAcumuladoCDI) * 100;
  }

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
      for (var t = 0; t < tickers.length; t++) {
        var ticker = tickers[t];
        var peso = pesos[ticker] || 0;
        var rets = retornosDiariosAtivos[ticker];
        var r = (rets && i < rets.length) ? rets[i] : 0;
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

  function rebalancear(retornosDiariosAtivos, pesosAlvo, frequenciaDias) {
    if (!retornosDiariosAtivos || !pesosAlvo) return [];
    var tickers = Object.keys(pesosAlvo);
    if (tickers.length === 0) return [];
    frequenciaDias = frequenciaDias || 21;
    var maxLen = 0;
    for (var t = 0; t < tickers.length; t++) {
      var arr = retornosDiariosAtivos[tickers[t]];
      if (arr && arr.length > maxLen) maxLen = arr.length;
    }
    if (maxLen === 0) return [];

    var pesosAtuais = {};
    for (var t = 0; t < tickers.length; t++) {
      pesosAtuais[tickers[t]] = pesosAlvo[tickers[t]] || 0;
    }

    var resultado = [];

    for (var i = 0; i < maxLen; i++) {
      if (frequenciaDias > 0 && i > 0 && i % frequenciaDias === 0) {
        for (var t = 0; t < tickers.length; t++) {
          pesosAtuais[tickers[t]] = pesosAlvo[tickers[t]] || 0;
        }
      }

      var retornoPortfolio = 0;
      var valorTotal = 0;
      for (var t = 0; t < tickers.length; t++) {
        var ticker = tickers[t];
        var rets = retornosDiariosAtivos[ticker];
        var r = (rets && i < rets.length) ? rets[i] : 0;
        retornoPortfolio += pesosAtuais[ticker] * r;
      }
      resultado.push(retornoPortfolio);

      var somaPesos = 0;
      for (var t = 0; t < tickers.length; t++) {
        var ticker = tickers[t];
        var rets = retornosDiariosAtivos[ticker];
        var r = (rets && i < rets.length) ? rets[i] : 0;
        pesosAtuais[ticker] = pesosAtuais[ticker] * (1 + r);
        somaPesos += pesosAtuais[ticker];
      }
      if (somaPesos !== 0) {
        for (var t = 0; t < tickers.length; t++) {
          pesosAtuais[tickers[t]] = pesosAtuais[tickers[t]] / somaPesos;
        }
      }
    }

    return resultado;
  }

  return {
    retornoAcumulado: retornoAcumulado,
    retornoAnualizado: retornoAnualizado,
    volatilidadeAnualizada: volatilidadeAnualizada,
    drawdownMaximo: drawdownMaximo,
    sharpe: sharpe,
    beta: beta,
    correlacao: correlacao,
    matrizCorrelacao: matrizCorrelacao,
    percentualDoCDI: percentualDoCDI,
    retornoCarteira: retornoCarteira,
    curvaPatrimonial: curvaPatrimonial,
    rebalancear: rebalancear
  };

})();
