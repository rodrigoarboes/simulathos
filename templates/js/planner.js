/* ==========================================================================
   Zanella Wealth — Financial Planner Logic
   ========================================================================== */

(function () {
    'use strict';

    // -----------------------------------------------------------------------
    // Currency formatting helpers
    // -----------------------------------------------------------------------

    function parseCurrency(str) {
        if (!str) return 0;
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        });
    }

    function formatCurrencyShort(value) {
        if (Math.abs(value) >= 1_000_000) {
            return 'R$ ' + (value / 1_000_000).toFixed(1).replace('.', ',') + 'M';
        }
        if (Math.abs(value) >= 1_000) {
            return 'R$ ' + (value / 1_000).toFixed(0) + 'mil';
        }
        return formatCurrency(value);
    }

    // -----------------------------------------------------------------------
    // Currency input mask
    // -----------------------------------------------------------------------

    function applyCurrencyMask(input) {
        input.addEventListener('input', function () {
            let v = this.value.replace(/\D/g, '');
            if (!v) { this.value = ''; return; }
            v = (parseInt(v, 10) / 100).toFixed(2);
            v = v.replace('.', ',');
            v = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            this.value = v;
        });
    }

    document.querySelectorAll('[data-currency]').forEach(applyCurrencyMask);

    // -----------------------------------------------------------------------
    // Step navigation
    // -----------------------------------------------------------------------

    const steps = document.querySelectorAll('.zw-step');
    const navLinks = document.querySelectorAll('.zw-nav-link');

    function goToStep(n) {
        steps.forEach(function (s) { s.classList.remove('active'); });
        navLinks.forEach(function (l) { l.classList.remove('active'); });

        var target = document.querySelector('.zw-step[data-step="' + n + '"]');
        var link = document.querySelector('.zw-nav-link[data-step="' + n + '"]');
        if (target) target.classList.add('active');
        if (link) link.classList.add('active');

        // Mark previous steps as completed in nav
        navLinks.forEach(function (l) {
            if (parseInt(l.dataset.step) < n) l.classList.add('completed');
        });

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (n === 5) calculatePlan();
    }

    document.querySelectorAll('[data-next]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            goToStep(parseInt(this.dataset.next));
        });
    });

    document.querySelectorAll('[data-prev]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            goToStep(parseInt(this.dataset.prev));
        });
    });

    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            goToStep(parseInt(this.dataset.step));
        });
    });

    // -----------------------------------------------------------------------
    // Live summaries (Step 2 & 3)
    // -----------------------------------------------------------------------

    var receitaFields = ['salario', 'outras-receitas', 'renda-conjuge'];
    var despesaFields = ['moradia', 'alimentacao', 'transporte', 'saude', 'educacao', 'lazer', 'outras-despesas'];
    var investFields = ['renda-fixa', 'renda-variavel', 'previdencia', 'outros-investimentos'];
    var bensFields = ['imoveis', 'veiculos'];
    var dividaFields = ['financiamento-imovel', 'outras-dividas'];

    function sumFields(ids) {
        return ids.reduce(function (acc, id) {
            var el = document.getElementById(id);
            return acc + (el ? parseCurrency(el.value) : 0);
        }, 0);
    }

    function updateSummaries() {
        var totalReceitas = sumFields(receitaFields);
        var totalDespesas = sumFields(despesaFields);
        var poupanca = totalReceitas - totalDespesas;

        setText('total-receitas', formatCurrency(totalReceitas));
        setText('total-despesas', formatCurrency(totalDespesas));
        var poupancaEl = document.getElementById('capacidade-poupanca');
        if (poupancaEl) {
            poupancaEl.textContent = formatCurrency(poupanca);
            poupancaEl.classList.toggle('zw-text-danger', poupanca < 0);
            poupancaEl.classList.toggle('zw-text-success', poupanca > 0);
        }

        var totalInvest = sumFields(investFields);
        var totalBens = sumFields(bensFields);
        var totalDividas = sumFields(dividaFields);
        var patrimonioLiquido = totalInvest + totalBens - totalDividas;

        setText('total-investimentos', formatCurrency(totalInvest));
        setText('total-bens', formatCurrency(totalBens));
        setText('total-dividas', formatCurrency(totalDividas));
        var plEl = document.getElementById('patrimonio-liquido');
        if (plEl) {
            plEl.textContent = formatCurrency(patrimonioLiquido);
            plEl.classList.toggle('zw-text-danger', patrimonioLiquido < 0);
            plEl.classList.toggle('zw-text-success', patrimonioLiquido >= 0);
        }
    }

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    // Attach live update to all currency fields
    document.querySelectorAll('[data-currency]').forEach(function (inp) {
        inp.addEventListener('input', updateSummaries);
    });

    // -----------------------------------------------------------------------
    // Core calculation
    // -----------------------------------------------------------------------

    var patrimonioChart = null;
    var composicaoChart = null;

    function calculatePlan() {
        var idadeAtual = parseInt(document.getElementById('idade').value) || 35;
        var idadeAposent = parseInt(document.getElementById('idade-aposentadoria').value) || 65;
        var expectativaVida = parseInt(document.getElementById('expectativa-vida').value) || 85;
        var rendaDesejada = parseCurrency(document.getElementById('renda-desejada').value);
        var aporteMensal = parseCurrency(document.getElementById('aporte-mensal').value);
        var rentAnual = parseFloat(document.getElementById('rentabilidade').value) || 5;
        var inssEstimado = parseCurrency(document.getElementById('inss-estimado').value);
        var patrimonioInvestido = sumFields(investFields);

        var anosAcumulacao = Math.max(idadeAposent - idadeAtual, 1);
        var anosGozo = Math.max(expectativaVida - idadeAposent, 1);

        // Monthly real rate
        var taxaMensalReal = Math.pow(1 + rentAnual / 100, 1 / 12) - 1;

        // Required patrimony using present value of annuity (real terms)
        var rendaMensalLiquida = Math.max(rendaDesejada - inssEstimado, 0);
        var nMesesGozo = anosGozo * 12;
        var patrimonioNecessario;
        if (taxaMensalReal > 0) {
            patrimonioNecessario = rendaMensalLiquida * (1 - Math.pow(1 + taxaMensalReal, -nMesesGozo)) / taxaMensalReal;
        } else {
            patrimonioNecessario = rendaMensalLiquida * nMesesGozo;
        }

        // Projected patrimony: FV of current investments + FV of annuity (monthly contributions)
        var nMesesAcum = anosAcumulacao * 12;
        var fvPatrimonioAtual = patrimonioInvestido * Math.pow(1 + taxaMensalReal, nMesesAcum);
        var fvAportes;
        if (taxaMensalReal > 0) {
            fvAportes = aporteMensal * (Math.pow(1 + taxaMensalReal, nMesesAcum) - 1) / taxaMensalReal;
        } else {
            fvAportes = aporteMensal * nMesesAcum;
        }
        var patrimonioProjetado = fvPatrimonioAtual + fvAportes;

        var deficit = patrimonioProjetado - patrimonioNecessario;

        // Ideal monthly contribution to reach target
        var aporteIdeal;
        var necessarioAposAporteAtual = patrimonioNecessario - fvPatrimonioAtual;
        if (necessarioAposAporteAtual <= 0) {
            aporteIdeal = 0;
        } else if (taxaMensalReal > 0) {
            aporteIdeal = necessarioAposAporteAtual * taxaMensalReal / (Math.pow(1 + taxaMensalReal, nMesesAcum) - 1);
        } else {
            aporteIdeal = necessarioAposAporteAtual / nMesesAcum;
        }

        // Projected passive income from projected patrimony
        var rendaPassivaProjetada = patrimonioProjetado * taxaMensalReal + inssEstimado;

        // Update result cards
        setText('patrimonio-necessario', formatCurrency(patrimonioNecessario));
        setText('res-anos', anosAcumulacao);
        setText('res-patrimonio-atual', formatCurrency(patrimonioInvestido));
        setText('res-patrimonio-projetado', formatCurrency(patrimonioProjetado));

        var deficitEl = document.getElementById('res-deficit');
        if (deficitEl) {
            deficitEl.textContent = formatCurrency(Math.abs(deficit));
            deficitEl.classList.remove('zw-text-success', 'zw-text-danger');
            if (deficit >= 0) {
                deficitEl.textContent = '+ ' + formatCurrency(deficit);
                deficitEl.classList.add('zw-text-success');
            } else {
                deficitEl.textContent = '- ' + formatCurrency(Math.abs(deficit));
                deficitEl.classList.add('zw-text-danger');
            }
        }

        setText('res-aporte-ideal', formatCurrency(Math.max(aporteIdeal, 0)));
        setText('res-renda-passiva', formatCurrency(Math.max(rendaPassivaProjetada, 0)));

        // Status box
        renderStatusBox(deficit, aporteIdeal, aporteMensal, rendaPassivaProjetada, rendaDesejada, patrimonioProjetado, patrimonioNecessario);

        // Charts
        renderCharts(idadeAtual, idadeAposent, patrimonioInvestido, aporteMensal, taxaMensalReal, patrimonioNecessario);
    }

    // -----------------------------------------------------------------------
    // Status box
    // -----------------------------------------------------------------------

    function renderStatusBox(deficit, aporteIdeal, aporteAtual, rendaPassiva, rendaDesejada, projetado, necessario) {
        var box = document.getElementById('status-box');
        if (!box) return;

        var pct = necessario > 0 ? (projetado / necessario * 100) : 0;

        if (deficit >= 0) {
            box.className = 'zw-status-box status-positive';
            box.innerHTML =
                '<h4>Parabéns! Seu plano está no caminho certo.</h4>' +
                '<p>Com o aporte mensal atual, você atingirá <strong>' + pct.toFixed(0) + '%</strong> da meta.</p>' +
                '<ul>' +
                '<li>Renda passiva projetada: <strong>' + formatCurrency(rendaPassiva) + '/mês</strong></li>' +
                '<li>Superávit projetado: <strong>' + formatCurrency(deficit) + '</strong></li>' +
                '</ul>';
        } else if (pct >= 70) {
            box.className = 'zw-status-box status-warning';
            box.innerHTML =
                '<h4>Quase lá! Pequenos ajustes podem fazer a diferença.</h4>' +
                '<p>Você atingirá <strong>' + pct.toFixed(0) + '%</strong> da meta. Considere aumentar o aporte mensal para <strong>' + formatCurrency(aporteIdeal) + '</strong>.</p>' +
                '<ul>' +
                '<li>Déficit projetado: <strong>' + formatCurrency(Math.abs(deficit)) + '</strong></li>' +
                '<li>Aporte mensal necessário: <strong>' + formatCurrency(aporteIdeal) + '</strong> (atual: ' + formatCurrency(aporteAtual) + ')</li>' +
                '</ul>';
        } else {
            box.className = 'zw-status-box status-negative';
            box.innerHTML =
                '<h4>Atenção: seu plano precisa de ajustes significativos.</h4>' +
                '<p>Com o aporte atual, você atingirá apenas <strong>' + pct.toFixed(0) + '%</strong> da meta.</p>' +
                '<ul>' +
                '<li>Déficit projetado: <strong>' + formatCurrency(Math.abs(deficit)) + '</strong></li>' +
                '<li>Aporte mensal necessário: <strong>' + formatCurrency(aporteIdeal) + '</strong> (atual: ' + formatCurrency(aporteAtual) + ')</li>' +
                '<li>Converse com seu assessor sobre estratégias para aumentar aportes ou revisar a meta.</li>' +
                '</ul>';
        }
    }

    // -----------------------------------------------------------------------
    // Charts
    // -----------------------------------------------------------------------

    function renderCharts(idadeAtual, idadeAposent, patrimonioInicial, aporteMensal, taxaMensal, patrimonioNecessario) {
        var anos = idadeAposent - idadeAtual;
        var labels = [];
        var dataPatrimonio = [];
        var dataAportes = [];
        var dataRendimentos = [];

        var saldo = patrimonioInicial;
        var totalAportado = patrimonioInicial;

        for (var i = 0; i <= anos; i++) {
            labels.push(idadeAtual + i);

            if (i > 0) {
                for (var m = 0; m < 12; m++) {
                    saldo = saldo * (1 + taxaMensal) + aporteMensal;
                    totalAportado += aporteMensal;
                }
            }

            dataPatrimonio.push(Math.round(saldo));
            dataAportes.push(Math.round(totalAportado));
            dataRendimentos.push(Math.round(Math.max(saldo - totalAportado, 0)));
        }

        // Patrimônio projection chart
        var ctx1 = document.getElementById('chart-patrimonio');
        if (!ctx1) return;

        if (patrimonioChart) patrimonioChart.destroy();

        patrimonioChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Patrimônio Projetado',
                        data: dataPatrimonio,
                        borderColor: '#010E30',
                        backgroundColor: 'rgba(1, 14, 48, 0.08)',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHitRadius: 10,
                        borderWidth: 2.5,
                    },
                    {
                        label: 'Meta',
                        data: labels.map(function () { return Math.round(patrimonioNecessario); }),
                        borderColor: '#BEB998',
                        borderDash: [6, 4],
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y);
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Idade' },
                        grid: { display: false },
                    },
                    y: {
                        title: { display: true, text: 'Patrimônio (R$)' },
                        ticks: {
                            callback: function (v) { return formatCurrencyShort(v); },
                        },
                    },
                },
            },
        });

        // Composition chart (stacked area)
        var ctx2 = document.getElementById('chart-composicao');
        if (!ctx2) return;

        if (composicaoChart) composicaoChart.destroy();

        composicaoChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Aportes Acumulados',
                        data: dataAportes,
                        backgroundColor: '#010E30',
                    },
                    {
                        label: 'Rendimentos',
                        data: dataRendimentos,
                        backgroundColor: '#BEB998',
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) {
                                return ctx.dataset.label + ': ' + formatCurrency(ctx.parsed.y);
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        stacked: true,
                        title: { display: true, text: 'Idade' },
                        grid: { display: false },
                    },
                    y: {
                        stacked: true,
                        title: { display: true, text: 'Valor (R$)' },
                        ticks: {
                            callback: function (v) { return formatCurrencyShort(v); },
                        },
                    },
                },
            },
        });
    }

    // -----------------------------------------------------------------------
    // PDF export (basic print-based)
    // -----------------------------------------------------------------------

    var btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', function () {
            window.print();
        });
    }

    // -----------------------------------------------------------------------
    // Initialize
    // -----------------------------------------------------------------------

    updateSummaries();

})();
