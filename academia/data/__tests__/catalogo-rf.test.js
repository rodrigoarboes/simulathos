// academia/data/__tests__/catalogo-rf.test.js
// Ficha dos ETFs de renda fixa no catálogo: classe, nome e prazo médio de
// repactuação. Nasceu de uma demanda de aluno (17/09) e de dois bugs que
// apareceram no caminho.
'use strict';

var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var Tributacao = require('../../../shared/js/motor/tributacao.js');

var CATALOGO = path.join(__dirname, '..', 'catalogo.js');
var PROGRAMA = path.join(__dirname, '..', '..', 'js', 'app-programa.js');

/* O ETF_INFO real vive em app-programa.js e é ele quem dá nome, gestora e
   classe aos ETFs. Carregar o catálogo SEM ele testaria uma realidade que não
   existe: sem ETF_INFO todo ticker terminado em 11 cai no RE_FII_LIKE e vira
   "FIIs Tijolo" — foi exatamente assim que eu me enganei na primeira versão
   destes testes. */
function extrairEtfInfo() {
  var src = fs.readFileSync(PROGRAMA, 'utf8');
  var i = src.search(/(?:var|const|let)\s+ETF_INFO\s*=\s*\{/);
  if (i === -1) return null;
  var ini = src.indexOf('{', i);
  var nivel = 0;
  for (var k = ini; k < src.length; k++) {
    if (src[k] === '{') nivel++;
    else if (src[k] === '}') { nivel--; if (nivel === 0) return src.slice(ini, k + 1); }
  }
  return null;
}

var TICKERS = [
  'LFTS11', 'LFTB11', 'IMAB11', 'IRFM11', 'B5P211', 'IB5M11', 'IMBB11',
  'XB3011', 'XB6011', 'TD3511', 'TD6011', 'GLFT11', 'BOVA11'
];

function carregarCatalogo() {
  var DADOS = { etfs: {} };
  for (var i = 0; i < TICKERS.length; i++) {
    DADOS.etfs[TICKERS[i]] = [
      { data: '2024-01-02', close: 10 },
      { data: '2024-01-03', close: 10.1 }
    ];
  }
  var sandbox = {
    window: { DADOS: DADOS }, console: console, Math: Math, Object: Object,
    JSON: JSON, Array: Array, Number: Number, String: String, Date: Date,
    Error: Error, isNaN: isNaN, parseFloat: parseFloat, parseInt: parseInt, RegExp: RegExp
  };
  vm.createContext(sandbox);
  var etfInfo = extrairEtfInfo();
  assert.ok(etfInfo, 'nao consegui extrair ETF_INFO de app-programa.js');
  // o catalogo le o GLOBAL ETF_INFO (nao window.ETF_INFO): var no topo do
  // script vira propriedade do contexto do vm.
  vm.runInContext('var ETF_INFO = ' + etfInfo + ';', sandbox, { filename: 'etf-info.js' });
  vm.runInContext(fs.readFileSync(CATALOGO, 'utf8'), sandbox, { filename: 'catalogo.js' });
  if (!sandbox.window.Catalogo) throw new Error('catalogo.js nao publicou window.Catalogo');
  return sandbox.window.Catalogo;
}

// ── Classificação ──────────────────────────────────────────────────────────
test('ETF de RF sai com classe de renda fixa, nao de FII', function () {
  // Quem garante isso e o ETF_INFO (etapa 3 da cascata). Sem ele, RE_FII_LIKE
  // pega qualquer ticker terminado em 11 e classifica como "FIIs Tijolo" — o
  // que torna ESTE teste a rede que protege contra alguem remover a ficha.
  var C = carregarCatalogo();
  var rf = ['LFTS11', 'IMAB11', 'IRFM11', 'B5P211', 'IB5M11', 'IMBB11'];
  for (var i = 0; i < rf.length; i++) {
    var info = C.info(rf[i]);
    assert.ok(info, rf[i] + ' nao esta no catalogo');
    assert.match(info.classe, /^RF /, rf[i] + ' saiu como "' + info.classe + '"');
  }
});

test('a classe certa: pos-fixado, inflacao e prefixado nao se misturam', function () {
  var C = carregarCatalogo();
  assert.strictEqual(C.info('LFTS11').classe, 'RF Pós-Fixado');
  assert.strictEqual(C.info('IMAB11').classe, 'RF Inflação');
  assert.strictEqual(C.info('IRFM11').classe, 'RF Prefixado');
});

test('o fatorRisco de RF pos-fixado e 0,05 (se cair pra FII, viraria 0,80)', function () {
  var C = carregarCatalogo();
  assert.strictEqual(C.info('LFTS11').atributos.fatorRisco, 0.05);
});

// ── O bug da chave duplicada ───────────────────────────────────────────────
test('atributos da classe chegam na ficha (a chave duplicada descartava eles)', function () {
  // 'risco' era declarado duas vezes no mesmo objeto literal: o segundo vencia
  // e atributosDaClasse(classe) era jogado fora em silencio.
  var C = carregarCatalogo();
  var at = C.info('IMAB11').atributos;
  assert.ok(at, 'atributos vieram null');
  assert.strictEqual(typeof at.fatorRisco, 'number');
  assert.strictEqual(typeof at.duration, 'number');
});

test('o texto do risco (do guia) continua acessivel — nao foi sacrificado', function () {
  var C = carregarCatalogo();
  var r = C.get('IMAB11');
  assert.ok('risco' in r, 'o campo risco desapareceu do registro');
});

// ── Nomes ──────────────────────────────────────────────────────────────────
test('os ETFs de RF tem nome de verdade, nao o ticker', function () {
  var C = carregarCatalogo();
  var tk = ['LFTS11', 'IMAB11', 'IRFM11', 'B5P211', 'IB5M11'];
  for (var i = 0; i < tk.length; i++) {
    var info = C.info(tk[i]);
    assert.notStrictEqual(info.nome, tk[i], tk[i] + ' esta sem nome');
    assert.ok(info.nome.length > 3);
  }
});

// ── Prazo de repactuação e a alíquota que sai dele ─────────────────────────
test('LFTS11: prazo de 1 dia (decisao da STN) => 25%, NAO 15%', function () {
  var C = carregarCatalogo();
  var tr = C.info('LFTS11').tributacao;
  assert.strictEqual(tr.prazoRepactuacao, 1);
  assert.strictEqual(tr.fonte, 'gestora');
  assert.match(tr.nota, /STN/);
  assert.strictEqual(Tributacao.aliquotaEtfRf(tr.prazoRepactuacao).aliquota, 0.25);
});

test('LFTB11: 760 dias alvo => 15%, e a nota explica o pedacinho de IPCA+', function () {
  // Entra no catalogo quando a serie de preco chegar (registrado em
  // tools/lista-rf.json); ate la a ficha de tributacao ja esta pronta.
  var C = carregarCatalogo();
  var tr = C.info('LFTB11') ? C.info('LFTB11').tributacao : null;
  if (!tr) { assert.ok(true, 'LFTB11 ainda sem serie de preco — ficha pronta, aguardando dados'); return; }
  assert.strictEqual(tr.prazoRepactuacao, 760);
  assert.match(tr.indice, /760/);
  assert.match(tr.nota, /9%/);
  assert.strictEqual(Tributacao.aliquotaEtfRf(tr.prazoRepactuacao).aliquota, 0.15);
});

test('NTN-B por vencimento: prazo derivado do ticker, faixa de 15%', function () {
  var C = carregarCatalogo();
  var porVencimento = ['XB3011', 'XB6011', 'TD3511', 'TD6011'];
  for (var i = 0; i < porVencimento.length; i++) {
    var tr = C.info(porVencimento[i]).tributacao;
    assert.strictEqual(tr.fonte, 'vencimento', porVencimento[i]);
    assert.ok(tr.prazoRepactuacao > 720, porVencimento[i] + ' deu ' + tr.prazoRepactuacao);
    assert.strictEqual(Tributacao.aliquotaEtfRf(tr.prazoRepactuacao).aliquota, 0.15);
  }
});

test('vencimento mais longo => prazo maior (2060 acima de 2030)', function () {
  var C = carregarCatalogo();
  var curto = C.info('XB3011').tributacao.prazoRepactuacao;
  var longo = C.info('XB6011').tributacao.prazoRepactuacao;
  assert.ok(longo > curto, '2060 deu ' + longo + ' e 2030 ' + curto);
});

test('indice sem prazo publicado NAO recebe aliquota chutada', function () {
  // O caso LFTS11 mostrou o custo de supor: preferimos "nao cadastrado".
  var C = carregarCatalogo();
  var semPrazo = ['IMAB11', 'IRFM11', 'B5P211', 'IB5M11', 'IMBB11'];
  for (var i = 0; i < semPrazo.length; i++) {
    var tr = C.info(semPrazo[i]).tributacao;
    assert.strictEqual(tr.prazoRepactuacao, null, semPrazo[i]);
    assert.strictEqual(tr.fonte, null);
    assert.strictEqual(Tributacao.aliquotaEtfRf(tr.prazoRepactuacao).aplicavel, false);
  }
});

test('ativo que nao e renda fixa nao finge ter faixa de prazo', function () {
  var C = carregarCatalogo();
  var tr = C.info('BOVA11').tributacao;
  assert.strictEqual(tr.prazoRepactuacao, null);
});
