// shared/js/motor/__tests__/backtest.test.js
// Testes de shared/js/motor/backtest.js contra o CONTRATO do motor v2.0.0.
// Alguns destes testes so devem passar depois que backtest.js for corrigido
// para cumprir o contrato — ver shared/js/motor/README.md.
'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var carregarMotor = require('./_carrega').carregarMotor;
var fixtures = require('./_fixtures');

function proximo(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

test('Backtest.rodar: CDI faltante em 5 datas => diagnostico.cdiFaltante=5 e carry-forward (sem retorno zero nas datas faltantes)', function () {
  var Backtest = carregarMotor().Backtest;
  var datas = fixtures.gerarDiasUteis('2022-01-03', 300);

  var precosA = fixtures.gerarPrecos(datas, 0.0006, 100);
  var precosB = fixtures.gerarPrecos(datas, -0.0003, 100);

  var pularCdi = {};
  var indicesFaltantes = [40, 90, 140, 190, 240];
  indicesFaltantes.forEach(function (idx) { pularCdi[datas[idx]] = true; });

  // taxa do CDI crescente dia a dia (nao-constante e nunca zero) para que o
  // carry-forward seja distinguivel de "zero no dia faltante"
  var cdi = fixtures.gerarSerieTaxa(datas, function (i) { return 0.0002 + 0.0000005 * i; }, pularCdi);

  var config = {
    dados: { A: precosA, B: precosB },
    cdi: cdi,
    pesos: { A: 0.5, B: 0.5 },
    valorInicial: 100000,
    aporteMensal: 0,
    rebalanceamento: 0,
    dataInicio: datas[0],
    dataFim: datas[datas.length - 1]
  };

  var resultado = Backtest.rodar(config);

  assert.strictEqual(
    resultado.resumo.diagnostico.cdiFaltante,
    5,
    'cdiFaltante deveria ser 5, veio ' + resultado.resumo.diagnostico.cdiFaltante
  );

  // As datas de retorno comecam no 2o dia de "datas" (precosParaRetornos descarta o 1o).
  // Verifica que, nas datas em que faltou CDI, a curva do CDI NAO ficou achatada
  // (retorno 0), ou seja, usou a ultima taxa conhecida (carry-forward), nao 0.
  var datasRetorno = resultado.curvas.datas;
  indicesFaltantes.forEach(function (idxOriginal) {
    var dataFaltante = datas[idxOriginal];
    var i = datasRetorno.indexOf(dataFaltante);
    assert.ok(i > 0, 'data faltante ' + dataFaltante + ' deveria estar em curvas.datas (posicao > 0)');
    var razao = resultado.curvas.cdi[i] / resultado.curvas.cdi[i - 1];
    assert.ok(
      Math.abs(razao - 1) > 1e-9,
      'curvas.cdi nao deveria ficar achatada (retorno 0) na data faltante ' + dataFaltante + ', razao=' + razao
    );
  });
});

test('Backtest.rodar: ativo comecando 100 pregoes depois => diagnostico.ativoLimitante e ele; diasUteis<252 => resumo.retornoAnualizado=null', function () {
  var Backtest = carregarMotor().Backtest;
  var datasCompletas = fixtures.gerarDiasUteis('2022-01-03', 300);
  var datasAtrasadas = datasCompletas.slice(100); // B so comeca 100 pregoes depois (200 datas)

  var precosA = fixtures.gerarPrecos(datasCompletas, 0.0004, 100);
  var precosB = fixtures.gerarPrecos(datasAtrasadas, -0.0002, 50);

  var cdi = fixtures.gerarSerieTaxa(datasCompletas, 0.0003);

  var config = {
    dados: { A: precosA, B: precosB },
    cdi: cdi,
    pesos: { A: 0.5, B: 0.5 },
    valorInicial: 100000,
    rebalanceamento: 0,
    dataInicio: datasCompletas[0],
    dataFim: datasCompletas[datasCompletas.length - 1]
  };

  var resultado = Backtest.rodar(config);

  assert.strictEqual(
    resultado.resumo.diagnostico.ativoLimitante,
    'B',
    'ativoLimitante deveria ser B (comeca 100 pregoes depois), veio ' + resultado.resumo.diagnostico.ativoLimitante
  );

  assert.ok(
    resultado.resumo.diasUteis < 252,
    'diasUteis deveria ser < 252 nesse cenario (janela limitada por B), veio ' + resultado.resumo.diasUteis
  );

  assert.strictEqual(
    resultado.resumo.retornoAnualizado,
    null,
    'retornoAnualizado deveria ser null quando diasUteis<252, veio ' + resultado.resumo.retornoAnualizado
  );
});

test('Backtest.rodar: serie com salto de +2000% lanca Error "dado_suspeito:..."', function () {
  var Backtest = carregarMotor().Backtest;
  var datas = fixtures.gerarDiasUteis('2022-01-03', 60);

  var precosA = fixtures.gerarPrecos(datas, 0.0003, 100);
  // Injeta um salto suspeito (+2000%) no meio da serie
  var idxSalto = 30;
  precosA[idxSalto] = { data: precosA[idxSalto].data, close: precosA[idxSalto - 1].close * 21 };
  // mantem a serie coerente dali em diante (nao precisa, mas evita outro motivo de reprovacao)
  for (var i = idxSalto + 1; i < precosA.length; i++) {
    precosA[i] = { data: precosA[i].data, close: precosA[idxSalto].close * (1 + 0.0003 * (i - idxSalto)) };
  }

  var cdi = fixtures.gerarSerieTaxa(datas, 0.0003);

  var config = {
    dados: { A: precosA },
    cdi: cdi,
    pesos: { A: 1 },
    valorInicial: 100000,
    rebalanceamento: 0,
    dataInicio: datas[0],
    dataFim: datas[datas.length - 1]
  };

  assert.throws(
    function () { Backtest.rodar(config); },
    function (err) {
      return err instanceof Error && err.message.indexOf('dado_suspeito:') === 0;
    },
    'deveria lancar Error comecando com "dado_suspeito:"'
  );
});

test('Backtest.rodar: config.validarDados=false ignora series suspeitas (nao lanca)', function () {
  var Backtest = carregarMotor().Backtest;
  var datas = fixtures.gerarDiasUteis('2022-01-03', 60);
  var precosA = fixtures.gerarPrecos(datas, 0.0003, 100);
  var idxSalto = 30;
  precosA[idxSalto] = { data: precosA[idxSalto].data, close: precosA[idxSalto - 1].close * 21 };

  var cdi = fixtures.gerarSerieTaxa(datas, 0.0003);
  var config = {
    dados: { A: precosA },
    cdi: cdi,
    pesos: { A: 1 },
    valorInicial: 100000,
    rebalanceamento: 0,
    validarDados: false,
    dataInicio: datas[0],
    dataFim: datas[datas.length - 1]
  };

  assert.doesNotThrow(function () { Backtest.rodar(config); });
});

test('Backtest.rodar: 300 pregoes sem rebalanceamento (drift) => composicao final != composicaoAlvo', function () {
  var Backtest = carregarMotor().Backtest;
  var datas = fixtures.gerarDiasUteis('2022-01-03', 300);
  var precosA = fixtures.gerarPrecos(datas, 0.0008, 100); // ativo ganhador
  var precosB = fixtures.gerarPrecos(datas, -0.0005, 100); // ativo perdedor
  var cdi = fixtures.gerarSerieTaxa(datas, 0.0003);

  var pesosAlvo = { A: 0.5, B: 0.5 };
  var config = {
    dados: { A: precosA, B: precosB },
    cdi: cdi,
    pesos: pesosAlvo,
    valorInicial: 100000,
    rebalanceamento: 0, // nunca rebalancear (drift real)
    dataInicio: datas[0],
    dataFim: datas[datas.length - 1]
  };

  var resultado = Backtest.rodar(config);

  assert.ok(resultado.composicaoAlvo, 'resultado deveria expor composicaoAlvo');
  assert.ok(resultado.composicao, 'resultado deveria expor composicao');

  // Le o peso de um ticker independente do formato exato (objeto {ticker:peso}
  // ou {labels:[], pesos:[]}), ja que o contrato define a SEMANTICA dos
  // campos mas nao fixa a forma do objeto.
  function pesoDe(obj, ticker) {
    if (!obj) return undefined;
    if (typeof obj[ticker] === 'number') return obj[ticker];
    if (Array.isArray(obj.labels) && Array.isArray(obj.pesos)) {
      var idx = obj.labels.indexOf(ticker);
      return idx >= 0 ? obj.pesos[idx] : undefined;
    }
    return undefined;
  }

  var alvoA = pesoDe(resultado.composicaoAlvo, 'A');
  var finalA = pesoDe(resultado.composicao, 'A');

  assert.strictEqual(typeof alvoA, 'number', 'composicaoAlvo deveria ter peso numerico para A');
  assert.strictEqual(typeof finalA, 'number', 'composicao deveria ter peso numerico para A');

  // composicaoAlvo == pesos de entrada
  assert.ok(proximo(alvoA, 0.5, 1e-9), 'composicaoAlvo.A deveria ser 0.5 (peso de entrada), veio ' + alvoA);

  // composicao (peso final apos drift de 300 pregoes com retornos bem diferentes) deve
  // ter se afastado visivelmente de 50/50 (A ganhador deveria pesar mais)
  assert.ok(
    Math.abs(finalA - alvoA) > 0.01,
    'composicao final deveria divergir de composicaoAlvo apos drift, veio A=' + finalA
  );
  assert.ok(
    finalA > alvoA,
    'ativo ganhador (A) deveria ter peso final maior que o peso alvo apos drift'
  );
});

test('Backtest.rodar: retornosCarteira, retornosPorAtivo e curvas.drawdown (<=0) presentes e coerentes', function () {
  var Backtest = carregarMotor().Backtest;
  var datas = fixtures.gerarDiasUteis('2022-01-03', 260);
  var precosA = fixtures.gerarPrecos(datas, 0.0004, 100);
  var precosB = fixtures.gerarPrecos(datas, 0.0001, 100);
  var cdi = fixtures.gerarSerieTaxa(datas, 0.0003);

  var config = {
    dados: { A: precosA, B: precosB },
    cdi: cdi,
    pesos: { A: 0.5, B: 0.5 },
    valorInicial: 100000,
    rebalanceamento: 21,
    dataInicio: datas[0],
    dataFim: datas[datas.length - 1]
  };

  var resultado = Backtest.rodar(config);

  assert.ok(Array.isArray(resultado.retornosCarteira));
  assert.strictEqual(resultado.retornosCarteira.length, resultado.resumo.diasUteis);

  assert.ok(resultado.retornosPorAtivo && Array.isArray(resultado.retornosPorAtivo.A));
  assert.ok(resultado.retornosPorAtivo && Array.isArray(resultado.retornosPorAtivo.B));

  assert.ok(Array.isArray(resultado.curvas.drawdown));
  resultado.curvas.drawdown.forEach(function (v) {
    if (v !== null) {
      assert.ok(v <= 1e-12, 'curvas.drawdown deveria ser sempre <= 0, veio ' + v);
    }
  });

  // diagnostico basico
  assert.strictEqual(resultado.resumo.diagnostico.motorVersion, '2.0.0');
  assert.ok(typeof resultado.resumo.diagnostico.dataCorteDados === 'string');
});

test('Backtest.rodar: >=252 dias uteis => resumo.retornoAnualizado anualiza por calendario (nao null)', function () {
  var Backtest = carregarMotor().Backtest;
  var datas = fixtures.gerarDiasUteis('2022-01-03', 300);
  var precosA = fixtures.gerarPrecos(datas, 0.0004, 100);
  var precosB = fixtures.gerarPrecos(datas, 0.0002, 100);
  var cdi = fixtures.gerarSerieTaxa(datas, 0.0003);

  var config = {
    dados: { A: precosA, B: precosB },
    cdi: cdi,
    pesos: { A: 0.5, B: 0.5 },
    valorInicial: 100000,
    rebalanceamento: 21,
    dataInicio: datas[0],
    dataFim: datas[datas.length - 1]
  };

  var resultado = Backtest.rodar(config);
  assert.ok(resultado.resumo.diasUteis >= 252, 'pre-condicao: diasUteis deveria ser >=252, veio ' + resultado.resumo.diasUteis);
  assert.notStrictEqual(resultado.resumo.retornoAnualizado, null);
  assert.strictEqual(typeof resultado.resumo.retornoAnualizado, 'number');
});
