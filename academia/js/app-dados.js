// academia/js/app-dados.js — extraído de index.html (linhas 3295-4046 do monólito original)
/* =================================================================================
   UNIVERSO DE ETFs
   ================================================================================= */
const ETFs = [
  // Renda Fixa BR
  { ticker: "FIXA11", nome: "ETF Renda Fixa Pré (B3)", classe: "RF Prefixado", custodia: "BR", desc: "Títulos públicos prefixados" },
  { ticker: "IRFM11", nome: "It Now IRFM (B3)", classe: "RF Prefixado", custodia: "BR", desc: "IRF-M, prefixados médios" },
  { ticker: "IMAB11", nome: "It Now IMA-B (B3)", classe: "RF Inflação", custodia: "BR", desc: "Tesouro IPCA+ médio" },
  { ticker: "B5P211", nome: "ETF IMA-B5 P2 (B3)", classe: "RF Inflação", custodia: "BR", desc: "IPCA+ curto (até 5 anos)" },
  { ticker: "IB5M11", nome: "ETF IMA-B5+ (B3)", classe: "RF Inflação", custodia: "BR", desc: "IPCA+ longo (5+ anos)" },
  { ticker: "LFTS11", nome: "It Now LFT (B3)", classe: "RF Pós-Fixado", custodia: "BR", desc: "Tesouro Selic, alta liquidez" },

  // Ações BR
  { ticker: "BOVA11", nome: "iShares Ibovespa (B3)", classe: "Ações BR", custodia: "BR", desc: "Ibovespa, large caps BR" },
  { ticker: "BOVV11", nome: "It Now Ibovespa (B3)", classe: "Ações BR", custodia: "BR", desc: "Ibovespa, alternativa BOVA" },
  { ticker: "SMAL11", nome: "iShares Small Caps (B3)", classe: "Ações BR", custodia: "BR", desc: "SMLL, small caps brasileiras" },
  { ticker: "DIVO11", nome: "It Now Dividendos (B3)", classe: "Ações BR", custodia: "BR", desc: "IDIV, dividendos" },

  // Ações Internacionais via B3
  { ticker: "IVVB11", nome: "iShares S&P 500 (B3)", classe: "Ações Internacionais", custodia: "BR", desc: "S&P 500 em reais" },
  { ticker: "NASD11", nome: "ETF Nasdaq (B3)", classe: "Ações Internacionais", custodia: "BR", desc: "Nasdaq 100 em reais" },
  { ticker: "ACWI11", nome: "ETF Global ACWI (B3)", classe: "Ações Internacionais", custodia: "BR", desc: "Mundo desenvolvido + emergente" },
  { ticker: "EURP11", nome: "ETF Europa (B3)", classe: "Ações Internacionais", custodia: "BR", desc: "Stoxx Europe 600" },

  // FIIs / Imobiliário
  { ticker: "XFIX11", nome: "ETF IFIX (B3)", classe: "FIIs", custodia: "BR", desc: "Índice de Fundos Imobiliários" },
  { ticker: "MATB11", nome: "ETF Materiais (B3)", classe: "Setorial", custodia: "BR", desc: "Setor materiais básicos" },

  // OFFSHORE — Ações
  { ticker: "VOO", nome: "Vanguard S&P 500 (US)", classe: "Ações Internacionais", custodia: "OFFSHORE", desc: "S&P 500, US-listed" },
  { ticker: "VTI", nome: "Vanguard Total Market (US)", classe: "Ações Internacionais", custodia: "OFFSHORE", desc: "Mercado total EUA" },
  { ticker: "VWO", nome: "Vanguard Emerging Markets (US)", classe: "Ações Internacionais", custodia: "OFFSHORE", desc: "Emergentes" },
  { ticker: "CSPX", nome: "iShares Core S&P 500 (UCITS)", classe: "Ações Internacionais", custodia: "OFFSHORE", desc: "S&P 500 UCITS (sem US estate tax)" },
  { ticker: "IWDA", nome: "iShares MSCI World (UCITS)", classe: "Ações Internacionais", custodia: "OFFSHORE", desc: "Mundo desenvolvido UCITS" },
  { ticker: "EIMI", nome: "iShares EM IMI (UCITS)", classe: "Ações Internacionais", custodia: "OFFSHORE", desc: "Emergentes UCITS" },

  // OFFSHORE — Renda Fixa
  { ticker: "BND", nome: "Vanguard Total Bond (US)", classe: "RF Internacional", custodia: "OFFSHORE", desc: "Bonds total market USA" },
  { ticker: "AGG", nome: "iShares Core Bond (US)", classe: "RF Internacional", custodia: "OFFSHORE", desc: "Aggregate bonds US" },
  { ticker: "IEF", nome: "iShares 7-10y Treasury (US)", classe: "RF Internacional", custodia: "OFFSHORE", desc: "Treasuries médios" },
  { ticker: "TLT", nome: "iShares 20+y Treasury (US)", classe: "RF Internacional", custodia: "OFFSHORE", desc: "Treasuries longos" },
  { ticker: "TIP", nome: "iShares TIPS (US)", classe: "RF Internacional", custodia: "OFFSHORE", desc: "Treasury IPCA equivalente" },

  // OFFSHORE — Alternativos
  { ticker: "GLD", nome: "SPDR Gold (US)", classe: "Alternativos", custodia: "OFFSHORE", desc: "Ouro físico" },
  { ticker: "VNQ", nome: "Vanguard REITs (US)", classe: "Alternativos", custodia: "OFFSHORE", desc: "REITs US" },
];

/* === Ativos B3 pré-embutidos (FIIs + ações, 5 anos via Yahoo) ===
   Adicionados ao catálogo automaticamente para aparecerem no dropdown
   com nome e classe corretos. Histórico completo, sem limite de API. */
(function () {
  var FIIS = ["KNRI11","HGLG11","MXRF11","XPLG11","HGRE11","KNCR11","BCFF11","XPML11","VISC11","HGBS11","KNIP11","IRDM11","RECR11","HGRU11","VILG11","BTLG11","RBRR11","VGHF11","MCHF11","HSML11","GGRC11","RBRF11","KNHF11","CPTS11","TGAR11","MFII11","DEVA11","HGCR11","RZTR11","VINO11"];
  var ACOES = ["PETR4","PETR3","VALE3","ITUB4","BBDC4","BBAS3","ABEV3","WEGE3","B3SA3","ITSA4","BPAC11","SUZB3","RENT3","RDOR3","RADL3","PRIO3","EQTL3","ELET3","ELET6","GGBR4","VBBR3","RAIL3","CSAN3","UGPA3","HAPV3","TOTS3","LREN3","MGLU3","CMIG4","SBSP3","VIVT3","TIMS3","KLBN11","CPLE6","ENEV3","CMIN3","ASAI3","NTCO3","CYRE3","EMBR3"];
  var jaTem = {};
  for (var i = 0; i < ETFs.length; i++) jaTem[ETFs[i].ticker] = true;
  function add(lista, classe, label) {
    for (var k = 0; k < lista.length; k++) {
      var tk = lista[k];
      if (jaTem[tk]) continue;
      if (!window.DADOS || !window.DADOS.etfs || !window.DADOS.etfs[tk]) continue; // só se tiver dados
      ETFs.push({ ticker: tk, nome: tk + " — " + label, classe: classe, custodia: "BR", desc: label + " (B3)" });
      jaTem[tk] = true;
    }
  }
  // FIIs Tijolo
  add(["KNRI11","HGLG11","XPLG11","HGRU11","VISC11","XPML11","HGBS11","VILG11","BTLG11","HGRE11","ALZR11","BRCR11","JSRE11","PVBI11","RBRP11","RECT11","TEPP11","TRXF11","VINO11","HSML11","GGRC11"], "FIIs Tijolo", "FII Tijolo");
  // FIIs Papel / Recebíveis
  add(["KNCR11","KNIP11","IRDM11","MXRF11","RECR11","CPTS11","HGCR11","RBRR11","VGHF11","MCHF11","KNHF11","DEVA11","VRTA11","HCTR11","KNSC11","MCCI11","VGIR11","VSLH11","BCFF11","RBRF11"], "FIIs Papel", "FII Papel/CRI");
  // FIAgros
  add(["VGIA11","SNAG11","RZAG11","KNCA11","CPTR11","EGAF11","FGAA11","GCRA11","JGPX11","RURA11","TGAR11","MFII11","RZTR11"], "FIAgros", "FIAgro");
  // Ações Dividendos/Utilities
  add(["TAEE11","EGIE3","CPFE3","BBSE3","CXSE3","SANB11","SAPR4","CSMG3","CGAS5","ALUP11","VIVT3","TIMS3","KLBN11","CMIG4","CPLE6","SBSP3"], "Dividendos/Utilities", "Dividendos");
  // Ações Blue Chips
  add(["PETR4","PETR3","VALE3","ITUB4","BBDC4","BBDC3","BBAS3","ABEV3","WEGE3","ELET3","ELET6","B3SA3","RENT3","SUZB3","BPAC11","ITSA4","EQTL3","RADL3","RDOR3","PRIO3","GGBR4","VBBR3","RAIL3","CSAN3","UGPA3","EMBR3"], "Ações BR", "Blue Chip");
  // Ações Mid/Small Caps
  add(["COGN3","CVCB3","CYRE3","DXCO3","EZTC3","FLRY3","GFSA3","JHSF3","LWSA3","MGLU3","MRVE3","HAPV3","TOTS3","LREN3","YDUQ3","SMTO3","TEND3","VAMO3","INTB3","NTCO3","ASAI3","CMIN3","ENEV3","CASH3"], "Mid/Small Caps", "Mid/Small Cap");
  // BDRs
  add(["AAPL34","MSFT34","AMZO34","GOGL34","M1TA34","TSLA34","NFLX34","MELI34","DISB34","NVDC34","COCA34","JPMC34","WMBY34","VISA34","JNJB34","WALM34"], "BDRs", "BDR Big Tech");
  // ETFs extras
  add(["PIBB11","GOVE11","SPXI11","XINA11","GOLD11","QBTC11","SMLL","IDIV","RRRP3"], "ETFs", "ETF");
})();


