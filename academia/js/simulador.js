/* ==========================================================================
   Simulathos / Academia — Simulador (backtest histórico real na Tela 4)
   Expõe global AIDASim com AIDASim.render(montagem, caseObj).
   Depende de: window.DADOS, Backtest + Metricas (shared/js/motor), Chart (global),
   opcionalmente window.Catalogo e window.Estado.
   Estilo: vanilla ES5-ish, defensivo, sem build. Sem style inline, sem emoji.
   ========================================================================== */

var AIDASim = (function () {
  'use strict';

  // Instâncias de Chart, para destruir antes de recriar.
  var chartPatrimonio = null;
  var chartDrawdown = null;

  // Universo combinado (B3 em BRL + offshore convertido para BRL), em cache.
  var universoCache = null;

  // URL do proxy Yahoo Finance (Cloudflare Worker).
  var PROXY_URL = 'https://aida-proxy.vocebancario.workers.dev';

  // Flag para evitar loop infinito de fetch no render.
  var fetchEmAndamento = false;

  // Último contexto renderizado (para re-render ao mudar premissas).
  var ctxAtual = { montagem: null, caseObj: null };

  // Aba ativa do painel de resultado.
  var abaAtiva = 'patrimonio';

  /* -------------------------------------------------------------------- */
  /* CALCULOS-16 — Premissas únicas do backtest (antes duplicadas em dois   */
  /* blocos com valores fixos 100000 / 0 / 63).                            */
  /* -------------------------------------------------------------------- */
  var PREMISSAS = {
    valorInicial: 100000,
    aporteMensal: 0,
    rebalanceamento: 63,   // 0 = nunca, 21 = mensal, 63 = trimestral, 252 = anual
    janela: 'max'          // 'max' | '5a' | '3a' | '12m'
  };
  // Marca se o usuário já mexeu nas premissas — enquanto não mexeu, o valor
  // inicial acompanha o aporte da Tela 3 / o aporte sugerido do case.
  var premissasTocadas = false;

  // Defaults das premissas, para restaurar ao trocar de case.
  var PREMISSAS_PADRAO = {
    valorInicial: PREMISSAS.valorInicial,
    aporteMensal: PREMISSAS.aporteMensal,
    rebalanceamento: PREMISSAS.rebalanceamento,
    janela: PREMISSAS.janela
  };

  // Identidade do último case renderizado, para não vazar premissas de um
  // cliente no outro (o valor inicial de um case é o patrimônio DAQUELE case).
  var casoAtualId = undefined;

  /** Chave estável do case (string), 'livre' quando não há case. */
  function chaveCase(caseObj) {
    if (!caseObj) return 'livre';
    if (caseObj.id != null) return String(caseObj.id);
    if (caseObj.titulo) return String(caseObj.titulo);
    return 'case';
  }

  /** Ao trocar de case, as premissas voltam ao padrão e reencostam no aporte. */
  function sincronizarCase(caseObj) {
    var chave = chaveCase(caseObj);
    if (casoAtualId === chave) return;
    casoAtualId = chave;
    PREMISSAS.valorInicial = PREMISSAS_PADRAO.valorInicial;
    PREMISSAS.aporteMensal = PREMISSAS_PADRAO.aporteMensal;
    PREMISSAS.rebalanceamento = PREMISSAS_PADRAO.rebalanceamento;
    PREMISSAS.janela = PREMISSAS_PADRAO.janela;
    premissasTocadas = false;
    abaAtiva = 'patrimonio';
  }

  var REBAL_OPCOES = [
    { valor: 0,   rotulo: 'Nunca' },
    { valor: 21,  rotulo: 'Mensal' },
    { valor: 63,  rotulo: 'Trimestral' },
    { valor: 252, rotulo: 'Anual' }
  ];
  var JANELA_OPCOES = [
    { valor: 'max', rotulo: 'Máx' },
    { valor: '5a',  rotulo: '5A' },
    { valor: '3a',  rotulo: '3A' },
    { valor: '12m', rotulo: '12M' }
  ];

  /**
   * Monta o universo de ativos para simulação, todos denominados em BRL:
   * - ETFs B3 (window.DADOS.etfs): já em reais, usados como estão.
   * - ETFs offshore (window.DADOS.offshore): cotados em dólar, convertidos
   *   para reais multiplicando o close (USD) pela cotação USD/BRL da data
   *   (window.DADOS.indices.usdbrl). Datas sem câmbio carregam o último
   *   câmbio conhecido.
   * - Fundos abertos (CVM): já em BRL.
   */
  function construirUniverso() {
    if (universoCache) return universoCache;
    var D = window.DADOS || {};
    var uni = {};

    if (D.etfs) {
      for (var t in D.etfs) {
        if (D.etfs.hasOwnProperty(t)) uni[t] = D.etfs[t];
      }
    }

    var usdbrl = D.indices && D.indices.usdbrl;
    if (D.offshore && usdbrl && usdbrl.length) {
      var fx = {};
      for (var i = 0; i < usdbrl.length; i++) fx[usdbrl[i].data] = usdbrl[i].close;

      for (var k in D.offshore) {
        if (!D.offshore.hasOwnProperty(k)) continue;
        var serieUsd = D.offshore[k];
        if (!serieUsd || !serieUsd.length) continue;
        var serieBrl = [];
        var ultimoFx = null;
        for (var j = 0; j < serieUsd.length; j++) {
          var data = serieUsd[j].data;
          var rate = fx[data];
          if (rate == null) rate = ultimoFx;
          if (rate == null) continue;
          ultimoFx = rate;
          serieBrl.push({ data: data, close: Math.round(serieUsd[j].close * rate * 100) / 100 });
        }
        if (serieBrl.length >= 2) uni[k] = serieBrl;
      }
    }

    if (D.fundos) {
      for (var f in D.fundos) {
        if (D.fundos.hasOwnProperty(f)) uni[f] = D.fundos[f];
      }
    }

    universoCache = uni;
    return uni;
  }

  // --------------------------------------------------------------------- //
  // Busca de tickers ausentes via proxy Yahoo Finance
  // --------------------------------------------------------------------- //

  function buscarTicker(ticker) {
    var symbol = ticker;
    if (/\d/.test(ticker) && ticker.indexOf('.') === -1 && ticker.indexOf('=') === -1) {
      symbol = ticker + '.SA';
    }
    var url = PROXY_URL + '/chart/' + encodeURIComponent(symbol) + '?range=5y&interval=1d';
    return fetch(url).then(function (resp) {
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      return resp.json();
    });
  }

  function buscarFaltantes(tickers) {
    if (!tickers.length) return Promise.resolve();
    var i = 0;
    function next() {
      if (i >= tickers.length) return Promise.resolve();
      var ticker = tickers[i++];
      return buscarTicker(ticker)
        .then(function (dados) {
          if (!dados || dados.length < 2) return;
          var isOffshore = !/\d/.test(ticker) || ticker.indexOf('.L') !== -1;
          if (isOffshore && window.DADOS && window.DADOS.indices && window.DADOS.indices.usdbrl) {
            var usdbrl = window.DADOS.indices.usdbrl;
            var fx = {};
            for (var a = 0; a < usdbrl.length; a++) fx[usdbrl[a].data] = usdbrl[a].close;
            var brl = [];
            var lastFx = null;
            for (var b = 0; b < dados.length; b++) {
              var rate = fx[dados[b].data];
              if (rate == null) rate = lastFx;
              if (rate == null) continue;
              lastFx = rate;
              brl.push({ data: dados[b].data, close: Math.round(dados[b].close * rate * 100) / 100 });
            }
            dados = brl;
          }
          if (dados.length >= 2) {
            if (!universoCache) construirUniverso();
            universoCache[ticker] = dados;
          }
        })
        .catch(function () { /* silencioso — vira "sem dados" no relatório */ })
        .then(next);
    }
    return next();
  }

  // --------------------------------------------------------------------- //
  // Formatação pt-BR
  // --------------------------------------------------------------------- //

  function nf(casas) {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: casas, maximumFractionDigits: casas
    });
  }
  var NF0 = nf(0), NF1 = nf(1), NF2 = nf(2);

  function fmtPct(dec, casas) {
    if (typeof dec !== 'number' || !isFinite(dec)) return '—';
    var f = (casas === 2) ? NF2 : NF1;
    return f.format(dec * 100) + '%';
  }

  function fmtPctAssinado(dec, casas) {
    if (typeof dec !== 'number' || !isFinite(dec)) return '—';
    return (dec > 0 ? '+' : '') + fmtPct(dec, casas);
  }

  function fmtNum(n, casas) {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    return (casas === 1 ? NF1 : NF2).format(n);
  }

  function fmtPP(pp, casas) {
    if (typeof pp !== 'number' || !isFinite(pp)) return '—';
    return (pp > 0 ? '+' : '') + (casas === 2 ? NF2 : NF1).format(pp) + ' p.p.';
  }

  function fmtReais(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    return 'R$ ' + NF0.format(v);
  }

  function fmtReaisCurto(v) {
    if (typeof v !== 'number' || !isFinite(v)) return '—';
    var abs = Math.abs(v);
    if (abs >= 1000000) return 'R$ ' + NF1.format(v / 1000000) + 'M';
    if (abs >= 1000) {
      var k = v / 1000;
      if (Math.abs(k) >= 100) return 'R$ ' + NF0.format(k) + 'k';
      return 'R$ ' + NF1.format(k) + 'k';
    }
    return 'R$ ' + NF0.format(v);
  }

  function fmtData(iso) {
    if (!iso || typeof iso !== 'string') return '—';
    var p = iso.split('-');
    if (p.length < 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // --------------------------------------------------------------------- //
  // Helpers de carteira
  // --------------------------------------------------------------------- //

  function montarPesos(pctMap, etfs) {
    var pesos = {};
    var mantidos = [];
    var descartados = [];
    var total = 0;

    for (var ticker in pctMap) {
      if (!pctMap.hasOwnProperty(ticker)) continue;
      var pct = pctMap[ticker];
      if (typeof pct !== 'number' || pct <= 0) continue;
      if (etfs && etfs[ticker] && etfs[ticker].length) {
        mantidos.push(ticker);
        total += pct;
      } else {
        descartados.push(ticker);
      }
    }
    if (total > 0) {
      for (var i = 0; i < mantidos.length; i++) {
        pesos[mantidos[i]] = pctMap[mantidos[i]] / total;
      }
    }
    return { pesos: pesos, mantidos: mantidos, descartados: descartados, total: total };
  }

  function montagemParaMapa(montagem) {
    var mapa = {};
    if (!montagem || !montagem.length) return mapa;
    for (var i = 0; i < montagem.length; i++) {
      var item = montagem[i];
      if (item && item.ticker) {
        mapa[item.ticker] = (mapa[item.ticker] || 0) + (Number(item.pct) || 0);
      }
    }
    return mapa;
  }

  /**
   * Período comum mais amplo entre as séries dos tickers mantidos:
   * início = a MAIOR primeira data; fim = a MENOR última data.
   * Também devolve qual ativo define cada ponta (ativo limitante).
   */
  function periodoComum(mantidos, etfs) {
    var inicio = '', fim = '', limitanteInicio = null, limitanteFim = null;
    for (var i = 0; i < mantidos.length; i++) {
      var serie = etfs[mantidos[i]];
      if (!serie || !serie.length) continue;
      var primeira = serie[0].data;
      var ultima = serie[serie.length - 1].data;
      if (inicio === '' || primeira > inicio) { inicio = primeira; limitanteInicio = mantidos[i]; }
      if (fim === '' || ultima < fim) { fim = ultima; limitanteFim = mantidos[i]; }
    }
    return {
      dataInicio: inicio, dataFim: fim,
      limitanteInicio: limitanteInicio, limitanteFim: limitanteFim
    };
  }

  /**
   * CALCULOS-06 — janela única: interseção do período comum do aluno com o do
   * gabarito. Os dois backtests rodam exatamente no mesmo dataInicio/dataFim,
   * senão a comparação mistura períodos diferentes.
   */
  function interseccao(a, b) {
    if (!a || !a.dataInicio) return b || null;
    if (!b || !b.dataInicio) return a || null;
    var inicio = a.dataInicio > b.dataInicio ? a.dataInicio : b.dataInicio;
    var fim = a.dataFim < b.dataFim ? a.dataFim : b.dataFim;
    var limIni = a.dataInicio > b.dataInicio ? a.limitanteInicio : b.limitanteInicio;
    var limFim = a.dataFim < b.dataFim ? a.limitanteFim : b.limitanteFim;
    return { dataInicio: inicio, dataFim: fim, limitanteInicio: limIni, limitanteFim: limFim };
  }

  // Recorta a janela pelo seletor Máx | 5A | 3A | 12M (fim fixo, início recuado).
  function aplicarJanela(periodo, janela) {
    if (!periodo || !periodo.dataFim || janela === 'max') return periodo;
    var meses = janela === '5a' ? 60 : janela === '3a' ? 36 : janela === '12m' ? 12 : 0;
    if (!meses) return periodo;
    var p = periodo.dataFim.split('-');
    var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
    d.setUTCMonth(d.getUTCMonth() - meses);
    var iso = d.toISOString().slice(0, 10);
    var inicio = iso > periodo.dataInicio ? iso : periodo.dataInicio;
    return {
      dataInicio: inicio, dataFim: periodo.dataFim,
      limitanteInicio: periodo.limitanteInicio, limitanteFim: periodo.limitanteFim,
      recortada: inicio !== periodo.dataInicio
    };
  }

  function subDados(mantidos, etfs) {
    var sub = {};
    for (var i = 0; i < mantidos.length; i++) sub[mantidos[i]] = etfs[mantidos[i]];
    return sub;
  }

  /** Roda um backtest a partir de um mapa de pcts (0-100) na janela dada. */
  function rodarBacktest(pctMap, etfs, periodo) {
    var info = montarPesos(pctMap, etfs);
    if (info.mantidos.length < 2 || info.total <= 0) return null;
    try {
      return Backtest.rodar(configBacktest(info, etfs, periodo));
    } catch (e) {
      return null;
    }
  }

  function configBacktest(info, etfs, periodo) {
    return {
      dados: subDados(info.mantidos, etfs),
      cdi: window.DADOS.cdi,
      ibov: window.DADOS.ibov,
      ipca: window.DADOS.ipca,
      pesos: info.pesos,
      valorInicial: PREMISSAS.valorInicial,
      aporteMensal: PREMISSAS.aporteMensal,
      rebalanceamento: PREMISSAS.rebalanceamento,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim
    };
  }

  // --------------------------------------------------------------------- //
  // HISTORICO-05/06 — alinhamento por data e downsample min-max
  // --------------------------------------------------------------------- //

  /** Constrói um array alinhado a datasBase a partir de (datas, valores). */
  function alinharPorData(datasBase, datas, valores) {
    if (!datasBase || !datas || !valores) return null;
    var mapa = {};
    for (var i = 0; i < datas.length && i < valores.length; i++) {
      mapa[datas[i]] = valores[i];
    }
    var out = [];
    for (var j = 0; j < datasBase.length; j++) {
      var v = mapa[datasBase[j]];
      out.push(typeof v === 'number' && isFinite(v) ? v : null);
    }
    return out;
  }

  /**
   * Escolhe índices preservando o mínimo e o máximo de cada bucket, de forma
   * que fundos de drawdown e topos não somem (a amostragem por índice antiga
   * escondia justamente o fundo).
   */
  function indicesMinMax(valores, maxPts, extras) {
    var n = valores ? valores.length : 0;
    var out = [];
    var i;
    if (!n) return out;
    if (n <= maxPts) {
      for (i = 0; i < n; i++) out.push(i);
      return out;
    }
    var buckets = Math.max(1, Math.floor(maxPts / 2));
    var passo = n / buckets;
    var marcados = {};
    for (var b = 0; b < buckets; b++) {
      var ini = Math.floor(b * passo);
      var fim = Math.min(n, Math.floor((b + 1) * passo));
      if (fim <= ini) continue;
      var iMin = -1, iMax = -1;
      for (i = ini; i < fim; i++) {
        var v = valores[i];
        if (v == null || !isFinite(v)) continue;
        if (iMin === -1 || v < valores[iMin]) iMin = i;
        if (iMax === -1 || v > valores[iMax]) iMax = i;
      }
      if (iMin === -1) { marcados[ini] = true; continue; }
      marcados[Math.min(iMin, iMax)] = true;
      marcados[Math.max(iMin, iMax)] = true;
    }
    marcados[0] = true;
    marcados[n - 1] = true;
    if (extras) {
      for (i = 0; i < extras.length; i++) {
        if (typeof extras[i] === 'number' && extras[i] >= 0 && extras[i] < n) marcados[extras[i]] = true;
      }
    }
    var chaves = Object.keys(marcados);
    for (i = 0; i < chaves.length; i++) out.push(Number(chaves[i]));
    out.sort(function (x, y) { return x - y; });
    return out;
  }

  function porIndices(arr, indices) {
    var out = [];
    if (!arr) return out;
    for (var i = 0; i < indices.length; i++) {
      var v = arr[indices[i]];
      out.push(typeof v === 'number' && isFinite(v) ? v : null);
    }
    return out;
  }

  /** Pico e fundo do maior drawdown, em índices da série original. */
  function picoEFundo(drawdown) {
    if (!drawdown || !drawdown.length) return { pico: null, fundo: null };
    var fundo = -1, menor = 0;
    for (var i = 0; i < drawdown.length; i++) {
      var v = drawdown[i];
      if (typeof v !== 'number' || !isFinite(v)) continue;
      if (v < menor) { menor = v; fundo = i; }
    }
    if (fundo === -1) return { pico: null, fundo: null };
    var pico = fundo;
    for (var j = fundo; j >= 0; j--) {
      if (drawdown[j] == null) continue;
      if (drawdown[j] >= -1e-9) { pico = j; break; }
      pico = j;
    }
    return { pico: pico, fundo: fundo };
  }

  // --------------------------------------------------------------------- //
  // HISTORICO-11/12 — explicações e semáforo por métrica (tabela única)
  // --------------------------------------------------------------------- //

  // Limite de drawdown tolerável por perfil do case (fração negativa).
  var DD_POR_PERFIL = { conservador: -0.08, moderado: -0.15, arrojado: -0.25 };

  function limiteDD(perfil) {
    var p = (perfil || '').toLowerCase();
    if (DD_POR_PERFIL.hasOwnProperty(p)) return DD_POR_PERFIL[p];
    return DD_POR_PERFIL.moderado;
  }

  /**
   * Tabela única de semáforo. Devolve 'ok' | 'warn' | 'bad' | null.
   * null quando a métrica não tem régua ou o valor não existe (mostra '—').
   */
  function semaforo(chave, valor, perfil) {
    if (typeof valor !== 'number' || !isFinite(valor)) return null;
    switch (chave) {
      case 'percentualCDI':
        return valor >= 100 ? 'ok' : valor >= 80 ? 'warn' : 'bad';
      case 'sharpe':
        return valor >= 0.5 ? 'ok' : valor >= 0 ? 'warn' : 'bad';
      case 'sortino':
        // Régua própria: Sortino só pune a volatilidade das quedas, então a
        // faixa boa é mais alta que a do Sharpe.
        return valor >= 1 ? 'ok' : valor >= 0.3 ? 'warn' : 'bad';
      case 'drawdownMaximo': {
        var lim = limiteDD(perfil);
        if (valor >= lim) return 'ok';
        if (valor >= lim * 1.5) return 'warn';
        return 'bad';
      }
      case 'ulcerIndex':
        return valor <= 5 ? 'ok' : valor <= 10 ? 'warn' : 'bad';
      case 'retornoAnualizado':
        return valor >= 0 ? 'ok' : 'bad';
      default:
        return null; // volatilidade e beta são descritivas, não têm nota
    }
  }

  function tendencia(valor) {
    if (typeof valor !== 'number' || !isFinite(valor)) return 'flat';
    if (valor > 0) return 'up';
    if (valor < 0) return 'down';
    return 'flat';
  }

  // --------------------------------------------------------------------- //
  // Blocos de HTML
  // --------------------------------------------------------------------- //

  function htmlMetric(m) {
    var attrs = ' class="metric"';
    if (m.estado) attrs += ' data-estado="' + m.estado + '"';
    if (m.trend) attrs += ' data-trend="' + m.trend + '"';
    var ctx = '<div class="metric__ctx">' + escapeHtml(m.ctx);
    if (m.faixa) {
      ctx += ' <span class="metric__faixa">Referência: ' + escapeHtml(m.faixa) + '</span>';
    }
    ctx += '</div>';
    return '<div' + attrs + '>' +
      '<div class="metric__label">' + escapeHtml(m.label) + '</div>' +
      '<div class="metric__value">' + escapeHtml(m.valor) + '</div>' +
      ctx +
      '</div>';
  }

  function htmlPremissas() {
    var h = '<div class="bt-premissas">';
    h += '<div class="bt-premissas__campo">' +
      '<label for="bt-valor-inicial">Valor inicial</label>' +
      '<input type="number" id="bt-valor-inicial" min="0" step="1000" value="' +
      PREMISSAS.valorInicial + '"></div>';
    h += '<div class="bt-premissas__campo">' +
      '<label for="bt-aporte-mensal">Aporte mensal</label>' +
      '<input type="number" id="bt-aporte-mensal" min="0" step="100" value="' +
      PREMISSAS.aporteMensal + '"></div>';

    h += '<div class="bt-premissas__campo"><label for="bt-rebal">Rebalanceamento</label>' +
      '<select id="bt-rebal">';
    for (var i = 0; i < REBAL_OPCOES.length; i++) {
      var o = REBAL_OPCOES[i];
      h += '<option value="' + o.valor + '"' +
        (Number(PREMISSAS.rebalanceamento) === o.valor ? ' selected' : '') + '>' +
        o.rotulo + '</option>';
    }
    h += '</select></div>';

    h += '<div class="bt-premissas__campo"><label for="bt-janela">Janela</label>' +
      '<select id="bt-janela">';
    for (var j = 0; j < JANELA_OPCOES.length; j++) {
      var w = JANELA_OPCOES[j];
      h += '<option value="' + w.valor + '"' +
        (PREMISSAS.janela === w.valor ? ' selected' : '') + '>' + w.rotulo + '</option>';
    }
    h += '</select></div>';
    h += '</div>';
    return h;
  }

  /** HISTORICO-02 + CALCULOS-18 — cobertura de dados antes do resultado. */
  function htmlCobertura(info, etfs, diag, periodo) {
    var d = diag || {};
    var primeiraPorAtivo = d.primeiraDataPorAtivo || {};
    var limitante = d.ativoLimitante || periodo.limitanteInicio || null;

    var h = '<div class="bt-cobertura">';
    h += '<div class="bt-cobertura__titulo">Cobertura de dados</div>';
    h += '<ul class="bt-cobertura__lista">';
    for (var i = 0; i < info.mantidos.length; i++) {
      var tk = info.mantidos[i];
      var serie = etfs[tk] || [];
      var ini = primeiraPorAtivo[tk] || (serie.length ? serie[0].data : null);
      var fim = serie.length ? serie[serie.length - 1].data : null;
      var eLim = (tk === limitante);
      h += '<li class="bt-cobertura__item"' + (eLim ? ' data-limitante="true"' : '') + '>' +
        '<span class="bt-cobertura__ticker">' + escapeHtml(tk) + '</span>' +
        '<span class="bt-cobertura__intervalo">' + fmtData(ini) + ' a ' + fmtData(fim) + '</span>' +
        (eLim ? '<span class="chip chip--ghost">limita a janela</span>' : '') +
        '</li>';
    }
    h += '</ul>';

    if (info.descartados.length) {
      h += '<p class="bt-cobertura__nota">Sem série histórica, fora do backtest: ' +
        escapeHtml(info.descartados.join(', ')) + '.</p>';
    }

    var pInf = d.pesoInformado, pUso = d.pesoUtilizado;
    if (typeof pInf === 'number' && typeof pUso === 'number' && Math.abs(pInf - pUso) > 1e-6) {
      h += '<p class="bt-cobertura__nota">Peso informado ' + fmtPct(pInf, 1) +
        ' e peso efetivamente utilizado ' + fmtPct(pUso, 1) +
        ' — a diferença foi renormalizada entre os ativos com dados.</p>';
    }

    var corte = d.dataCorteDados || periodo.dataFim;
    var versao = d.motorVersion || (typeof Metricas !== 'undefined' && Metricas.MOTOR_VERSION) || null;
    h += '<div class="bt-cobertura__chips">' +
      '<span class="chip">Dados até ' + fmtData(corte) +
      (versao ? ' · motor v' + escapeHtml(versao) : '') + '</span>' +
      '<span class="chip">Janela ' + fmtData(periodo.dataInicio) + ' a ' + fmtData(periodo.dataFim) + '</span>' +
      '</div>';
    h += '</div>';
    return h;
  }

  /** HISTORICO-14 + CALCULOS-17 — hero em dinheiro. */
  function htmlHero(resumo) {
    var vi = resumo.valorInicial, vf = resumo.valorFinal;
    var ret = resumo.retornoAcumulado;
    var pctCDI = resumo.percentualCDI;

    var titulo = (typeof resumo.retornoAnualizado === 'number' && isFinite(resumo.retornoAnualizado))
      ? 'Resultado da carteira no período'
      : 'Retorno do período (' + NF0.format(Math.max(1, Math.round((resumo.diasCorridos || 0) / 30.44))) + ' meses)';

    // Com aportes, o que "virou" o valor final é o total aportado, não só o
    // valor inicial — dizer 80 mil viraram 156 mil escondendo 40 mil de aporte
    // seria mentira de vitrine.
    var total = resumo.totalAportado;
    var comAporte = (typeof total === 'number' && typeof vi === 'number' && total > vi + 1);
    var frase = '—';
    if (typeof vf === 'number') {
      if (comAporte) frase = fmtReais(total) + ' aportados viraram ' + fmtReais(vf);
      else if (typeof vi === 'number') frase = fmtReais(vi) + ' viraram ' + fmtReais(vf);
    }

    var sub;
    if (typeof pctCDI === 'number' && isFinite(pctCDI)) {
      sub = fmtPctAssinado(ret, 1) + ' · ' + fmtNum(pctCDI, 1) + '% do CDI';
    } else {
      // CALCULOS-17 — %CDI não faz sentido em carteira perdedora ou CDI ≤ 0.
      var retCDI = resumo.retornoCDI;
      var difPP = (typeof ret === 'number' && typeof retCDI === 'number')
        ? (ret - retCDI) * 100 : null;
      sub = 'Carteira ' + fmtPctAssinado(ret, 1) +
        ' · CDI ' + fmtPctAssinado(retCDI, 1) +
        ' · diferença ' + fmtPP(difPP, 1);
    }

    return '<div class="bt-hero">' +
      '<div class="bt-hero__label">' + escapeHtml(titulo) + '</div>' +
      '<div class="bt-hero__valor">' + escapeHtml(frase) + '</div>' +
      '<div class="bt-hero__ctx">' + escapeHtml(sub) + '</div>' +
      '</div>';
  }

  /** Rótulo do perfil usado na régua de drawdown (o do case, ou o padrão). */
  function rotuloPerfilDD(perfil) {
    var p = (perfil || '').toLowerCase();
    return DD_POR_PERFIL.hasOwnProperty(p) ? p : 'moderado';
  }

  function htmlMetricas(resumo, perfil) {
    var lim = limiteDD(perfil);
    var anualOk = (typeof resumo.retornoAnualizado === 'number' && isFinite(resumo.retornoAnualizado));

    // Janela abaixo de um ano: o motor não anualiza (e anualizar seria inventar).
    // Em vez de mostrar um traço, o card assume o retorno do período.
    var cardRetorno = anualOk ? {
      label: 'Retorno anualizado', valor: fmtPct(resumo.retornoAnualizado, 1),
      ctx: 'Quanto a carteira rendeu por ano, em média composta.',
      faixa: 'acima de zero a carteira ganhou dinheiro; abaixo, perdeu.',
      estado: semaforo('retornoAnualizado', resumo.retornoAnualizado, perfil),
      trend: tendencia(resumo.retornoAnualizado)
    } : {
      label: 'Retorno do período', valor: fmtPctAssinado(resumo.retornoAcumulado, 1),
      ctx: 'A janela tem menos de um ano (' + NF0.format(resumo.diasUteis || 0) +
        ' pregões), então não dá para anualizar sem inventar. Este é o retorno cheio do período.',
      estado: semaforo('retornoAnualizado', resumo.retornoAcumulado, perfil),
      trend: tendencia(resumo.retornoAcumulado)
    };

    // % do CDI só existe quando carteira e CDI renderam positivo no período.
    // Sem isso, a comparação honesta é a diferença em pontos percentuais.
    var pctCDI = resumo.percentualCDI;
    var temPctCDI = (typeof pctCDI === 'number' && isFinite(pctCDI));
    var difCDI = (typeof resumo.retornoAcumulado === 'number' && typeof resumo.retornoCDI === 'number')
      ? (resumo.retornoAcumulado - resumo.retornoCDI) * 100 : null;
    var cardCDI = temPctCDI ? {
      label: '% do CDI', valor: fmtNum(pctCDI, 1) + '%',
      ctx: 'Quanto do rendimento do CDI a carteira entregou.',
      faixa: 'acima de 100% ganha do CDI; de 80% a 100% empata; abaixo de 80% perde para a renda fixa básica.',
      estado: semaforo('percentualCDI', pctCDI, perfil)
    } : {
      label: 'Carteira vs CDI', valor: fmtPP(difCDI, 1),
      ctx: 'Nesta janela a razão carteira/CDI não faz sentido (carteira ou CDI sem retorno positivo), ' +
        'então a comparação é a diferença direta: carteira ' + fmtPctAssinado(resumo.retornoAcumulado, 1) +
        ' contra CDI ' + fmtPctAssinado(resumo.retornoCDI, 1) + '.',
      faixa: 'acima de zero p.p. a carteira ficou à frente do CDI no período.',
      estado: (typeof difCDI === 'number') ? (difCDI >= 0 ? 'ok' : 'bad') : null,
      trend: tendencia(difCDI)
    };

    var lista = [
      cardRetorno,
      cardCDI,
      {
        label: 'Volatilidade', valor: fmtPct(resumo.volatilidade, 1),
        ctx: 'O tamanho médio do sobe e desce em um ano. Quanto maior, mais o extrato balança.',
        faixa: 'não tem nota isolada — o que é oscilação demais depende do perfil e do prazo do cliente.'
      },
      {
        label: 'Sharpe', valor: fmtNum(resumo.sharpe, 2),
        ctx: 'Quanto de retorno acima do CDI a carteira entregou por unidade de balanço.',
        faixa: 'a partir de 0,50 é bom; de 0,00 a 0,50 é fraco; negativo significa balançar sem ganhar do CDI.',
        estado: semaforo('sharpe', resumo.sharpe, perfil)
      },
      {
        label: 'Drawdown máximo', valor: fmtPct(resumo.drawdownMaximo, 1),
        ctx: 'A maior queda do topo ao fundo. É o susto que o cliente teria vivido.',
        faixa: 'no perfil ' + rotuloPerfilDD(perfil) + ', até ' + fmtPct(lim, 0) +
          ' é tolerável; abaixo de ' + fmtPct(lim * 1.5, 0) + ' é queda difícil de segurar.',
        estado: semaforo('drawdownMaximo', resumo.drawdownMaximo, perfil)
      },
      {
        label: 'Beta (vs Ibovespa)', valor: fmtNum(resumo.beta, 2),
        ctx: 'Sensibilidade à bolsa brasileira.',
        faixa: '1,00 anda junto com o Ibovespa; 0,50 sente metade; perto de zero quase não depende da bolsa.'
      },
      {
        label: 'Sortino', valor: fmtNum(resumo.sortino, 2),
        ctx: 'Como o Sharpe, mas só penaliza a oscilação das quedas — ignora as altas.',
        faixa: 'a partir de 1,00 é bom; de 0,30 a 1,00 é mediano; abaixo disso as quedas não foram pagas.',
        estado: semaforo('sortino', resumo.sortino, perfil)
      },
      {
        label: 'Ulcer Index', valor: fmtNum(resumo.ulcerIndex, 2),
        ctx: 'Profundidade somada à duração das quedas. Quanto menor, menos tempo no vermelho.',
        faixa: 'até 5 é tranquilo; de 5 a 10 incomoda; acima de 10 é muito tempo abaixo do topo.',
        estado: semaforo('ulcerIndex', resumo.ulcerIndex, perfil)
      }
    ];
    var h = '<div class="bt-metrics">';
    for (var i = 0; i < lista.length; i++) h += htmlMetric(lista[i]);
    h += '</div>';
    return h;
  }

  /** CALCULOS-01 — come-cotas pelo motor, com o regime inferido da carteira. */
  function inferirRegime(pesos) {
    var pesoRV = 0, total = 0;
    var temCatalogo = (window.Catalogo && typeof window.Catalogo.classeDe === 'function');
    for (var tk in pesos) {
      if (!pesos.hasOwnProperty(tk)) continue;
      var p = pesos[tk];
      total += p;
      if (!temCatalogo) continue;
      var classe = '';
      try { classe = window.Catalogo.classeDe(tk) || ''; } catch (e) { classe = ''; }
      if (/^Ações|^FIIs|^Dividendos|^Mid\/Small|^Setorial|^BDRs|^Cripto/.test(classe)) pesoRV += p;
    }
    if (!temCatalogo || total <= 0) return 'rf_longo';
    return (pesoRV / total) > 0.60 ? 'acoes' : 'rf_longo';
  }

  function htmlComeCotas(res, regime) {
    if (typeof Metricas === 'undefined' || typeof Metricas.comeCotas !== 'function') return '';
    var cc;
    try {
      cc = Metricas.comeCotas(res.retornosCarteira, res.curvas.datas, regime);
    } catch (e) {
      return '';
    }
    if (!cc) return '';

    var h = '<div class="bt-notes bt-notes--comecotas">' +
      '<div class="bt-notes__titulo">ETF contra fundo: o come-cotas</div>';

    if (!cc.aplicavel) {
      h += '<p>Mais de 60% desta carteira está em renda variável. Um fundo de ações ' +
        'não tem come-cotas — o imposto de 15% só aparece no resgate. A vantagem do ' +
        'ETF aqui é custo e liquidez, não o diferimento semestral.</p>';
    } else {
      h += '<p>Se esta carteira fosse um fundo de investimento em vez de ETFs, o ' +
        'come-cotas teria consumido <strong>' + escapeHtml(fmtNum(cc.perdaPP, 2)) +
        ' p.p.</strong> do retorno no período (' +
        NF0.format(cc.eventos ? cc.eventos.length : 0) + ' cobranças semestrais). ' +
        'Retorno bruto ' + escapeHtml(fmtPct(cc.retornoBruto, 1)) +
        ' contra ' + escapeHtml(fmtPct(cc.retornoLiquido, 1)) + ' líquido de come-cotas.</p>';
    }
    h += '</div>';
    return h;
  }

  function htmlVeredito(resumo, resGab, periodo, perfil) {
    var poucosDias = (resumo.diasUteis || 0) < 252;
    var classe = 'bt-verdict';
    var h = '<div class="' + classe + '"' + (poucosDias ? ' data-estado="warn"' : '') + '>';
    h += '<div class="bt-verdict__titulo">Veredito</div>';

    if (poucosDias) {
      // CALCULOS-06 — janela curta demais para conclusão: avisar, não julgar.
      var lim = periodo.limitanteInicio || (resumo.diagnostico && resumo.diagnostico.ativoLimitante);
      h += '<p>A janela comum entre a carteira e o gabarito tem apenas ' +
        NF0.format(resumo.diasUteis || 0) + ' pregões — menos de um ano. ' +
        (lim ? 'O ativo que limita o histórico é <strong>' + escapeHtml(lim) + '</strong>. ' : '') +
        'Com esse histórico não dá para concluir nada sobre retorno ou risco: ' +
        'trate os números abaixo como ilustração, não como avaliação.</p>';
      h += '</div>';
      return h;
    }

    var pct = resumo.percentualCDI;
    var estadoCDI = semaforo('percentualCDI', pct, perfil);
    var frase = (estadoCDI === 'ok') ? 'A carteira superou o CDI no período.'
      : (estadoCDI === 'warn') ? 'A carteira ficou perto do CDI no período.'
      : (estadoCDI === 'bad') ? 'A carteira ficou abaixo do CDI no período.'
      : 'Não dá para comparar com o CDI nesta janela (carteira ou CDI sem retorno positivo).';

    h += '<p>' + escapeHtml(frase) + '</p>';

    if (resGab && resGab.resumo) {
      var difPP = (resumo.retornoAcumulado - resGab.resumo.retornoAcumulado) * 100;
      h += '<div class="bt-verdict__comparativo">' +
        '<div class="metric"><div class="metric__label">Sua carteira</div>' +
        '<div class="metric__value">' + escapeHtml(fmtPctAssinado(resumo.retornoAcumulado, 1)) + '</div>' +
        '<div class="metric__ctx">' + escapeHtml(fmtReais(resumo.valorFinal)) + '</div></div>' +
        '<div class="metric"><div class="metric__label">Gabarito</div>' +
        '<div class="metric__value">' + escapeHtml(fmtPctAssinado(resGab.resumo.retornoAcumulado, 1)) + '</div>' +
        '<div class="metric__ctx">' + escapeHtml(fmtReais(resGab.resumo.valorFinal)) + '</div></div>' +
        '<div class="metric" data-trend="' + tendencia(difPP) + '">' +
        '<div class="metric__label">Diferença</div>' +
        '<div class="metric__value">' + escapeHtml(fmtPP(difPP, 1)) + '</div>' +
        '<div class="metric__ctx">Mesma janela para as duas carteiras.</div></div>' +
        '</div>';
    }
    h += '</div>';
    return h;
  }

  function htmlAbas() {
    function botao(id, rotulo) {
      var ativo = (abaAtiva === id);
      return '<button type="button" role="tab" class="chip" data-aba="' + id + '"' +
        ' id="bt-tab-' + id + '" aria-controls="bt-painel-' + id + '"' +
        ' aria-selected="' + (ativo ? 'true' : 'false') + '">' + rotulo + '</button>';
    }
    return '<div class="bt-tabs" role="tablist">' +
      botao('patrimonio', 'Patrimônio') +
      botao('drawdown', 'Drawdown') +
      botao('correlacao', 'Correlação') +
      '</div>';
  }

  function htmlPaineisGrafico(res) {
    function painel(id, conteudo) {
      var oculto = (abaAtiva === id) ? '' : ' hidden';
      return '<div class="bt-chart" role="tabpanel" id="bt-painel-' + id +
        '" aria-labelledby="bt-tab-' + id + '"' + oculto + '>' + conteudo + '</div>';
    }
    var h = '';
    h += painel('patrimonio',
      '<canvas id="chart-backtest-real"></canvas>' +
      '<p class="bt-chart__nota">Séries alinhadas por data. Os pontos marcados na linha da ' +
      'carteira são o topo e o fundo da maior queda do período.</p>');
    h += painel('drawdown',
      '<canvas id="chart-backtest-drawdown"></canvas>' +
      '<p class="bt-chart__nota">Distância do patrimônio até o topo anterior, dia a dia. ' +
      'Zero significa estar no topo histórico.</p>');
    h += painel('correlacao', htmlCorrelacao(res));
    return h;
  }

  function htmlCorrelacao(res) {
    var c = res && res.correlacao;
    if (!c || !c.labels || !c.labels.length || !c.matrix) {
      return '<p class="empty-state">Correlação indisponível para esta carteira.</p>';
    }
    var h = '<div class="bt-corr">' +
      '<table class="bt-corr__tabela"><thead><tr><th scope="col"></th>';
    var i, j;
    for (i = 0; i < c.labels.length; i++) {
      h += '<th scope="col">' + escapeHtml(c.labels[i]) + '</th>';
    }
    h += '</tr></thead><tbody>';
    for (i = 0; i < c.labels.length; i++) {
      h += '<tr><th scope="row">' + escapeHtml(c.labels[i]) + '</th>';
      for (j = 0; j < c.labels.length; j++) {
        var v = c.matrix[i] ? c.matrix[i][j] : null;
        var faixa = null;
        if (typeof v === 'number' && isFinite(v)) {
          var a = Math.abs(v);
          faixa = a < 0.3 ? 'baixa' : a <= 0.7 ? 'media' : 'alta';
        }
        h += '<td' + (faixa ? ' data-faixa="' + faixa + '"' : '') + '>' +
          (typeof v === 'number' && isFinite(v) ? escapeHtml(fmtNum(v, 2)) : '—') + '</td>';
      }
      h += '</tr>';
    }
    h += '</tbody></table>' +
      '<p class="bt-chart__nota">Abaixo de 0,30 os ativos se protegem entre si; ' +
      'de 0,30 a 0,70 andam parecido; acima de 0,70 é a mesma aposta com dois nomes.</p>' +
      '</div>';
    return h;
  }

  function htmlNotasFinais(resumo) {
    var h = '<div class="bt-notes">';
    h += '<label class="bt-notes__toggle" for="toggle-ipca">' +
      '<input type="checkbox" id="toggle-ipca"> Descontar a inflação (IPCA)</label>' +
      '<div id="retorno-real-info" class="bt-notes__real" hidden></div>';
    var rot = REBAL_OPCOES.filter(function (o) { return o.valor === Number(PREMISSAS.rebalanceamento); });
    h += '<p class="bt-attr">Rebalanceamento: ' +
      escapeHtml(rot.length ? rot[0].rotulo.toLowerCase() : 'nunca') +
      '. Aporte mensal: ' + escapeHtml(fmtReais(PREMISSAS.aporteMensal)) +
      '. Total aportado no período: ' + escapeHtml(fmtReais(resumo.totalAportado)) +
      '. Sem custos, sem imposto e sem spread de corretagem — é o teto teórico.</p>';
    h += '</div>';
    return h;
  }

  // --------------------------------------------------------------------- //
  // Render de mensagem amigável no painel
  // --------------------------------------------------------------------- //

  function destruirGraficos() {
    if (chartPatrimonio) { try { chartPatrimonio.destroy(); } catch (e) {} chartPatrimonio = null; }
    if (chartDrawdown) { try { chartDrawdown.destroy(); } catch (e) {} chartDrawdown = null; }
  }

  function mensagem(texto) {
    var alvo = document.getElementById('backtest-real-conteudo');
    if (!alvo) return;
    destruirGraficos();
    alvo.innerHTML = '<div class="bt"><p class="empty-state">' + escapeHtml(texto) + '</p></div>';
  }

  // --------------------------------------------------------------------- //
  // Render principal
  // --------------------------------------------------------------------- //

  function valorInicialSugerido(caseObj) {
    var el = document.getElementById('aporte');
    var v = el ? Number(el.value) : NaN;
    if (isFinite(v) && v > 0) return v;
    if (caseObj && isFinite(Number(caseObj.aporte_sugerido)) && Number(caseObj.aporte_sugerido) > 0) {
      return Number(caseObj.aporte_sugerido);
    }
    return 100000;
  }

  function render(montagem, caseObj) {
    var alvo = document.getElementById('backtest-real-conteudo');
    if (!alvo) return;

    ctxAtual.montagem = montagem;
    ctxAtual.caseObj = caseObj;

    if (!window.DADOS || !window.DADOS.etfs || typeof Backtest === 'undefined') {
      mensagem('Backtest histórico indisponível: motor ou dados não carregados.');
      return;
    }
    sincronizarCase(caseObj);
    if (!premissasTocadas) PREMISSAS.valorInicial = valorInicialSugerido(caseObj);

    var etfs = construirUniverso();
    var pctMap = montagemParaMapa(montagem);
    var info = montarPesos(pctMap, etfs);

    // Busca única dos tickers desconhecidos no proxy.
    if (info.descartados.length > 0 && PROXY_URL && !fetchEmAndamento) {
      fetchEmAndamento = true;
      alvo.innerHTML = '<div class="bt"><p class="empty-state">Buscando dados de ' +
        escapeHtml(info.descartados.join(', ')) + '.</p></div>';
      buscarFaltantes(info.descartados).then(function () {
        fetchEmAndamento = false;
        render(montagem, caseObj);
      });
      return;
    }
    fetchEmAndamento = false;

    if (info.mantidos.length < 2 || info.total <= 0) {
      var falta = info.descartados.length
        ? ' Ativos sem dados: ' + info.descartados.join(', ') + '.'
        : '';
      mensagem('Backtest histórico indisponível: a carteira precisa de ao menos 2 ativos com histórico (B3, offshore ou fundos).' + falta);
      return;
    }

    // CALCULOS-06 — janela única: interseção aluno ∩ gabarito, depois o recorte
    // escolhido nas premissas. Os dois backtests usam exatamente essas datas.
    var periodoAluno = periodoComum(info.mantidos, etfs);
    var infoGab = null, periodoGab = null;
    if (caseObj && caseObj.gabarito) {
      infoGab = montarPesos(caseObj.gabarito, etfs);
      if (infoGab.mantidos.length >= 2 && infoGab.total > 0) {
        periodoGab = periodoComum(infoGab.mantidos, etfs);
      } else {
        infoGab = null;
      }
    }
    var periodo = aplicarJanela(interseccao(periodoAluno, periodoGab), PREMISSAS.janela);

    if (!periodo || !periodo.dataInicio || !periodo.dataFim || periodo.dataInicio >= periodo.dataFim) {
      mensagem('Backtest histórico indisponível: não há período comum entre os ativos da carteira e os do gabarito.');
      return;
    }

    var res;
    try {
      res = Backtest.rodar(configBacktest(info, etfs, periodo));
    } catch (e) {
      mensagem('Backtest histórico indisponível: ' + (e && e.message ? e.message : 'erro ao processar a carteira') + '.');
      return;
    }

    var resGab = infoGab ? rodarBacktest(caseObj.gabarito, etfs, periodo) : null;
    ultimoGabarito = resGab;

    // Estado compartilhado (com o global legado mantido por compatibilidade).
    window._lastBacktestResult = res;
    if (window.Estado && typeof window.Estado.setBacktest === 'function') {
      try { window.Estado.setBacktest(res); } catch (e2) {}
    }

    var resumo = res.resumo;
    var perfil = caseObj && caseObj.perfil;
    var regime = inferirRegime(info.pesos);

    var html = '<div class="bt">';
    html += htmlPremissas();
    html += htmlCobertura(info, etfs, resumo.diagnostico, periodo);
    html += htmlHero(resumo);
    html += htmlMetricas(resumo, perfil);
    html += htmlAbas();
    html += htmlPaineisGrafico(res);
    html += htmlVeredito(resumo, resGab, periodo, perfil);
    html += htmlComeCotas(res, regime);
    html += htmlNotasFinais(resumo);
    html += '</div>';

    destruirGraficos();
    alvo.innerHTML = html;

    ligarPremissas(alvo);
    ligarAbas(alvo, res);
    ligarIpca(alvo);

    if (abaAtiva === 'patrimonio') desenharPatrimonio(res, resGab);
    if (abaAtiva === 'drawdown') desenharDrawdown(res);
  }

  // --------------------------------------------------------------------- //
  // Ligações de eventos (sem handlers inline)
  // --------------------------------------------------------------------- //

  function rerender() {
    render(ctxAtual.montagem, ctxAtual.caseObj);
  }

  function ligarPremissas(raiz) {
    var vi = raiz.querySelector('#bt-valor-inicial');
    var am = raiz.querySelector('#bt-aporte-mensal');
    var rb = raiz.querySelector('#bt-rebal');
    var jn = raiz.querySelector('#bt-janela');

    if (vi) vi.addEventListener('change', function () {
      var v = Number(vi.value);
      if (isFinite(v) && v > 0) { PREMISSAS.valorInicial = v; premissasTocadas = true; rerender(); }
    });
    if (am) am.addEventListener('change', function () {
      var v = Number(am.value);
      if (isFinite(v) && v >= 0) { PREMISSAS.aporteMensal = v; premissasTocadas = true; rerender(); }
    });
    if (rb) rb.addEventListener('change', function () {
      PREMISSAS.rebalanceamento = Number(rb.value);
      premissasTocadas = true;
      rerender();
    });
    if (jn) jn.addEventListener('change', function () {
      PREMISSAS.janela = jn.value;
      premissasTocadas = true;
      rerender();
    });
  }

  function ligarAbas(raiz, res) {
    var botoes = raiz.querySelectorAll('.bt-tabs [data-aba]');
    for (var i = 0; i < botoes.length; i++) {
      botoes[i].addEventListener('click', function (ev) {
        var alvoAba = ev.currentTarget.getAttribute('data-aba');
        abaAtiva = alvoAba;
        var bts = raiz.querySelectorAll('.bt-tabs [data-aba]');
        for (var j = 0; j < bts.length; j++) {
          bts[j].setAttribute('aria-selected', bts[j].getAttribute('data-aba') === alvoAba ? 'true' : 'false');
        }
        var ids = ['patrimonio', 'drawdown', 'correlacao'];
        for (var k = 0; k < ids.length; k++) {
          var p = raiz.querySelector('#bt-painel-' + ids[k]);
          if (p) p.hidden = (ids[k] !== alvoAba);
        }
        if (alvoAba === 'patrimonio' && !chartPatrimonio) desenharPatrimonio(res, ultimoGabarito);
        if (alvoAba === 'drawdown' && !chartDrawdown) desenharDrawdown(res);
      });
    }
  }

  function ligarIpca(raiz) {
    var cb = raiz.querySelector('#toggle-ipca');
    if (cb) cb.addEventListener('change', toggleRetornoReal);
  }

  // --------------------------------------------------------------------- //
  // Gráficos (Chart.js)
  // --------------------------------------------------------------------- //

  var ultimoGabarito = null;

  function coresTema() {
    var isDark = document.body.classList.contains('dark') ||
      document.documentElement.getAttribute('data-theme') === 'dark';
    return {
      grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      tick: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.5)',
      isDark: isDark
    };
  }

  function opcoesBase(cores, formatador) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true, pointStyle: 'circle', padding: 16,
            boxWidth: 8, font: { size: 12 }, color: cores.tick
          }
        },
        tooltip: {
          backgroundColor: cores.isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.96)',
          titleColor: cores.isDark ? '#e0e0e0' : '#333',
          bodyColor: cores.isDark ? '#ccc' : '#555',
          borderColor: cores.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
          borderWidth: 1, padding: 10,
          callbacks: {
            title: function (itens) {
              return itens && itens.length ? fmtData(itens[0].label) : '';
            },
            label: function (c) {
              var v = c.parsed.y;
              if (v == null) return c.dataset.label + ': —';
              return c.dataset.label + ': ' + formatador(v);
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8, maxRotation: 0, font: { size: 10 }, color: cores.tick,
            callback: function (val, idx) {
              var l = this.getLabelForValue ? this.getLabelForValue(val) : null;
              return l ? fmtData(l) : idx;
            }
          },
          grid: { display: false }
        },
        y: {
          ticks: { font: { size: 10 }, color: cores.tick, callback: formatador },
          grid: { color: cores.grid, drawBorder: false }
        }
      }
    };
  }

  var MAX_PTS = 400;

  function desenharPatrimonio(res, resGab) {
    ultimoGabarito = resGab || null;
    if (typeof Chart === 'undefined') return;
    var canvas = document.getElementById('chart-backtest-real');
    if (!canvas || !canvas.getContext) return;
    if (chartPatrimonio) { try { chartPatrimonio.destroy(); } catch (e) {} chartPatrimonio = null; }

    var curvas = res.curvas;
    var datas = curvas.datas || [];
    var cores = coresTema();

    var pf = picoEFundo(curvas.drawdown);
    var idx = indicesMinMax(curvas.carteira, MAX_PTS, [pf.pico, pf.fundo]);
    var labels = [];
    for (var i = 0; i < idx.length; i++) labels.push(datas[idx[i]]);

    // Pico e fundo do maior drawdown marcados na linha da carteira.
    var raios = [], coresPontos = [];
    for (var p = 0; p < idx.length; p++) {
      if (idx[p] === pf.fundo) { raios.push(5); coresPontos.push('#c0392b'); }
      else if (idx[p] === pf.pico) { raios.push(4); coresPontos.push('#2d8c5c'); }
      else { raios.push(0); coresPontos.push('rgba(0,0,0,0)'); }
    }

    var datasets = [{
      label: 'Sua carteira',
      data: porIndices(curvas.carteira, idx),
      borderColor: '#0088cc',
      borderWidth: 2.5,
      pointRadius: raios,
      pointBackgroundColor: coresPontos,
      pointBorderColor: coresPontos,
      tension: 0.15,
      fill: false,
      spanGaps: true
    }];

    if (resGab && resGab.curvas && resGab.curvas.carteira) {
      // HISTORICO — gabarito plotado por DATA, não por índice.
      var gabAlinhado = alinharPorData(datas, resGab.curvas.datas, resGab.curvas.carteira);
      datasets.push({
        label: 'Gabarito',
        data: porIndices(gabAlinhado, idx),
        borderColor: '#2d8c5c',
        borderWidth: 2, pointRadius: 0, tension: 0.15, fill: false, spanGaps: true
      });
    }

    function benchmark(rotulo, serie, cor) {
      if (!serie) return;
      datasets.push({
        label: rotulo,
        data: porIndices(serie, idx),
        borderColor: cor,
        borderWidth: 1.25, borderDash: [5, 4],
        pointRadius: 0, tension: 0.15, fill: false, spanGaps: true
      });
    }
    benchmark('CDI', curvas.cdi, '#9aa3ad');
    benchmark('Ibovespa', curvas.ibov, '#e0843b');
    benchmark('IPCA + 5%', curvas.ipcaMais5, '#b0455a');

    chartPatrimonio = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: opcoesBase(cores, fmtReaisCurto)
    });
  }

  function desenharDrawdown(res) {
    if (typeof Chart === 'undefined') return;
    var canvas = document.getElementById('chart-backtest-drawdown');
    if (!canvas || !canvas.getContext) return;
    if (chartDrawdown) { try { chartDrawdown.destroy(); } catch (e) {} chartDrawdown = null; }

    var curvas = res.curvas;
    var dd = curvas.drawdown || [];
    if (!dd.length) return;

    var pf = picoEFundo(dd);
    var idx = indicesMinMax(dd, MAX_PTS, [pf.pico, pf.fundo]);
    var labels = [];
    for (var i = 0; i < idx.length; i++) labels.push((curvas.datas || [])[idx[i]]);

    var cores = coresTema();
    var opcoes = opcoesBase(cores, function (v) { return fmtPct(v, 1); });
    opcoes.plugins.legend.display = false;

    chartDrawdown = new Chart(canvas.getContext('2d'), {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Drawdown',
          data: porIndices(dd, idx),
          borderColor: '#c0392b',
          backgroundColor: cores.isDark ? 'rgba(192,57,43,0.22)' : 'rgba(192,57,43,0.14)',
          borderWidth: 1.75,
          pointRadius: 0,
          tension: 0.1,
          fill: 'origin',
          spanGaps: true
        }]
      },
      options: opcoes
    });
  }

  // --------------------------------------------------------------------- //
  // API pública
  // --------------------------------------------------------------------- //

  return {
    render: render,
    buscar: buscarTicker,
    setProxy: function (url) { PROXY_URL = url; },
    resetCache: function () { universoCache = null; },
    // Expostos para teste e para os outros módulos.
    premissas: PREMISSAS,
    periodoComum: periodoComum,
    interseccao: interseccao,
    aplicarJanela: aplicarJanela,
    montarPesos: montarPesos,
    construirUniverso: construirUniverso,
    indicesMinMax: indicesMinMax,
    alinharPorData: alinharPorData
  };

})();

