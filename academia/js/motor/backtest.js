/* ==========================================================================
   AIDA Alocação — Backtest Engine
   Depends on: Metricas (alocacao/js/metricas.js), Simulathos (shared/js/utils.js)
   ========================================================================== */

var Backtest = (function () {
  'use strict';

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  /**
   * Find the intersection of date strings across all series in a map.
   * @param {Object} seriesObj – { "TICKER": [{data:"YYYY-MM-DD", ...}, ...], ... }
   * @returns {string[]} sorted array of dates present in EVERY series
   */
  function alinharDatas(seriesObj) {
    var keys = Object.keys(seriesObj);
    if (keys.length === 0) return [];

    // Build a Set for each series, then intersect
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

    // Start with the first set, intersect with the rest
    var baseKeys = Object.keys(sets[0]);
    var result = [];
    for (var i = 0; i < baseKeys.length; i++) {
      var d = baseKeys[i];
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
   * Convert a price series [{data, close}] to daily return series [{data, retorno}].
   * The first element is dropped (no prior price).
   * @param {Array} precos – [{data:"YYYY-MM-DD", close: number}, ...]
   * @returns {Array} [{data, retorno}, ...]
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

  /**
   * Filter a series array to entries whose .data is in the given Set.
   * @param {Array} series – [{data, ...}, ...]
   * @param {Object} dateSet – { "YYYY-MM-DD": true, ... }
   * @returns {Array}
   */
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
   * Filter a series to entries within [dataInicio, dataFim] (inclusive, string comparison).
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
   * Build the daily total-return series for IPCA + 5% p.a.
   * IPCA is monthly (data: "YYYY-MM", valor: percentage like 0.56 meaning 0.56%).
   * The real rate added is 5% p.a. => daily ~= (1.05)^(1/252) - 1.
   *
   * @param {Array} ipcaMensal – [{data:"YYYY-MM", valor: number}, ...]
   * @param {string[]} datasUteis – sorted trading dates
   * @returns {number[]} daily total returns, one per trading date
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

    for (var i = 0; i < datasUteis.length; i++) {
      var d = datasUteis[i];
      var mesAtual = d.substring(0, 7); // "YYYY-MM"

      if (mesAtual !== ultimoMes) {
        ultimoMes = mesAtual;
        var diasNoMes = 0;
        for (var j = i; j < datasUteis.length; j++) {
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
   * Build an equity curve from a daily-return series, applying the same
   * monthly contributions used for the portfolio. This keeps every line
   * (carteira and benchmarks) comparable when aporteMensal > 0.
   * @returns {number[]} equity values, one per return date
   */
  function curvaComAportes(retornosDiarios, valorInicial, aporteMensal) {
    var curva = Metricas.curvaPatrimonial(retornosDiarios, valorInicial, aporteMensal, 21);
    var vals = [];
    for (var i = 1; i < curva.length; i++) {
      vals.push(curva[i].valor);
    }
    return vals;
  }

  /**
   * Get the final (drifted) weights after applying a series of returns
   * starting from pesosAlvo without rebalancing.
   */
  function pesosFinaisDrift(pesosAlvo, retornosDiariosAtivos) {
    var tickers = Object.keys(pesosAlvo);
    if (tickers.length === 0) return { labels: [], pesos: [] };

    var maxLen = 0;
    for (var t = 0; t < tickers.length; t++) {
      var arr = retornosDiariosAtivos[tickers[t]];
      if (arr && arr.length > maxLen) maxLen = arr.length;
    }

    // Simulate weight drift
    var w = {};
    for (var t = 0; t < tickers.length; t++) {
      w[tickers[t]] = pesosAlvo[tickers[t]] || 0;
    }

    for (var i = 0; i < maxLen; i++) {
      var soma = 0;
      for (var t = 0; t < tickers.length; t++) {
        var ticker = tickers[t];
        var rets = retornosDiariosAtivos[ticker];
        var r = (rets && i < rets.length) ? rets[i] : 0;
        w[ticker] = w[ticker] * (1 + r);
        soma += w[ticker];
      }
      if (soma !== 0) {
        for (var t = 0; t < tickers.length; t++) {
          w[tickers[t]] = w[tickers[t]] / soma;
        }
      }
    }

    var labels = [];
    var pesos = [];
    for (var t = 0; t < tickers.length; t++) {
      labels.push(tickers[t]);
      pesos.push(w[tickers[t]]);
    }
    return { labels: labels, pesos: pesos };
  }

  // -----------------------------------------------------------------------
  // Main entry point
  // -----------------------------------------------------------------------

  /**
   * Run a full backtest.
   * @param {Object} config – see module documentation for shape
   * @returns {Object} result – { resumo, curvas, correlacao, composicao }
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
    var rebalanceamento = (typeof config.rebalanceamento === 'number') ? config.rebalanceamento : 0;
    var dataInicio  = config.dataInicio    || '';
    var dataFim     = config.dataFim       || '';

    var tickers = Object.keys(pesos);
    if (tickers.length === 0) {
      throw new Error('Backtest.rodar: pesos deve conter ao menos um ativo');
    }

    // -------------------------------------------------------------------
    // Step 1: Filter all series to [dataInicio, dataFim]
    // -------------------------------------------------------------------
    var dadosFiltrados = {};
    for (var t = 0; t < tickers.length; t++) {
      var ticker = tickers[t];
      var serie = dados[ticker];
      if (!serie || serie.length === 0) {
        throw new Error('Backtest.rodar: dados ausentes para ' + ticker);
      }
      dadosFiltrados[ticker] = filtrarIntervalo(serie, dataInicio, dataFim);
    }

    var cdiFiltrado  = filtrarIntervalo(cdiSeries, dataInicio, dataFim);
    var ibovFiltrado = filtrarIntervalo(ibovSeries, dataInicio, dataFim);

    // -------------------------------------------------------------------
    // Step 2: Align by common trading dates (intersection of all series)
    // -------------------------------------------------------------------
    // Combine all series into one map for alignment
    var todasSeries = {};
    for (var t = 0; t < tickers.length; t++) {
      todasSeries[tickers[t]] = dadosFiltrados[tickers[t]];
    }
    todasSeries['__cdi__']  = cdiFiltrado;
    todasSeries['__ibov__'] = ibovFiltrado;

    var datasComuns = alinharDatas(todasSeries);
    if (datasComuns.length < 2) {
      throw new Error('Backtest.rodar: menos de 2 datas comuns encontradas');
    }

    // Build a lookup for fast filtering
    var dateSet = {};
    for (var i = 0; i < datasComuns.length; i++) {
      dateSet[datasComuns[i]] = true;
    }

    // Re-filter all series to the common dates
    var dadosAlinhados = {};
    for (var t = 0; t < tickers.length; t++) {
      dadosAlinhados[tickers[t]] = filtrarPorDatas(dadosFiltrados[tickers[t]], dateSet);
    }
    var cdiAlinhado  = filtrarPorDatas(cdiFiltrado, dateSet);
    var ibovAlinhado = filtrarPorDatas(ibovFiltrado, dateSet);

    // -------------------------------------------------------------------
    // Step 3: Convert price series to daily returns
    // -------------------------------------------------------------------
    var retornosPorAtivo = {};   // { "TICKER": [number, ...] }
    var retornosComData = {};    // { "TICKER": [{data, retorno}, ...] }

    for (var t = 0; t < tickers.length; t++) {
      var ticker = tickers[t];
      var rc = precosParaRetornos(dadosAlinhados[ticker]);
      retornosComData[ticker] = rc;
      retornosPorAtivo[ticker] = [];
      for (var i = 0; i < rc.length; i++) {
        retornosPorAtivo[ticker].push(rc[i].retorno);
      }
    }

    // CDI daily returns (already rates, not prices)
    // We skip the first date to align with the returns (which lose the first date)
    var cdiRetornos = [];
    var cdiDatasRetorno = [];
    // Build a set of return-dates from the first ticker
    var primeiroTicker = tickers[0];
    var datasRetorno = [];
    for (var i = 0; i < retornosComData[primeiroTicker].length; i++) {
      datasRetorno.push(retornosComData[primeiroTicker][i].data);
    }
    var datasRetornoSet = {};
    for (var i = 0; i < datasRetorno.length; i++) {
      datasRetornoSet[datasRetorno[i]] = true;
    }

    // Map CDI values by date for quick lookup
    var cdiPorData = {};
    for (var i = 0; i < cdiAlinhado.length; i++) {
      cdiPorData[cdiAlinhado[i].data] = cdiAlinhado[i].valor;
    }

    for (var i = 0; i < datasRetorno.length; i++) {
      var d = datasRetorno[i];
      var val = (typeof cdiPorData[d] === 'number') ? cdiPorData[d] : 0;
      cdiRetornos.push(val);
      cdiDatasRetorno.push(d);
    }

    // Ibov returns (from prices)
    var ibovRetornosComData = precosParaRetornos(ibovAlinhado);
    // Align ibov returns to the same return dates
    var ibovPorData = {};
    for (var i = 0; i < ibovRetornosComData.length; i++) {
      ibovPorData[ibovRetornosComData[i].data] = ibovRetornosComData[i].retorno;
    }
    var ibovRetornos = [];
    for (var i = 0; i < datasRetorno.length; i++) {
      var r = ibovPorData[datasRetorno[i]];
      ibovRetornos.push(typeof r === 'number' ? r : 0);
    }

    var numDias = datasRetorno.length;

    // -------------------------------------------------------------------
    // Step 4: Build portfolio daily returns
    // -------------------------------------------------------------------
    var retornosCarteira;
    if (rebalanceamento > 0) {
      retornosCarteira = Metricas.rebalancear(retornosPorAtivo, pesos, rebalanceamento);
    } else {
      retornosCarteira = Metricas.retornoCarteira(pesos, retornosPorAtivo);
    }

    // -------------------------------------------------------------------
    // Step 5: Build equity curve
    // -------------------------------------------------------------------
    var curvaObj = Metricas.curvaPatrimonial(retornosCarteira, valorInicial, aporteMensal, 21);

    // Extract equity values (skip index 0 which is the initial value before any return)
    var equityValues = [];
    for (var i = 1; i < curvaObj.length; i++) {
      equityValues.push(curvaObj[i].valor);
    }

    // If curvaObj has more entries than datasRetorno (shouldn't happen, but be safe),
    // or fewer, align lengths
    while (equityValues.length < datasRetorno.length) {
      equityValues.push(equityValues.length > 0 ? equityValues[equityValues.length - 1] : valorInicial);
    }
    if (equityValues.length > datasRetorno.length) {
      equityValues = equityValues.slice(0, datasRetorno.length);
    }

    // -------------------------------------------------------------------
    // Step 6: Build benchmark curves
    // -------------------------------------------------------------------

    // All benchmark curves receive the SAME contributions as the portfolio,
    // so the comparison stays fair when aporteMensal > 0 ("had I invested the
    // same monthly amount in CDI / Ibov / IPCA+5% instead").

    // CDI: daily rates already computed in cdiRetornos
    var cdiValues = curvaComAportes(cdiRetornos, valorInicial, aporteMensal);

    // Ibovespa: daily price returns already computed in ibovRetornos
    var ibovValues = curvaComAportes(ibovRetornos, valorInicial, aporteMensal);

    // IPCA + 5% p.a.
    var ipcaRetornos = ipcaMais5Retornos(ipcaSeries, datasRetorno);
    var ipcaMais5Values = curvaComAportes(ipcaRetornos, valorInicial, aporteMensal);

    // -------------------------------------------------------------------
    // Step 7: Calculate metrics
    // -------------------------------------------------------------------
    var retAcum     = Metricas.retornoAcumulado(retornosCarteira);
    var retAnual    = Metricas.retornoAnualizado(retAcum, numDias);
    var vol         = Metricas.volatilidadeAnualizada(retornosCarteira);
    var maxDD       = Metricas.drawdownMaximo(retornosCarteira);
    var sharpeVal   = Metricas.sharpe(retornosCarteira, cdiRetornos);
    var betaVal     = Metricas.beta(retornosCarteira, ibovRetornos);
    var cdiAcum     = Metricas.retornoAcumulado(cdiRetornos);
    var pctCDI      = Metricas.percentualDoCDI(retAcum, cdiAcum);

    // Correlation matrix
    var mapaRetornos = {};
    for (var t = 0; t < tickers.length; t++) {
      mapaRetornos[tickers[t]] = retornosPorAtivo[tickers[t]];
    }
    var corr = Metricas.matrizCorrelacao(mapaRetornos);

    // -------------------------------------------------------------------
    // Step 8: Composition (final weights)
    // -------------------------------------------------------------------
    var composicao;
    if (rebalanceamento > 0) {
      // If rebalanced, final weights are approximately the target weights
      var labels = [];
      var pesosArr = [];
      for (var t = 0; t < tickers.length; t++) {
        labels.push(tickers[t]);
        pesosArr.push(pesos[tickers[t]]);
      }
      composicao = { labels: labels, pesos: pesosArr };
    } else {
      composicao = pesosFinaisDrift(pesos, retornosPorAtivo);
    }

    // -------------------------------------------------------------------
    // Return result
    // -------------------------------------------------------------------
    return {
      resumo: {
        retornoAcumulado:  retAcum,
        retornoAnualizado: retAnual,
        volatilidade:      vol,
        sharpe:            sharpeVal,
        drawdownMaximo:    maxDD,
        beta:              betaVal,
        percentualCDI:     pctCDI,
        diasUteis:         numDias
      },
      curvas: {
        datas:     datasRetorno,
        carteira:  equityValues,
        cdi:       cdiValues,
        ibov:      ibovValues,
        ipcaMais5: ipcaMais5Values
      },
      correlacao: {
        labels: corr.labels,
        matrix: corr.matrix
      },
      composicao: {
        labels: composicao.labels,
        pesos:  composicao.pesos
      }
    };
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  return {
    rodar: rodar
  };

})();
