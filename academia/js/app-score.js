// academia/js/app-score.js — avaliação pedagógica (score, erros nomeados, feedback)

/* =================================================================================
   FORMATAÇÃO pt-BR
   ================================================================================= */
var _fmtPct1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
var _fmtPct0 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

function fmtPct(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return _fmtPct1.format(v) + "%";
}
function fmtPctInt(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return _fmtPct0.format(v) + "%";
}
/* Índices ponderados (risco, liquidez efetiva) — número puro, sem sufixo de %. */
function fmtIndice(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  return _fmtPct1.format(v);
}
function fmtDelta(v) {
  if (v === null || v === undefined || isNaN(v)) return "—";
  var s = _fmtPct1.format(Math.abs(v));
  return (v > 0 ? "+" : v < 0 ? "−" : "") + s + " p.p.";
}

/* =================================================================================
   ATRIBUTOS POR CLASSE
   ---------------------------------------------------------------------------------
   ACADEMIA-06: perfil e liquidez deixam de depender de uma lista fechada de quatro
   classes de RV e passam a somar peso × atributo da classe, vindos do Catálogo.
   O mapa abaixo é o fallback usado quando window.Catalogo ainda não existe.
   ================================================================================= */
var SCORE_ATRIBUTOS_FALLBACK = {
  "RF Pós-Fixado":        { fatorRisco: 0.05, liquidezEfetiva: 1.00, moeda: "BRL", duration: 0.1 },
  "RF Prefixado":         { fatorRisco: 0.25, liquidezEfetiva: 0.70, moeda: "BRL", duration: 2.5 },
  "RF Inflação":          { fatorRisco: 0.35, liquidezEfetiva: 0.50, moeda: "BRL", duration: 5 },
  "RF Internacional":     { fatorRisco: 0.40, liquidezEfetiva: 0.60, moeda: "USD", duration: 6 },
  "Ações BR":             { fatorRisco: 1.00, liquidezEfetiva: 0.80, moeda: "BRL", duration: null },
  "Ações Internacionais": { fatorRisco: 1.00, liquidezEfetiva: 0.70, moeda: "USD", duration: null },
  "Dividendos":           { fatorRisco: 0.80, liquidezEfetiva: 0.70, moeda: "BRL", duration: null },
  "Mid/Small Caps":       { fatorRisco: 1.30, liquidezEfetiva: 0.50, moeda: "BRL", duration: null },
  "Setorial":             { fatorRisco: 1.20, liquidezEfetiva: 0.60, moeda: "BRL", duration: null },
  "FIIs Tijolo":          { fatorRisco: 0.80, liquidezEfetiva: 0.50, moeda: "BRL", duration: null },
  "FIIs Papel":           { fatorRisco: 0.45, liquidezEfetiva: 0.50, moeda: "BRL", duration: 3 },
  "FIAgros":              { fatorRisco: 0.60, liquidezEfetiva: 0.35, moeda: "BRL", duration: 3 },
  "BDRs":                 { fatorRisco: 1.10, liquidezEfetiva: 0.45, moeda: "USD", duration: null },
  "Cripto":               { fatorRisco: 1.50, liquidezEfetiva: 0.80, moeda: "USD", duration: null },
  "Alternativos":         { fatorRisco: 0.90, liquidezEfetiva: 0.60, moeda: "USD", duration: null },
  "Fundos Abertos":       { fatorRisco: 0.50, liquidezEfetiva: 0.30, moeda: "BRL", duration: null },
  "Offshore US":          { fatorRisco: 1.00, liquidezEfetiva: 0.70, moeda: "USD", duration: null },
  "UCITS":                { fatorRisco: 1.00, liquidezEfetiva: 0.50, moeda: "USD", duration: null },
  "Não classificado":     { fatorRisco: 1.00, liquidezEfetiva: 0.50, moeda: "BRL", duration: null }
};

/* Nomes de classe herdados da base antiga de ETFs → taxonomia fechada do Catálogo. */
var SCORE_CLASSES_LEGADAS = {
  "FIIs": "FIIs Tijolo",
  "FII": "FIIs Tijolo",
  "Fundo Aberto": "Fundos Abertos",
  "Offshore": "Offshore US",
  "Renda Fixa": "RF Pós-Fixado"
};

function scoreClasseNormalizada(classe) {
  if (!classe) return "Não classificado";
  if (SCORE_CLASSES_LEGADAS[classe]) return SCORE_CLASSES_LEGADAS[classe];
  return classe;
}

function scoreAtributos(classe) {
  var c = scoreClasseNormalizada(classe);
  if (typeof window !== "undefined" && window.Catalogo && typeof window.Catalogo.atributos === "function") {
    var viaCatalogo = window.Catalogo.atributos(c);
    if (viaCatalogo) return viaCatalogo;
  }
  return SCORE_ATRIBUTOS_FALLBACK[c] || SCORE_ATRIBUTOS_FALLBACK["Não classificado"];
}

