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
    var etfs = window.DADOS.etfs;

    // (a) Pesos da carteira do aluno
    var pctMap = montagemParaMapa(montagem);
    var info = montarPesos(pctMap, etfs);

    if (info.mantidos.length < 2 || info.total <= 0) {
      var falta = info.descartados.length
        ? ' Ativos sem dados: ' + info.descartados.join(', ') + '.'
        : '';
      mensagem('Backtest histórico indisponível: a carteira precisa de ao menos 2 ativos com dados (B3).' + falta);
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

    var html = '';

    // Intro
    html +=
      '<p style="font-size:13px; color:var(--text-soft); line-height:1.6; margin:0 0 16px;">' +
      'Desempenho histórico real da carteira proposta no período de <strong>' +
      fmtData(periodo.dataInicio) + '</strong> a <strong>' + fmtData(periodo.dataFim) +
      '</strong> (' + resumo.diasUteis + ' dias úteis). Rebalanceamento trimestral, sem aportes.' +
      '</p>';

    // Métricas
    var metricas = [
      { label: 'Retorno acumulado', valor: fmtPct(resumo.retornoAcumulado, 1) },
      { label: 'Retorno anualizado', valor: fmtPct(resumo.retornoAnualizado, 1) },
      { label: 'Volatilidade', valor: fmtPct(resumo.volatilidade, 1) },
      { label: 'Sharpe', valor: fmtNum(resumo.sharpe, 2) },
      { label: 'Drawdown máximo', valor: fmtPct(resumo.drawdownMaximo, 1) },
      { label: 'Beta (vs Ibov)', valor: fmtNum(resumo.beta, 2) },
      { label: '% do CDI', valor: fmtPct(resumo.percentualCDI, 1) }
    ];
    html += '<div class="score-dimensoes" style="margin-bottom:20px;">';
    for (var m = 0; m < metricas.length; m++) {
      html +=
        '<div class="dim-card">' +
        '<h5>' + metricas[m].label + '</h5>' +
        '<div class="dim-valor" style="color:var(--brand-blue);">' + metricas[m].valor + '</div>' +
        '</div>';
    }
    html += '</div>';

    // Canvas do gráfico
    html +=
      '<div style="position:relative; height:300px; margin-bottom:8px;">' +
      '<canvas id="chart-backtest-real"></canvas>' +
      '</div>';

    // Verdito comparativo
    if (resGab && resGab.resumo) {
      html +=
        '<p style="font-size:13px; color:var(--text); line-height:1.6; margin:8px 0 0;">' +
        'Sua carteira rendeu <strong>' + fmtPct(resumo.retornoAcumulado, 1) +
        '</strong> vs <strong>' + fmtPct(resGab.resumo.retornoAcumulado, 1) +
        '</strong> do gabarito e <strong>' + fmtPct(resumo.percentualCDI, 1) +
        '</strong> do CDI no período.' +
        '</p>';
    }

    // Nota sobre descartados
    if (info.descartados.length) {
      html +=
        '<p style="font-size:12px; color:var(--text-soft); margin:12px 0 0;">' +
        'Ativos sem dados históricos no protótipo, ignorados no backtest: ' +
        escapeHtml(info.descartados.join(', ')) + '.' +
        '</p>';
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

    var MAX = 150;
    var labels = downsample(curvas.datas, MAX);

    var datasets = [
      {
        label: 'Sua carteira',
        data: downsample(curvas.carteira, MAX),
        borderColor: '#0088cc',
        backgroundColor: 'rgba(0,136,204,0.08)',
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.15,
        fill: false
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
            labels: { boxWidth: 14, font: { size: 11 } }
          },
          tooltip: {
            callbacks: {
              label: function (c) {
                return c.dataset.label + ': ' + fmtReaisCurto(c.parsed.y);
              }
            }
          }
        },
        scales: {
          x: {
            ticks: { maxTicksLimit: 8, font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            ticks: {
              font: { size: 10 },
              callback: function (v) { return fmtReaisCurto(v); }
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
    render: render
  };

})();