/* === DADOS REAIS (Banco Central do Brasil / SGS) — congelados em 14/05/2026 === */
/* Atualizável: trocar estes arrays ou, no AdvisorPro, puxar via API com job agendado */
const DADOS_MERCADO = {
  _fonte: "Banco Central do Brasil (SGS) — dados congelados em 14/05/2026",
  _atualizado: "14/05/2026",

  dolar: {
    meses: ["07/1994", "08/1994", "09/1994", "10/1994", "11/1994", "12/1994", "01/1995", "02/1995", "03/1995", "04/1995", "05/1995", "06/1995", "07/1995", "08/1995", "09/1995", "10/1995", "11/1995", "12/1995", "01/1996", "02/1996", "03/1996", "04/1996", "05/1996", "06/1996", "07/1996", "08/1996", "09/1996", "10/1996", "11/1996", "12/1996", "01/1997", "02/1997", "03/1997", "04/1997", "05/1997", "06/1997", "07/1997", "08/1997", "09/1997", "10/1997", "11/1997", "12/1997", "01/1998", "02/1998", "03/1998", "04/1998", "05/1998", "06/1998", "07/1998", "08/1998", "09/1998", "10/1998", "11/1998", "12/1998", "01/1999", "02/1999", "03/1999", "04/1999", "05/1999", "06/1999", "07/1999", "08/1999", "09/1999", "10/1999", "11/1999", "12/1999", "01/2000", "02/2000", "03/2000", "04/2000", "05/2000", "06/2000", "07/2000", "08/2000", "09/2000", "10/2000", "11/2000", "12/2000", "01/2001", "02/2001", "03/2001", "04/2001", "05/2001", "06/2001", "07/2001", "08/2001", "09/2001", "10/2001", "11/2001", "12/2001", "01/2002", "02/2002", "03/2002", "04/2002", "05/2002", "06/2002", "07/2002", "08/2002", "09/2002", "10/2002", "11/2002", "12/2002", "01/2003", "02/2003", "03/2003", "04/2003", "05/2003", "06/2003", "07/2003", "08/2003", "09/2003", "10/2003", "11/2003", "12/2003", "01/2004", "02/2004", "03/2004", "04/2004", "05/2004", "06/2004", "07/2004", "08/2004", "09/2004", "10/2004", "11/2004", "12/2004", "01/2005", "02/2005", "03/2005", "04/2005", "05/2005", "06/2005", "07/2005", "08/2005", "09/2005", "10/2005", "11/2005", "12/2005", "01/2006", "02/2006", "03/2006", "04/2006", "05/2006", "06/2006", "07/2006", "08/2006", "09/2006", "10/2006", "11/2006", "12/2006", "01/2007", "02/2007", "03/2007", "04/2007", "05/2007", "06/2007", "07/2007", "08/2007", "09/2007", "10/2007", "11/2007", "12/2007", "01/2008", "02/2008", "03/2008", "04/2008", "05/2008", "06/2008", "07/2008", "08/2008", "09/2008", "10/2008", "11/2008", "12/2008", "01/2009", "02/2009", "03/2009", "04/2009", "05/2009", "06/2009", "07/2009", "08/2009", "09/2009", "10/2009", "11/2009", "12/2009", "01/2010", "02/2010", "03/2010", "04/2010", "05/2010", "06/2010", "07/2010", "08/2010", "09/2010", "10/2010", "11/2010", "12/2010", "01/2011", "02/2011", "03/2011", "04/2011", "05/2011", "06/2011", "07/2011", "08/2011", "09/2011", "10/2011", "11/2011", "12/2011", "01/2012", "02/2012", "03/2012", "04/2012", "05/2012", "06/2012", "07/2012", "08/2012", "09/2012", "10/2012", "11/2012", "12/2012", "01/2013", "02/2013", "03/2013", "04/2013", "05/2013", "06/2013", "07/2013", "08/2013", "09/2013", "10/2013", "11/2013", "12/2013", "01/2014", "02/2014", "03/2014", "04/2014", "05/2014", "06/2014", "07/2014", "08/2014", "09/2014", "10/2014", "11/2014", "12/2014", "01/2015", "02/2015", "03/2015", "04/2015", "05/2015", "06/2015", "07/2015", "08/2015", "09/2015", "10/2015", "11/2015", "12/2015", "01/2016", "02/2016", "03/2016", "04/2016", "05/2016", "06/2016", "07/2016", "08/2016", "09/2016", "10/2016", "11/2016", "12/2016", "01/2017", "02/2017", "03/2017", "04/2017", "05/2017", "06/2017", "07/2017", "08/2017", "09/2017", "10/2017", "11/2017", "12/2017", "01/2018", "02/2018", "03/2018", "04/2018", "05/2018", "06/2018", "07/2018", "08/2018", "09/2018", "10/2018", "11/2018", "12/2018", "01/2019", "02/2019", "03/2019", "04/2019", "05/2019", "06/2019", "07/2019", "08/2019", "09/2019", "10/2019", "11/2019", "12/2019", "01/2020", "02/2020", "03/2020", "04/2020", "05/2020", "06/2020", "07/2020", "08/2020", "09/2020", "10/2020", "11/2020", "12/2020", "01/2021", "02/2021", "03/2021", "04/2021", "05/2021", "06/2021", "07/2021", "08/2021", "09/2021", "10/2021", "11/2021", "12/2021", "01/2022", "02/2022", "03/2022", "04/2022", "05/2022", "06/2022", "07/2022", "08/2022", "09/2022", "10/2022", "11/2022", "12/2022", "01/2023", "02/2023", "03/2023", "04/2023", "05/2023", "06/2023", "07/2023", "08/2023", "09/2023", "10/2023", "11/2023", "12/2023", "01/2024", "02/2024", "03/2024", "04/2024", "05/2024", "06/2024", "07/2024", "08/2024", "09/2024", "10/2024", "11/2024", "12/2024", "01/2025", "02/2025", "03/2025", "04/2025", "05/2025", "06/2025", "07/2025", "08/2025", "09/2025", "10/2025", "11/2025", "12/2025", "01/2026", "02/2026", "03/2026", "04/2026", "05/2026"],
    valores: [1.0,0.932,0.885,0.849,0.845,0.848,0.845,0.843,0.85,0.902,0.914,0.908,0.92,0.936,0.951,0.9555,0.963,0.9666,0.9726,0.9786,0.984,0.9881,0.9925,0.9986,1.0045,1.0108,1.0165,1.0215,1.028,1.0331,1.0395,1.0457,1.0515,1.0594,1.0643,1.0709,1.0771,1.0835,1.0914,1.0967,1.103,1.1096,1.1165,1.1236,1.1305,1.1375,1.1442,1.152,1.1572,1.1643,1.1772,1.1807,1.1929,1.2016,1.2078,1.9638,2.0284,1.7251,1.6735,1.7336,1.7575,1.8115,1.9217,1.9565,1.9431,1.9221,1.8011,1.7932,1.7678,1.7407,1.8008,1.8202,1.808,1.788,1.8218,1.8483,1.9099,1.9795,1.9384,1.9739,2.0428,2.1584,2.2239,2.3833,2.3249,2.4935,2.559,2.6866,2.682,2.4672,2.3066,2.4161,2.3596,2.322,2.377,2.5413,2.8595,3.3275,3.0286,3.7467,3.6113,3.616,3.5224,3.493,3.5637,3.3359,2.9159,2.978,2.8443,3.0006,2.984,2.9034,2.8559,2.9341,2.8862,2.9486,2.8945,2.8904,2.9569,3.1567,3.0747,3.0466,2.9298,2.8513,2.859,2.7145,2.6682,2.613,2.6011,2.655,2.5146,2.4286,2.3459,2.3785,2.3623,2.2339,2.2516,2.2177,2.337,2.2217,2.1181,2.1542,2.0718,2.2713,2.1701,2.1905,2.1468,2.1623,2.141,2.1672,2.1342,2.1093,2.126,2.0478,2.0268,1.9056,1.9176,1.8856,1.9547,1.8225,1.746,1.7888,1.7722,1.7451,1.6816,1.7534,1.6506,1.632,1.6061,1.5593,1.6447,1.9213,2.1818,2.3565,2.3298,2.3475,2.4121,2.2899,2.1369,1.944,1.9342,1.8369,1.8829,1.7794,1.7588,1.7293,1.724,1.8773,1.8,1.7701,1.7315,1.8255,1.8006,1.7489,1.7441,1.6812,1.7044,1.7052,1.651,1.6631,1.6627,1.6194,1.5747,1.5878,1.5599,1.5551,1.604,1.8811,1.7506,1.7929,1.8683,1.7376,1.7152,1.8314,1.9149,2.035,1.9893,2.0432,2.0335,2.026,2.0312,2.1121,2.0415,1.9843,1.9848,2.0186,2.0095,2.1355,2.2297,2.2914,2.3643,2.2123,2.2468,2.3449,2.3975,2.409,2.324,2.262,2.2221,2.264,2.2054,2.2607,2.2364,2.4623,2.4839,2.5624,2.6929,2.6894,2.8655,3.1556,3.0754,3.1789,3.1191,3.4425,3.6725,3.9794,3.8126,3.8745,4.0387,3.9986,3.9913,3.5799,3.4991,3.6126,3.2298,3.2662,3.2472,3.2338,3.2053,3.4362,3.2729,3.1479,3.0976,3.1167,3.1724,3.2307,3.3015,3.1161,3.1333,3.1642,3.2736,3.2636,3.2697,3.173,3.262,3.3104,3.5424,3.7413,3.9055,3.7491,4.1279,4.0273,3.6973,3.8285,3.8595,3.6694,3.7832,3.8682,3.965,3.9003,3.8193,3.8296,4.1581,4.174,3.9786,4.2261,4.0213,4.2475,4.4946,5.2404,5.5816,5.3639,5.3651,5.3075,5.3732,5.6441,5.6895,5.2789,5.1626,5.4608,5.5832,5.6849,5.4087,5.1636,5.0055,5.1379,5.1576,5.3911,5.6694,5.6168,5.6309,5.281,5.1347,4.6984,5.0266,4.7765,5.3142,5.1606,5.2007,5.2002,5.15,5.1948,5.3436,5.0721,5.207,5.0637,5.0334,5.035,4.7876,4.7752,4.9318,5.0679,5.0194,4.9191,4.8916,4.935,4.9596,5.0532,5.1184,5.2373,5.5893,5.6681,5.623,5.4521,5.8073,6.0634,6.2086,5.8687,5.7914,5.7051,5.6394,5.6937,5.4511,5.5436,5.4378,5.3208,5.3505,5.3469,5.4372,5.2587,5.2001,5.1606,4.9587],
    r100emdolar: [100.0,107.3,112.99,117.79,118.34,117.92,118.34,118.62,117.65,110.86,109.41,110.13,108.7,106.84,105.15,104.66,103.84,103.46,102.82,102.19,101.63,101.2,100.76,100.14,99.55,98.93,98.38,97.9,97.28,96.8,96.2,95.63,95.1,94.39,93.96,93.38,92.84,92.29,91.63,91.18,90.66,90.12,89.57,89.0,88.46,87.91,87.4,86.81,86.42,85.89,84.95,84.7,83.83,83.22,82.8,50.92,49.3,57.97,59.76,57.68,56.9,55.2,52.04,51.11,51.46,52.03,55.52,55.77,56.57,57.45,55.53,54.94,55.31,55.93,54.89,54.1,52.36,50.52,51.59,50.66,48.95,46.33,44.97,41.96,43.01,40.1,39.08,37.22,37.29,40.53,43.35,41.39,42.38,43.07,42.07,39.35,34.97,30.05,33.02,26.69,27.69,27.65,28.39,28.63,28.06,29.98,34.29,33.58,35.16,33.33,33.51,34.44,35.02,34.08,34.65,33.91,34.55,34.6,33.82,31.68,32.52,32.82,34.13,35.07,34.98,36.84,37.48,38.27,38.45,37.66,39.77,41.18,42.63,42.04,42.33,44.76,44.41,45.09,42.79,45.01,47.21,46.42,48.27,44.03,46.08,45.65,46.58,46.25,46.71,46.14,46.86,47.41,47.04,48.83,49.34,52.48,52.15,53.03,51.16,54.87,57.27,55.9,56.43,57.3,59.47,57.03,60.58,61.27,62.26,64.13,60.8,52.05,45.83,42.44,42.92,42.6,41.46,43.67,46.8,51.44,51.7,54.44,53.11,56.2,56.86,57.83,58.0,53.27,55.56,56.49,57.75,54.78,55.54,57.18,57.34,59.48,58.67,58.64,60.57,60.13,60.14,61.75,63.5,62.98,64.11,64.3,62.34,53.16,57.12,55.78,53.52,57.55,58.3,54.6,52.22,49.14,50.27,48.94,49.18,49.36,49.23,47.35,48.98,50.4,50.38,49.54,49.76,46.83,44.85,43.64,42.3,45.2,44.51,42.65,41.71,41.51,43.03,44.21,45.0,44.17,45.34,44.23,44.71,40.61,40.26,39.03,37.13,37.18,34.9,31.69,32.52,31.46,32.06,29.05,27.23,25.13,26.23,25.81,24.76,25.01,25.05,27.93,28.58,27.68,30.96,30.62,30.8,30.92,31.2,29.1,30.55,31.77,32.28,32.09,31.52,30.95,30.29,32.09,31.92,31.6,30.55,30.64,30.58,31.52,30.66,30.21,28.23,26.73,25.6,26.67,24.23,24.83,27.05,26.12,25.91,27.25,26.43,25.85,25.22,25.64,26.18,26.11,24.05,23.96,25.13,23.66,24.87,23.54,22.25,19.08,17.92,18.64,18.64,18.84,18.61,17.72,17.58,18.94,19.37,18.31,17.91,17.59,18.49,19.37,19.98,19.46,19.39,18.55,17.64,17.8,17.76,18.94,19.48,21.28,19.89,20.94,18.82,19.38,19.23,19.23,19.42,19.25,18.71,19.72,19.2,19.75,19.87,19.86,20.89,20.94,20.28,19.73,19.92,20.33,20.44,20.26,20.16,19.79,19.54,19.09,17.89,17.64,17.78,18.34,17.22,16.49,16.11,17.04,17.27,17.53,17.73,17.56,18.34,18.04,18.39,18.79,18.69,18.7,18.39,19.02,19.23,19.38,20.17]
  },

  indices: {
    meses: ["05/2016", "06/2016", "07/2016", "08/2016", "09/2016", "10/2016", "11/2016", "12/2016", "01/2017", "02/2017", "03/2017", "04/2017", "05/2017", "06/2017", "07/2017", "08/2017", "09/2017", "10/2017", "11/2017", "12/2017", "01/2018", "02/2018", "03/2018", "04/2018", "05/2018", "06/2018", "07/2018", "08/2018", "09/2018", "10/2018", "11/2018", "12/2018", "01/2019", "02/2019", "03/2019", "04/2019", "05/2019", "06/2019", "07/2019", "08/2019", "09/2019", "10/2019", "11/2019", "12/2019", "01/2020", "02/2020", "03/2020", "04/2020", "05/2020", "06/2020", "07/2020", "08/2020", "09/2020", "10/2020", "11/2020", "12/2020", "01/2021", "02/2021", "03/2021", "04/2021", "05/2021", "06/2021", "07/2021", "08/2021", "09/2021", "10/2021", "11/2021", "12/2021", "01/2022", "02/2022", "03/2022", "04/2022", "05/2022", "06/2022", "07/2022", "08/2022", "09/2022", "10/2022", "11/2022", "12/2022", "01/2023", "02/2023", "03/2023", "04/2023", "05/2023", "06/2023", "07/2023", "08/2023", "09/2023", "10/2023", "11/2023", "12/2023", "01/2024", "02/2024", "03/2024", "04/2024", "05/2024", "06/2024", "07/2024", "08/2024", "09/2024", "10/2024", "11/2024", "12/2024", "01/2025", "02/2025", "03/2025", "04/2025", "05/2025", "06/2025", "07/2025", "08/2025", "09/2025", "10/2025", "11/2025", "12/2025", "01/2026", "02/2026", "03/2026", "04/2026"],
    cdi: [101.11,102.28,103.42,104.67,105.83,106.94,108.05,109.27,110.45,111.39,112.56,113.45,114.51,115.44,116.36,117.29,118.04,118.8,119.47,120.12,120.82,121.37,122.02,122.65,123.29,123.93,124.6,125.31,125.9,126.58,127.2,127.82,128.51,129.14,129.75,130.42,131.13,131.74,132.49,133.16,133.77,134.41,134.92,135.42,135.93,136.33,136.79,137.18,137.5,137.79,138.06,138.28,138.5,138.72,138.93,139.15,139.36,139.54,139.82,140.11,140.49,140.93,141.43,142.04,142.67,143.37,144.21,145.32,146.38,147.49,148.87,150.1,151.65,153.2,154.77,156.58,158.26,159.87,161.5,163.31,165.14,166.66,168.61,170.16,172.07,173.91,175.77,177.77,179.5,181.29,182.96,184.59,186.38,187.87,189.43,191.12,192.7,194.23,195.99,197.7,199.36,201.21,202.8,204.69,206.76,208.8,210.81,213.04,215.47,217.84,220.63,223.19,225.91,228.8,231.21,234.03,236.74,239.11,242.0,244.64],
    ipca: [100.78,101.13,101.66,102.11,102.19,102.45,102.64,102.95,103.34,103.68,103.94,104.08,104.41,104.17,104.42,104.61,104.78,105.22,105.52,105.98,106.29,106.63,106.72,106.96,107.39,108.74,109.1,109.0,109.52,110.02,109.78,109.95,110.3,110.78,111.61,112.24,112.39,112.4,112.61,112.74,112.69,112.8,113.38,114.68,114.92,115.21,115.29,114.94,114.5,114.8,115.21,115.49,116.22,117.22,118.27,119.86,120.16,121.2,122.32,122.7,123.72,124.38,125.57,126.66,128.13,129.74,130.97,131.92,132.64,133.98,136.15,137.59,138.24,139.16,138.22,137.72,137.32,138.13,138.7,139.56,140.3,141.47,142.48,143.35,143.68,143.56,143.73,144.06,144.44,144.79,145.19,146.0,146.62,147.83,148.07,148.63,149.32,149.63,150.2,150.17,150.83,151.68,152.27,153.06,153.3,155.31,156.18,156.85,157.26,157.64,158.05,157.87,158.63,158.77,159.06,159.59,160.11,161.23,162.65,163.74],
    poupanca: [100.65,101.36,102.04,102.81,103.48,104.17,104.84,105.56,106.27,106.83,107.53,108.06,108.69,109.29,109.9,110.51,111.06,111.58,112.06,112.54,112.99,113.44,113.88,114.3,114.72,115.15,115.58,116.01,116.44,116.87,117.31,117.74,118.18,118.62,119.06,119.5,119.94,120.39,120.84,121.25,121.67,122.05,122.4,122.75,123.07,123.39,123.69,123.96,124.23,124.44,124.61,124.77,124.91,125.06,125.2,125.35,125.49,125.64,125.78,125.98,126.18,126.44,126.75,127.06,127.44,127.9,128.46,129.09,129.81,130.46,131.24,131.97,132.85,133.71,134.6,135.6,136.53,137.41,138.31,139.29,140.28,141.09,142.14,142.97,143.99,144.97,145.93,146.97,147.87,148.77,149.63,150.48,151.37,152.13,152.95,153.87,154.77,155.6,156.5,157.39,158.28,159.23,160.13,161.06,162.14,163.17,164.16,165.26,166.37,167.49,168.62,169.76,170.9,172.06,173.2,174.37,175.55,176.64,177.83,179.02]
  }
};

