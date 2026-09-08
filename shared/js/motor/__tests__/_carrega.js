// shared/js/motor/__tests__/_carrega.js
// Helper de carregamento do motor para os testes (node --test).
//
// Os arquivos metricas.js e backtest.js sao scripts classicos (sem módulos,
// pensados para <script src="...">), que expoem "var Metricas" e
// "var Backtest" como globais. Para testar sem poluir o global do processo
// Node (e sem precisar de package.json/dependencias), cada chamada a
// carregarMotor() executa os dois arquivos num vm.context isolado, na
// mesma ordem em que o HTML os carrega: metricas.js primeiro (Backtest
// depende do global Metricas already existir quando backtest.js roda).
'use strict';

var fs = require('fs');
var path = require('path');
var vm = require('vm');

var MOTOR_DIR = path.join(__dirname, '..');
var METRICAS_PATH = path.join(MOTOR_DIR, 'metricas.js');
var BACKTEST_PATH = path.join(MOTOR_DIR, 'backtest.js');

/**
 * ATENCAO ao escrever novos testes: objetos/arrays devolvidos por Metricas/Backtest
 * vem de dentro deste vm.context isolado, entao pertencem a um "realm" JS diferente
 * do arquivo de teste. Array.isArray funciona normalmente, mas
 * assert.deepStrictEqual(arrayDoMotor, arrayLocal) FALHA mesmo com conteudo identico,
 * porque os prototypes (Array.prototype de cada realm) sao objetos diferentes.
 * Prefira comparar por JSON.stringify(...) ou por elemento (indice a indice) quando
 * o valor comparado atravessa essa fronteira.
 *
 * Carrega uma instancia nova e isolada de Metricas + Backtest.
 * @returns {{Metricas: object, Backtest: object}}
 */
function carregarMotor() {
  var sandbox = {
    console: console,
    Math: Math,
    Object: Object,
    JSON: JSON,
    Array: Array,
    Number: Number,
    String: String,
    Date: Date,
    Error: Error,
    isNaN: isNaN,
    parseFloat: parseFloat,
    parseInt: parseInt
  };
  vm.createContext(sandbox);

  var metricasSrc = fs.readFileSync(METRICAS_PATH, 'utf8');
  vm.runInContext(metricasSrc, sandbox, { filename: 'metricas.js' });

  if (!sandbox.Metricas) {
    throw new Error('_carrega.js: metricas.js nao definiu o global "Metricas"');
  }

  var backtestSrc = fs.readFileSync(BACKTEST_PATH, 'utf8');
  vm.runInContext(backtestSrc, sandbox, { filename: 'backtest.js' });

  if (!sandbox.Backtest) {
    throw new Error('_carrega.js: backtest.js nao definiu o global "Backtest"');
  }

  return { Metricas: sandbox.Metricas, Backtest: sandbox.Backtest, _sandbox: sandbox };
}

module.exports = { carregarMotor: carregarMotor };
