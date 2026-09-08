// shared/js/motor/__tests__/metricas.test.js
// Testes de shared/js/motor/metricas.js contra o CONTRATO do motor v2.0.0.
// Alguns destes testes so devem passar depois que metricas.js for corrigido
// para cumprir o contrato — ver shared/js/motor/README.md.
'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var carregarMotor = require('./_carrega').carregarMotor;
var fixtures = require('./_fixtures');

function proximo(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

test('Metricas.MOTOR_VERSION === "2.0.0"', function () {
  var Metricas = carregarMotor().Metricas;
  assert.strictEqual(Metricas.MOTOR_VERSION, '2.0.0');
});

test('retornoAnualizado: retorno diario constante, 252 dias uteis, diasCorridos=365 ~= (1+r)^252 - 1', function () {
  var Metricas = carregarMotor().Metricas;
  var r = 0.0005;
  var retAcum = Math.pow(1 + r, 252) - 1;
  var esperado = Math.pow(1 + r, 252) - 1; // mesma quantidade; diasCorridos=365 fica bem proximo de 1 ano
  var atual = Metricas.retornoAnualizado(retAcum, 252, 365);
  assert.ok(
    proximo(atual, esperado, 1e-3),
    'retornoAnualizado(' + retAcum + ', 252, 365) = ' + atual + ', esperado ~= ' + esperado
  );
});

test('retornoAnualizado: sem diasCorridos, mantem compatibilidade 252/numDiasUteis', function () {
  var Metricas = carregarMotor().Metricas;
  var retAcum = 0.10;
  var numDias = 126; // meio ano util
  var esperado = Math.pow(1 + retAcum, 252 / numDias) - 1;
  var atual = Metricas.retornoAnualizado(retAcum, numDias);
  assert.ok(proximo(atual, esperado, 1e-9), 'atual=' + atual + ' esperado=' + esperado);
});

test('drawdownMaximo: serie com um unico drawdown fabricado de -20%', function () {
  var Metricas = carregarMotor().Metricas;
  // dia1: +10% (novo pico em 1.10); dia2: -20% => equity 0.88; dd = (0.88-1.10)/1.10 = -0.20 exato
  var retornos = [0.10, -0.20, 0.05];
  var dd = Metricas.drawdownMaximo(retornos);
  assert.ok(proximo(dd, -0.20, 1e-9), 'drawdownMaximo=' + dd + ', esperado -0.20');
});

test('sharpe: carteira identica ao ativo livre de risco => sharpe = 0', function () {
  var Metricas = carregarMotor().Metricas;
  var rf = [];
  for (var i = 0; i < 60; i++) rf.push(0.0003 + 0.00001 * i); // rf variavel dia a dia, nao constante
  var ret = rf.slice(); // carteira == rf em todos os dias => excesso sempre 0
  var sh = Metricas.sharpe(ret, rf);
  assert.ok(proximo(sh, 0, 1e-9), 'sharpe=' + sh + ', esperado 0');
});

test('volatilidadeAnualizada e sharpe usam raiz de diasUteisPorAno customizado', function () {
  var Metricas = carregarMotor().Metricas;
  var ret = [];
  for (var i = 0; i < 60; i++) ret.push((i % 2 === 0) ? 0.01 : -0.005);
  var vol252 = Metricas.volatilidadeAnualizada(ret, 252);
  var vol12 = Metricas.volatilidadeAnualizada(ret, 12);
  // mesma serie, base de anualizacao diferente => proporcao = sqrt(252/12)
  var razaoEsperada = Math.sqrt(252 / 12);
  assert.ok(
    proximo(vol252 / vol12, razaoEsperada, 1e-6),
    'razao vol252/vol12=' + (vol252 / vol12) + ', esperado ' + razaoEsperada
  );
});

test('rebalancear: buy&hold sintetico (freq=Infinity) bate com formula analitica', function () {
  var Metricas = carregarMotor().Metricas;
  var A = [], B = [];
  for (var i = 0; i < 252; i++) { A.push(0.002); B.push(-0.001); }
  var retornos = { A: A, B: B };
  var pesos = { A: 0.5, B: 0.5 };

  var serieCarteira = Metricas.rebalancear(retornos, pesos, Infinity);
  var acc = 1;
  for (var i = 0; i < serieCarteira.length; i++) acc *= (1 + serieCarteira[i]);

  var analitico = 0.5 * Math.pow(1.002, 252) + 0.5 * Math.pow(0.999, 252) - 1;
  assert.ok(
    proximo(acc - 1, 0.215822, 1e-6) && proximo(acc - 1, analitico, 1e-6),
    'acumulado=' + (acc - 1) + ', esperado 0.215822 (analitico=' + analitico + ')'
  );
});

test('rebalancear: frequencia 63 produz resultado diferente de Infinity (nunca rebalancear)', function () {
  var Metricas = carregarMotor().Metricas;
  var A = [], B = [];
  for (var i = 0; i < 252; i++) { A.push(0.002); B.push(-0.001); }
  var retornos = { A: A, B: B };
  var pesos = { A: 0.5, B: 0.5 };

  var serie63 = Metricas.rebalancear(retornos, pesos, 63);
  var serieInf = Metricas.rebalancear(retornos, pesos, Infinity);

  var acc63 = 1, accInf = 1;
  for (var i = 0; i < serie63.length; i++) acc63 *= (1 + serie63[i]);
  for (var i = 0; i < serieInf.length; i++) accInf *= (1 + serieInf[i]);

  assert.ok(
    Math.abs(acc63 - accInf) > 1e-6,
    'rebalanceamento a cada 63 dias deveria divergir do buy&hold puro: acc63=' + acc63 + ' accInf=' + accInf
  );
});

test('sortino: 252 dias (52 negativos -0.5%, 200 positivos +0.1%, rf=0) ~= -1.6641', function () {
  var Metricas = carregarMotor().Metricas;
  var ret = [];
  for (var i = 0; i < 200; i++) ret.push(0.0010);
  for (var i = 0; i < 52; i++) ret.push(-0.0050);
  var rf = new Array(252).fill(0);

  var s = Metricas.sortino(ret, rf);
  assert.ok(proximo(s, -1.6641, 1e-3), 'sortino=' + s + ', esperado ~= -1.6641');
});

test('sortino: sem nenhum dia negativo => null (nunca 99)', function () {
  var Metricas = carregarMotor().Metricas;
  var ret = [];
  for (var i = 0; i < 100; i++) ret.push(0.0007);
  var rf = new Array(100).fill(0);
  var s = Metricas.sortino(ret, rf);
  assert.strictEqual(s, null, 'sortino deveria ser null quando nao ha dia negativo, veio ' + s);
});

test('sortino: apenas 30 observacoes => null (minimo de 60 dias)', function () {
  var Metricas = carregarMotor().Metricas;
  var ret = [];
  for (var i = 0; i < 25; i++) ret.push(0.001);
  for (var i = 0; i < 5; i++) ret.push(-0.002);
  var rf = new Array(30).fill(0);
  var s = Metricas.sortino(ret, rf);
  assert.strictEqual(s, null, 'sortino com 30 observacoes deveria ser null, veio ' + s);
});

test('percentualDoCDI: retorno da carteira negativo => null', function () {
  var Metricas = carregarMotor().Metricas;
  var pct = Metricas.percentualDoCDI(-0.95, 0.758);
  assert.strictEqual(pct, null, 'percentualDoCDI(-0.95, 0.758) deveria ser null, veio ' + pct);
});

test('percentualDoCDI: retorno do CDI <= 0 => null', function () {
  var Metricas = carregarMotor().Metricas;
  var pct = Metricas.percentualDoCDI(0.10, 0);
  assert.strictEqual(pct, null, 'percentualDoCDI(0.10, 0) deveria ser null, veio ' + pct);
});

// -----------------------------------------------------------------------
// comeCotas
// -----------------------------------------------------------------------

test('comeCotas: regime "acoes" nao tem come-cotas => aplicavel:false', function () {
  var Metricas = carregarMotor().Metricas;
  var datas = fixtures.gerarDiasUteis('2020-01-02', 60);
  var retornos = datas.map(function () { return 0.0005; });
  var resultado = Metricas.comeCotas(retornos, datas, 'acoes');
  assert.strictEqual(resultado.aplicavel, false, 'regime acoes deveria retornar aplicavel:false');
});

test('comeCotas: rf_longo, 504 pregoes (2 anos) de +0.05%/dia => exatamente 4 eventos (mai/nov x2), perda menor que a formula antiga sem reset de base', function () {
  var Metricas = carregarMotor().Metricas;
  var datas = fixtures.gerarDiasUteis('2020-01-02', 504);
  var r = 0.0005;
  var retornos = datas.map(function () { return r; });

  var resultado = Metricas.comeCotas(retornos, datas, 'rf_longo');

  assert.strictEqual(resultado.aplicavel, true, 'regime rf_longo deveria ser aplicavel');
  assert.strictEqual(resultado.eventos.length, 4, 'deveria haver 4 eventos (mai/nov x2 anos), veio ' + resultado.eventos.length);

  // As datas dos eventos devem ser o ultimo pregao de maio/novembro presente em "datas"
  var byYearMonth = {};
  datas.forEach(function (d) { byYearMonth[d.substring(0, 7)] = d; });
  var esperadas = [];
  Object.keys(byYearMonth).sort().forEach(function (ym) {
    var mm = ym.substring(5, 7);
    if (mm === '05' || mm === '11') esperadas.push(byYearMonth[ym]);
  });
  var datasEventos = resultado.eventos.map(function (e) { return e.data; });
  // Nota: resultado.eventos veio de dentro do vm.context isolado (ver _carrega.js),
  // entao o array tem o Array.prototype DAQUELE realm — assert.deepStrictEqual falharia
  // por diferenca de prototype mesmo com conteudo identico. Comparamos por JSON.
  assert.strictEqual(
    JSON.stringify(datasEventos),
    JSON.stringify(esperadas),
    'datas dos eventos nao batem com ultimo pregao de mai/nov: ' + JSON.stringify(datasEventos) + ' vs ' + JSON.stringify(esperadas)
  );

  assert.strictEqual(typeof resultado.perdaPP, 'number');
  assert.ok(resultado.perdaPP > 0, 'perdaPP deveria ser positivo (regime tem come-cotas), veio ' + resultado.perdaPP);

  var retornoBruto = Math.pow(1 + r, datas.length) - 1;
  assert.ok(
    proximo(resultado.retornoBruto, retornoBruto, 1e-9),
    'retornoBruto=' + resultado.retornoBruto + ', esperado ' + retornoBruto
  );

  // perdaPP deve ser (retornoBruto - retornoLiquido), possivelmente expresso em pontos
  // percentuais (x100 — "PP" de perdaPP). O contrato nao fixa a escala, entao normalizamos
  // para fracao antes de comparar com a referencia abaixo.
  var perdaFracaoDoResultado = resultado.retornoBruto - resultado.retornoLiquido;
  var perdaPPComoFracao = proximo(resultado.perdaPP, perdaFracaoDoResultado, 1e-9)
    ? resultado.perdaPP
    : resultado.perdaPP / 100;
  assert.ok(
    proximo(perdaPPComoFracao, perdaFracaoDoResultado, 1e-9),
    'perdaPP (' + resultado.perdaPP + ') deveria corresponder a retornoBruto-retornoLiquido (' + perdaFracaoDoResultado + '), em fracao ou p.p.'
  );

  // Referencia: formula ANTIGA "valor -= (valor-1)*0.15 sem reset" (base sempre = 1, nunca
  // reposicionada para o valor pos-imposto) — deve perder MAIS que a formula correta (com
  // reset de base a cada evento), pois tributa o ganho acumulado inteiro a cada evento.
  var eventosSet = {};
  resultado.eventos.forEach(function (e) { eventosSet[e.data] = true; });
  var valorAntigo = 1;
  for (var i = 0; i < datas.length; i++) {
    valorAntigo *= (1 + retornos[i]);
    if (eventosSet[datas[i]]) {
      valorAntigo -= (valorAntigo - 1) * 0.15;
    }
  }
  var perdaPPAntiga = retornoBruto - (valorAntigo - 1); // em fracao

  assert.ok(
    perdaPPComoFracao < perdaPPAntiga,
    'perdaPP em fracao (' + perdaPPComoFracao + ') deveria ser menor que a perda da formula antiga sem reset (' + perdaPPAntiga + ')'
  );
});

test('comeCotas: cada evento so cobra imposto quando V > base (nao cobra sobre perda)', function () {
  var Metricas = carregarMotor().Metricas;
  // serie com retorno negativo constante: nunca deveria gerar imposto > 0
  var datas = fixtures.gerarDiasUteis('2020-01-02', 504);
  var retornos = datas.map(function () { return -0.0003; });
  var resultado = Metricas.comeCotas(retornos, datas, 'multimercado');
  resultado.eventos.forEach(function (e) {
    assert.strictEqual(e.imposto, 0, 'evento em serie negativa nao deveria gerar imposto (so cobra quando V > base): ' + JSON.stringify(e));
  });
});