function scoreClasseDoTicker(ticker) {
  if (!ticker) return "Não classificado";
  if (typeof window !== "undefined" && window.Catalogo && typeof window.Catalogo.classeDe === "function") {
    var c = window.Catalogo.classeDe(ticker);
    if (c) return scoreClasseNormalizada(c);
  }
  var etf = (typeof ETFs !== "undefined" && ETFs) ? ETFs.find(function (e) { return e.ticker === ticker; }) : null;
  return scoreClasseNormalizada(etf ? etf.classe : null);
}

/* =================================================================================
   UTILITÁRIOS
   ================================================================================= */
/* ACADEMIA-02: nenhuma dimensão sai de 0..100 — nem no cálculo, nem na barra. */
function clamp100(v) {
  if (v === null || v === undefined || isNaN(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

function linhasValidas(alloc) {
  return (alloc || []).filter(function (l) { return l && l.ticker && l.pct > 0; });
}

/* Soma os pesos por ticker (uma carteira pode repetir o mesmo papel em duas linhas). */
function pesosPorTicker(alloc) {
  var out = {};
  linhasValidas(alloc).forEach(function (l) {
    out[l.ticker] = (out[l.ticker] || 0) + l.pct;
  });
  return out;
}

function carteiraDoGabarito(caso) {
  if (!caso || !caso.gabarito) return [];
  return Object.keys(caso.gabarito).map(function (t) {
    return { ticker: t, pct: Number(caso.gabarito[t]) };
  });
}

/* ACADEMIA-03: DUAS métricas de concentração, com nome fixo, usadas do mesmo jeito
   no cálculo, no tooltip e no feedback.
   - concentração POR ATIVO  = maior peso num único ticker
   - concentração POR CLASSE = maior peso numa única classe                        */
function concentracaoPorAtivo(alloc) {
  var pesos = Object.values(pesosPorTicker(alloc));
  return pesos.length ? Math.max.apply(null, pesos) : 0;
}
function concentracaoPorClasse(porClasse) {
  var pesos = Object.values(porClasse || {});
  return pesos.length ? Math.max.apply(null, pesos) : 0;
}

/* Exposição cambial: soma dos pesos cujas classes têm moeda USD. */
function exposicaoMoeda(porClasse, moeda) {
  var total = 0;
  Object.keys(porClasse || {}).forEach(function (c) {
    if (scoreAtributos(c).moeda === moeda) total += porClasse[c];
  });
  return total;
}

/* Soma peso × atributo da classe (fatorRisco ou liquidezEfetiva). */
function somaPonderadaPorClasse(porClasse, atributo) {
  var total = 0;
  Object.keys(porClasse || {}).forEach(function (c) {
    var at = scoreAtributos(c);
    var v = at ? at[atributo] : null;
    if (typeof v === "number") total += porClasse[c] * v;
  });
  return total;
}

/* =================================================================================
   SCORE — 4 dimensões
   ---------------------------------------------------------------------------------
   1. Aderência ao perfil (30%) — risco ponderado da carteira vs risco do gabarito
   2. Coerência macro     (25%) — distância do gabarito por classe
   3. Liquidez            (20%) — liquidez efetiva ponderada vs a do gabarito
   4. Diversificação      (25%) — nº de classes do gabarito + concentração RELATIVA
                                  ao gabarito (ACADEMIA-01)
   ================================================================================= */
var SCORE_TOLERANCIA_CLASSE = 10;   // p.p. de folga acima do gabarito, por classe
var SCORE_PISO_CONC_ATIVO = 35;     // p.p. — limiar mínimo de concentração por ativo

function calcularScore() {
  var sua = agruparPorClasse(montagemAtual);
  var gabCarteira = carteiraDoGabarito(caseAtual);
  var gab = agruparPorClasse(gabCarteira);

  // Dim 1 — Perfil (risco ponderado, ACADEMIA-06)
  var riscoSua = somaPonderadaPorClasse(sua, "fatorRisco");
  var riscoGab = somaPonderadaPorClasse(gab, "fatorRisco");
  var diffRisco = Math.abs(riscoSua - riscoGab);
  var scorePerfil = clamp100(100 - diffRisco * 3);

  // Dim 2 — Macro (coerência por classe)
  var classes = {};
  Object.keys(sua).forEach(function (c) { classes[c] = true; });
  Object.keys(gab).forEach(function (c) { classes[c] = true; });
  var somaDiff = 0;
  Object.keys(classes).forEach(function (c) {
    somaDiff += Math.abs((sua[c] || 0) - (gab[c] || 0));
  });
  var scoreMacro = clamp100(100 - somaDiff * 1.2);

  // Dim 3 — Liquidez (liquidez efetiva ponderada, ACADEMIA-06)
  var liqSua = somaPonderadaPorClasse(sua, "liquidezEfetiva");
  var liqGab = somaPonderadaPorClasse(gab, "liquidezEfetiva");
  var diffLiq = Math.abs(liqSua - liqGab);
  var scoreLiq = clamp100(100 - diffLiq * 4);

  // Dim 4 — Diversificação (ACADEMIA-01: tudo relativo ao gabarito do case)
  var classesGab = Object.keys(gab).filter(function (c) { return gab[c] > 0; }).length;
  var classesSua = Object.keys(sua).filter(function (c) { return sua[c] > 0; }).length;
  var concAtivo = concentracaoPorAtivo(montagemAtual);
  var concClasse = concentracaoPorClasse(sua);

  // Excesso por classe: só conta onde o aluno concentra MAIS do que o modelo.
  var excessoClasse = 0;
  var classeExcedida = null;
  Object.keys(classes).forEach(function (c) {
    var exc = (sua[c] || 0) - (gab[c] || 0);
    if (exc > excessoClasse) { excessoClasse = exc; classeExcedida = c; }
  });

  // Excesso por ativo: limiar é o maior do piso pedagógico e do próprio gabarito.
  var pesosGabTicker = pesosPorTicker(gabCarteira);
  var maiorAtivoGab = Object.values(pesosGabTicker).length
    ? Math.max.apply(null, Object.values(pesosGabTicker)) : 0;
  var limiarAtivo = Math.max(SCORE_PISO_CONC_ATIVO, maiorAtivoGab);

  var scoreDiv = 100;
  if (classesSua < classesGab) scoreDiv -= (classesGab - classesSua) * 15;
  if (excessoClasse > SCORE_TOLERANCIA_CLASSE) scoreDiv -= (excessoClasse - SCORE_TOLERANCIA_CLASSE) * 1.2;
  if (concAtivo > limiarAtivo) scoreDiv -= (concAtivo - limiarAtivo) * 1.2;
  scoreDiv = clamp100(scoreDiv);

  // Soma — checa se = 100%
  var somaTotal = (montagemAtual || []).reduce(function (acc, l) { return acc + (l.pct || 0); }, 0);
  var penalSoma = Math.abs(somaTotal - 100) * 0.5;

  var total = clamp100(Math.round(
    scorePerfil * 0.30 + scoreMacro * 0.25 + scoreLiq * 0.20 + scoreDiv * 0.25 - penalSoma
  ));

  var erros = detectarErros(montagemAtual, caseAtual);

  // ACADEMIA-10: a tentativa só é contada quando a proposta é submetida.
  if (caseAtual && typeof registrarTentativa === "function") {
    registrarTentativa(caseAtual.id, "submit");
  }

  return {
    total: total,
    perfil: Math.round(clamp100(scorePerfil)),
    macro: Math.round(clamp100(scoreMacro)),
    liquidez: Math.round(clamp100(scoreLiq)),
    diversificacao: Math.round(clamp100(scoreDiv)),
    sua: sua,
    gab: gab,
    // risco ponderado (mantém rvSua/rvGab por compatibilidade de nome)
    riscoSua: riscoSua, riscoGab: riscoGab,
    rvSua: riscoSua, rvGab: riscoGab,
    liqPonderadaSua: liqSua, liqPonderadaGab: liqGab,
    // ACADEMIA-03 — as duas métricas nomeadas, calculadas uma única vez
    concentracaoAtivo: concAtivo,
    concentracaoClasse: concClasse,
    limiarConcentracaoAtivo: limiarAtivo,
    excessoConcentracaoClasse: excessoClasse,
    classeMaisExcedida: classeExcedida,
    classesSua: classesSua,
    classesGab: classesGab,
    somaTotal: somaTotal,
    erros: erros
  };
}

/* =================================================================================
   ACADEMIA-07 — ERROS NOMEADOS
   ---------------------------------------------------------------------------------
   Regra geral: nunca acusamos o aluno de algo que o próprio gabarito faz. Por isso
   cada limiar absoluto é comparado também com o gabarito do case.
   ================================================================================= */
var SCORE_LIMIAR_CONC_ATIVO = 35;      // p.p. num único ticker
var SCORE_FOLGA_CONC_CLASSE = 20;      // p.p. acima do gabarito, por classe
var SCORE_LIMIAR_CAMBIO = 40;          // p.p. em moeda USD num case conservador

function detectarErros(montagem, caso) {
  var erros = [];
  var linhas = linhasValidas(montagem);
  var porTicker = pesosPorTicker(montagem);
  var tickers = Object.keys(porTicker);
  var porClasse = agruparPorClasse(montagem);

  var gabCarteira = carteiraDoGabarito(caso);
  var gabTicker = pesosPorTicker(gabCarteira);
  var gabClasse = agruparPorClasse(gabCarteira);

  // --- DUPLICIDADE -------------------------------------------------------------
  if (typeof window !== "undefined" && window.Catalogo && typeof window.Catalogo.sobreposicoes === "function") {
    var paresGab = {};
    try {
      window.Catalogo.sobreposicoes(Object.keys(gabTicker)).forEach(function (p) {
        paresGab[p.a + "|" + p.b] = true;
        paresGab[p.b + "|" + p.a] = true;
      });
    } catch (e) { /* gabarito sem sobreposições conhecidas */ }
    var pares = [];
    try { pares = window.Catalogo.sobreposicoes(tickers) || []; } catch (e) { pares = []; }
    pares.forEach(function (p) {
      if (paresGab[p.a + "|" + p.b]) return;
      erros.push({
        codigo: "DUPLICIDADE",
        nome: "Duplicidade de exposição",
        gravidade: "media",
        evidencia: p.a + " (" + fmtPct(porTicker[p.a] || 0) + ") e " + p.b + " (" + fmtPct(porTicker[p.b] || 0) +
                   ") cobrem a mesma exposição — " + p.motivo + ".",
        comoCorrigir: "Fique com um dos dois e some o peso do outro nele, ou troque um deles por uma exposição que a carteira ainda não tem."
      });
    });
  }

  // --- CONCENTRACAO_ATIVO ------------------------------------------------------
  tickers.forEach(function (t) {
    var pesoGab = gabTicker[t] || 0;
    if (porTicker[t] > SCORE_LIMIAR_CONC_ATIVO && porTicker[t] > pesoGab) {
      erros.push({
        codigo: "CONCENTRACAO_ATIVO",
        nome: "Concentração por ativo",
        gravidade: porTicker[t] > 50 ? "alta" : "media",
        evidencia: t + " responde por " + fmtPct(porTicker[t]) + " da carteira (limite pedagógico: " +
                   fmtPct(SCORE_LIMIAR_CONC_ATIVO) + "; no gabarito: " + fmtPct(pesoGab) + ").",
        comoCorrigir: "Reduza " + t + " para no máximo " + fmtPct(Math.max(SCORE_LIMIAR_CONC_ATIVO, pesoGab)) +
                      " e redistribua a diferença entre as classes que o gabarito usa."
      });
    }
  });

  // --- CONCENTRACAO_CLASSE -----------------------------------------------------
  Object.keys(porClasse).forEach(function (c) {
    var teto = (gabClasse[c] || 0) + SCORE_FOLGA_CONC_CLASSE;
    if (porClasse[c] > teto) {
      erros.push({
        codigo: "CONCENTRACAO_CLASSE",
        nome: "Concentração por classe",
        gravidade: porClasse[c] - teto > 20 ? "alta" : "media",
        evidencia: c + " ficou com " + fmtPct(porClasse[c]) + " contra " + fmtPct(gabClasse[c] || 0) +
                   " do gabarito (" + fmtDelta(porClasse[c] - (gabClasse[c] || 0)) + ").",
        comoCorrigir: "Traga " + c + " para perto de " + fmtPct(gabClasse[c] || 0) +
                      " e devolva o excedente às classes em que você ficou abaixo do modelo."
      });
    }
  });

  // --- SOMA_FORA ---------------------------------------------------------------
  var soma = (montagem || []).reduce(function (acc, l) { return acc + (l.pct || 0); }, 0);
  if (Math.abs(soma - 100) > 0.05) {
    erros.push({
      codigo: "SOMA_FORA",
      nome: "Soma fora de 100%",
      gravidade: "alta",
      evidencia: "A carteira soma " + fmtPct(soma) + " em " + linhas.length + " posição(ões).",
      comoCorrigir: soma > 100
        ? "Retire " + fmtPct(soma - 100) + " das posições mais pesadas."
        : "Aloque os " + fmtPct(100 - soma) + " que faltam."
    });
  }

  // --- CAMBIO_SEM_HEDGE --------------------------------------------------------
  var perfil = caso && caso.perfil ? String(caso.perfil).toLowerCase() : "";
  if (perfil.indexOf("conservador") !== -1) {
    var usdSua = exposicaoMoeda(porClasse, "USD");
    var usdGab = exposicaoMoeda(gabClasse, "USD");
    var tetoUSD = Math.max(SCORE_LIMIAR_CAMBIO, usdGab);
    if (usdSua > tetoUSD) {
      erros.push({
        codigo: "CAMBIO_SEM_HEDGE",
        nome: "Câmbio sem hedge",
        gravidade: "alta",
        evidencia: fmtPct(usdSua) + " da carteira está em ativos dolarizados, num case de perfil " +
                   caso.perfil + " (limite: " + fmtPct(tetoUSD) + "; gabarito: " + fmtPct(usdGab) + ").",
        comoCorrigir: "Reduza a parcela em dólar para até " + fmtPct(tetoUSD) +
                      " ou explique no pitch como o cliente conservador convive com a variação cambial."
      });
    }
  }

  // Mais grave primeiro. Os pesos começam em 1 porque 0 seria falsy no fallback.
  var ordem = { alta: 1, media: 2, baixa: 3 };
  erros.sort(function (a, b) { return (ordem[a.gravidade] || 9) - (ordem[b.gravidade] || 9); });
  return erros;
}

/* =================================================================================
   PONTE COM A AVALIAÇÃO MAP — estrutura pronta para conexão futura
   ---------------------------------------------------------------------------------
   NOTA PARA O ADVISORPRO (Lovable):
   Esta função monta o registro de uma tentativa no formato esperado pela
   ferramenta de avaliação MAP. No protótipo ela só monta e loga o objeto.
   No AdvisorPro, este objeto deve ser PERSISTIDO no Supabase como evidência
   do desempenho do aluno no nível BETA — o score das 4 dimensões funciona
   como uma rubrica parcial de Beta ("monta carteira passiva com ETFs").
   O mentor usa essas tentativas acumuladas para decidir a progressão
   Beta → Gama. Sugestão: gravar em `feedbacks` ou em tabela própria de
   tentativas, linkada a `profiles.id` e a `methodology_levels` (nível Beta).
   Reaproveitar a ferramenta de avaliação de missões que já existe no
   ecossistema VocêBancário — adaptar, não recriar.
   ================================================================================= */
function montarRegistroAvaliacao(score) {
  return {
    // Identificação (no AdvisorPro virá do login/perfil Supabase)
    aluno: {
      nome: alunoIdentidade.nome || null,
      arroba: alunoIdentidade.arroba || null,
      programa: alunoIdentidade.programa || (modoAcesso === "MAP" ? "MAP" : "FEA")
    },
    // Contexto da tentativa
    nivel_map: "beta", // esta ferramenta avalia a competência do nível Beta
    case_id: caseAtual ? caseAtual.id : null,
    case_titulo: caseAtual ? caseAtual.titulo : null,
    framework_pitch: (typeof frameworkAtual !== "undefined" && frameworkAtual) ? frameworkAtual : null,
    // Carteira montada
    carteira: montagemAtual
      .filter(function (l) { return l.ticker && l.pct > 0; })
      .map(function (l) { return { ticker: l.ticker, pct: l.pct }; }),
    cenario_usado: cenarioFoiEditado() ? "atual_editado" : "case_original",
    // Score — funciona como rubrica parcial do nível Beta
    score: {
      total: score.total,
      aderencia_perfil: score.perfil,
      coerencia_macro: score.macro,
      liquidez: score.liquidez,
      diversificacao: score.diversificacao
    },
    // ACADEMIA-03 — métricas nomeadas, iguais às do feedback e do tooltip
    concentracao: {
      por_ativo: score.concentracaoAtivo !== undefined ? Number(score.concentracaoAtivo.toFixed(2)) : null,
      por_classe: score.concentracaoClasse !== undefined ? Number(score.concentracaoClasse.toFixed(2)) : null
    },
    // ACADEMIA-07 — erros nomeados vão junto da tentativa
    erros: (score.erros || []).map(function (e) {
      return { codigo: e.codigo, nome: e.nome, gravidade: e.gravidade, evidencia: e.evidencia };
    }),
    graficos_inseridos: graficosInseridos.map(function (g) { return g.tipo; }),
    timestamp: new Date().toISOString()
  };
}

/* =================================================================================
   TELA 4 — render
   ================================================================================= */
function renderTela4(score) {
  // Restore all elements (in case they were hidden by Modo Livre)
  document.querySelector('.score-header').style.display = '';
  document.querySelector('.comparativo-grid').style.display = '';
  var paineis4 = document.querySelectorAll('#tela4 > .painel');
  for (var i = 0; i < paineis4.length; i++) paineis4[i].style.display = '';
  document.getElementById("btn-ir-pitch").style.display = "";
  document.getElementById("btn-ir-pitch").textContent = "Estruturar pitch comercial →";
  document.getElementById("btn-voltar-inicio-livre").style.display = "none";
  document.getElementById("btn-refazer-montagem").textContent = "← Refazer montagem";

  // Score grande
  var numEl = document.getElementById("score-numero");
  var totalExibido = clamp100(score.total);
  numEl.innerHTML = totalExibido + "<small>/100</small>";
  numEl.classList.remove("ok", "warn", "bad");
  var msg = "";
  if (totalExibido >= 80) { numEl.classList.add("ok"); msg = "Excelente proposta. Aderente ao gabarito."; }
  else if (totalExibido >= 60) { numEl.classList.add("warn"); msg = "Proposta razoável, com pontos a ajustar."; }
  else { numEl.classList.add("bad"); msg = "Proposta com desvios importantes do gabarito. Revise o briefing."; }
  document.getElementById("score-mensagem").textContent = msg;

  // 4 dimensões — ACADEMIA-02: valor e barra sempre em 0..100
  var tipDiv = "Usa duas métricas: concentração POR ATIVO (maior peso num único ticker — hoje " +
    fmtPct(score.concentracaoAtivo) + ") e concentração POR CLASSE (maior peso numa única classe — hoje " +
    fmtPct(score.concentracaoClasse) + "). A penalidade só entra quando você concentra MAIS que o gabarito do case, " +
    "e a carteira precisa das " + score.classesGab + " classes que o modelo usa.";

  var dims = [
    { label: "Aderência ao perfil", val: clamp100(score.perfil), peso: 30, tip: "Soma peso × fator de risco de cada classe e compara com o mesmo cálculo no gabarito. Conservador com muita renda variável derruba esta nota." },
    { label: "Coerência macro", val: clamp100(score.macro), peso: 25, tip: "Compara sua alocação por classe com a do gabarito. Mede se você leu corretamente o cenário e alocou de acordo." },
    { label: "Liquidez", val: clamp100(score.liquidez), peso: 20, tip: "Soma peso × liquidez efetiva de cada classe e compara com o gabarito. Pós-fixado conta integralmente; fundos abertos e FIIs contam menos." },
    { label: "Diversificação", val: clamp100(score.diversificacao), peso: 25, tip: tipDiv }
  ];

  var contDims = document.getElementById("score-dimensoes");
  contDims.innerHTML = dims.map(function (d) {
    return '' +
      '<div class="dim-card">' +
        '<h5>' + d.label + ' (' + d.peso + '%)<span class="info-tip tip-down" data-tip="' + d.tip.replace(/"/g, "&quot;") + '"></span></h5>' +
        '<div class="dim-valor">' + Math.round(d.val) + '</div>' +
        '<div class="dim-barra"><div class="dim-barra-fill"></div></div>' +
      '</div>';
  }).join("");

  // Cor e largura aplicadas via JS (sem style= no HTML gerado); largura sempre 0..100.
  var cards = contDims.querySelectorAll(".dim-card");
  for (var k = 0; k < cards.length && k < dims.length; k++) {
    var v = clamp100(dims[k].val);
    var cor = v >= 80 ? "var(--ok)" : v >= 60 ? "var(--warn)" : "var(--bad)";
    var valEl = cards[k].querySelector(".dim-valor");
    var fillEl = cards[k].querySelector(".dim-barra-fill");
    if (valEl) valEl.style.color = cor;
    if (fillEl) { fillEl.style.width = v + "%"; fillEl.style.background = cor; }
  }

  // Pizzas comparativas (canvases ficam ocultos na tela 4 nova; mantidos por compatibilidade)
  renderPizza("grafico-sua", score.sua, chartSua, function (c) { chartSua = c; });
  renderPizza("grafico-gabarito", score.gab, chartGabarito, function (c) { chartGabarito = c; });
  // Barras empilhadas 100% (mesma escala de cor por classe da tela 3) + tabela de diferenças
  renderComposeEm("compose-sua", score.sua);
  renderComposeEm("compose-gabarito", score.gab);
  renderDiferencasClasse(score.sua, score.gab);

  // Perfil de risco do gabarito (sugestão do Rodrigo na call: deixar o perfil visível)
  document.getElementById("gabarito-perfil-tag").innerHTML =
    '<span class="tag tag-sm perfil-' + caseAtual.perfil.slice(0, 5) + '">Perfil-alvo: ' + caseAtual.perfil + '</span>' +
    '<span class="tag tag-sm">' + labelCiclo(caseAtual.ciclo) + '</span>';

  // Feedback pedagógico
  var feedback = gerarFeedback(score);
  document.getElementById("feedback-lista").innerHTML = feedback.map(function (f) {
    var icone = f.tipo === "ok" ? "OK" : f.tipo === "warn" ? "!" : "X";
    return '<li class="' + f.tipo + '"><span>' + icone + '</span><div><strong>' + f.titulo + '</strong>' + (f.detalhe || '') + '</div></li>';
  }).join("");

  document.getElementById("gabarito-justificativa").textContent = caseAtual.justificativa;

  if (window.AIDASim) AIDASim.render(montagemAtual, caseAtual);
}

/* =================================================================================
   ACADEMIA-08 — FEEDBACK
   Ordem: (1) tabela de diferenças por classe e por ticker, ordenada pelo maior
   desvio; (2) erros nomeados; (3) só se não houver erro nomeado, as frases gerais.
   ================================================================================= */
function linhasDeDiferenca(mapaSua, mapaGab) {
  var chaves = {};
  Object.keys(mapaSua || {}).forEach(function (k) { chaves[k] = true; });
  Object.keys(mapaGab || {}).forEach(function (k) { chaves[k] = true; });
  return Object.keys(chaves).map(function (k) {
    var s = (mapaSua && mapaSua[k]) || 0;
    var g = (mapaGab && mapaGab[k]) || 0;
    return { chave: k, sua: s, gab: g, delta: s - g };
  }).filter(function (r) {
    return Math.abs(r.delta) >= 0.05 || r.sua > 0 || r.gab > 0;
  }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
}

function tabelaDiferencasHTML(titulo, linhas, limite) {
  if (!linhas.length) return "";
  var corpo = linhas.slice(0, limite).map(function (r) {
    return '<div class="dado-key"><span>' + r.chave + '</span>' +
           '<span>você ' + fmtPct(r.sua) + ' · modelo ' + fmtPct(r.gab) + ' · Δ ' + fmtDelta(r.delta) + '</span></div>';
  }).join("");
  return '<div class="diff-bloco"><div class="diff-titulo">' + titulo + '</div>' + corpo + '</div>';
}

function gerarFeedback(score) {
  var fb = [];
  var sua = score.sua || {};
  var gab = score.gab || {};
  var erros = score.erros || detectarErros(montagemAtual, caseAtual);

  // (1) Tabela de diferenças — sempre em primeiro lugar
  var difClasses = linhasDeDiferenca(sua, gab);
  var difTickers = linhasDeDiferenca(pesosPorTicker(montagemAtual), pesosPorTicker(carteiraDoGabarito(caseAtual)));
  var maiorDesvio = difClasses.length ? difClasses[0] : null;
  var tabela = tabelaDiferencasHTML("Por classe", difClasses, 8) +
               tabelaDiferencasHTML("Por ativo", difTickers, 10);
  if (tabela) {
    var temDesvio = maiorDesvio && Math.abs(maiorDesvio.delta) >= 0.05;
    fb.push({
      tipo: temDesvio && Math.abs(maiorDesvio.delta) > 15 ? "warn" : "ok",
      titulo: temDesvio ? "Onde sua carteira difere do modelo" : "Sua carteira bate com o modelo",
      detalhe: (temDesvio
        ? '<div class="diff-resumo">Maior desvio: ' + maiorDesvio.chave + ' (' + fmtDelta(maiorDesvio.delta) + ').</div>'
        : '<div class="diff-resumo">Nenhum desvio relevante por classe ou por ativo.</div>') + tabela
    });
  }

  // (2) Erros nomeados — nome em caixa alta
  erros.forEach(function (e) {
    fb.push({
      tipo: e.gravidade === "alta" ? "bad" : "warn",
      titulo: e.nome.toUpperCase() + " (" + e.codigo + ")",
      detalhe: " " + e.evidencia + " <em>Como corrigir:</em> " + e.comoCorrigir
    });
  });

  // (3) Fallback — as frases genéricas só aparecem quando não há erro nomeado
  if (erros.length === 0) {
    var diffRisco = (score.riscoSua || 0) - (score.riscoGab || 0);
    if (Math.abs(diffRisco) <= 5) {
      fb.push({ tipo: "ok", titulo: "Nível de risco aderente ao perfil", detalhe: " Índice de risco da carteira: " + fmtIndice(score.riscoSua) + " (gabarito: " + fmtIndice(score.riscoGab) + ")." });
    } else if (diffRisco > 5) {
      fb.push({ tipo: "warn", titulo: "Risco acima do gabarito", detalhe: " Índice de risco " + fmtIndice(score.riscoSua) + " contra " + fmtIndice(score.riscoGab) + " do modelo. Perfil " + caseAtual.perfil + " comporta menos risco neste caso." });
    } else {
      fb.push({ tipo: "warn", titulo: "Risco abaixo do gabarito", detalhe: " Índice de risco " + fmtIndice(score.riscoSua) + " contra " + fmtIndice(score.riscoGab) + " do modelo. Conservadorismo excessivo para o perfil e o horizonte do cliente." });
    }

    var diffLiq = (score.liqPonderadaSua || 0) - (score.liqPonderadaGab || 0);
    if (Math.abs(diffLiq) <= 5) {
      fb.push({ tipo: "ok", titulo: "Liquidez adequada", detalhe: " Índice de liquidez efetiva: " + fmtIndice(score.liqPonderadaSua) + " (gabarito: " + fmtIndice(score.liqPonderadaGab) + ")." });
    } else if (diffLiq < 0) {
      fb.push({ tipo: "warn", titulo: "Liquidez abaixo do recomendado", detalhe: " Cliente pode precisar de recursos e ficar exposto a marcação a mercado adversa." });
    } else {
      fb.push({ tipo: "warn", titulo: "Liquidez acima do necessário", detalhe: " Custo de oportunidade alto — capital parado quando o horizonte permite outras alocações." });
    }

    fb.push({
      tipo: "ok",
      titulo: "Concentração dentro do esperado",
      detalhe: " Concentração por ativo em " + fmtPct(score.concentracaoAtivo) +
               " e por classe em " + fmtPct(score.concentracaoClasse) + "."
    });

    // Coerência com a custódia do case
    var offshoreSua = linhasValidas(montagemAtual).filter(function (l) {
      var e = (typeof ETFs !== "undefined" && ETFs) ? ETFs.find(function (et) { return et.ticker === l.ticker; }) : null;
      return e && e.custodia === "OFFSHORE";
    }).reduce(function (acc, l) { return acc + l.pct; }, 0);

    if (caseAtual && caseAtual.custodia === "OFFSHORE" && offshoreSua < 60) {
      fb.push({ tipo: "bad", titulo: "Case offshore com pouca alocação offshore", detalhe: " Cliente tem estrutura/preferência offshore mas você alocou só " + fmtPct(offshoreSua) + " em ETFs UCITS/US." });
    } else if (caseAtual && caseAtual.custodia === "BR" && offshoreSua > 20) {
      fb.push({ tipo: "warn", titulo: "Exposição offshore alta para case BR", detalhe: " Cliente sem estrutura offshore — você alocou " + fmtPct(offshoreSua) + " em ETFs US-listed. Verifique se a custódia foi prevista." });
    } else {
      fb.push({ tipo: "ok", titulo: "Custódia coerente com o case", detalhe: "" });
    }
  }

  return fb;
}

/* Composição por classe como barra empilhada 100% (.compose), reaproveitando os
   helpers da montagem (montChartIdx/montEsc/montFmtPct) quando existirem. */
function renderComposeEm(containerId, mapa) {
  var alvo = document.getElementById(containerId);
  if (!alvo) return;
  var idx = (typeof montChartIdx === "function") ? montChartIdx : function () { return 8; };
  var esc = (typeof montEsc === "function") ? montEsc : function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; });
  };
  var fmt = (typeof montFmtPct === "function") ? montFmtPct : function (v) { return (Math.round(v * 10) / 10).toLocaleString("pt-BR") + "%"; };
  var entradas = Object.keys(mapa || {}).map(function (k) { return { classe: k, pct: mapa[k] }; })
    .filter(function (e) { return e.pct > 0; })
    .sort(function (a, b) { return b.pct - a.pct; });
  var total = entradas.reduce(function (a, e) { return a + e.pct; }, 0);
  var legendaAntiga = alvo.nextElementSibling;
  if (legendaAntiga && legendaAntiga.classList && legendaAntiga.classList.contains("compose__legenda")) legendaAntiga.remove();
  if (!entradas.length) { alvo.innerHTML = '<div class="empty-state">Sem alocação.</div>'; return; }
  var html = "";
  entradas.forEach(function (e) {
    var w = total > 0 ? (e.pct / total) * 100 : 0;
    html += '<span class="compose__seg" style="--w:' + w.toFixed(2) + "%;--c:var(--chart-" + idx(e.classe) + ')" title="' + esc(e.classe) + " · " + fmt(e.pct) + '"></span>';
  });
  alvo.innerHTML = html;
  var legenda = document.createElement("ul");
  legenda.className = "compose__legenda";
  legenda.innerHTML = entradas.map(function (e) {
    return '<li class="compose__item"><span class="compose__ponto" data-chart="' + idx(e.classe) + '"></span>' +
      '<span class="compose__nome">' + esc(e.classe) + '</span><span class="compose__pct">' + fmt(e.pct) + "</span></li>";
  }).join("");
  alvo.insertAdjacentElement("afterend", legenda);
  legenda.querySelectorAll(".compose__ponto").forEach(function (p) {
    p.style.setProperty("--c", "var(--chart-" + (p.getAttribute("data-chart") || 8) + ")");
  });
}

/* Tabela #diferencas-classe (tela 4): você × modelo × delta, ordenada pelo maior desvio. */
function renderDiferencasClasse(sua, gab) {
  var tabela = document.getElementById("diferencas-classe");
  if (!tabela) return;
  var tbody = tabela.querySelector("tbody");
  if (!tbody) return;
  var fmt = function (v) { return (Math.round(v * 10) / 10).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + "%"; };
  var classes = {};
  Object.keys(sua || {}).forEach(function (k) { classes[k] = true; });
  Object.keys(gab || {}).forEach(function (k) { classes[k] = true; });
  var linhas = Object.keys(classes).map(function (k) {
    var s = (sua && sua[k]) || 0, g = (gab && gab[k]) || 0;
    return { classe: k, sua: s, gab: g, delta: s - g };
  }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
  tbody.innerHTML = linhas.map(function (l) {
    var sinal = l.delta > 0.05 ? "+" : "";
    var estado = Math.abs(l.delta) < 5 ? "ok" : Math.abs(l.delta) < 15 ? "warn" : "bad";
    return "<tr data-estado=\"" + estado + "\"><th scope=\"row\">" + l.classe + "</th><td>" + fmt(l.sua) + "</td><td>" + fmt(l.gab) + "</td><td>" + sinal + fmt(l.delta).replace("%", " p.p.") + "</td></tr>";
  }).join("");
}

/* =================================================================================
   NAVEGAÇÃO
   ================================================================================= */