/* =================================================================================
   15 CASES — Densos, com gabarito embutido
   ================================================================================= */
const CASES = [
  /* --------------- CASE 01 --------------- */
  {
    id: 1,
    titulo: "Bancário de varejo, 30 anos, R$ 80k na Poupança",
    ciclo: "alta-selic",
    perfil: "moderado",
    patrimonio: "baixo",
    custodia: "BR",
    resumo: "Cliente típico do Rodrigo de 10 anos atrás: salário CLT, único ativo é a Poupança herdada da família. Quer começar a investir mas tem medo.",
    cliente: "Pedro, 30 anos, bancário escriturário CEF, casado, 1 filho de 2 anos. Mora em apartamento financiado (CEF, 25 anos restantes). Salário CLT R$ 6.500, esposa autônoma R$ 3.000.",
    dados: {
      "Patrimônio total": "R$ 80.000",
      "Composição atual": "100% Poupança CEF",
      "Renda familiar mensal": "R$ 9.500",
      "Aporte mensal possível": "R$ 1.500",
      "Reserva de emergência": "Inexistente formal (a Poupança serve)",
      "Horizonte": "Misto: 30% curto (reserva), 70% longo (aposentadoria)"
    },
    objetivos: [
      "Sair da Poupança sem sustos (cliente avesso a perdas nominais)",
      "Construir reserva de emergência de 6 meses (~R$ 30k)",
      "Iniciar previdência de longo prazo para aposentadoria"
    ],
    restricoes: [
      "NÃO topa ver patrimônio nominal cair em renda fixa marcada a mercado",
      "Suitability moderado, mas comportamento real conservador",
      "Não pode travar liquidez de >50% (esposa autônoma = renda volátil)"
    ],
    macro: "Selic em 13,75% (alta). IPCA acumulado 4,5%. Curva de juros longa precificando cortes a partir de 2025. Cenário fiscal incerto pressiona prêmio de risco.",
    aporte_sugerido: 80000,
    gabarito: {
      "LFTS11": 35,  // Reserva, Selic + liquidez
      "IMAB11": 25,  // Inflação proteção
      "FIXA11": 15,  // Prefixado aproveitando taxa alta
      "BOVA11": 15,  // Ações BR para longo prazo
      "IVVB11": 10   // Diversificação USD
    },
    justificativa: "Cliente conservador disfarçado de moderado precisa de aderência ao comportamento, não ao suitability formal. LFTS (Tesouro Selic) protege da volatilidade e dá liquidez para reserva. IMAB e FIXA aproveitam taxas históricas altas. Pequena dose de Ibov + S&P inicia educação financeira sem expor demais. Total internacional ~10% é introdução à dolarização sem complicar."
  },

  /* --------------- CASE 02 --------------- */
  {
    id: 2,
    titulo: "Aposentada 68 anos, R$ 450k em CDB DI 100%",
    ciclo: "queda-selic",
    perfil: "conservador",
    patrimonio: "medio",
    custodia: "BR",
    resumo: "Viúva recente, herdou CDBs do marido que só rendem 100% do CDI. Selic começou a cair e ela perdeu R$ 800/mês de renda em 6 meses.",
    cliente: "Dona Helena, 68 anos, aposentada INSS + pensão. Mora sozinha em apartamento próprio, gasta R$ 4.500/mês. Tem 2 filhos adultos, independentes financeiramente.",
    dados: {
      "Patrimônio total": "R$ 450.000",
      "Composição atual": "100% CDB DI 100% no banco do marido",
      "Renda mensal (INSS+pensão)": "R$ 3.800",
      "Custo mensal": "R$ 4.500 (déficit de R$ 700/mês)",
      "Reserva de emergência": "Sobra confortável dentro dos R$ 450k",
      "Horizonte": "Vitalício — precisa de renda complementar perpétua"
    },
    objetivos: [
      "Gerar renda complementar de pelo menos R$ 1.500/mês (R$ 18k/ano)",
      "Travar taxas reais antes do ciclo de queda continuar",
      "Preservar patrimônio para herança aos 2 filhos"
    ],
    restricoes: [
      "Conservadora de verdade — qualquer marcação negativa gera ligação aflita",
      "Não entende renda variável, não quer entender",
      "Precisa de liquidez parcial para imprevistos médicos"
    ],
    macro: "Selic 11,5% em trajetória de queda (mercado precifica 9% em 12 meses). IPCA 4,2%. Janela rara para travar taxas reais elevadas em IPCA+ e prefixados antes da queda continuar.",
    aporte_sugerido: 450000,
    gabarito: {
      "LFTS11": 25,   // Liquidez + renda imediata
      "IMAB11": 30,   // Travar IPCA+ médio
      "B5P211": 20,   // IPCA+ curto, casa com necessidade
      "FIXA11": 20,   // Prefixado aproveitando topo de ciclo
      "XFIX11": 5     // Pequena dose FII para renda mensal (dividendos)
    },
    justificativa: "Foco em renda real perpétua. IMAB e B5P2 travam IPCA+ em níveis historicamente altos antes da queda da Selic continuar. FIXA aproveita prefixados também próximos do topo. LFTS mantém liquidez de emergência. Pequena dose de XFIX (5%) é o limite razoável de variável para uma conservadora real — entrega dividendos mensais que ela percebe como 'renda'. Zero ações por aderência comportamental."
  },

  /* --------------- CASE 03 --------------- */
  {
    id: 3,
    _entrevista: true, // INTERNO: caiu em entrevista — invisível para o aluno, filtrável para o Rodrigo
    titulo: "Médico, 45 anos, R$ 1,2MM — quer dolarizar 30%",
    ciclo: "crise",
    perfil: "moderado",
    patrimonio: "alto",
    custodia: "BR",
    resumo: "Cardiologista preocupado com cenário fiscal BR. Quer dolarização parcial mas tem medo do timing.",
    cliente: "Dr. Ricardo, 45 anos, cardiologista PJ, casado, 2 filhos (12 e 15). Renda média R$ 38k/mês. Carteira BR já diversificada (45% RF, 30% multimercado, 25% ações BR).",
    dados: {
      "Patrimônio investido": "R$ 1.200.000",
      "Composição atual": "55% RF / 25% multimercado / 20% ações BR",
      "Renda mensal PJ": "R$ 38.000",
      "Aporte mensal": "R$ 12.000",
      "Imóveis": "Casa própria + sala de consultório",
      "Horizonte": "Longo prazo (aposentadoria aos 60), filhos: educação superior em 5 anos"
    },
    objetivos: [
      "Dolarizar 25-35% da carteira para proteção cambial",
      "Diversificar geograficamente (medo de risco-país BR)",
      "Manter parcela em BR para aproveitar prêmios atuais"
    ],
    restricoes: [
      "Tem medo de comprar dólar no topo (USD/BRL em R$ 5,80)",
      "Não quer abrir conta offshore agora (burocracia)",
      "Filhos vão estudar fora possivelmente — passivo em USD futuro"
    ],
    macro: "USD/BRL em R$ 5,80, em tendência de alta. Cenário fiscal pressionando real. Fed mantendo juros em 4,5%. Tensão geopolítica eleva ouro. Selic BR 12,75% atrativa para fixed income local.",
    aporte_sugerido: 1200000,
    gabarito: {
      "LFTS11": 10,   // Liquidez
      "IMAB11": 20,   // Núcleo de inflação
      "FIXA11": 15,   // Prefixado BR
      "BOVA11": 15,   // Ações BR
      "IVVB11": 20,   // Dolarização sem offshore
      "NASD11": 10,   // Tech US em BRL
      "ACWI11": 10    // Diversificação global
    },
    justificativa: "Dolarização via B3 (IVVB+NASD+ACWI = 40%) resolve a demanda do cliente sem custódia offshore. Núcleo BR mantido em ~60% aproveita Selic atual (12,75%) e IPCA+. Para timing do USD, faz DCA (aportes mensais) ao invés de entrada única — atende ao 'medo de topo'. Nenhum ETF setorial concentrado para um moderado."
  },

  /* --------------- CASE 04 --------------- */
  {
    id: 4,
    titulo: "Empreendedor PJ, R$ 300k — reserva da empresa",
    ciclo: "alta-selic",
    perfil: "conservador",
    patrimonio: "medio",
    custodia: "BR",
    resumo: "Capital de giro da empresa do cliente. Precisa render acima do CDI mas não pode travar liquidez.",
    cliente: "Camila, 38, sócia majoritária de uma agência digital (10 funcionários). PF separada. R$ 300k é capital de giro/reserva da empresa.",
    dados: {
      "Patrimônio (PJ)": "R$ 300.000 (reserva operacional)",
      "Composição atual": "70% CDB DI / 30% Conta Corrente",
      "Faturamento empresa": "R$ 200k/mês",
      "Reserva-alvo": "6 meses de folha (~R$ 200k bloqueados)",
      "Horizonte": "Resgate possível a qualquer momento"
    },
    objetivos: [
      "Bater 110%+ do CDI sem perder liquidez",
      "Não ter marcação a mercado negativa",
      "Manter 65% liquidável em D+1"
    ],
    restricoes: [
      "PJ não pode comprar ações nem fundos arrojados (política interna)",
      "Marcação a mercado negativa em DRE ruim para banco/clientes",
      "Tributação PJ — atenção a IR sobre rendimentos"
    ],
    macro: "Selic 13,75% em patamar alto. IPCA 4,5%. Banco Central sinalizando manutenção por meses. CDI rendendo bem em pós-fixado.",
    aporte_sugerido: 300000,
    gabarito: {
      "LFTS11": 70,   // Núcleo de pós-fixado líquido
      "B5P211": 20,   // Pequena dose IPCA+ curto (até 5 anos)
      "FIXA11": 10    // Prefixado curto aproveitando topo
    },
    justificativa: "PJ com necessidade de liquidez e zero tolerância a marcação negativa exige LFTS dominante. B5P2 (IPCA+ curto) e FIXA curto são as únicas adições defensáveis para tentar bater CDI. Zero variável, zero offshore. ETF é melhor que CDB porque tem liquidez D+1, enquanto CDB de banco médio pode ter carência. Não confundir com PF — política PJ é diferente."
  },

  /* --------------- CASE 05 --------------- */
  {
    id: 5,
    titulo: "Casal 35a, R$ 600k para aposentadoria em 30 anos",
    ciclo: "queda-selic",
    perfil: "arrojado",
    patrimonio: "medio",
    custodia: "BR",
    resumo: "Casal jovem, sem filhos, alta renda. Quer construir patrimônio para aposentadoria longa com viés agressivo.",
    cliente: "Lucas (engenheiro, R$ 22k/mês) e Marina (advogada, R$ 18k/mês). 35 anos cada, casados há 5, sem filhos por escolha. Apartamento próprio quitado.",
    dados: {
      "Patrimônio total": "R$ 600.000",
      "Composição atual": "60% Tesouro Selic / 40% CDB",
      "Renda familiar mensal": "R$ 40.000",
      "Aporte mensal possível": "R$ 15.000",
      "Custos mensais": "R$ 15.000",
      "Horizonte": "30 anos (aposentadoria aos 65)"
    },
    objetivos: [
      "Maximizar retorno real para aposentadoria longa",
      "Diversificação global (não confiam em risco-país BR de longo prazo)",
      "Pequena alocação em alternativos (ouro como hedge)"
    ],
    restricoes: [
      "Não querem >5% em renda fixa de curto prazo (custo de oportunidade)",
      "Topam volatilidade — comportamento alinhado ao suitability",
      "Não querem FIIs (preferem ações diretas via ETF)"
    ],
    macro: "Selic 11,5% caindo (precificado 9% em 12m). Curva longa atrativa. S&P 500 perto de máxima histórica. Cenário macro internacional construtivo.",
    aporte_sugerido: 600000,
    gabarito: {
      "LFTS11": 5,    // Mínimo de liquidez
      "IB5M11": 15,   // IPCA+ longo (30 anos!)
      "BOVA11": 20,   // Ações BR
      "SMAL11": 10,   // Small caps (perfil agressivo)
      "IVVB11": 25,   // S&P 500 em BRL
      "NASD11": 15,   // Nasdaq tech
      "ACWI11": 10    // Diversificação global
    },
    justificativa: "Horizonte de 30 anos + perfil arrojado + comportamento alinhado = peso máximo em renda variável (80%). Diversificação 50/50 BR/Internacional. IB5M+ (IPCA+ longo) é o único RF — duration alta casa com horizonte. SMAL é a 'pimenta' do perfil arrojado. Não cabe FII porque o cliente quer só ações. Crítico: este é o perfil que mais erra por ALOCAR DEMAIS EM RF por medo. O assessor precisa segurar a mão e respeitar o suitability."
  },

  /* --------------- CASE 06 --------------- */
  {
    id: 6,
    titulo: "Herdeiro 28a, R$ 2MM — diversificação global",
    ciclo: "estavel",
    perfil: "arrojado",
    patrimonio: "alto",
    custodia: "OFFSHORE",
    resumo: "Recebeu herança do avô. Já tem cidadania italiana, quer estruturar offshore desde o início para evitar inventário futuro complexo.",
    cliente: "Bruno, 28, designer freelancer (renda R$ 8k/mês). Solteiro, mora com a mãe. Cidadania italiana ativa.",
    dados: {
      "Patrimônio herdado": "R$ 2.000.000 (líquido após ITCMD)",
      "Composição atual": "Em conta corrente — recém liberado",
      "Renda mensal": "R$ 8.000 (freelance, irregular)",
      "Aporte mensal": "R$ 0 (consome a renda)",
      "Custódia preferida": "Offshore (Insigneo já recomendado)",
      "Horizonte": "Indefinido — patrimônio de proteção/wealth"
    },
    objetivos: [
      "Diversificação geográfica máxima (não confia em BR)",
      "Estrutura UCITS para evitar US estate tax (40% sobre >US$60k)",
      "Crescimento patrimonial sem necessidade de renda imediata"
    ],
    restricoes: [
      "Quer evitar fundos com TER >0,30% (mentalidade Bogle)",
      "Não quer single stocks — só ETFs",
      "Nada de renda fixa BR (não confia)"
    ],
    macro: "Cenário global estável. Fed em 4,5% mantendo. ECB 3,5%. Inflação developed markets em ~2,5%. Bolsas em níveis altos mas não esticadas.",
    aporte_sugerido: 2000000,
    gabarito: {
      "CSPX": 35,   // S&P 500 UCITS — núcleo
      "IWDA": 20,   // Mundo desenvolvido UCITS
      "EIMI": 10,   // Emergentes UCITS (BR + Ásia)
      "AGG": 15,    // RF Aggregate US (via UCITS equivalente na prática)
      "TIP": 10,    // Treasury IPCA US
      "GLD": 5,     // Ouro
      "VNQ": 5      // REITs US
    },
    justificativa: "Estrutura 70/30 (RV/RF) com UCITS dominante elimina o US estate tax (crítico para 28 anos com R$ 2MM offshore). CSPX+IWDA+EIMI cobre o globo a custo médio <0,15% TER. TIP protege contra inflação USD. GLD e VNQ adicionam descorrelação. Zero BR porque o cliente declarou. ETFs US-listed (AGG) só são aceitáveis se houver estrutura societária que evite estate tax — caso contrário, troca por equivalente UCITS."
  },

  /* --------------- CASE 07 --------------- */
  {
    id: 7,
    titulo: "Servidor público, R$ 200k — proteção contra inflação",
    ciclo: "alta-selic",
    perfil: "conservador",
    patrimonio: "baixo",
    custodia: "BR",
    resumo: "Servidor estável que viu o salário comer inflação por 5 anos. Quer especificamente IPCA+, mas só conhece Tesouro Direto.",
    cliente: "Antônio, 52, técnico judiciário federal, casado, filhos adultos. Estabilidade total no emprego. Aposenta em 8 anos com 80% da remuneração.",
    dados: {
      "Patrimônio total": "R$ 200.000",
      "Composição atual": "60% Tesouro IPCA+ 2035 / 40% CDB DI",
      "Salário": "R$ 14.000",
      "Aporte mensal": "R$ 3.000",
      "Reserva de emergência": "Já tem (separada, R$ 60k em LFTS)",
      "Horizonte": "8 anos (aposentadoria)"
    },
    objetivos: [
      "Continuar protegendo poder de compra (foco é inflação real)",
      "Aproveitar IPCA+ atual (~6%) em janela rara",
      "Pequena diversificação para 'sair só de Tesouro'"
    ],
    restricoes: [
      "Já é cliente do Tesouro Direto — entende vencimento e MtM",
      "Não quer ações nem multimercado",
      "Aceita pequena dose de RV se for educacional"
    ],
    macro: "Selic 13,75% alta. IPCA+ 2035 pagando 6,10% real. Janela histórica para travar taxa real. Curva longa em prêmio elevado.",
    aporte_sugerido: 200000,
    gabarito: {
      "B5P211": 25,   // IPCA+ curto (5 anos até aposentadoria)
      "IMAB11": 35,   // IPCA+ médio
      "IB5M11": 20,   // IPCA+ longo (pós aposentadoria)
      "FIXA11": 10,   // Prefixado para travar topo
      "BOVA11": 10    // Pequena dose RV educativa
    },
    justificativa: "Cliente literalmente pediu proteção inflacionária — gabarito atende com 80% indexado ao IPCA via 3 ETFs de durações diferentes (laddering). Casa B5P2 com a aposentadoria. FIXA aproveita janela prefixada. 10% em BOVA cumpre o pedido de 'sair só de Tesouro' sem desconforto. Sem multimercado nem internacional — não foi pedido e cliente é conservador."
  },

  /* --------------- CASE 08 --------------- */
  {
    id: 8,
    titulo: "Profissional liberal, 50a, recém-divorciada, R$ 700k",
    ciclo: "crise",
    perfil: "moderado",
    patrimonio: "medio",
    custodia: "BR",
    resumo: "Dentista que recebeu sua parte na partilha. Filhos pequenos, recomeço financeiro, precisa de proteção + crescimento.",
    cliente: "Patrícia, 50, dentista (clínica própria), divorciada há 3 meses, 2 filhos (10 e 13). Custódia compartilhada. Mora em apartamento alugado.",
    dados: {
      "Patrimônio": "R$ 700.000 (partilha)",
      "Composição atual": "Conta corrente (recém-liberado)",
      "Renda mensal": "R$ 22.000 (clínica)",
      "Custos": "R$ 16.000 (incluindo pensão dos filhos)",
      "Reserva de emergência": "Inexistente — partilha veio em momento de aperto",
      "Horizonte": "Misto: 15% curto (1-2 anos) / 85% longo (aposentadoria)"
    },
    objetivos: [
      "Construir reserva sólida pós-divórcio",
      "Garantir educação dos filhos (faculdade em 5-8 anos)",
      "Recompor aposentadoria (perdeu metade na partilha)"
    ],
    restricoes: [
      "Emocionalmente frágil — não topa volatilidade extrema agora",
      "Quer ver o patrimônio crescer (não só preservar)",
      "Suspeita de produtos complexos (ex-marido era 'do mercado')"
    ],
    macro: "Volatilidade alta. Selic 12,75% lateral. USD/BRL em R$ 5,90 (alta). Bolsa BR oscilando muito. Cenário fiscal crítico.",
    aporte_sugerido: 700000,
    gabarito: {
      "LFTS11": 20,   // Reserva + emergência
      "IMAB11": 25,   // Inflação proteção
      "B5P211": 15,   // IPCA+ curto (faculdade dos filhos)
      "FIXA11": 10,   // Prefixado moderado
      "BOVA11": 10,   // Ações BR
      "IVVB11": 15,   // Dolarização defensiva
      "XFIX11": 5     // FII renda
    },
    justificativa: "Em crise emocional + crise macro, conservadorismo aumenta sem trair o suitability moderado. 50% em RF aproveita taxas altas, 30% em variável (com peso em internacional como hedge da crise BR) dá crescimento, 20% liquidez/reserva resolve o gap emocional. B5P2 casa especificamente com horizonte da faculdade. Não cabe carteira agressiva mesmo sendo moderada — momento de vida pede prudência."
  },

  /* --------------- CASE 09 --------------- */
  {
    id: 9,
    _entrevista: true, // INTERNO: caiu em entrevista
    titulo: "Engenheiro Petrobras, R$ 150k FGTS sacado",
    ciclo: "alta-selic",
    perfil: "moderado",
    patrimonio: "baixo",
    custodia: "BR",
    resumo: "Saque-aniversário do FGTS. Nunca investiu além de Poupança e CDB do BB. Quer aprender.",
    cliente: "Roberto, 42, engenheiro Petrobras (concursado), casado, 2 filhos (8 e 11). Renda estável R$ 18k/mês.",
    dados: {
      "Patrimônio investível": "R$ 150.000 (FGTS recém-sacado)",
      "Outros recursos": "R$ 60k em CDB BB (já tem) — não vai mexer agora",
      "Salário": "R$ 18.000",
      "Aporte mensal": "R$ 2.500",
      "Reserva de emergência": "Já cobre (CDB BB)",
      "Horizonte": "Longo (18 anos até aposentar com estabilidade Petrobras)"
    },
    objetivos: [
      "Primeiro investimento 'de verdade' fora do banco",
      "Aprender enquanto investe (cliente curioso e estudioso)",
      "Começar a dolarização (lê notícias do exterior, preocupado com BR)"
    ],
    restricoes: [
      "Vai consumir conteúdo — assessor precisa explicar tudo",
      "Quer simplicidade (ETFs já é avanço vs CDB)",
      "Aceita volatilidade moderada"
    ],
    macro: "Selic 13,75% alta. IPCA+ pagando taxas reais elevadas. Janela favorável tanto para RF quanto para iniciar variável.",
    aporte_sugerido: 150000,
    gabarito: {
      "LFTS11": 10,   // Liquidez (mesmo já tendo no CDB)
      "IMAB11": 25,   // Núcleo inflação
      "FIXA11": 15,   // Prefixado topo de ciclo
      "BOVA11": 20,   // Ações BR
      "IVVB11": 20,   // S&P em BRL (dolarização inicial)
      "NASD11": 10    // Tech US — aderente ao perfil curioso
    },
    justificativa: "Carteira 'didática' para cliente curioso e moderado. 50% RF aproveita taxas altas (IMAB+FIXA+LFTS). 50% variável com peso 30/20 em internacional/BR atende ao interesse em dolarização sem complicar com offshore. NASD entra porque o cliente curioso vai consumir conteúdo de tech US naturalmente — engaja. Boa carteira para o cliente 'pegar amor pelo mercado'."
  },

  /* --------------- CASE 10 --------------- */
  {
    id: 10,
    titulo: "Empresária, R$ 5MM da venda da empresa",
    ciclo: "estavel",
    perfil: "moderado",
    patrimonio: "alto",
    custodia: "OFFSHORE",
    resumo: "Vendeu sua participação em uma startup por R$ 8MM líquidos. Já comprou imóvel, sobrou R$ 5MM. Quer preservação + crescimento moderado.",
    cliente: "Fernanda, 44, ex-CFO, vendeu participação na empresa. Casada, 1 filho universitário (USP). Renda atual zero — vai viver do patrimônio + projetos pessoais.",
    dados: {
      "Patrimônio total": "R$ 5.000.000",
      "Composição": "Conta corrente, recém-liberada",
      "Renda mensal": "R$ 0 (vai depender do patrimônio)",
      "Necessidade mensal": "R$ 25.000",
      "Custódia": "Aberta para offshore + onshore",
      "Horizonte": "Wealth de longuíssimo prazo + renda atual"
    },
    objetivos: [
      "Wealth preservation primeiro, crescimento moderado segundo",
      "Estrutura tax-efficient (vendeu com ganho, sensível a tributação)",
      "Renda mensal sustentável (~R$ 25k = retorno real exigido ~6% a.a.)"
    ],
    restricoes: [
      "Aversão a perdas mesmo sendo moderada (efeito 'wealth recém-conquistada')",
      "Quer parte significativa offshore (medo de risco-país)",
      "Não quer single-stocks (já teve concentração na empresa dela)"
    ],
    macro: "Cenário global estável. Fed 4,5% lateral. BR Selic 11,75% caindo. USD/BRL R$ 5,40. Bolsas em níveis intermediários.",
    aporte_sugerido: 5000000,
    gabarito: {
      // 60% Offshore / 40% BR
      "CSPX": 18,    // S&P UCITS
      "IWDA": 12,    // Mundo
      "EIMI": 5,     // Emergentes
      "TIP": 15,     // RF inflação US
      "GLD": 5,      // Ouro
      "VNQ": 5,      // REITs
      // ONSHORE
      "LFTS11": 10,  // Liquidez para saques mensais
      "IMAB11": 15,  // Núcleo BR
      "FIXA11": 5,   // Prefixado BR
      "BOVA11": 5,   // Ações BR
      "XFIX11": 5    // FII renda
    },
    justificativa: "Carteira 60/40 (Offshore/BR) com viés conservador dentro do perfil moderado, dado o momento 'recém-rica'. Offshore via UCITS evita estate tax. RF é dominante (45% total) para entregar os ~6% reais sem grande risco. Renda mensal sai do LFTS11 (10% = R$500k líquidos, ~20 meses de saque) + dividendos do XFIX. Ouro e REITs entram como descorrelação. Gabarito que prioriza 'não perder' sobre 'maximizar' — adequado ao momento de vida."
  },

  /* --------------- CASE 11 --------------- */
  {
    id: 11,
    titulo: "Aposentado militar, 65a, R$ 800k — renda passiva",
    ciclo: "queda-selic",
    perfil: "conservador",
    patrimonio: "medio",
    custodia: "BR",
    resumo: "Coronel reformado, foco total em renda mensal. Hoje vive da pensão + LCI/LCA que vencem em 2 anos.",
    cliente: "Coronel Almeida, 65, reformado FAB, casado, 3 filhos adultos. Pensão integral R$ 18k/mês. Custo mensal R$ 12k (estilo de vida confortável).",
    dados: {
      "Patrimônio total": "R$ 800.000",
      "Composição atual": "60% LCI/LCA (vencendo 2026) / 30% CDB / 10% Poupança",
      "Pensão FAB": "R$ 18.000",
      "Aporte mensal": "R$ 4.000 (sobra da pensão)",
      "Necessidade do patrimônio": "Reforço para gastos extras + herança",
      "Horizonte": "Vitalício + sucessão"
    },
    objetivos: [
      "Maximizar renda mensal (dividendos + cupons)",
      "Travar taxas reais antes da Selic continuar caindo",
      "Pequena exposição a variável para combater inflação no longuíssimo prazo"
    ],
    restricoes: [
      "Disciplina militar = baixíssima tolerância a 'perda nominal' em RV",
      "Acompanha o noticiário e fica nervoso com volatilidade",
      "Não pretende deixar o BR (custódia BR sempre)"
    ],
    macro: "Selic 11,5% caindo (precificado 9% em 12m). IPCA+ longo pagando 5,8% real. FII com yield médio 0,9% a.m. Janela ótima para renda passiva travada.",
    aporte_sugerido: 800000,
    gabarito: {
      "LFTS11": 15,   // Liquidez para gastos
      "IMAB11": 25,   // Núcleo inflação médio
      "IB5M11": 20,   // IPCA+ longo (travar topo)
      "FIXA11": 15,   // Prefixado topo
      "DIVO11": 10,   // Dividendos BR
      "XFIX11": 15    // FII para renda mensal
    },
    justificativa: "Para conservador focado em renda, gabarito explora dois geradores de cash: (1) cupons semestrais de IMAB+IB5M+FIXA, (2) dividendos mensais de DIVO+XFIX. Total 25% em variável geradora de renda passiva — único caminho 'aceitável' de variável para conservador militar disciplinado. IB5M trava IPCA+ longo em janela rara antes da queda continuar."
  },

  /* --------------- CASE 12 --------------- */
  {
    id: 12,
    _entrevista: true, // INTERNO: caiu em entrevista
    titulo: "Tech worker, 34a, R$ 1,5MM em stock vesting USD",
    ciclo: "crise",
    perfil: "arrojado",
    patrimonio: "alto",
    custodia: "OFFSHORE",
    resumo: "Engenheiro de software de big tech US, recebe RSUs em USD. Tem concentração de 70% em uma única ação. Precisa diversificar urgente.",
    cliente: "Daniel, 34, engineering manager em big tech, single, mora em SP. Salário base R$ 35k + RSUs vestidas vendidas anualmente (~R$ 400k/ano líquido).",
    dados: {
      "Patrimônio total": "R$ 1.500.000 equivalente em USD",
      "Composição atual": "70% ações da própria empresa (RSUs não vendidas) / 30% conta USD parada",
      "Renda mensal": "R$ 35k base + RSUs",
      "Aporte mensal": "R$ 30.000",
      "Custódia": "Offshore (Schwab/IBKR existente)",
      "Horizonte": "Longo (financial independence em 10-15 anos — FIRE movement)"
    },
    objetivos: [
      "Reduzir concentração da single-stock para <10%",
      "Diversificar globalmente em USD",
      "Construir portfólio FIRE (foco em accumulação agressiva)"
    ],
    restricoes: [
      "Já tem conta offshore funcional",
      "Sabe sobre US estate tax — quer migrar para UCITS",
      "Não quer renda fixa BR (vive em USD mentalmente)"
    ],
    macro: "Volatilidade tech US elevada. Fed 4,5% mantendo. USD/BRL alto. NASDAQ em correção de 15% do topo. Boa janela para entrar em ETFs amplos.",
    aporte_sugerido: 1500000,
    gabarito: {
      // 90% UCITS / 10% concentração residual da empresa (não no gabarito ETF)
      "CSPX": 35,    // S&P 500 UCITS — núcleo
      "IWDA": 25,    // Mundo desenvolvido
      "EIMI": 10,    // Emergentes
      "TIP": 10,     // RF inflação US
      "AGG": 10,     // RF aggregate
      "GLD": 5,      // Ouro descorrelação
      "VNQ": 5       // REITs
    },
    justificativa: "Concentração de 70% em single stock é o erro #1 a corrigir. Gabarito faz tax-loss harvesting parcial (mas isso é execução, não alocação) e redireciona para 70% RV ampla via UCITS. CSPX+IWDA+EIMI = cobertura global. RF moderada (20%) porque perfil é FIRE acumulação. Crítico: não dobrar exposição S&P comprando VOO/VTI quando já tem RSUs em big tech US — usar CSPX/IWDA é diversificação real. UCITS obrigatório dado o tamanho >US$60k (estate tax)."
  },

  /* --------------- CASE 13 --------------- */
  {
    id: 13,
    titulo: "Mãe solo, R$ 120k — reserva educacional 10 anos",
    ciclo: "alta-selic",
    perfil: "conservador",
    patrimonio: "baixo",
    custodia: "BR",
    resumo: "Pediatra, mãe solo, filho de 8 anos. Quer construir reserva para faculdade dele (em 10 anos). Hoje tem R$ 120k na Poupança.",
    cliente: "Carla, 36, pediatra (CLT em hospital + plantões PJ). Mora com o filho em apartamento alugado. Renda R$ 16k/mês.",
    dados: {
      "Patrimônio total": "R$ 120.000",
      "Composição atual": "100% Poupança CEF",
      "Renda mensal": "R$ 16.000",
      "Custos mensais": "R$ 11.000 (incluindo escola particular do filho)",
      "Reserva de emergência": "Embutida na Poupança",
      "Horizonte": "Misto — 30% reserva permanente, 70% faculdade (10 anos)"
    },
    objetivos: [
      "Faculdade do filho em 10 anos — meta R$ 250k em valor real",
      "Manter reserva de emergência intocável",
      "Sair da Poupança (entendeu que está perdendo para CDI)"
    ],
    restricoes: [
      "Cliente conservadora E vulnerável (mãe solo) — zero tolerância a perdas",
      "Aporte mensal modesto (R$ 1.500) — patrimônio cresce devagar",
      "Custódia simples — não quer múltiplas corretoras"
    ],
    macro: "Selic 13,75% alta. IPCA+ 10 anos pagando 6%. Janela ouro para travar taxa real para objetivo de 10 anos.",
    aporte_sugerido: 120000,
    gabarito: {
      "LFTS11": 25,   // Reserva de emergência intocável
      "B5P211": 25,   // IPCA+ curto-médio (escalonamento)
      "IMAB11": 30,   // IPCA+ médio (casa com 10 anos)
      "FIXA11": 10,   // Prefixado pequeno
      "BOVA11": 10    // Pequena dose RV (10 anos suporta)
    },
    justificativa: "Objetivo de 10 anos + perfil conservador real = núcleo em IPCA+ duration média que casa com o horizonte. LFTS protege a parte de emergência. 10% em BOVA é o limite defensável para conservadora, mas 10 anos de horizonte permite. Gabarito casa duration com objetivo (escola dos filhos). Cuidado: não vender variável agressiva para mãe solo conservadora, mesmo que matematicamente o longo prazo justifique — aderência comportamental >>> teoria."
  },

  /* --------------- CASE 14 --------------- */
  {
    id: 14,
    _entrevista: true, // INTERNO: caiu em entrevista
    titulo: "Médico residente, R$ 250k, 50% LCI/LCA vencendo",
    ciclo: "queda-selic",
    perfil: "moderado",
    patrimonio: "medio",
    custodia: "BR",
    resumo: "Recém-formado, residência em SP, recebeu herança do pai (R$ 250k). Metade em LCI/LCA do banco do pai vencendo agora.",
    cliente: "Felipe, 27, médico residente (R3 cirurgia), solteiro, mora com a mãe. Renda R$ 4.500 residência + R$ 3k plantões.",
    dados: {
      "Patrimônio total": "R$ 250.000 (herança)",
      "Composição atual": "50% LCI/LCA vencendo / 30% CDB DI / 20% Poupança",
      "Renda mensal": "R$ 7.500",
      "Aporte mensal": "R$ 1.500 (residência rouba tempo)",
      "Reserva de emergência": "Vai morar com a mãe nos próximos 5 anos",
      "Horizonte": "Longo (acaba residência em 2 anos, depois carreira PJ)"
    },
    objetivos: [
      "Reposicionar o vencimento de LCI/LCA (Selic caiu, taxas não compensam mais)",
      "Considerar tributação (LCI/LCA isentas vs ETF tributado)",
      "Construir base patrimonial antes de virar PJ médico"
    ],
    restricoes: [
      "Vencimento de LCI/LCA = janela única de reposicionamento (não rolar automaticamente)",
      "Como residente, baixíssima necessidade de liquidez (mora com a mãe)",
      "Horizonte longo permite agressividade moderada"
    ],
    macro: "Selic 11,5% caindo. LCI/LCA novas pagando 90% CDI (vs Tesouro IPCA+ 5,8% real). Janela de reposicionamento favorece RV.",
    aporte_sugerido: 250000,
    gabarito: {
      "LFTS11": 5,    // Mínimo (mora com a mãe)
      "IMAB11": 20,   // Núcleo IPCA+
      "IB5M11": 15,   // IPCA+ longo
      "BOVA11": 20,   // Ações BR
      "IVVB11": 20,   // S&P em BRL
      "NASD11": 10,   // Tech US
      "SMAL11": 10    // Small caps (idade + horizonte permite)
    },
    justificativa: "Reposicionamento de LCI/LCA vencendo é janela tática rara. Cliente moderado com características arrojadas (idade, horizonte, sem liquidez exigida) merece carteira 60/40 (RV/RF) — agressiva dentro do moderado. SMAL entra pelo perfil etário. Crítico não 'rolar' LCI/LCA automaticamente — taxa caiu, tributação isenta perdeu vantagem comparativa, ETFs entregam mais retorno bruto-líquido para esse horizonte."
  },

  /* --------------- CASE 15 --------------- */
  {
    id: 15,
    titulo: "Casal expatriado, USD 400k offshore (Insigneo)",
    ciclo: "estavel",
    perfil: "moderado",
    patrimonio: "alto",
    custodia: "OFFSHORE",
    resumo: "Casal mudou para Portugal há 2 anos. Tem USD 400k em conta Insigneo. Quer carteira UCITS pura para evitar US estate tax.",
    cliente: "Júlio (45, executivo farmacêutica) e Renata (43, gerente de produto). Mudaram para Lisboa em 2023. Visto D7. Filho de 11 anos.",
    dados: {
      "Patrimônio offshore": "USD 400.000",
      "Composição atual": "Mix de fundos ativos com TER >1,5% (Allianz wind-down)",
      "Renda combinada": "EUR 14.000/mês (Portugal)",
      "Custos": "EUR 9.000/mês",
      "Custódia": "Insigneo (UCITS-capable)",
      "Horizonte": "Longo (aposentadoria em Portugal, 15-20 anos)"
    },
    objetivos: [
      "Migrar 100% para UCITS (evitar US estate tax)",
      "Reduzir TER médio para <0,20%",
      "Carteira global diversificada, viés moderado"
    ],
    restricoes: [
      "Insigneo = só UCITS disponível na prática",
      "Não querem dólar 100% (vivem em EUR — algum hedge cambial)",
      "Não querem ativos brasileiros (já saíram do país)"
    ],
    macro: "Fed 4,5% mantendo. ECB 3,5%. Inflação developed markets 2,5%. Cenário global estável construtivo. EUR/USD em 1,07 — não esticado.",
    aporte_sugerido: 1500000,  // Equivalente em BRL aproximado para os cálculos
    gabarito: {
      // Tudo UCITS via Insigneo
      "CSPX": 30,    // S&P 500 UCITS
      "IWDA": 25,    // Mundo desenvolvido (inclui Europa)
      "EIMI": 10,    // Emergentes UCITS
      "AGG": 15,     // RF (na prática equivalente UCITS bond aggregate)
      "TIP": 10,     // RF inflação
      "GLD": 5,      // Ouro
      "VNQ": 5       // REITs
    },
    justificativa: "Carteira UCITS pura para evitar US estate tax de 40% sobre >US$60k (crítico para US$400k!). 70/30 RV/RF dentro do moderado. CSPX+IWDA cobrem developed markets (incluindo Europa onde vivem). EIMI adiciona emergentes. TIP+AGG são proxies para o que na prática seria executado em UCITS bond ETFs. Custo total TER médio <0,20%. Eliminação de fundos ativos com TER 1,5% gera economia de USD 5,200/ano — material para o cliente."
  }
];

/* =================================================================================
   ESTADO DA APLICAÇÃO
   ================================================================================= */
let caseAtual = null;
let montagemAtual = []; // [{ticker, pct}]
let modoLivre = false;
// Pseudo-case do Modo Livre: libera pitch (tela 5) e apresentação (tela 6)
// para carteiras montadas fora do catálogo — mesmos fluxos, contexto neutro.
const CASE_MODO_LIVRE = {
  id: 0,
  titulo: "Carteira própria",
  cliente: "Cliente real — carteira montada no Modo Livre",
  perfil: "—",
  ciclo: null,
  macro: ""
};
