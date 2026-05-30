/* ==========================================================================
   AIDA Allocation — UI Orchestration
   ========================================================================== */

(function () {
    'use strict';

    // -----------------------------------------------------------------------
    // State
    // -----------------------------------------------------------------------

    var state = {
        selected: {},       // { ticker: weight (0-100) }
        resultado: null,    // last backtest result
        charts: {
            patrimonio: null,
            composicao: null
        }
    };

    var wizard;

    // -----------------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------------

    function $(sel) { return document.querySelector(sel); }
    function $$(sel) { return document.querySelectorAll(sel); }
    function el(id) { return document.getElementById(id); }

    function fmtPct(v, decimals) {
        decimals = decimals !== undefined ? decimals : 2;
        return (v * 100).toFixed(decimals).replace('.', ',') + '%';
    }

    function fmtNum(v, decimals) {
        decimals = decimals !== undefined ? decimals : 2;
        return v.toFixed(decimals).replace('.', ',');
    }

    function todayStr() {
        var d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    function yearsAgo(n) {
        var d = new Date();
        d.setFullYear(d.getFullYear() - n);
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    // -----------------------------------------------------------------------
    // Step 1: Render ETF Catalog
    // -----------------------------------------------------------------------

    function renderCatalog() {
        var container = el('etf-catalog');
        if (!container) return;

        var classes = Catalogo.classes;
        var html = '';

        var classKeys = Object.keys(classes);
        for (var c = 0; c < classKeys.length; c++) {
            var classId = classKeys[c];
            var classInfo = classes[classId];
            var etfs = Catalogo.porClasse(classId);
            if (etfs.length === 0) continue;

            html += '<div class="zw-etf-group">';
            html += '<div class="zw-etf-group__title">' + classInfo.nome + '</div>';
            html += '<div class="zw-etf-grid">';

            for (var i = 0; i < etfs.length; i++) {
                var etf = etfs[i];
                html += '<div class="zw-etf-card" data-ticker="' + etf.ticker + '">';
                html += '<div class="zw-etf-card__ticker">' + etf.ticker + '</div>';
                html += '<div class="zw-etf-card__name">' + etf.nome + '</div>';
                html += '<div class="zw-etf-card__desc">' + etf.descricao + '</div>';
                html += '</div>';
            }

            html += '</div></div>';
        }

        container.innerHTML = html;

        // Attach click handlers
        var cards = container.querySelectorAll('.zw-etf-card');
        for (var j = 0; j < cards.length; j++) {
            cards[j].addEventListener('click', onEtfCardClick);
        }
    }

    function onEtfCardClick(e) {
        var card = e.currentTarget;
        var ticker = card.getAttribute('data-ticker');

        if (state.selected[ticker] !== undefined) {
            // Deselect
            delete state.selected[ticker];
            card.classList.remove('selected');
        } else {
            // Select with default weight 0
            state.selected[ticker] = 0;
            card.classList.add('selected');
        }

        renderWeightSliders();
        updateTotal();
    }

    // -----------------------------------------------------------------------
    // Step 1: Weight Sliders
    // -----------------------------------------------------------------------

    function renderWeightSliders() {
        var tickers = Object.keys(state.selected);
        var section = el('weight-sliders');
        var rowsContainer = el('weight-rows');

        if (tickers.length === 0) {
            section.style.display = 'none';
            return;
        }
        section.style.display = '';

        var html = '';
        for (var i = 0; i < tickers.length; i++) {
            var ticker = tickers[i];
            var weight = state.selected[ticker] || 0;
            var etfInfo = Catalogo.porTicker(ticker);
            var label = etfInfo ? ticker : ticker;

            html += '<div class="zw-weight-row" data-ticker="' + ticker + '">';
            html += '<span class="zw-weight-row__label">' + label + '</span>';
            html += '<input type="range" class="zw-weight-row__slider" min="0" max="100" step="1" value="' + weight + '" data-ticker="' + ticker + '">';
            html += '<input type="number" class="zw-weight-row__input zw-field" min="0" max="100" step="1" value="' + weight + '" data-ticker="' + ticker + '">';
            html += '<span class="zw-weight-row__pct">%</span>';
            html += '</div>';
        }

        rowsContainer.innerHTML = html;

        // Attach slider/input change handlers
        var sliders = rowsContainer.querySelectorAll('.zw-weight-row__slider');
        var inputs = rowsContainer.querySelectorAll('.zw-weight-row__input');

        for (var s = 0; s < sliders.length; s++) {
            sliders[s].addEventListener('input', onSliderChange);
        }
        for (var n = 0; n < inputs.length; n++) {
            inputs[n].addEventListener('input', onWeightInputChange);
        }
    }

    function onSliderChange(e) {
        var ticker = e.target.getAttribute('data-ticker');
        var val = parseInt(e.target.value, 10) || 0;
        state.selected[ticker] = val;

        // Sync the number input
        var row = e.target.closest('.zw-weight-row');
        var numInput = row.querySelector('.zw-weight-row__input');
        if (numInput) numInput.value = val;

        updateTotal();
    }

    function onWeightInputChange(e) {
        var ticker = e.target.getAttribute('data-ticker');
        var val = parseInt(e.target.value, 10) || 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        state.selected[ticker] = val;

        // Sync the slider
        var row = e.target.closest('.zw-weight-row');
        var slider = row.querySelector('.zw-weight-row__slider');
        if (slider) slider.value = val;

        updateTotal();
    }

    function updateTotal() {
        var tickers = Object.keys(state.selected);
        var total = 0;
        for (var i = 0; i < tickers.length; i++) {
            total += state.selected[tickers[i]] || 0;
        }

        var bar = el('total-bar');
        var fill = el('total-fill');
        var pctLabel = el('total-pct');
        var validationMsg = el('step1-validation');

        pctLabel.textContent = total + '%';

        var pctWidth = Math.min(total, 100);
        fill.style.width = pctWidth + '%';

        if (total === 100 && tickers.length >= 2) {
            bar.className = 'zw-total-bar is-valid';
            fill.style.background = '#14B550';
            validationMsg.textContent = 'Carteira válida: ' + tickers.length + ' ativos, soma 100%.';
            validationMsg.className = 'zw-validation-msg is-ok';
        } else {
            bar.className = 'zw-total-bar is-invalid';
            fill.style.background = '#DB222A';

            var msgs = [];
            if (tickers.length < 2) msgs.push('Selecione pelo menos 2 ativos');
            if (total !== 100) msgs.push('A soma dos pesos deve ser exatamente 100% (atual: ' + total + '%)');
            validationMsg.textContent = msgs.join('. ') + '.';
            validationMsg.className = 'zw-validation-msg is-error';
        }
    }

    function validateStep1() {
        var tickers = Object.keys(state.selected);
        var total = 0;
        for (var i = 0; i < tickers.length; i++) {
            total += state.selected[tickers[i]] || 0;
        }
        return tickers.length >= 2 && total === 100;
    }

    // -----------------------------------------------------------------------
    // Step 2: Premissas Setup
    // -----------------------------------------------------------------------

    function initPremissas() {
        // Set default dates
        var dataFim = el('data-fim');
        var dataInicio = el('data-inicio');
        if (dataFim) dataFim.value = todayStr();
        if (dataInicio) dataInicio.value = yearsAgo(5);

        // Quick period buttons
        var quickBtns = $$('[data-periodo]');
        for (var i = 0; i < quickBtns.length; i++) {
            quickBtns[i].addEventListener('click', function () {
                var anos = parseInt(this.getAttribute('data-periodo'), 10);
                var fim = el('data-fim');
                if (!fim.value) fim.value = todayStr();
                el('data-inicio').value = yearsAgo(anos);
            });
        }
    }

    // -----------------------------------------------------------------------
    // Step 2 -> Step 3: Run Backtest
    // -----------------------------------------------------------------------

    function runSimulation() {
        var loadingEl = el('resultado-loading');
        var erroEl = el('resultado-erro');
        var contentEl = el('resultado-content');

        // Show loading
        loadingEl.style.display = '';
        erroEl.style.display = 'none';
        contentEl.style.display = 'none';

        // Go to step 3
        wizard.goToStep(3);

        // Read premissas
        var valorInicial = Simulathos.parseCurrency(el('valor-inicial').value);
        var aporteMensal = Simulathos.parseCurrency(el('aporte-mensal').value);
        var dataInicio = el('data-inicio').value;
        var dataFim = el('data-fim').value;
        var rebalDias = parseInt(el('rebalanceamento').value, 10);

        // Build pesos map (fraction 0-1)
        var pesos = {};
        var tickers = Object.keys(state.selected);
        for (var i = 0; i < tickers.length; i++) {
            pesos[tickers[i]] = state.selected[tickers[i]] / 100;
        }

        // If data was embedded via data/dados.js (loaded with a <script> tag),
        // use it directly. This works even when the page is opened with a
        // double-click (file://), where fetch() of local files is blocked.
        if (window.DADOS && window.DADOS.etfs) {
            var dataMapEmbed = {};
            for (var te = 0; te < tickers.length; te++) {
                if (window.DADOS.etfs[tickers[te]]) {
                    dataMapEmbed[tickers[te]] = window.DADOS.etfs[tickers[te]];
                }
            }
            dataMapEmbed['_cdi'] = window.DADOS.cdi;
            dataMapEmbed['_ibov'] = window.DADOS.ibov;
            dataMapEmbed['_ipca'] = window.DADOS.ipca;
            onAllDataLoaded(dataMapEmbed, [], {
                pesos: pesos,
                tickers: tickers,
                valorInicial: valorInicial,
                aporteMensal: aporteMensal,
                dataInicio: dataInicio,
                dataFim: dataFim,
                rebalDias: rebalDias
            });
            return;
        }

        // Otherwise, fetch the individual JSON files (requires a local server).
        var fetches = {};
        for (var t = 0; t < tickers.length; t++) {
            fetches[tickers[t]] = 'data/etfs/' + tickers[t] + '.json';
        }
        fetches['_cdi'] = 'data/cdi.json';
        fetches['_ibov'] = 'data/ibov.json';
        fetches['_ipca'] = 'data/ipca.json';

        var fetchKeys = Object.keys(fetches);
        var dataMap = {};
        var fetchErrors = [];

        // Fetch files one at a time (sequential) so a single-threaded static
        // server (e.g. python -m http.server) doesn't drop concurrent
        // connections. Each request retries once on failure.
        function fetchComRetry(url, tentativasRestantes) {
            return fetch(url)
                .then(function (resp) {
                    if (!resp.ok) throw new Error('HTTP ' + resp.status);
                    return resp.json();
                })
                .catch(function (err) {
                    if (tentativasRestantes > 0) {
                        return fetchComRetry(url, tentativasRestantes - 1);
                    }
                    throw err;
                });
        }

        function carregarSequencial(indice) {
            if (indice >= fetchKeys.length) {
                onAllDataLoaded(dataMap, fetchErrors, {
                    pesos: pesos,
                    tickers: tickers,
                    valorInicial: valorInicial,
                    aporteMensal: aporteMensal,
                    dataInicio: dataInicio,
                    dataFim: dataFim,
                    rebalDias: rebalDias
                });
                return;
            }
            var key = fetchKeys[indice];
            fetchComRetry(fetches[key], 1)
                .then(function (json) {
                    dataMap[key] = json;
                })
                .catch(function (err) {
                    fetchErrors.push(key + ': ' + err.message);
                })
                .finally(function () {
                    carregarSequencial(indice + 1);
                });
        }

        carregarSequencial(0);
    }

    function onAllDataLoaded(dataMap, fetchErrors, config) {
        var loadingEl = el('resultado-loading');
        var erroEl = el('resultado-erro');
        var contentEl = el('resultado-content');

        loadingEl.style.display = 'none';

        // Check for critical errors (ETF data missing)
        var missingEtfs = [];
        for (var i = 0; i < config.tickers.length; i++) {
            if (!dataMap[config.tickers[i]]) {
                missingEtfs.push(config.tickers[i]);
            }
        }

        if (missingEtfs.length > 0 || !dataMap['_cdi']) {
            erroEl.style.display = '';

            var aberturaLocal = location.protocol === 'file:';
            var so404 = fetchErrors.length > 0 && fetchErrors.every(function (e) {
                return e.indexOf('HTTP 404') !== -1;
            });

            var html = '<h3>Dados não encontrados</h3>' +
                '<p>Não foi possível carregar os dados necessários para a simulação.</p>' +
                (missingEtfs.length > 0 ? '<p>ETFs faltantes: <strong>' + missingEtfs.join(', ') + '</strong></p>' : '');

            if (aberturaLocal) {
                html += '<p style="margin-top:12px;">Você abriu o arquivo com <strong>duplo-clique</strong> (endereço <code>file://</code>). ' +
                    'O navegador bloqueia o carregamento de dados locais nesse modo.</p>' +
                    '<p>Rode um servidor local na pasta do projeto e acesse via <code>http://localhost</code>:</p>' +
                    '<code>python -m http.server 8080</code>' +
                    '<p style="margin-top:8px;">Depois abra <code>http://localhost:8080/alocacao/</code></p>';
            } else if (so404) {
                html += '<p style="margin-top:12px;">Os arquivos de dados não foram encontrados no servidor. Baixe-os:</p>' +
                    '<code>node tools/fetch-dados.mjs</code>';
            } else {
                html += '<code>node tools/fetch-dados.mjs</code>' +
                    '<p style="margin-top:12px;">Execute o comando acima para baixar os dados históricos.</p>';
            }

            if (fetchErrors.length > 0) {
                html += '<p style="margin-top:12px;font-size:12px;color:#888;">Detalhe técnico: ' +
                    fetchErrors.join(' · ') + '</p>';
            }

            erroEl.innerHTML = html;
            return;
        }

        // Run backtest
        try {
            var backtestConfig = {
                pesos: config.pesos,
                tickers: config.tickers,
                valorInicial: config.valorInicial,
                aporteMensal: config.aporteMensal,
                dataInicio: config.dataInicio,
                dataFim: config.dataFim,
                rebalDias: config.rebalDias,
                dadosEtfs: {},
                dadosCdi: dataMap['_cdi'],
                dadosIbov: dataMap['_ibov'],
                dadosIpca: dataMap['_ipca']
            };

            for (var t = 0; t < config.tickers.length; t++) {
                backtestConfig.dadosEtfs[config.tickers[t]] = dataMap[config.tickers[t]];
            }

            var resultado = Backtest.rodar(backtestConfig);
            state.resultado = resultado;

            contentEl.style.display = '';
            renderResultado(resultado, config);

        } catch (err) {
            erroEl.style.display = '';
            erroEl.innerHTML = '<h3>Erro na simulação</h3>' +
                '<p>' + (err.message || 'Erro desconhecido') + '</p>';
        }
    }

    // -----------------------------------------------------------------------
    // Step 3: Render Results
    // -----------------------------------------------------------------------

    function renderResultado(res, config) {
        // Hero: retorno acumulado
        el('res-retorno-acum').textContent = fmtPct(res.retornoAcumulado);

        // Metric cards
        el('res-retorno-anual').textContent = fmtPct(res.retornoAnualizado);
        el('res-volatilidade').textContent = fmtPct(res.volatilidade);
        el('res-sharpe').textContent = fmtNum(res.sharpe);
        el('res-drawdown').textContent = fmtPct(res.drawdownMaximo);
        el('res-beta').textContent = fmtNum(res.beta);
        el('res-pct-cdi').textContent = fmtNum(res.percentualCDI) + '%';

        // Charts
        renderChartPatrimonio(res, config);
        renderChartComposicao(res, config);

        // Correlation matrix
        renderCorrelationMatrix(res);

        // Status box
        renderStatusBox(res);
    }

    // -----------------------------------------------------------------------
    // Chart: Evolucao Patrimonial
    // -----------------------------------------------------------------------

    function renderChartPatrimonio(res, config) {
        var canvas = el('chart-patrimonio');
        if (!canvas) return;

        // Destroy previous chart
        if (state.charts.patrimonio) {
            state.charts.patrimonio.destroy();
            state.charts.patrimonio = null;
        }

        var curvaCarteira = res.curvaCarteira || [];
        var curvaCdi = res.curvaCdi || [];
        var curvaIbov = res.curvaIbov || [];
        var curvaIpca5 = res.curvaIpca5 || [];

        // Build labels (use date strings if available, otherwise day index)
        var labels = [];
        var dataCarteira = [];
        var dataCdi = [];
        var dataIbov = [];
        var dataIpca5 = [];

        var maxLen = curvaCarteira.length;

        // Downsample if too many points (for performance)
        var step = maxLen > 1000 ? Math.ceil(maxLen / 500) : 1;

        for (var i = 0; i < maxLen; i += step) {
            var item = curvaCarteira[i];
            labels.push(item.data || item.dia || i);
            dataCarteira.push(typeof item.valor === 'number' ? item.valor : item);

            if (i < curvaCdi.length) {
                var cdiItem = curvaCdi[i];
                dataCdi.push(typeof cdiItem.valor === 'number' ? cdiItem.valor : cdiItem);
            }
            if (i < curvaIbov.length) {
                var ibovItem = curvaIbov[i];
                dataIbov.push(typeof ibovItem.valor === 'number' ? ibovItem.valor : ibovItem);
            }
            if (i < curvaIpca5.length) {
                var ipcaItem = curvaIpca5[i];
                dataIpca5.push(typeof ipcaItem.valor === 'number' ? ipcaItem.valor : ipcaItem);
            }
        }

        // Always include last point
        if (maxLen > 0 && (maxLen - 1) % step !== 0) {
            var last = curvaCarteira[maxLen - 1];
            labels.push(last.data || last.dia || maxLen - 1);
            dataCarteira.push(typeof last.valor === 'number' ? last.valor : last);
            if (curvaCdi.length > 0) {
                var lastCdi = curvaCdi[curvaCdi.length - 1];
                dataCdi.push(typeof lastCdi.valor === 'number' ? lastCdi.valor : lastCdi);
            }
            if (curvaIbov.length > 0) {
                var lastIbov = curvaIbov[curvaIbov.length - 1];
                dataIbov.push(typeof lastIbov.valor === 'number' ? lastIbov.valor : lastIbov);
            }
            if (curvaIpca5.length > 0) {
                var lastIpca = curvaIpca5[curvaIpca5.length - 1];
                dataIpca5.push(typeof lastIpca.valor === 'number' ? lastIpca.valor : lastIpca);
            }
        }

        var datasets = [
            {
                label: 'Carteira',
                data: dataCarteira,
                borderColor: '#010E30',
                backgroundColor: 'rgba(1, 14, 48, 0.05)',
                borderWidth: 2.5,
                fill: true,
                pointRadius: 0,
                tension: 0.1
            }
        ];

        if (dataCdi.length > 0) {
            datasets.push({
                label: 'CDI',
                data: dataCdi,
                borderColor: '#14B550',
                borderWidth: 1.5,
                borderDash: [6, 3],
                fill: false,
                pointRadius: 0,
                tension: 0.1
            });
        }

        if (dataIbov.length > 0) {
            datasets.push({
                label: 'Ibovespa',
                data: dataIbov,
                borderColor: '#E67E22',
                borderWidth: 1.5,
                borderDash: [6, 3],
                fill: false,
                pointRadius: 0,
                tension: 0.1
            });
        }

        if (dataIpca5.length > 0) {
            datasets.push({
                label: 'IPCA + 5%',
                data: dataIpca5,
                borderColor: '#8E44AD',
                borderWidth: 1.5,
                borderDash: [4, 4],
                fill: false,
                pointRadius: 0,
                tension: 0.1
            });
        }

        state.charts.patrimonio = new Chart(canvas, {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { usePointStyle: true, padding: 16, font: { size: 12 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ctx.dataset.label + ': ' + Simulathos.formatCurrency(ctx.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: true,
                        ticks: {
                            maxTicksLimit: 8,
                            font: { size: 11 },
                            maxRotation: 0
                        },
                        grid: { display: false }
                    },
                    y: {
                        display: true,
                        ticks: {
                            font: { size: 11 },
                            callback: function (val) {
                                return Simulathos.formatCurrencyShort(val);
                            }
                        },
                        grid: { color: 'rgba(0,0,0,0.04)' }
                    }
                }
            }
        });
    }

    // -----------------------------------------------------------------------
    // Chart: Composicao Final
    // -----------------------------------------------------------------------

    function renderChartComposicao(res, config) {
        var canvas = el('chart-composicao');
        if (!canvas) return;

        if (state.charts.composicao) {
            state.charts.composicao.destroy();
            state.charts.composicao = null;
        }

        // Use final weights from the backtest result, or fall back to original allocation
        var pesosFinais = res.pesosFinais || config.pesos;
        var tickers = Object.keys(pesosFinais);
        var labels = [];
        var data = [];
        var colors = [
            '#010E30', '#2980B9', '#27AE60', '#E67E22', '#8E44AD',
            '#E74C3C', '#1ABC9C', '#F39C12', '#34495E', '#D35400',
            '#16A085', '#C0392B', '#7F8C8D', '#2C3E50', '#9B59B6'
        ];

        for (var i = 0; i < tickers.length; i++) {
            labels.push(tickers[i]);
            data.push(Math.round(pesosFinais[tickers[i]] * 10000) / 100); // to % with 2 decimals
        }

        state.charts.composicao = new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, tickers.length),
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 16, font: { size: 12 }, usePointStyle: true }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ctx.label + ': ' + ctx.parsed.toFixed(1) + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    // -----------------------------------------------------------------------
    // Correlation Matrix
    // -----------------------------------------------------------------------

    function renderCorrelationMatrix(res) {
        var tableEl = el('corr-matrix');
        if (!tableEl) return;

        var corrData = res.matrizCorrelacao;
        if (!corrData || !corrData.labels || corrData.labels.length === 0) {
            tableEl.innerHTML = '<tr><td style="padding:20px; color:var(--zw-text-muted);">Dados insuficientes para matriz de correlação.</td></tr>';
            return;
        }

        var labels = corrData.labels;
        var matrix = corrData.matrix;

        var html = '<thead><tr><th></th>';
        for (var h = 0; h < labels.length; h++) {
            html += '<th>' + labels[h] + '</th>';
        }
        html += '</tr></thead><tbody>';

        for (var i = 0; i < labels.length; i++) {
            html += '<tr><th>' + labels[i] + '</th>';
            for (var j = 0; j < labels.length; j++) {
                var val = matrix[i][j];
                var bg = getCorrColor(val, i === j);
                var textColor = i === j ? '#666' : (Math.abs(val) > 0.5 ? '#fff' : '#333');
                html += '<td style="background:' + bg + '; color:' + textColor + ';">' +
                    val.toFixed(2).replace('.', ',') + '</td>';
            }
            html += '</tr>';
        }
        html += '</tbody>';

        tableEl.innerHTML = html;
    }

    function getCorrColor(val, isDiagonal) {
        if (isDiagonal) return '#E0E0E0';
        var absVal = Math.abs(val);
        if (absVal < 0.3) return '#27AE60';
        if (absVal < 0.7) return '#F39C12';
        return '#E74C3C';
    }

    // -----------------------------------------------------------------------
    // Status Box
    // -----------------------------------------------------------------------

    function renderStatusBox(res) {
        var box = el('status-box');
        if (!box) return;

        var sharpeVal = res.sharpe;
        var statusClass, title, text;

        if (sharpeVal > 0.5) {
            statusClass = 'status-positive';
            title = 'Boa relação risco-retorno';
            text = buildStatusText(res, 'positive');
        } else if (sharpeVal >= 0) {
            statusClass = 'status-warning';
            title = 'Relação risco-retorno moderada';
            text = buildStatusText(res, 'warning');
        } else {
            statusClass = 'status-negative';
            title = 'Retorno abaixo do CDI — carteira destruiu valor no período';
            text = buildStatusText(res, 'negative');
        }

        box.className = 'zw-status-box ' + statusClass;
        box.innerHTML = '<h4>' + title + '</h4>' + text;
    }

    function buildStatusText(res, level) {
        var items = [];

        items.push('Retorno acumulado de <strong>' + fmtPct(res.retornoAcumulado) + '</strong> no período, equivalente a <strong>' + fmtNum(res.percentualCDI) + '% do CDI</strong>.');

        items.push('Índice Sharpe de <strong>' + fmtNum(res.sharpe) + '</strong> com volatilidade anualizada de <strong>' + fmtPct(res.volatilidade) + '</strong>.');

        if (res.drawdownMaximo < -0.15) {
            items.push('Drawdown máximo de <strong>' + fmtPct(res.drawdownMaximo) + '</strong> — a carteira teve queda expressiva em algum momento do período.');
        } else {
            items.push('Drawdown máximo de <strong>' + fmtPct(res.drawdownMaximo) + '</strong>.');
        }

        if (level === 'positive') {
            items.push('A carteira apresentou boa diversificação e retorno ajustado ao risco no período analisado.');
        } else if (level === 'warning') {
            items.push('Considere ajustar a alocação para melhorar a relação risco-retorno.');
        } else {
            items.push('A carteira rendeu menos que o CDI no período. Avalie a concentração em ativos de risco e o horizonte de investimento.');
        }

        var html = '<ul>';
        for (var i = 0; i < items.length; i++) {
            html += '<li>' + items[i] + '</li>';
        }
        html += '</ul>';
        return html;
    }

    // -----------------------------------------------------------------------
    // Step 4: Relatorio
    // -----------------------------------------------------------------------

    function renderRelatorio(res, config) {
        if (!res) return;

        // Carteira
        var carteiraHtml = '';
        var tickers = config.tickers;
        for (var i = 0; i < tickers.length; i++) {
            var etfInfo = Catalogo.porTicker(tickers[i]);
            var nome = etfInfo ? etfInfo.nome : tickers[i];
            var peso = (config.pesos[tickers[i]] * 100).toFixed(0);
            carteiraHtml += '<div class="zw-relatorio-item"><span>' + tickers[i] + ' — ' + nome + '</span><span>' + peso + '%</span></div>';
        }
        el('rel-carteira').innerHTML = carteiraHtml;

        // Premissas
        var rebalLabels = { '0': 'Nunca (buy & hold)', '21': 'Mensal', '63': 'Trimestral', '252': 'Anual' };
        var rebalLabel = rebalLabels[String(config.rebalDias)] || config.rebalDias + ' dias';
        var premissasHtml = '';
        premissasHtml += '<div class="zw-relatorio-item"><span>Valor inicial</span><span>' + Simulathos.formatCurrency(config.valorInicial) + '</span></div>';
        premissasHtml += '<div class="zw-relatorio-item"><span>Aporte mensal</span><span>' + Simulathos.formatCurrency(config.aporteMensal) + '</span></div>';
        premissasHtml += '<div class="zw-relatorio-item"><span>Período</span><span>' + formatDateBR(config.dataInicio) + ' a ' + formatDateBR(config.dataFim) + '</span></div>';
        premissasHtml += '<div class="zw-relatorio-item"><span>Rebalanceamento</span><span>' + rebalLabel + '</span></div>';
        el('rel-premissas').innerHTML = premissasHtml;

        // Metricas
        var metricasHtml = '';
        metricasHtml += '<div class="zw-relatorio-item"><span>Retorno acumulado</span><span>' + fmtPct(res.retornoAcumulado) + '</span></div>';
        metricasHtml += '<div class="zw-relatorio-item"><span>Retorno anualizado</span><span>' + fmtPct(res.retornoAnualizado) + '</span></div>';
        metricasHtml += '<div class="zw-relatorio-item"><span>Volatilidade anualizada</span><span>' + fmtPct(res.volatilidade) + '</span></div>';
        metricasHtml += '<div class="zw-relatorio-item"><span>Índice Sharpe</span><span>' + fmtNum(res.sharpe) + '</span></div>';
        metricasHtml += '<div class="zw-relatorio-item"><span>Drawdown máximo</span><span>' + fmtPct(res.drawdownMaximo) + '</span></div>';
        metricasHtml += '<div class="zw-relatorio-item"><span>Beta (vs Ibovespa)</span><span>' + fmtNum(res.beta) + '</span></div>';
        metricasHtml += '<div class="zw-relatorio-item"><span>% do CDI</span><span>' + fmtNum(res.percentualCDI) + '%</span></div>';
        el('rel-metricas').innerHTML = metricasHtml;

        // Analise (reuse status box logic)
        var analiseBox = el('rel-analise');
        var sharpeVal = res.sharpe;
        var statusClass, title, text;
        if (sharpeVal > 0.5) {
            statusClass = 'status-positive';
            title = 'Boa relação risco-retorno';
            text = buildStatusText(res, 'positive');
        } else if (sharpeVal >= 0) {
            statusClass = 'status-warning';
            title = 'Relação risco-retorno moderada';
            text = buildStatusText(res, 'warning');
        } else {
            statusClass = 'status-negative';
            title = 'Retorno abaixo do CDI — carteira destruiu valor no período';
            text = buildStatusText(res, 'negative');
        }
        analiseBox.className = 'zw-status-box ' + statusClass;
        analiseBox.innerHTML = '<h4>' + title + '</h4>' + text;
    }

    function formatDateBR(dateStr) {
        if (!dateStr) return '';
        var parts = dateStr.split('-');
        if (parts.length === 3) return parts[2] + '/' + parts[1] + '/' + parts[0];
        return dateStr;
    }

    // -----------------------------------------------------------------------
    // Navigation & Validation Hooks
    // -----------------------------------------------------------------------

    function initNavigation() {
        // Override step 1 -> step 2 to validate
        var btnNext1 = el('btn-step1-next');
        if (btnNext1) {
            // Remove the default data-next behavior (handled by wizard)
            // and add our validation check
            btnNext1.removeAttribute('data-next');
            btnNext1.addEventListener('click', function () {
                if (!validateStep1()) {
                    updateTotal(); // refresh validation messages
                    return;
                }
                wizard.goToStep(2);
            });
        }

        // Simular button
        var btnSimular = el('btn-simular');
        if (btnSimular) {
            btnSimular.addEventListener('click', function () {
                runSimulation();
            });
        }

        // Exportar PDF
        var btnPdf = el('btn-exportar-pdf');
        if (btnPdf) {
            btnPdf.addEventListener('click', function () {
                window.print();
            });
        }

        // Nova Simulacao
        var btnNova = el('btn-nova-simulacao');
        if (btnNova) {
            btnNova.addEventListener('click', function () {
                wizard.goToStep(1);
            });
        }
    }

    // -----------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------

    function init() {
        // Initialize wizard navigation
        wizard = Simulathos.initStepWizard({
            onStepChange: function (step) {
                // When moving to step 4 (relatorio), populate report
                if (step === 4 && state.resultado) {
                    var tickers = Object.keys(state.selected);
                    var pesos = {};
                    for (var i = 0; i < tickers.length; i++) {
                        pesos[tickers[i]] = state.selected[tickers[i]] / 100;
                    }
                    renderRelatorio(state.resultado, {
                        pesos: pesos,
                        tickers: tickers,
                        valorInicial: Simulathos.parseCurrency(el('valor-inicial').value),
                        aporteMensal: Simulathos.parseCurrency(el('aporte-mensal').value),
                        dataInicio: el('data-inicio').value,
                        dataFim: el('data-fim').value,
                        rebalDias: parseInt(el('rebalanceamento').value, 10)
                    });
                }
            }
        });

        // Initialize currency masks
        Simulathos.initCurrencyMasks();

        // Render ETF catalog
        renderCatalog();

        // Set up premissas defaults
        initPremissas();

        // Set up navigation hooks
        initNavigation();
    }

    // Boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