// --------------------------------------------------------------------- //
// toggleRetornoReal — global, chamado pelo checkbox #toggle-ipca
// --------------------------------------------------------------------- //
function toggleRetornoReal() {
  var cb = document.getElementById('toggle-ipca');
  var info = document.getElementById('retorno-real-info');
  var r = (window.Estado && typeof window.Estado.getBacktest === 'function' && window.Estado.getBacktest())
    || window._lastBacktestResult;
  if (!cb || !info || !r) return;

  if (!cb.checked) { info.hidden = true; return; }

  var datas = r.curvas && r.curvas.datas;
  if (!datas || datas.length < 2) { info.hidden = true; return; }

  var inicio = datas[0].substring(0, 7);
  var fim = datas[datas.length - 1].substring(0, 7);
  var ipcaData = (window.DADOS && window.DADOS.ipca) || [];
  var ipcaAcum = 1;
  for (var i = 0; i < ipcaData.length; i++) {
    var item = ipcaData[i];
    if (item && item.data >= inicio && item.data <= fim) {
      ipcaAcum *= (1 + item.valor / 100);
    }
  }
  var inflacao = ipcaAcum - 1;
  var nominal = r.resumo.retornoAcumulado;
  var f = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  if (typeof nominal !== 'number' || !isFinite(nominal)) { info.hidden = true; return; }
  var real = (1 + nominal) / (1 + inflacao) - 1;

  info.textContent = 'Retorno real: ' + f.format(real * 100) + '% ' +
    '(nominal ' + f.format(nominal * 100) + '% menos inflação ' + f.format(inflacao * 100) + '%)';
  info.hidden = false;
}
