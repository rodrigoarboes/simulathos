// shared/js/motor/__tests__/tributacao.test.js
// Tributação de renda fixa: faixas de ETF, prazo médio de carteira e a conta
// da tese do "pedacinho longo".
'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var T = require('../tributacao.js');

function proximo(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

// ── Faixas de ETF de renda fixa ────────────────────────────────────────────
test('faixas: 25% ate 180 dias, 20% de 181 a 720, 15% acima de 720', function () {
  assert.strictEqual(T.aliquotaEtfRf(1).aliquota, 0.25);
  assert.strictEqual(T.aliquotaEtfRf(180).aliquota, 0.25);
  assert.strictEqual(T.aliquotaEtfRf(181).aliquota, 0.20);
  assert.strictEqual(T.aliquotaEtfRf(720).aliquota, 0.20);
  assert.strictEqual(T.aliquotaEtfRf(721).aliquota, 0.15);
});

test('caso LFTS11: a STN definiu repactuacao de UM dia => 25%, nao 15%', function () {
  // O ETF tem Tesouro Selic de vencimento longo, mas a repactuacao de fundo de
  // indice lastreado em LFT e diaria. Quem deduz a aliquota da DURATION erra
  // por 10 pontos percentuais. Este teste tranca esse erro.
  var r = T.aliquotaEtfRf(1);
  assert.strictEqual(r.aliquota, 0.25);
  assert.strictEqual(r.faixa, 'até 180 dias');
});

test('caso LFTB11: indice de 760 dias alvo => 15%, logo acima da fronteira', function () {
  assert.strictEqual(T.aliquotaEtfRf(760).aliquota, 0.15);
});

test('prazo nao informado nao vira aliquota otimista: aplicavel=false', function () {
  for (var i = 0; i < 4; i++) {
    var entrada = [null, undefined, NaN, -5][i];
    var r = T.aliquotaEtfRf(entrada);
    assert.strictEqual(r.aplicavel, false, 'entrada ' + String(entrada));
    assert.strictEqual(r.aliquota, null);
  }
});

// ── Prazo médio ponderado ──────────────────────────────────────────────────
test('prazo medio: media ponderada pelos pesos', function () {
  var r = T.prazoMedioPonderado([
    { peso: 0.5, prazoDias: 100 },
    { peso: 0.5, prazoDias: 900 }
  ]);
  assert.strictEqual(r.prazoDias, 500);
  assert.strictEqual(r.pesoConsiderado, 1);
});

test('ativo SEM prazo (acao, FII, cripto) fica fora da media, nao entra como zero', function () {
  // Entrar como zero derrubaria o prazo medio e daria uma aliquota otimista.
  var r = T.prazoMedioPonderado([
    { peso: 0.6, prazoDias: 900 },
    { peso: 0.4, prazoDias: null }
  ]);
  assert.strictEqual(r.prazoDias, 900);
  assert.strictEqual(r.pesoConsiderado, 0.6);
  assert.strictEqual(r.pesoIgnorado, 0.4);
});

test('carteira sem nenhum ativo de prazo conhecido => aplicavel:false', function () {
  var r = T.prazoMedioPonderado([{ peso: 1, prazoDias: null }]);
  assert.strictEqual(r.aplicavel, false);
  assert.strictEqual(r.prazoDias, null);
});

test('peso zero ou negativo e ignorado', function () {
  var r = T.prazoMedioPonderado([
    { peso: 0, prazoDias: 10 },
    { peso: -1, prazoDias: 10 },
    { peso: 1, prazoDias: 800 }
  ]);
  assert.strictEqual(r.prazoDias, 800);
});

// ── Fundo: a carteira é classificada junta ─────────────────────────────────
test('fundo: acima de 720 dias e longo prazo (15%); ate 720 e curto (20%)', function () {
  assert.strictEqual(T.aliquotaFundoRf(721).aliquota, 0.15);
  assert.strictEqual(T.aliquotaFundoRf(721).classe, 'longo prazo');
  assert.strictEqual(T.aliquotaFundoRf(720).aliquota, 0.20);
  assert.strictEqual(T.aliquotaFundoRf(720).classe, 'curto prazo');
});

// ── A TESE: quanto de NTN-B longa puxa a carteira pra 15% ──────────────────
test('a tese do pedacinho longo: carteira 100% LFT (1 dia) + NTN-B 2060 reproduz os ~9% do LFTB11', function () {
  // NTN-B 2060 com duration ~23 anos = ~8435 dias.
  var r = T.pesoParaVirarLongoPrazo([{ peso: 1, prazoDias: 1 }], 8435);
  assert.strictEqual(r.necessario, true);
  // O LFTB11 real usa 9% de IPCA+ 2060 com 91% de LFT. A conta bate.
  assert.ok(proximo(r.pesoExtra, 0.093, 0.005), 'deu ' + r.pesoExtra);
});

test('a conta fecha: aplicando o peso calculado, a carteira passa dos 720 dias', function () {
  var carteira = [{ peso: 1, prazoDias: 1 }];
  var x = T.pesoParaVirarLongoPrazo(carteira, 8435).pesoExtra;
  var comLongo = carteira.concat([{ peso: x, prazoDias: 8435 }]);
  var medio = T.prazoMedioPonderado(comLongo).prazoDias;
  assert.ok(medio > T.LIMITE_LONGO_PRAZO_DIAS, 'prazo medio ficou em ' + medio);
  assert.strictEqual(T.aliquotaFundoRf(medio).aliquota, 0.15);
});

test('carteira que JA e de longo prazo nao precisa de pedacinho nenhum', function () {
  var r = T.pesoParaVirarLongoPrazo([{ peso: 1, prazoDias: 900 }], 8435);
  assert.strictEqual(r.necessario, false);
  assert.strictEqual(r.pesoExtra, 0);
});

test('ativo curto nao serve de alavanca: avisa em vez de devolver numero errado', function () {
  var r = T.pesoParaVirarLongoPrazo([{ peso: 1, prazoDias: 1 }], 500);
  assert.strictEqual(r.pesoExtra, null);
  assert.match(r.motivo, /longo o bastante/);
});

test('quanto mais curta a NTN-B, mais peso e preciso', function () {
  var carteira = [{ peso: 1, prazoDias: 1 }];
  var com2060 = T.pesoParaVirarLongoPrazo(carteira, 8435).pesoExtra;
  var com2030 = T.pesoParaVirarLongoPrazo(carteira, 1500).pesoExtra;
  assert.ok(com2030 > com2060, '2030 exigiu ' + com2030 + ' e 2060 ' + com2060);
});

// ── Líquido ────────────────────────────────────────────────────────────────
test('liquido na venda desconta a aliquota do ganho', function () {
  assert.ok(proximo(T.liquidoNaVenda(0.32, 0.15), 0.272, 1e-12));
  assert.ok(proximo(T.liquidoNaVenda(0.32, 0.25), 0.24, 1e-12));
});

test('prejuizo nao gera imposto', function () {
  assert.strictEqual(T.liquidoNaVenda(-0.10, 0.15), -0.10);
});

test('a diferenca entre 25% e 15% num ganho de 32% e de 3,2 pontos', function () {
  var caro = T.liquidoNaVenda(0.32, 0.25);
  var barato = T.liquidoNaVenda(0.32, 0.15);
  assert.ok(proximo(barato - caro, 0.032, 1e-12));
});
