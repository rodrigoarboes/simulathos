// shared/js/motor/__tests__/_fixtures.js
// Geradores de dados sinteticos usados pelos testes do motor.
'use strict';

/**
 * Gera N datas de pregao (dias uteis, sem feriados) em ordem crescente,
 * no formato "YYYY-MM-DD", comecando em dataInicioISO (inclusive).
 * Simplificacao deliberada: pula so sabado/domingo (sem calendario de
 * feriados da B3) — suficiente para dados sinteticos de teste.
 * @param {string} dataInicioISO ex: "2020-01-02"
 * @param {number} quantidade
 * @returns {string[]}
 */
function gerarDiasUteis(dataInicioISO, quantidade) {
  var datas = [];
  var d = new Date(dataInicioISO + 'T12:00:00Z');
  while (datas.length < quantidade) {
    var dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      var y = d.getUTCFullYear();
      var m = String(d.getUTCMonth() + 1);
      if (m.length < 2) m = '0' + m;
      var dd = String(d.getUTCDate());
      if (dd.length < 2) dd = '0' + dd;
      datas.push(y + '-' + m + '-' + dd);
    }
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return datas;
}

/**
 * Gera uma serie de precos [{data, close}] a partir de um retorno diario
 * constante (ou de uma funcao retorno(i) => numero), comecando em precoInicial.
 * O primeiro elemento tem o preco inicial (sem retorno aplicado ainda) —
 * espelha o formato real de series de preco consumido por precosParaRetornos,
 * que descarta o primeiro dia (nao ha preco anterior para calcular retorno).
 * @param {string[]} datas
 * @param {number|function} retorno constante ou funcao(i)
 * @param {number} precoInicial
 * @returns {Array<{data:string, close:number}>}
 */
function gerarPrecos(datas, retorno, precoInicial) {
  var fn = (typeof retorno === 'function') ? retorno : function () { return retorno; };
  var closes = [precoInicial];
  for (var i = 1; i < datas.length; i++) {
    closes.push(closes[i - 1] * (1 + fn(i)));
  }
  var serie = [];
  for (var i = 0; i < datas.length; i++) {
    serie.push({ data: datas[i], close: closes[i] });
  }
  return serie;
}

/**
 * Gera uma serie de taxas [{data, valor}] (formato CDI/IPCA: valor = taxa
 * do dia, nao preco). Permite pular datas especificas (para simular dados
 * faltantes) via o parametro pularDatas (Set/objeto de datas a omitir).
 * @param {string[]} datas
 * @param {number|function} valor constante ou funcao(i)
 * @param {Object} [pularDatas] mapa {data: true} de datas a NAO incluir
 * @returns {Array<{data:string, valor:number}>}
 */
function gerarSerieTaxa(datas, valor, pularDatas) {
  var fn = (typeof valor === 'function') ? valor : function () { return valor; };
  pularDatas = pularDatas || {};
  var serie = [];
  for (var i = 0; i < datas.length; i++) {
    if (pularDatas[datas[i]]) continue;
    serie.push({ data: datas[i], valor: fn(i) });
  }
  return serie;
}

module.exports = {
  gerarDiasUteis: gerarDiasUteis,
  gerarPrecos: gerarPrecos,
  gerarSerieTaxa: gerarSerieTaxa
};
