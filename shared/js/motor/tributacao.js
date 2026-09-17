// shared/js/motor/tributacao.js — tributação de renda fixa (academia + alocacao)
// Script clássico (var/function + IIFE), igual metricas.js e backtest.js.
//
// POR QUE ESTE MÓDULO EXISTE
// O motor já tinha come-cotas, que é de FUNDO. Faltava o que o ETF de renda
// fixa é: alíquota fixa pelo PRAZO MÉDIO DE REPACTUAÇÃO da carteira do índice,
// retida só na venda, sem come-cotas e sem IOF. Sem isso o simulador não
// conseguia mostrar a tese que motivou este módulo (demanda de aluno, 17/09):
// um pedaço pequeno em NTN-B longa puxa o prazo médio acima de 720 dias e
// derruba a alíquota de 25% para 15%.
//
// CUIDADO QUE ESTE MÓDULO PROTEGE
// Prazo médio de repactuação NÃO é duration. O caso LFTS11 é a prova: ETF de
// Tesouro Selic com títulos de vencimento longo, mas a STN definiu que a
// repactuação de fundo de índice lastreado em LFT é de UM dia — o ETF saiu de
// 15% para 25%. Quem deduz a alíquota da duration erra por 10 pontos.
var Tributacao = (function () {

  var VERSION = '1.0.0';

  // Faixas de IR de ETF de renda fixa, por prazo médio de repactuação da
  // carteira do índice (em dias). Vale da compra à venda: não há redução por
  // tempo de carrego, como no Tesouro Direto.
  var FAIXAS_ETF_RF = [
    { ateDias: 180, aliquota: 0.25, rotulo: 'até 180 dias' },
    { ateDias: 720, aliquota: 0.20, rotulo: '181 a 720 dias' },
    { ateDias: Infinity, aliquota: 0.15, rotulo: 'acima de 720 dias' }
  ];

  // Fundo de renda fixa: a carteira INTEIRA é classificada junta. Acima de 720
  // dias de prazo médio o fundo é "longo prazo" (15%); abaixo, "curto" (20%).
  // É esta regra que a tese do pedacinho longo explora.
  var LIMITE_LONGO_PRAZO_DIAS = 720;
  // A regra é ACIMA de 720 dias, e o prazo legal é contado em dias inteiros.
  // Por isso o cálculo do "quanto preciso botar" mira 721 e não 720: mirar a
  // fronteira exata devolvia o peso que deixa a média em 720 (ou 719,9999 por
  // ponto flutuante) — ou seja, um número que NÃO muda a faixa. O teste pegou.
  var MARGEM_ALVO_DIAS = 1;
  var ALIQUOTA_FUNDO_LONGO = 0.15;
  var ALIQUOTA_FUNDO_CURTO = 0.20;

  function _numero(v) {
    return typeof v === 'number' && isFinite(v) ? v : null;
  }

  /**
   * Alíquota de IR de um ETF de renda fixa.
   * @param {number} prazoRepactuacaoDias prazo médio de repactuação do índice
   * @returns {{aplicavel:boolean, aliquota:number|null, faixa:string|null, motivo:string|null}}
   */
  function aliquotaEtfRf(prazoRepactuacaoDias) {
    var p = _numero(prazoRepactuacaoDias);
    if (p === null || p < 0) {
      return {
        aplicavel: false,
        aliquota: null,
        faixa: null,
        motivo: 'prazo médio de repactuação não informado'
      };
    }
    for (var i = 0; i < FAIXAS_ETF_RF.length; i++) {
      if (p <= FAIXAS_ETF_RF[i].ateDias) {
        return {
          aplicavel: true,
          aliquota: FAIXAS_ETF_RF[i].aliquota,
          faixa: FAIXAS_ETF_RF[i].rotulo,
          motivo: null
        };
      }
    }
    return { aplicavel: false, aliquota: null, faixa: null, motivo: 'prazo fora das faixas' };
  }

  /**
   * Prazo médio ponderado pelos pesos — a conta que decide a faixa de um FUNDO,
   * e a que mostra o efeito de um pedacinho longo na carteira.
   *
   * Ativo sem prazo informado (ação, FII, cripto) fica FORA da média: entrar
   * como zero derrubaria o prazo e daria uma alíquota otimista e errada.
   *
   * @param {Array<{peso:number, prazoDias:number|null}>} itens
   * @returns {{aplicavel:boolean, prazoDias:number|null, pesoConsiderado:number, pesoIgnorado:number}}
   */
  function prazoMedioPonderado(itens) {
    if (!itens || itens.length === 0) {
      return { aplicavel: false, prazoDias: null, pesoConsiderado: 0, pesoIgnorado: 0 };
    }
    var soma = 0;
    var pesoOk = 0;
    var pesoFora = 0;
    for (var i = 0; i < itens.length; i++) {
      var peso = _numero(itens[i] && itens[i].peso) || 0;
      if (peso <= 0) continue;
      var prazo = _numero(itens[i].prazoDias);
      if (prazo === null || prazo < 0) {
        pesoFora += peso;
        continue;
      }
      soma += peso * prazo;
      pesoOk += peso;
    }
    if (pesoOk === 0) {
      return { aplicavel: false, prazoDias: null, pesoConsiderado: 0, pesoIgnorado: pesoFora };
    }
    return {
      aplicavel: true,
      prazoDias: soma / pesoOk,
      pesoConsiderado: pesoOk,
      pesoIgnorado: pesoFora
    };
  }

  /**
   * Alíquota de um FUNDO de renda fixa pelo prazo médio da carteira.
   * @param {number} prazoMedioDias
   */
  function aliquotaFundoRf(prazoMedioDias) {
    var p = _numero(prazoMedioDias);
    if (p === null || p < 0) {
      return { aplicavel: false, aliquota: null, classe: null, motivo: 'prazo médio não informado' };
    }
    var longo = p > LIMITE_LONGO_PRAZO_DIAS;
    return {
      aplicavel: true,
      aliquota: longo ? ALIQUOTA_FUNDO_LONGO : ALIQUOTA_FUNDO_CURTO,
      classe: longo ? 'longo prazo' : 'curto prazo',
      motivo: null
    };
  }

  /**
   * Quanto falta de peso em um ativo longo pra carteira virar "longo prazo".
   * É a pergunta prática da tese: "quanto de NTN-B 2060 eu preciso botar?".
   *
   * @param {Array<{peso:number, prazoDias:number|null}>} itens carteira atual
   * @param {number} prazoDoLongo prazo do ativo que entraria
   * @returns {{necessario:boolean, pesoExtra:number|null, motivo:string|null}}
   */
  function pesoParaVirarLongoPrazo(itens, prazoDoLongo) {
    var atual = prazoMedioPonderado(itens);
    if (!atual.aplicavel) {
      return { necessario: false, pesoExtra: null, motivo: 'carteira sem prazo médio calculável' };
    }
    if (atual.prazoDias > LIMITE_LONGO_PRAZO_DIAS) {
      return { necessario: false, pesoExtra: 0, motivo: 'a carteira já é de longo prazo' };
    }
    var pl = _numero(prazoDoLongo);
    if (pl === null || pl <= LIMITE_LONGO_PRAZO_DIAS + MARGEM_ALVO_DIAS) {
      return {
        necessario: true,
        pesoExtra: null,
        motivo: 'o ativo escolhido não é longo o bastante pra puxar a média'
      };
    }
    // (P·A + x·L) / (P + x) ≥ alvo  →  x ≥ P·(alvo − A) / (L − alvo)
    var alvo = LIMITE_LONGO_PRAZO_DIAS + MARGEM_ALVO_DIAS;
    var P = atual.pesoConsiderado;
    var A = atual.prazoDias;
    var x = (P * (alvo - A)) / (pl - alvo);
    return { necessario: true, pesoExtra: x, motivo: null };
  }

  /**
   * Retorno líquido de IR sobre o ganho. Prejuízo não gera imposto.
   * @param {number} retornoBruto ex.: 0.32 para +32%
   * @param {number} aliquota ex.: 0.15
   */
  function liquidoNaVenda(retornoBruto, aliquota) {
    var r = _numero(retornoBruto);
    var a = _numero(aliquota);
    if (r === null) return null;
    if (a === null || a <= 0 || r <= 0) return r;
    return r * (1 - a);
  }

  return {
    VERSION: VERSION,
    FAIXAS_ETF_RF: FAIXAS_ETF_RF,
    LIMITE_LONGO_PRAZO_DIAS: LIMITE_LONGO_PRAZO_DIAS,
    MARGEM_ALVO_DIAS: MARGEM_ALVO_DIAS,
    aliquotaEtfRf: aliquotaEtfRf,
    prazoMedioPonderado: prazoMedioPonderado,
    aliquotaFundoRf: aliquotaFundoRf,
    pesoParaVirarLongoPrazo: pesoParaVirarLongoPrazo,
    liquidoNaVenda: liquidoNaVenda
  };

})();

if (typeof module !== 'undefined' && module.exports) module.exports = Tributacao;
