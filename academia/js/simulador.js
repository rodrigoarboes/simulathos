/* ==========================================================================
   AIDA Alocação — Simulador (backtest histórico real na Tela 4)
   Expõe global AIDASim com AIDASim.render(montagem, caseObj).
   Depende de: window.DADOS, Backtest (js/motor/backtest.js), Chart (global).
   Estilo: vanilla ES5-ish, defensivo, sem build.
   ========================================================================== */

var AIDASim = (function () {
  'use strict';

  // Instância de Chart anterior, para destruir antes de recriar.
  var chartAtual = null;

  // Universo combinado (B3 em BRL + offshore convertido para BRL), em cache.
  var universoCache = null;

  // URL do proxy Yahoo Finance (Cloudflare Worker).
  var PROXY_URL = 'https://aida-proxy.vocebancario.workers.dev';

  // Flag para evitar loop infinito de fetch no render.
  var fetchEmAndamento = false;

  /**
   * Monta o universo de ativos para simulação, todos denominados em BRL:
   * - ETFs B3 (window.DADOS.etfs): já em reais, usados como estão.
   * - ETFs offshore (window.DADOS.offshore): cotados em dólar, convertidos
   *   para reais multiplicando o close (USD) pela cotação USD/BRL da data
   *   (window.DADOS.indices.usdbrl). Datas sem câmbio carregam o último
   *   câmbio conhecido. Assim uma carteira mista BR+offshore fica coerente.
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

    universoCache = uni;
    return uni;
  }

  // --------------------------------------------------------------------- //
  // Live ticker search via Yahoo Finance proxy
  // --------------------------------------------------------------------- //

  /**
   * Busca dados históricos de um ticker via proxy Yahoo Finance.
   * Regras de símbolo:
   * - Tickers brasileiros (contêm dígito): acrescenta .SA
   * - Já possui sufixo (.L, .SA, =X): usa como está
   * - Letras puras (AAPL, VOO): usa como está (US-listed)
   */
  function buscarTicker(ticker) {
    var symbol = ticker;
    if (/\d/.test(ticker) && ticker.indexOf('.') === -1 && ticker.indexOf('=') === -1) {
      symbol = ticker + '.SA';
    }

    var url = PROXY_URL + '/chart/' + encodeURIComponent(symbol) + '?range=5y&interval=1d';

    return fetch(url)
      .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        return resp.json();
      });
  }

  /**
   * Busca sequencialmente todos os tickers faltantes e os insere no universo.
   * Tickers offshore (sem dígitos) são convertidos de USD para BRL.
   */
  function buscarFaltantes(tickers) {
    if (!tickers.length) return Promise.resolve();

    var i = 0;
    function next() {
      if (i >= tickers.length) return Promise.resolve();
      var ticker = tickers[i++];
      return buscarTicker(ticker)
        .then(function(dados) {
          if (dados && dados.length >= 2) {
            // Check if this is an offshore ticker (non-.SA) — convert to BRL
            var isOffshore = !/\d/.test(ticker) || ticker.indexOf('.L') !== -1;
            if (isOffshore && window.DADOS && window.DADOS.indices && window.DADOS.indices.usdbrl) {
              var usdbrl = window.DADOS.indices.usdbrl;
              var fx = {};
              for (var j = 0; j < usdbrl.length; j++) fx[usdbrl[j].data] = usdbrl[j].close;
              var brl = [];
              var lastFx = null;
              for (var j = 0; j < dados.length; j++) {
                var rate = fx[dados[j].data];
                if (rate == null) rate = lastFx;
                if (rate == null) continue;
                lastFx = rate;
                brl.push({ data: dados[j].data, close: Math.round(dados[j].close * rate * 100) / 100 });
              }
              dados = brl;
            }
            if (dados.length >= 2) {
              if (!universoCache) construirUniverso();
              universoCache[ticker] = dados;
            }
          }
        })
        .catch(function(err) {
          // Silently skip — will be listed as "descartados" by the render
        })
        .then(next);
    }
    return next();
  }

  // --------------------------------------------------------------------- //
  // Helpers de formatação
  // --------------------------------------------------------------------- //

  function fmtPct(dec, casas) {
    if (typeof dec !== 'number' || isNaN(dec)) return '—';
    var c = (typeof casas === 'number') ? casas : 1;
    var v = (dec * 100).toFixed(c);
    return v.replace('.', ',') + '%';
  }

  function fmtNum(n, casas) {
    if (typeof n !== 'number' || isNaN(n)) return '—';
    var c = (typeof casas === 'number') ? casas : 2;
    return n.toFixed(c).replace('.', ',');
  }

  // Converte "YYYY-MM-DD" para "dd/mm/yyyy".
  function fmtData(iso) {
    if (!iso || typeof iso !== 'string') return '—';
    var p = iso.split('-');
    if (p.length < 3) return iso;
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  // Formata um valor em reais de forma curta: R$ 1,2k / R$ 100k / R$ 1,3M.
  function fmtReaisCurto(v) {
    if (typeof v !== 'number' || isNaN(v)) return 'R$ —';
    var abs = Math.abs(v);
    if (abs >= 1000000) {
      return 'R$ ' + (v / 1000000).toFixed(1).replace('.', ',') + 'M';
    }
    if (abs >= 1000) {
      var k = v / 1000;
      // 100k inteiro, 1,2k com decimal
      if (Math.abs(k) >= 100) return 'R$ ' + Math.round(k) + 'k';
      return 'R$ ' + k.toFixed(1).replace('.', ',') + 'k';
    }
    return 'R$ ' + Math.round(v);
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // --------------------------------------------------------------------- //
  // Helpers de carteira
  // --------------------------------------------------------------------- //

  /**
   * A partir de um mapa de pcts { TICKER: pct(0-100) }, mantém apenas tickers
   * presentes em window.DADOS.etfs com pct > 0, e renormaliza para decimais
   * que somam 1.
   * @returns { pesos: {TICKER:decimal}, mantidos: [TICKER], descartados: [TICKER] }
   */
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

  // Converte array de montagem [{ticker, pct}] em mapa { TICKER: pct }.
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
   * (As séries vêm ordenadas ascendentes por data.)
   */
  function periodoComum(mantidos, etfs) {
    var inicio = '';
    var fim = '';
    for (var i = 0; i < mantidos.length; i++) {
      var serie = etfs[mantidos[i]];
      if (!serie || !serie.length) continue;
      var primeira = serie[0].data;
      var ultima = serie[serie.length - 1].data;
      if (inicio === '' || primeira > inicio) inicio = primeira;
      if (fim === '' || ultima < fim) fim = ultima;
    }
    return { dataInicio: inicio, dataFim: fim };
  }

  // Subconjunto de DADOS.etfs apenas com os tickers mantidos.
  function subDados(mantidos, etfs) {
    var sub = {};
    for (var i = 0; i < mantidos.length; i++) {
      sub[mantidos[i]] = etfs[mantidos[i]];
    }
    return sub;
  }

  /**
   * Roda um backtest completo a partir de um mapa de pcts (0-100),
   * usando o período fornecido. Retorna o resultado do Backtest ou null
   * se não houver ao menos 2 ativos com dados ou se o engine lançar erro.
   */
  function rodarBacktest(pctMap, etfs, periodo) {
    var info = montarPesos(pctMap, etfs);
    if (info.mantidos.length < 2 || info.total <= 0) return null;
    try {
      return Backtest.rodar({
        dados: subDados(info.mantidos, etfs),
        cdi: window.DADOS.cdi,
        ibov: window.DADOS.ibov,
        ipca: window.DADOS.ipca,
        pesos: info.pesos,
        valorInicial: 100000,
        aporteMensal: 0,
        rebalanceamento: 63,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim
      });
    } catch (e) {
      return null;
    }
  }

  // --------------------------------------------------------------------- //
  // Downsample para o gráfico (mantém ~maxPts pontos)
  // --------------------------------------------------------------------- //

  function downsample(arr, maxPts) {
    if (!arr || arr.length <= maxPts) return arr || [];
    var passo = arr.length / maxPts;
    var out = [];
    for (var i = 0; i < maxPts; i++) {
      out.push(arr[Math.floor(i * passo)]);
    }
    // garante o último ponto
    out[out.length - 1] = arr[arr.length - 1];
    return out;
  }

  // --------------------------------------------------------------------- //
  // Render de mensagem amigável no painel
  // --------------------------------------------------------------------- //

  function mensagem(texto) {
    var alvo = document.getElementById('backtest-real-conteudo');
    if (!alvo) return;
    if (chartAtual) { try { chartAtual.destroy(); } catch (e) {} chartAtual = null; }
    alvo.innerHTML =
      '<p style="font-size:14px; color:var(--text-soft); line-height:1.6; margin:0;">' +
      escapeHtml(texto) + '</p>';
  }

  // --------------------------------------------------------------------- //
  // Render principal
  // --------------------------------------------------------------------- //

  function render(montagem, caseObj) {
    var alvo = document.getElementById('backtest-real-conteudo');
    if (!alvo) return;

    if (!window.DADOS || !window.DADOS.etfs || typeof Backtest === 'undefined') {
      mensagem('Backtest histórico indisponível: motor ou dados não carregados.');
      return;
    }
    var etfs = construirUniverso();

    // (a) Pesos da carteira do aluno
    var pctMap = montagemParaMapa(montagem);
    var info = montarPesos(pctMap, etfs);

    // Auto-fetch unknown tickers from the proxy (only once per render)
    if (info.descartados.length > 0 && PROXY_URL && !fetchEmAndamento) {
      fetchEmAndamento = true;
      alvo.innerHTML = '<p style="font-size:14px; color:var(--brand-blue);">⏳ Buscando dados de <strong>' + info.descartados.join(', ') + '</strong> no Yahoo Finance...</p>';
      buscarFaltantes(info.descartados).then(function() {
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
      mensagem('Backtest histórico indisponível: a carteira precisa de ao menos 2 ativos com dados históricos (B3 ou offshore).' + falta);
      return;
    }

    // (b) Período comum mais amplo
    var periodo = periodoComum(info.mantidos, etfs);
    if (!periodo.dataInicio || !periodo.dataFim || periodo.dataInicio >= periodo.dataFim) {
      mensagem('Backtest histórico indisponível: não há período comum suficiente entre os ativos da carteira.');
      return;
    }

    // (c) Backtest da carteira
    var res;
    try {
      res = Backtest.rodar({
        dados: subDados(info.mantidos, etfs),
        cdi: window.DADOS.cdi,
        ibov: window.DADOS.ibov,
        ipca: window.DADOS.ipca,
        pesos: info.pesos,
        valorInicial: 100000,
        aporteMensal: 0,
        rebalanceamento: 63,
        dataInicio: periodo.dataInicio,
        dataFim: periodo.dataFim
      });
    } catch (e) {
      mensagem('Backtest histórico indisponível: ' + (e && e.message ? e.message : 'erro ao processar a carteira') + '.');
      return;
    }

    // (d) Backtest do gabarito (mesma lógica, melhor esforço)
    var resGab = null;
    if (caseObj && caseObj.gabarito) {
      var infoGab = montarPesos(caseObj.gabarito, etfs);
      if (infoGab.mantidos.length >= 2 && infoGab.total > 0) {
        var periodoGab = periodoComum(infoGab.mantidos, etfs);
        if (periodoGab.dataInicio && periodoGab.dataFim && periodoGab.dataInicio < periodoGab.dataFim) {
          resGab = rodarBacktest(caseObj.gabarito, etfs, periodoGab);
        }
      }
    }

    // (e) Render
    var resumo = res.resumo;
    var curvas = res.curvas;

    // --- Color coding for metrics ---
    var corRetorno = resumo.retornoAcumulado >= 0 ? 'var(--ok)' : 'var(--bad)';
    var corRetornoAnual = resumo.retornoAnualizado >= 0 ? 'var(--ok)' : 'var(--bad)';
    var corSharpe = resumo.sharpe >= 0.5 ? 'var(--ok)' : resumo.sharpe >= 0 ? 'var(--warn)' : 'var(--bad)';
    var corDD = resumo.drawdownMaximo > -0.15 ? 'var(--warn)' : 'var(--bad)';
    var corCDI = resumo.percentualCDI >= 100 ? 'var(--ok)' : resumo.percentualCDI >= 80 ? 'var(--warn)' : 'var(--bad)';
    var corVol = 'var(--brand-blue)';
    var corBeta = 'var(--brand-blue)';

    var html = '';

    // Intro
    html +=
      '<p style="font-size:13px; color:var(--text-soft); line-height:1.6; margin:0 0 20px;">' +
      'Desempenho histórico real da carteira proposta no período de <strong>' +
      fmtData(periodo.dataInicio) + '</strong> a <strong>' + fmtData(periodo.dataFim) +
      '</strong> (' + resumo.diasUteis + ' dias úteis). Rebalanceamento trimestral, sem aportes.' +
      '</p>';

    // --- Hero metric: Retorno acumulado ---
    html +=
      '<div style="text-align:center; margin-bottom:20px; padding:20px 16px; ' +
      'background:var(--bg-soft); border-radius:12px; border:1px solid var(--border);">' +
        '<div style="font-size:11px; text-transform:uppercase; letter-spacing:2px; ' +
        'color:var(--text-soft); font-weight:700;">Retorno acumulado no período</div>' +
        '<div style="font-family:var(--font-display); font-size:48px; font-weight:800; ' +
        'color:' + corRetorno + '; letter-spacing:-2px; line-height:1.2; margin:4px 0;">' +
        fmtPct(resumo.retornoAcumulado, 1) + '</div>' +
        '<div style="font-size:13px; color:var(--text-soft);">' +
        fmtData(periodo.dataInicio) + ' — ' + fmtData(periodo.dataFim) +
        '</div>' +
      '</div>';

    // --- Separator ---
    html += '<hr style="border:none; border-top:1px solid var(--border); margin:20px 0;">';

    // --- Metrics grid ---
    var metricas = [
      { icon: '📈', label: 'Retorno anualizado', valor: fmtPct(resumo.retornoAnualizado, 1), cor: corRetornoAnual },
      { icon: '🎯', label: '% do CDI',           valor: fmtNum(resumo.percentualCDI, 1) + '%', cor: corCDI },
      { icon: '⚡',       label: 'Volatilidade',       valor: fmtPct(resumo.volatilidade, 1),        cor: corVol },
      { icon: '⚖️', label: 'Sharpe',             valor: fmtNum(resumo.sharpe, 2),              cor: corSharpe },
      { icon: '📉', label: 'Drawdown máximo', valor: fmtPct(resumo.drawdownMaximo, 1),    cor: corDD },
      { icon: '📊', label: 'Beta (vs Ibov)',     valor: fmtNum(resumo.beta, 2),                cor: corBeta }
    ];
    html += '<div class="score-dimensoes" style="margin-bottom:20px;">';
    for (var m = 0; m < metricas.length; m++) {
      html +=
        '<div class="dim-card" style="border-left:3px solid ' + metricas[m].cor + ';">' +
        '<h5 style="display:flex; align-items:center; gap:4px;">' +
        '<span style="font-size:14px;">' + metricas[m].icon + '</span> ' +
        metricas[m].label + '</h5>' +
        '<div class="dim-valor" style="color:' + metricas[m].cor + '; ' +
        'font-family:var(--font-mono);">' + metricas[m].valor + '</div>' +
        '</div>';
    }
    html += '</div>';

    // --- Separator ---
    html += '<hr style="border:none; border-top:1px solid var(--border); margin:20px 0;">';

    // --- Chart title ---
    html +=
      '<div style="font-size:14px; font-weight:700; color:var(--text); margin-bottom:8px; ' +
      'font-family:var(--font-display);">' +
      '📈 Evolução patrimonial (R$ 100 mil iniciais)</div>';

    // Canvas do gráfico
    html +=
      '<div style="position:relative; height:360px; margin-bottom:8px;">' +
      '<canvas id="chart-backtest-real"></canvas>' +
      '</div>';

    // --- Separator ---
    html += '<hr style="border:none; border-top:1px solid var(--border); margin:20px 0;">';

    // --- Comparison verdict card ---
    var veredictoCDI = resumo.percentualCDI;
    var corFundoVeredito = veredictoCDI >= 100 ? 'var(--ok)' :
                           veredictoCDI >= 80  ? 'var(--warn)' : 'var(--bad)';
    var labelVeredito = veredictoCDI >= 100 ? 'Carteira superou o CDI' :
                        veredictoCDI >= 80  ? 'Carteira próxima do CDI' :
                                              'Carteira abaixo do CDI';

    if (resGab && resGab.resumo) {
      // Two-column comparison: vs Gabarito and vs CDI
      html +=
        '<div style="background:color-mix(in srgb, ' + corFundoVeredito + ' 10%, var(--bg-soft)); ' +
        'border:1px solid color-mix(in srgb, ' + corFundoVeredito + ' 30%, var(--border)); ' +
        'border-radius:10px; padding:16px 20px; margin-bottom:16px;">' +
          '<div style="font-size:12px; font-weight:700; text-transform:uppercase; ' +
          'letter-spacing:1.5px; color:var(--text-soft); margin-bottom:12px;">' +
          '🏆 Veredito</div>' +
          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">' +
            // Col 1: vs Gabarito
            '<div style="text-align:center;">' +
              '<div style="font-size:11px; color:var(--text-soft); margin-bottom:4px;">Sua carteira</div>' +
              '<div style="font-family:var(--font-display); font-size:28px; font-weight:800; ' +
              'color:' + corRetorno + ';">' + fmtPct(resumo.retornoAcumulado, 1) + '</div>' +
              '<div style="font-size:11px; color:var(--text-soft); margin:4px 0;">vs gabarito</div>' +
              '<div style="font-family:var(--font-display); font-size:28px; font-weight:800; ' +
              'color:var(--text);">' + fmtPct(resGab.resumo.retornoAcumulado, 1) + '</div>' +
            '</div>' +
            // Col 2: vs CDI
            '<div style="text-align:center;">' +
              '<div style="font-size:11px; color:var(--text-soft); margin-bottom:4px;">% do CDI</div>' +
              '<div style="font-family:var(--font-display); font-size:28px; font-weight:800; ' +
              'color:' + corCDI + ';">' + fmtNum(resumo.percentualCDI, 1) + '%</div>' +
              '<div style="font-size:11px; color:var(--text-soft); margin:4px 0;">' + labelVeredito + '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    } else {
      // Single-card verdict: vs CDI only
      html +=
        '<div style="background:color-mix(in srgb, ' + corFundoVeredito + ' 10%, var(--bg-soft)); ' +
        'border:1px solid color-mix(in srgb, ' + corFundoVeredito + ' 30%, var(--border)); ' +
        'border-radius:10px; padding:16px 20px; margin-bottom:16px;">' +
          '<div style="font-size:12px; font-weight:700; text-transform:uppercase; ' +
          'letter-spacing:1.5px; color:var(--text-soft); margin-bottom:8px;">' +
          '🏆 Veredito</div>' +
          '<div style="display:flex; align-items:center; gap:12px;">' +
            '<div style="font-family:var(--font-display); font-size:32px; font-weight:800; ' +
            'color:' + corCDI + ';">' + fmtNum(resumo.percentualCDI, 1) + '% CDI</div>' +
            '<div style="font-size:13px; color:var(--text); line-height:1.4;">' +
            'Sua carteira rendeu <strong>' + fmtPct(resumo.retornoAcumulado, 1) +
            '</strong> no período. ' + labelVeredito + '.</div>' +
          '</div>' +
        '</div>';
    }

    // --- Dropped tickers note (styled info box) ---
    if (info.descartados.length) {
      html +=
        '<div style="border-left:3px solid var(--brand-blue); background:var(--bg-soft); ' +
        'border-radius:0 6px 6px 0; padding:10px 14px; margin:12px 0 0; ' +
        'font-size:12px; color:var(--text-soft); line-height:1.5;">' +
        '<strong>ℹ️ Ativos sem dados históricos</strong> no protótipo, ignorados no backtest: ' +
        escapeHtml(info.descartados.join(', ')) + '.' +
        '</div>';
    }

    alvo.innerHTML = html;

    // Gráfico
    desenharGrafico(curvas, resGab);
  }

  // --------------------------------------------------------------------- //
  // Gráfico de linha (Chart.js)
  // --------------------------------------------------------------------- //

  function desenharGrafico(curvas, resGab) {
    if (typeof Chart === 'undefined') return;
    var canvas = document.getElementById('chart-backtest-real');
    if (!canvas) return;
    var ctx = canvas.getContext ? canvas.getContext('2d') : null;
    if (!ctx) return;

    if (chartAtual) { try { chartAtual.destroy(); } catch (e) {} chartAtual = null; }

    // Detect dark mode for theme-aware grid/tick colors
    var isDark = document.body.classList.contains('dark');
    var gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';
    var tickColor = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)';

    var MAX = 150;
    var labels = downsample(curvas.datas, MAX);

    // Build gradient fill for carteira line
    var gradientFill = ctx.createLinearGradient(0, 0, 0, canvas.parentElement ? canvas.parentElement.offsetHeight || 360 : 360);
    gradientFill.addColorStop(0, isDark ? 'rgba(0,136,204,0.15)' : 'rgba(0,136,204,0.10)');
    gradientFill.addColorStop(1, isDark ? 'rgba(0,136,204,0.0)' : 'rgba(0,136,204,0.0)');

    var datasets = [
      {
        label: 'Sua carteira',
        data: downsample(curvas.carteira, MAX),
        borderColor: '#0088cc',
        backgroundColor: gradientFill,
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.15,
        fill: true
      }
    ];

    if (resGab && resGab.curvas && resGab.curvas.carteira) {
      datasets.push({
        label: 'Gabarito',
        data: downsample(resGab.curvas.carteira, MAX),
        borderColor: '#2d8c5c',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.15,
        fill: false
      });
    }

    datasets.push({
      label: 'CDI',
      data: downsample(curvas.cdi, MAX),
      borderColor: '#9aa3ad',
      borderWidth: 1.25,
      borderDash: [5, 4],
      pointRadius: 0,
      tension: 0.15,
      fill: false
    });
    datasets.push({
      label: 'Ibovespa',
      data: downsample(curvas.ibov, MAX),
      borderColor: '#e0843b',
      borderWidth: 1.25,
      borderDash: [5, 4],
      pointRadius: 0,
      tension: 0.15,
      fill: false
    });
    datasets.push({
      label: 'IPCA+5%',
      data: downsample(curvas.ipcaMais5, MAX),
      borderColor: '#b0455a',
      borderWidth: 1.25,
      borderDash: [5, 4],
      pointRadius: 0,
      tension: 0.15,
      fill: false
    });

    chartAtual = new Chart(ctx, {
      type: 'line',
      data: { labels: labels, datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              boxWidth: 8,
              font: { size: 12 },
              color: tickColor
            }
          },
          tooltip: {
            backgroundColor: isDark ? 'rgba(30,30,30,0.95)' : 'rgba(255,255,255,0.96)',
            titleColor: isDark ? '#e0e0e0' : '#333',
            bodyColor: isDark ? '#ccc' : '#555',
            borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1,
            padding: 10,
            bodyFont: { size: 12 },
            titleFont: { size: 12, weight: '600' },
            callbacks: {
              label: function (c) {
                var val = c.parsed.y;
                var formatted = 'R$ ' + (typeof val === 'number' ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : val);
                return c.dataset.label + ': ' + formatted;
              }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              maxTicksLimit: 8,
              maxRotation: 0,
              font: { size: 10 },
              color: tickColor
            },
            grid: { display: false }
          },
          y: {
            ticks: {
              font: { size: 10 },
              color: tickColor,
              callback: function (v) { return fmtReaisCurto(v); }
            },
            grid: {
              color: gridColor,
              drawBorder: false
            }
          }
        }
      }
    });
  }

  // --------------------------------------------------------------------- //
  // API pública
  // --------------------------------------------------------------------- //

  return {
    render: render,
    buscar: buscarTicker,
    setProxy: function(url) { PROXY_URL = url; }
  };

})();
