/* ==========================================================================
   Simulador de Aposentadoria — Logic
   Depends on: Simulathos (shared/js/utils.js)
   ========================================================================== */

(function () {
    'use strict';

    var S = Simulathos;

    // -----------------------------------------------------------------------
    // Init masks & wizard
    // -----------------------------------------------------------------------

    S.initCurrencyMasks();

    var wizard = S.initStepWizard({
        onStepChange: function (step) {
            if (step === 5) calculatePlan();
        },
    });

    // -----------------------------------------------------------------------
    // Live summaries (Step 2 & 3)
    // -----------------------------------------------------------------------

    var receitaFields = ['salario', 'outras-receitas', 'renda-conjuge'];
    var despesaFields = ['moradia', 'alimentacao', 'transporte', 'saude', 'educacao', 'lazer', 'outras-despesas'];
    var investFields = ['renda-fixa', 'renda-variavel', 'previdencia', 'outros-investimentos'];
    var bensFields = ['imoveis', 'veiculos'];
    var dividaFields = ['financiamento-imovel', 'outras-dividas'];

    function updateSummaries() {
        var totalReceitas = S.sumFields(receitaFields);
        var totalDespesas = S.sumFields(despesaFields);
        var poupanca = totalReceitas - totalDespesas;

        S.setText('total-receitas', S.formatCurrency(totalReceitas));
        S.setText('total-despesas', S.formatCurrency(totalDespesas));
        var poupancaEl = document.getElementById('capacidade-poupanca');
        if (poupancaEl) {
            poupancaEl.textContent = S.formatCurrency(poupanca);
            poupancaEl.classList.toggle('zw-text-danger', poupanca < 0);
            poupancaEl.classList.toggle('zw-text-success', poupanca > 0);
        }

        var totalInvest = S.sumFields(investFields);
        var totalBens = S.sumFields(bensFields);
        var totalDividas = S.sumFields(dividaFields);
        var patrimonioLiquido = totalInvest + totalBens - totalDividas;

        S.setText('total-investimentos', S.formatCurrency(totalInvest));
        S.setText('total-bens', S.formatCurrency(totalBens));
        S.setText('total-dividas', S.formatCurrency(totalDividas));
        var plEl = document.getElementById('patrimonio-liquido');
        if (plEl) {
            plEl.textContent = S.formatCurrency(patrimonioLiquido);
            plEl.classList.toggle('zw-text-danger', patrimonioLiquido < 0);
            plEl.classList.toggle('zw-text-success', patrimonioLiquido >= 0);
        }
    }

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
        var rendaDesejada = S.parseCurrency(document.getElementById('renda-desejada').value);
        var aporteMensal = S.parseCurrency(document.getElementById('aporte-mensal').value);
        var rentAnual = parseFloat(document.getElementById('rentabilidade').value) || 5;
        var inssEstimado = S.parseCurrency(document.getElementById('inss-estimado').value);
        var patrimonioInvestido = S.sumFields(investFields);

        var anosAcumulacao = Math.max(idadeAposent - idadeAtual, 1);
        var anosGozo = Math.max(expectativaVida - idadeAposent, 1);
        var taxaMensalReal = Math.pow(1 + rentAnual / 100, 1 / 12) - 1;

        var rendaMensalLiquida = Math.max(rendaDesejada - inssEstimado, 0);
        var nMesesGozo = anosGozo * 12;
        var patrimonioNecessario;
        if (taxaMensalReal > 0) {
            patrimonioNecessario = rendaMensalLiquida * (1 - Math.pow(1 + taxaMensalReal, -nMesesGozo)) / taxaMensalReal;
        } else {
            patrimonioNecessario = rendaMensalLiquida * nMesesGozo;
        }

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

        var aporteIdeal;
        var necessarioAposAporteAtual = patrimonioNecessario - fvPatrimonioAtual;
        if (necessarioAposAporteAtual <= 0) {
            aporteIdeal = 0;
        } else if (taxaMensalReal > 0) {
            aporteIdeal = necessarioAposAporteAtual * taxaMensalReal / (Math.pow(1 + taxaMensalReal, nMesesAcum) - 1);
        } else {
            aporteIdeal = necessarioAposAporteAtual / nMesesAcum;
        }

        var rendaPassivaProjetada = patrimonioProjetado * taxaMensalReal + inssEstimado;

        S.setText('patrimonio-necessario', S.formatCurrency(patrimonioNecessario));
        S.setText('res-anos', anosAcumulacao);
        S.setText('res-patrimonio-atual', S.formatCurrency(patrimonioInvestido));
        S.setText('res-patrimonio-projetado', S.formatCurrency(patrimonioProjetado));

        var deficitEl = document.getElementById('res-deficit');
        if (deficitEl) {
            deficitEl.classList.remove('zw-text-success', 'zw-text-danger');
            if (deficit >= 0) {
                deficitEl.textContent = '+ ' + S.formatCurrency(deficit);
                deficitEl.classList.add('zw-text-success');
            } else {
                deficitEl.textContent = '- ' + S.formatCurrency(Math.abs(deficit));
                deficitEl.classList.add('zw-text-danger');
            }
        }

        S.setText('res-aporte-ideal', S.formatCurrency(Math.max(aporteIdeal, 0)));
        S.setText('res-renda-passiva', S.formatCurrency(Math.max(rendaPassivaProjetada, 0)));

        renderStatusBox(deficit, aporteIdeal, aporteMensal, rendaPassivaProjetada, rendaDesejada, patrimonioProjetado, patrimonioNecessario);
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
                '<li>Renda passiva projetada: <strong>' + S.formatCurrency(rendaPassiva) + '/mês</strong></li>' +
                '<li>Superávit projetado: <strong>' + S.formatCurrency(deficit) + '</strong></li>' +
                '</ul>';
        } else if (pct >= 70) {
            box.className = 'zw-status-box status-warning';
            box.innerHTML =
                '<h4>Quase lá! Pequenos ajustes podem fazer a diferença.</h4>' +
                '<p>Você atingirá <strong>' + pct.toFixed(0) + '%</strong> da meta. Considere aumentar o aporte mensal para <strong>' + S.formatCurrency(aporteIdeal) + '</strong>.</p>' +
                '<ul>' +
                '<li>Déficit projetado: <strong>' + S.formatCurrency(Math.abs(deficit)) + '</strong></li>' +
                '<li>Aporte mensal necessário: <strong>' + S.formatCurrency(aporteIdeal) + '</strong> (atual: ' + S.formatCurrency(aporteAtual) + ')</li>' +
                '</ul>';
        } else {
            box.className = 'zw-status-box status-negative';
            box.innerHTML =
                '<h4>Atenção: seu plano precisa de ajustes significativos.</h4>' +
                '<p>Com o aporte atual, você atingirá apenas <strong>' + pct.toFixed(0) + '%</strong> da meta.</p>' +
                '<ul>' +
                '<li>Déficit projetado: <strong>' + S.formatCurrency(Math.abs(deficit)) + '</strong></li>' +
                '<li>Aporte mensal necessário: <strong>' + S.formatCurrency(aporteIdeal) + '</strong> (atual: ' + S.formatCurrency(aporteAtual) + ')</li>' +
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

        var primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--zw-primary').trim();
        var accentColor = getComputedStyle(document.documentElement).getPropertyValue('--zw-accent').trim();

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
                        borderColor: primaryColor,
                        backgroundColor: primaryColor + '14',
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHitRadius: 10,
                        borderWidth: 2.5,
                    },
                    {
                        label: 'Meta',
                        data: labels.map(function () { return Math.round(patrimonioNecessario); }),
                        borderColor: accentColor,
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
                            label: function (ctx) { return ctx.dataset.label + ': ' + S.formatCurrency(ctx.parsed.y); },
                        },
                    },
                },
                scales: {
                    x: { title: { display: true, text: 'Idade' }, grid: { display: false } },
                    y: { title: { display: true, text: 'Patrimônio (R$)' }, ticks: { callback: function (v) { return S.formatCurrencyShort(v); } } },
                },
            },
        });

        var ctx2 = document.getElementById('chart-composicao');
        if (!ctx2) return;

        if (composicaoChart) composicaoChart.destroy();
        composicaoChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Aportes Acumulados', data: dataAportes, backgroundColor: primaryColor },
                    { label: 'Rendimentos', data: dataRendimentos, backgroundColor: accentColor },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' },
                    tooltip: {
                        callbacks: {
                            label: function (ctx) { return ctx.dataset.label + ': ' + S.formatCurrency(ctx.parsed.y); },
                        },
                    },
                },
                scales: {
                    x: { stacked: true, title: { display: true, text: 'Idade' }, grid: { display: false } },
                    y: { stacked: true, title: { display: true, text: 'Valor (R$)' }, ticks: { callback: function (v) { return S.formatCurrencyShort(v); } } },
                },
            },
        });
    }

    // -----------------------------------------------------------------------
    // PDF export
    // -----------------------------------------------------------------------

    var btnExportar = document.getElementById('btn-exportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', function () { window.print(); });
    }

    // -----------------------------------------------------------------------
    // Init
    // -----------------------------------------------------------------------

    updateSummaries();

})();
