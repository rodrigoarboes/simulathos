// academia/js/app-montagem.js — experiência de montagem da tela 3 (dono: montagem)
// Emite as classes do contrato (.alloc-row, .alloc-total, .compose, .carteira-info,
// .badge-sim) e consome window.Catalogo / window.Estado quando existirem, com
// fallback para o comportamento antigo.

/* =================================================================================
   0. FORMATAÇÃO pt-BR
   ================================================================================= */
var _montNum1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
var _montNum2 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
var _montMoeda0 = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0, maximumFractionDigits: 0 });

function montFmtPct(n) { return _montNum1.format(Number(n) || 0) + "%"; }
function montFmtPct2(n) { return _montNum2.format(Number(n) || 0) + "%"; }
function montFmtBRL(n) { return _montMoeda0.format(Number(n) || 0); }
function montEsc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/"/g, "&quot;")
    .replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function montById(id) { return document.getElementById(id); }

/* Uma cor de gráfico por família de classe (--chart-1..8). */
var MONT_CHART_POR_CLASSE = {
  "RF Pós-Fixado": 1, "RF Prefixado": 1, "RF Internacional": 1,
  "RF Inflação": 2,
  "Ações BR": 3, "Mid/Small Caps": 3, "Setorial": 3,
  "Dividendos": 4,
  "FIIs Tijolo": 5, "FIIs Papel": 5, "FIAgros": 5,
  "Ações Internacionais": 6, "BDRs": 6, "Offshore US": 6, "UCITS": 6,
  "Cripto": 7,
  "Alternativos": 8, "Fundos Abertos": 8, "Não classificado": 8
};
function montChartIdx(classe) {
  if (MONT_CHART_POR_CLASSE[classe]) return MONT_CHART_POR_CLASSE[classe];
  var c = String(classe || "").toLowerCase();
  if (c.indexOf("rf ") === 0 || c.indexOf("renda fixa") > -1) return 1;
  if (c.indexOf("fii") > -1) return 5;
  if (c.indexOf("dividend") > -1) return 4;
  if (c.indexOf("cripto") > -1 || c.indexOf("bitcoin") > -1) return 7;
  if (c.indexOf("internacion") > -1 || c.indexOf("offshore") > -1 || c.indexOf("ucits") > -1) return 6;
  if (c.indexOf("ação") > -1 || c.indexOf("ações") > -1 || c.indexOf("acoes") > -1) return 3;
  return 8;
}

/* =================================================================================
   1. CATÁLOGO — acesso único com fallback
   ================================================================================= */
function montTemCatalogo() {
  return !!(window.Catalogo && typeof window.Catalogo.get === "function");
}

function montSerieBruta(ticker) {
  var D = window.DADOS;
  if (!D) return null;
  var s = (D.etfs && D.etfs[ticker]) || (D.offshore && D.offshore[ticker]) || (D.fundos && D.fundos[ticker]) || null;
  return (s && s.length) ? s : null;
}

/* Registro normalizado do ativo — sempre no formato do contrato do Catálogo. */
function montReg(ticker) {
  if (!ticker) return null;
  if (montTemCatalogo()) {
    var r = window.Catalogo.get(ticker);
    if (r) return r;
  }
  var pool = window._allETFs || (typeof ETFs !== "undefined" ? ETFs : []);
  var e = null;
  for (var i = 0; i < pool.length; i++) { if (pool[i].ticker === ticker) { e = pool[i]; break; } }
  var offshore = e && (e.custodia === "OFFSHORE" || e.custodia === "US" || e.custodia === "IE");
  var serie = montSerieBruta(ticker);
  return {
    ticker: ticker,
    nome: (e && (e.nome || e.desc)) || ticker,
    classe: (e && e.classe) || "Não classificado",
    subclasse: null,
    custodia: offshore ? "US" : "B3",
    moeda: offshore ? "USD" : "BRL",
    gestora: null,
    taxa: null,
    benchmark: null,
    desc: (e && e.desc) || "",
    temSerie: !!serie,
    primeiraData: serie ? (serie[0].data || null) : null,
    ultimaData: serie ? (serie[serie.length - 1].data || null) : null,
    qualidadeOk: null,
    equivalentes: (window._eqMap && window._eqMap[ticker]) ? window._eqMap[ticker].slice() : [],
    papel: null, risco: null, pitch: null
  };
}

function montClasseDe(ticker) {
  if (montTemCatalogo()) return window.Catalogo.classeDe(ticker);
  var r = montReg(ticker);
  return (r && r.classe) || "Não classificado";
}

function montSobreposicoes(tickers) {
  if (montTemCatalogo() && typeof window.Catalogo.sobreposicoes === "function") {
    return window.Catalogo.sobreposicoes(tickers) || [];
  }
  var eq = window._eqMap || {};
  var out = [];
  for (var i = 0; i < tickers.length; i++) {
    for (var j = i + 1; j < tickers.length; j++) {
      var a = tickers[i], b = tickers[j];
      var la = (eq[a] || []).indexOf(b) > -1;
      var lb = (eq[b] || []).indexOf(a) > -1;
      if (la || lb) out.push({ a: a, b: b, motivo: "mesmo índice" });
    }
  }
  return out;
}

/* =================================================================================
   2. UNIVERSO LEGADO (só quando o Catálogo não estiver carregado)
   ================================================================================= */
var MONT_EQ_MAP_LEGADO = {
  "IVVB11":["VOO","IVV","SPY","VUAA","CSPX"], "VOO":["IVVB11","VUAA","CSPX","IVV"], "IVV":["IVVB11","VOO","CSPX"], "SPY":["IVVB11","VOO","CSPX"],
  "VUAA":["VOO","IVVB11","CSPX"], "CSPX":["IVV","IVVB11","VUAA"],
  "NASD11":["QQQ","CNDX"], "QQQ":["NASD11","CNDX"], "CNDX":["QQQ","NASD11"],
  "ACWI11":["ACWI","VWRA","ISAC"], "ACWI":["ACWI11","VWRA","ISAC"], "VWRA":["ACWI11","ACWI","ISAC"], "ISAC":["ACWI11","ACWI","VWRA"],
  "VWO":["EIMI","IEMA"], "EIMI":["VWO","EEM"], "EEM":["EIMI","VWO"], "IEMG":["EIMI","VWO"],
  "GOLD11":["GLD","IAU","SGOL"], "GLD":["GOLD11","IAU","SGOL"], "IAU":["GOLD11","GLD"], "SGOL":["GOLD11","GLD"],
  "SLV":["SIVR"], "SIVR":["SLV"],
  "AGG":["BND","VDPA"], "BND":["AGG","VDPA"], "VDPA":["AGG","BND"],
  "TLT":["BBTR"], "IEF":["BBTR"], "BBTR":["TLT","IEF","GOVT"],
  "SHV":["IB01","BIL"], "BIL":["SHV","IB01","U03A"], "IB01":["SHV","BIL"], "U03A":["BIL","SHV"],
  "FLOT":["FLOA","USFR","TFLO"], "FLOA":["FLOT","USFR"], "USFR":["FLOT","FLOA"],
  "SMAL11":["IWM","R2US"], "IWM":["SMAL11","R2US"], "R2US":["IWM","SMAL11"],
  "DIVO11":["VYM","VHYA","SCHD"], "VYM":["DIVO11","VHYA","SCHD"], "SCHD":["DIVO11","VYM"], "VHYA":["VYM","DIVO11"],
  "XFIX11":["VNQ","DPYA"], "VNQ":["XFIX11","DPYA"], "DPYA":["VNQ","XFIX11"],
  "EURP11":["VGK","ISFD","XMED"], "VGK":["EURP11","ISFD"], "ISFD":["VGK","EURP11"],
  "VLUE":["IUVL"], "IUVL":["VLUE"],
  "USMV":["SPMV"], "SPMV":["USMV"],
  "EWJ":["IJPA","VJPA"], "IJPA":["EWJ"], "VJPA":["EWJ"],
  "INDA":["NDIA"], "NDIA":["INDA"],
  "FXI":["CNYA","MCHI"], "MCHI":["FXI","CNYA"], "CNYA":["FXI","MCHI"],
  "IWDA":["VXUS","VEA","SWRD"], "SWRD":["IWDA","VXUS"],
  "BOTZ39":["BOTZ"], "BOTZ":["BOTZ39"],
  "BBUG39":["BUG"], "BUG":["BBUG39"],
  "BAIQ39":["AIQ"], "AIQ":["BAIQ39"],
  "QBTC11":["IBIT","FBTC","GBTC","BITH11"], "BITH11":["IBIT","QBTC11"], "IBIT":["QBTC11","BITH11","FBTC"],
  "HASH11":["IBIT","FBTC"],
  "RSP":["XDEW"], "XDEW":["RSP"]
};

/* Monta window._allETFs sem o Catálogo (universo mínimo: ETFs + tickers com série). */
function montUniversoLegado() {
  var base = (typeof ETFs !== "undefined") ? ETFs : [];
  function eqTexto(t) {
    var eqs = MONT_EQ_MAP_LEGADO[t];
    if (!eqs || !eqs.length) return "";
    return " (≈ " + eqs.slice(0, 3).join(" · ") + ")";
  }
  var vistos = {};
  var lista = base.map(function (e) {
    vistos[e.ticker] = true;
    var eq = eqTexto(e.ticker);
    if (eq && String(e.desc || "").indexOf("≈") === -1) {
      return Object.assign({}, e, { desc: (e.desc || "") + eq });
    }
    return e;
  });
  var D = window.DADOS;
  if (D) {
    if (D.etfs) Object.keys(D.etfs).forEach(function (t) {
      if (!vistos[t]) { vistos[t] = true; lista.push({ ticker: t, nome: t, desc: "B3" + eqTexto(t), classe: "Não classificado", custodia: "BR" }); }
    });
    if (D.offshore) Object.keys(D.offshore).forEach(function (t) {
      if (!vistos[t]) { vistos[t] = true; lista.push({ ticker: t, nome: t, desc: "Offshore US" + eqTexto(t), classe: "Offshore US", custodia: "OFFSHORE" }); }
    });
    if (D.fundos) Object.keys(D.fundos).forEach(function (n) {
      if (!vistos[n]) { vistos[n] = true; lista.push({ ticker: n, nome: n, desc: "Fundo aberto (CVM, come-cotas)", classe: "Fundos Abertos", custodia: "BR" }); }
    });
  }
  window._eqMap = window._eqMap || MONT_EQ_MAP_LEGADO;
  window._allETFs = lista;
  return lista;
}

function montPool() {
  if (montTemCatalogo()) {
    if (!window._allETFs || !window._allETFs.length) {
      window._allETFs = window.Catalogo.all().map(function (r) {
        return { ticker: r.ticker, nome: r.nome, desc: r.desc, classe: r.classe, custodia: (r.custodia === "US" || r.custodia === "IE") ? "OFFSHORE" : "BR" };
      });
    }
    return window._allETFs;
  }
  if (!window._allETFs || !window._allETFs.length) montUniversoLegado();
  return window._allETFs || [];
}

/* =================================================================================
   3. SIMULABILIDADE E JANELA COMUM
   ================================================================================= */
function montMesAno(iso) {
  if (!iso) return null;
  var s = String(iso);
  var m = s.match(/^(\d{4})-(\d{2})/);
  if (m) return m[2] + "/" + m[1];
  var m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m2) return m2[2] + "/" + m2[3];
  return s;
}

function montAnosEntre(a, b) {
  if (!a || !b) return null;
  var da = new Date(a), db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return null;
  return (db - da) / (365.25 * 24 * 3600 * 1000);
}

/* 'ok' = série longa; 'curta' = série < 3 anos; 'sem' = sem histórico. */
function montNivelSim(reg) {
  if (!reg || !reg.temSerie || !reg.primeiraData) return "sem";
  var anos = montAnosEntre(reg.primeiraData, reg.ultimaData);
  if (anos !== null && anos < 3) return "curta";
  return "ok";
}
var MONT_SIM_LEGADO = { ok: "total", curta: "parcial", sem: "nenhum" };
var MONT_SIM_TITULO = {
  ok: "Histórico completo — entra no backtest",
  curta: "Histórico curto (menos de 3 anos) — encurta a janela do backtest",
  sem: "Sem série histórica — não entra no backtest"
};

function montBadgeSim(reg) {
  var nivel = montNivelSim(reg);
  return '<span class="badge-sim" data-nivel="' + nivel + '" data-sim="' + MONT_SIM_LEGADO[nivel] +
    '" title="' + montEsc(MONT_SIM_TITULO[nivel]) + '" aria-label="' + montEsc(MONT_SIM_TITULO[nivel]) + '"></span>';
}

function montJanelaComum() {
  var inicio = null, fim = null, limitante = null, semSerie = [];
  montagemAtual.forEach(function (l) {
    if (!l.ticker || !(Number(l.pct) > 0)) return;
    var reg = montReg(l.ticker);
    if (!reg || !reg.temSerie || !reg.primeiraData) { semSerie.push(l.ticker); return; }
    if (!inicio || String(reg.primeiraData) > String(inicio)) { inicio = reg.primeiraData; limitante = l.ticker; }
    if (!fim || String(reg.ultimaData) < String(fim)) fim = reg.ultimaData;
  });
  return { inicio: inicio, fim: fim, limitante: limitante, semSerie: semSerie };
}

/* =================================================================================
   4. LINHAS DE ALOCAÇÃO
   ================================================================================= */
function montLinhaValida(l) { return !!(l && l.ticker && (Number(l.pct) || 0) > 0); }

/* MONTAGEM-04: normaliza o ruído de ponto flutuante da soma (0,1 + 0,2 e afins).
   Os percentuais são digitados em passos de 0,1 p.p., então 4 casas decimais
   preservam qualquer valor legítimo e eliminam o 99,99999999999999. */
function montLimparFloat(n) {
  var v = Number(n);
  if (!isFinite(v)) return 0;
  return Math.round(v * 10000) / 10000;
}

function montSoma() {
  return montLimparFloat(montagemAtual.reduce(function (a, l) { return a + (Number(l.pct) || 0); }, 0));
}

function renderLinhasAlocacao() {
  var cont = montById("linhas-alocacao");
  if (!cont) return;
  var pool = montPool();
  cont.innerHTML = "";

  // Barra de ferramentas (distribuir / ajustar / filtro ativo)
  var tools = document.createElement("div");
  tools.className = "alloc-tools";
  tools.innerHTML =
    '<button type="button" class="btn btn--ghost" onclick="distribuirIgualmente()" ' +
    'title="Divide o que sobra igualmente entre as linhas destravadas">Distribuir igualmente</button>' +
    '<button type="button" class="btn btn--ghost" onclick="ajustarPara100()" ' +
    'title="Ajusta proporcionalmente as linhas destravadas para fechar 100%">Ajustar para 100%</button>' +
    '<span class="alloc-tools__filtro" id="alloc-filtro-chip"></span>';
  cont.appendChild(tools);

  montagemAtual.forEach(function (linha, idx) {
    var reg = linha.ticker ? montReg(linha.ticker) : null;
    var classe = linha.ticker ? montClasseDe(linha.ticker) : "";
    var chartIdx = montChartIdx(classe);

    var acDisplay = "";
    if (linha.ticker) acDisplay = reg && reg.desc ? linha.ticker + " — " + reg.desc : linha.ticker;

    var isCustom = !!(linha.ticker && !pool.some(function (e) { return e.ticker === linha.ticker; }));
    var showCustom = (typeof modoLivre !== "undefined" && modoLivre) && isCustom;
    var travado = !!linha.travado;

    var div = document.createElement("div");
    div.className = "alloc-row";
    div.setAttribute("data-idx", String(idx));
    if (travado) div.setAttribute("data-travado", "true");

    var html = "";
    html += '<span class="alloc-row__classe" data-chart="' + chartIdx + '" title="' + montEsc(classe || "Sem ativo") + '"></span>';
    html += '<div class="alloc-row__ativo">';
    html += '<div class="ticker-autocomplete" id="ac-' + idx + '">';
    html += '<input type="text" placeholder="Digite ticker ou nome..." value="' + montEsc(acDisplay) + '"' +
      ' oninput="onAutocompleteInput(' + idx + ', this.value)" onfocus="onAutocompleteFocus(' + idx + ')"' +
      ' onkeydown="montAcKeydown(' + idx + ', event)" autocomplete="off" aria-label="Ativo da linha ' + (idx + 1) + '"/>';
    html += '<div class="ac-dropdown" id="ac-drop-' + idx + '" role="listbox"></div>';
    html += "</div>";
    if (typeof modoLivre !== "undefined" && modoLivre) {
      html += '<input type="text" class="alloc-row__custom" id="custom-ticker-' + idx + '"' +
        (showCustom ? "" : " hidden") + ' placeholder="Ex: PETR4, WEGE3, AAPL..." value="' +
        montEsc(isCustom ? linha.ticker : "") + '" onchange="onCustomTicker(' + idx + ', this.value)"/>';
    }
    html += '<div class="alloc-row__meta">';
    if (linha.ticker) {
      html += montBadgeSim(reg);
      html += '<span class="alloc-row__nome">' + montEsc((reg && reg.nome) || linha.ticker) + "</span>";
      if (classe) html += '<span class="alloc-row__classe-nome">' + montEsc(classe) + "</span>";
    }
    html += "</div>";
    html += "</div>";

    html += '<div class="alloc-row__peso">';
    html += '<input type="number" min="0" max="100" step="0.1" value="' + (Number(linha.pct) || 0) + '"' +
      ' placeholder="%" aria-label="Percentual da linha ' + (idx + 1) + '"' +
      (travado ? " readonly" : "") +
      ' onchange="atualizarLinha(' + idx + ', \'pct\', this.value)"' +
      ' oninput="atualizarLinha(' + idx + ', \'pct\', this.value)"' +
      ' onkeydown="montPesoKeydown(' + idx + ', event)"/>';
    html += "</div>";

    html += '<span class="alloc-row__valor" id="valor-' + idx + '">' + montFmtBRL(0) + "</span>";

    html += '<div class="alloc-row__acoes">';
    html += '<button type="button" class="btn btn--ghost alloc-row__trava" aria-pressed="' + (travado ? "true" : "false") +
      '" onclick="alternarTrava(' + idx + ')" title="' + (travado ? "Linha travada — não entra nos ajustes automáticos" : "Travar percentual desta linha") +
      '">' + (travado ? "Travado" : "Travar") + "</button>";
    html += '<button type="button" class="btn btn--ghost alloc-row__remover" onclick="removerLinha(' + idx +
      ')" aria-label="Remover linha ' + (idx + 1) + '" title="Remover linha">&times;</button>';
    html += "</div>";

    html += '<div class="alloc-row__aviso" id="aviso-' + idx + '" role="status"></div>';

    div.innerHTML = html;
    var faixa = div.querySelector(".alloc-row__classe");
    if (faixa && classe) faixa.style.setProperty("--c", "var(--chart-" + chartIdx + ")");
    cont.appendChild(div);
  });

  // Resumo permanente de simulabilidade (janela comum) sob a lista
  var janela = document.createElement("div");
  janela.className = "alloc-janela";
  janela.id = "alloc-janela";
  cont.appendChild(janela);

  montRenderChipFiltro();

  var acoes = montById("carteira-acoes");
  if (acoes && window.Estado && typeof window.Estado.renderAcoesCarteira === "function") {
    try { window.Estado.renderAcoesCarteira(acoes); } catch (e) { /* silencioso */ }
  }
}

function onTickerSelect(idx, val) {
  if (!montagemAtual[idx]) return;
  montagemAtual[idx].ticker = val;
  var customInput = montById("custom-ticker-" + idx);
  if (customInput) customInput.hidden = true;
  renderLinhasAlocacao();
  calcularMontagem();
}

function onCustomTicker(idx, val) {
  if (!montagemAtual[idx]) return;
  montagemAtual[idx].ticker = String(val || "").trim().toUpperCase();
  calcularMontagem();
}

function atualizarLinha(idx, campo, valor) {
  if (!montagemAtual[idx]) return;
  if (campo === "pct") valor = parseFloat(valor) || 0;
  montagemAtual[idx][campo] = valor;
  calcularMontagem();
}

function adicionarLinha() {
  montagemAtual.push({ ticker: "", pct: 0 });
  renderLinhasAlocacao();
  calcularMontagem();
}

function removerLinha(idx) {
  montagemAtual.splice(idx, 1);
  renderLinhasAlocacao();
  calcularMontagem();
}

function limparMontagem() {
  montagemAtual = [{ ticker: "", pct: 0 }, { ticker: "", pct: 0 }, { ticker: "", pct: 0 }];
  renderLinhasAlocacao();
  calcularMontagem();
}

/* ---- MONTAGEM-07: distribuir / ajustar / cadeado ------------------------------ */
function alternarTrava(idx) {
  if (!montagemAtual[idx]) return;
  montagemAtual[idx].travado = !montagemAtual[idx].travado;
  renderLinhasAlocacao();
  calcularMontagem();
}

function montArred1(n) { return Math.round((Number(n) || 0) * 10) / 10; }

function distribuirIgualmente() {
  var alvos = [];
  montagemAtual.forEach(function (l, i) { if (l.ticker && !l.travado) alvos.push(i); });
  if (!alvos.length) montagemAtual.forEach(function (l, i) { if (!l.travado) alvos.push(i); });
  if (!alvos.length) return;

  var travados = montagemAtual.reduce(function (a, l) { return a + (l.travado ? (Number(l.pct) || 0) : 0); }, 0);
  var restante = Math.max(0, 100 - travados);
  var base = montArred1(restante / alvos.length);
  var acumulado = 0;
  alvos.forEach(function (i, k) {
    if (k < alvos.length - 1) { montagemAtual[i].pct = base; acumulado = montLimparFloat(acumulado + base); }
    else { montagemAtual[i].pct = montArred1(restante - acumulado); }
  });
  renderLinhasAlocacao();
  calcularMontagem();
}

function ajustarPara100() {
  var alvos = [];
  montagemAtual.forEach(function (l, i) { if (!l.travado && (Number(l.pct) || 0) > 0) alvos.push(i); });
  var travados = montagemAtual.reduce(function (a, l) { return a + (l.travado ? (Number(l.pct) || 0) : 0); }, 0);
  var alvo = montArred1(100 - travados);
  if (!alvos.length || alvo <= 0) { distribuirIgualmente(); return; }

  var somaLivre = alvos.reduce(function (a, i) { return a + (Number(montagemAtual[i].pct) || 0); }, 0);
  if (somaLivre <= 0) { distribuirIgualmente(); return; }

  var fator = alvo / somaLivre;
  var acumulado = 0;
  alvos.forEach(function (i, k) {
    if (k < alvos.length - 1) {
      montagemAtual[i].pct = montArred1((Number(montagemAtual[i].pct) || 0) * fator);
      acumulado = montLimparFloat(acumulado + montagemAtual[i].pct);
    } else {
      montagemAtual[i].pct = montArred1(alvo - acumulado);
    }
  });
  renderLinhasAlocacao();
  calcularMontagem();
}

/* =================================================================================
   5. AUTOCOMPLETE — busca textual, filtro de categoria, teclado
   ================================================================================= */
var _acTimeout = null;
window._acCategoryFilter = "";
var _montUltimaQuery = {};

var MONT_ROTULO_CATEGORIA = {
  "": "Todas", "RF": "Renda Fixa", "Ações BR": "Ações BR", "FII": "FIIs",
  "Dividendos": "Dividendos", "Internacional": "Internacional", "BDR": "BDRs",
  "Cripto": "Cripto", "Alternativos": "Alternativos", "Fundos": "Fundos abertos",
  "OFFSHORE": "Offshore US", "UCITS": "UCITS"
};
function montRotuloCategoria(cat) { return MONT_ROTULO_CATEGORIA[cat] || cat || "Todas"; }

function _matchesCategory(e, cat) {
  if (!cat) return true;
  var cl = (e.classe || "").toLowerCase();
  var desc = (e.desc || "").toLowerCase();
  var cust = (e.custodia || "").toLowerCase();
  if (cat === "OFFSHORE") return (cust === "offshore" || cust === "us") && cl.indexOf("ucits") === -1;
  if (cat === "UCITS") return cl.indexOf("ucits") > -1;
  if (cat === "Cripto") return cl.indexOf("cripto") > -1 || cl.indexOf("bitcoin") > -1 || desc.indexOf("bitcoin") > -1 || desc.indexOf("ethereum") > -1 || e.ticker.indexOf("BTC") > -1 || e.ticker.indexOf("ETH") > -1;
  if (cat === "RF") return cl.indexOf("rf ") > -1 || cl.indexOf("renda fixa") > -1 || desc.indexOf("tesouro") > -1 || desc.indexOf("treasur") > -1 || desc.indexOf("bond") > -1 || desc.indexOf("renda fixa") > -1;
  if (cat === "FII") return cl.indexOf("fii") > -1 || cl.indexOf("fiagro") > -1 || cl.indexOf("imobiliário") > -1;
  if (cat === "Dividendos") return cl.indexOf("dividend") > -1 || desc.indexOf("dividend") > -1 || desc.indexOf("dividendo") > -1 || desc.indexOf("yield") > -1 || desc.indexOf("income") > -1;
  if (cat === "Internacional") return cl.indexOf("internacional") > -1 || cl.indexOf("internacionais") > -1;
  if (cat === "BDR") return cl.indexOf("bdr") > -1 || e.ticker.indexOf("34") > -1 || e.ticker.indexOf("39") > -1;
  if (cat === "Alternativos") return cl.indexOf("alternativ") > -1 || cl.indexOf("setorial") > -1 || desc.indexOf("ouro") > -1 || desc.indexOf("gold") > -1 || desc.indexOf("commodit") > -1;
  if (cat === "Fundos") return cl.indexOf("fundos") > -1 || desc.indexOf("cvm") > -1 || desc.indexOf("come-cotas") > -1;
  return cl.indexOf(cat.toLowerCase()) > -1;
}

var _searchSynonyms = {
  "eua": "s&p 500,ações eua,nasdaq,dow,americana,us-listed,estados unidos,usa",
  "estados unidos": "s&p 500,ações eua,nasdaq,americana,us-listed,eua,usa",
  "usa": "s&p 500,ações eua,nasdaq,americana,us-listed,eua,estados unidos",
  "bolsa americana": "s&p 500,ações eua,nasdaq,us-listed,eua",
  "ouro": "gold,ouro,sgol,gld,iau,precious",
  "prata": "silver,prata,slv,sivr",
  "tecnologia": "tech,tecnologia,semicondut,ai,artificial,software",
  "inteligencia artificial": "ai,artificial,inteligencia,botz,aiq,tech",
  "ia": "ai,artificial,inteligencia,botz,aiq,tech,robotic",
  "bitcoin": "btc,bitcoin,crypto,cripto",
  "ethereum": "eth,ethereum,crypto,cripto",
  "europa": "europe,europa,stoxx,euro,ftse,uk,reino unido,alemanha,frança",
  "china": "china,asia,hang seng,csi,shanghai",
  "japao": "japan,japão,nikkei,topix",
  "india": "india,índia,nifty",
  "emergentes": "emerging,emergentes,em,developing",
  "dividendos": "dividend,yield,income,proventos,jcp",
  "renda fixa": "bond,treasury,fixed income,rf ,tesouro,selic,ipca,prefixado,cdi",
  "imobiliario": "reit,imobiliário,imobiliario,fii,real estate,property",
  "energia": "energy,energia,oil,petróleo,gas,clean,solar,wind",
  "saude": "health,saúde,saude,biotech,pharma,genomic",
  "cannabis": "cannabis,weed,marijuana,hemp",
  "defesa": "defense,defesa,militar,aerospace,space",
  "gaming": "gaming,jogos,esports,video game",
  "cyber": "cyber,cibersegurança,security,hack"
};

function montBuscar(query, catFilter) {
  var pool = montPool();
  var q = String(query || "").toLowerCase();
  var expandidos = [q];
  Object.keys(_searchSynonyms).forEach(function (key) {
    if (q.indexOf(key) > -1 || key.indexOf(q) > -1) {
      _searchSynonyms[key].split(",").forEach(function (s) { expandidos.push(s.trim()); });
    }
  });
  return pool.filter(function (e) {
    if (catFilter && !_matchesCategory(e, catFilter)) return false;
    var text = (e.ticker + " " + (e.desc || "") + " " + (e.classe || "") + " " + (e.nome || "")).toLowerCase();
    return expandidos.some(function (term) { return term && text.indexOf(term) > -1; });
  }).slice(0, 50);
}

function onAutocompleteInput(idx, value) {
  clearTimeout(_acTimeout);
  var query = String(value || "").trim();
  _montUltimaQuery[idx] = query;

  if (query.length < 2) { closeAutocomplete(idx); return; }

  _acTimeout = setTimeout(function () {
    var catFilter = window._acCategoryFilter || "";
    var results = montBuscar(query, catFilter);
    if (!results.length && catFilter) {
      montMostrarVazio(idx, query, catFilter);
      return;
    }
    showAutocompleteResults(idx, results);
  }, 150);
}

function onAutocompleteFocus(idx) {
  var input = document.querySelector("#ac-" + idx + " input");
  if (input && input.value.length >= 2) onAutocompleteInput(idx, input.value);
}

/* MONTAGEM-04: estado vazio dentro do dropdown, com escape do filtro. */
function montMostrarVazio(idx, query, catFilter) {
  var drop = montById("ac-drop-" + idx);
  if (!drop) return;
  var html = '<div class="ac-empty empty-state">';
  html += "<span>Nenhum ativo em <strong>" + montEsc(montRotuloCategoria(catFilter)) + "</strong> para &ldquo;" + montEsc(query) + "&rdquo;.</span>";
  html += '<button type="button" class="btn btn--ghost" onclick="montBuscarEmTodas(' + idx + ')">Buscar em todas as categorias</button>';
  html += "</div>";
  drop.innerHTML = html;
  drop.classList.add("open");
}

function montBuscarEmTodas(idx) {
  window._acCategoryFilter = "";
  montRenderChipFiltro();
  var q = _montUltimaQuery[idx] || "";
  var results = montBuscar(q, "");
  if (results.length) showAutocompleteResults(idx, results);
  else montMostrarVazioTotal(idx, q);
}

function montMostrarVazioTotal(idx, query) {
  var drop = montById("ac-drop-" + idx);
  if (!drop) return;
  drop.innerHTML = '<div class="ac-empty empty-state"><span>Nenhum ativo encontrado para &ldquo;' + montEsc(query) +
    '&rdquo; em nenhuma categoria.</span><span>Tente o ticker (BOVA11), o nome do índice ou a tese (ouro, EUA, dividendos).</span></div>';
  drop.classList.add("open");
}

function showAutocompleteResults(idx, results) {
  var drop = montById("ac-drop-" + idx);
  if (!drop) return;
  if (!results || results.length === 0) { montMostrarVazioTotal(idx, _montUltimaQuery[idx] || ""); return; }

  var grupos = {};
  results.forEach(function (e) {
    var g = e.classe || "Não classificado";
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(e);
  });

  var html = "";
  var chip = montChipFiltroHtml(window._acCategoryFilter || "");
  if (chip) html += '<div class="ac-filtro">' + chip + "</div>";
  var pos = 0;
  Object.keys(grupos).sort().forEach(function (g) {
    html += '<div class="ac-group-label">' + montEsc(g) + "</div>";
    grupos[g].forEach(function (e) {
      var reg = montReg(e.ticker);
      var hasInfo = (typeof ETF_INFO !== "undefined" && ETF_INFO[e.ticker]) ? true : false;
      html += '<div class="ac-item" role="option" data-pos="' + pos + '" data-ticker="' + montEsc(e.ticker) + '">';
      html += '<span class="ac-item__main" onclick="selectAutocomplete(' + idx + ",'" + e.ticker + "')\">";
      html += montBadgeSim(reg);
      html += '<span class="ac-ticker">' + montEsc(e.ticker) + "</span>";
      html += '<span class="ac-desc">' + montEsc(e.desc || "") + "</span>";
      html += "</span>";
      if (hasInfo) {
        html += '<span class="ac-info-btn" onclick="event.stopPropagation();mostrarFichaETF(\'' + e.ticker + '\')" title="Ver ficha do ETF">i</span>';
      }
      html += "</div>";
      pos++;
    });
  });

  drop.innerHTML = html;
  drop.setAttribute("data-ativo", "-1");
  drop.classList.add("open");
}

/* MONTAGEM-06: navegação por teclado no dropdown. */
function montAcKeydown(idx, ev) {
  var drop = montById("ac-drop-" + idx);
  if (!drop) return;
  var aberto = drop.classList.contains("open");
  var itens = drop.querySelectorAll(".ac-item");

  if (ev.key === "Escape") {
    closeAutocomplete(idx);
    return;
  }
  if (!aberto || !itens.length) {
    if (ev.key === "ArrowDown") {
      var input = document.querySelector("#ac-" + idx + " input");
      if (input && input.value.trim().length >= 2) onAutocompleteInput(idx, input.value);
    }
    return;
  }

  var ativo = parseInt(drop.getAttribute("data-ativo") || "-1", 10);
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
    ev.preventDefault();
    if (ev.key === "ArrowDown") ativo = (ativo + 1) % itens.length;
    else ativo = (ativo - 1 + itens.length) % itens.length;
    montAcMarcar(drop, itens, ativo);
    return;
  }
  if (ev.key === "Enter") {
    ev.preventDefault();
    var alvo = itens[ativo >= 0 ? ativo : 0];
    if (alvo) selectAutocomplete(idx, alvo.getAttribute("data-ticker"));
    return;
  }
}

function montAcMarcar(drop, itens, ativo) {
  for (var i = 0; i < itens.length; i++) {
    if (i === ativo) itens[i].setAttribute("aria-selected", "true");
    else itens[i].removeAttribute("aria-selected");
  }
  drop.setAttribute("data-ativo", String(ativo));
  if (itens[ativo] && itens[ativo].scrollIntoView) {
    itens[ativo].scrollIntoView({ block: "nearest" });
  }
}

/* Enter no campo de % cria/foca a próxima linha. */
function montPesoKeydown(idx, ev) {
  if (ev.key !== "Enter") return;
  ev.preventDefault();
  if (idx >= montagemAtual.length - 1) {
    adicionarLinha();
  }
  var prox = document.querySelector("#ac-" + (idx + 1) + " input");
  if (prox) prox.focus();
}

/* MONTAGEM-01: escolhido o ativo, o passo seguinte é o percentual — o foco vai
   para o campo de % da mesma linha (e seleciona o valor, para já poder digitar). */
function montFocarPeso(idx) {
  var linha = document.querySelector('.alloc-row[data-idx="' + idx + '"]');
  var peso = linha ? linha.querySelector(".alloc-row__peso input") : null;
  if (peso && !peso.readOnly) {
    peso.focus();
    if (typeof peso.select === "function") { try { peso.select(); } catch (e) { /* ignorado */ } }
    return true;
  }
  return false;
}

function selectAutocomplete(idx, ticker) {
  closeAutocomplete(idx);
  onTickerSelect(idx, ticker);
  if (montFocarPeso(idx)) return;
  var input = document.querySelector("#ac-" + idx + " input");
  if (input) input.focus();
}

function closeAutocomplete(idx) {
  var drop = montById("ac-drop-" + idx);
  if (drop) { drop.classList.remove("open"); drop.setAttribute("data-ativo", "-1"); }
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".ticker-autocomplete")) {
    document.querySelectorAll(".ac-dropdown").forEach(function (d) { d.classList.remove("open"); });
  }
});

/* MONTAGEM-04: chip removível do filtro de categoria (barra de ferramentas e
   cabeçalho do dropdown, para o filtro ficar visível dentro do próprio campo). */
function montChipFiltroHtml(cat) {
  if (!cat) return "";
  return '<span class="chip chip--accent" data-filtro="' + montEsc(cat) + '">Categoria: ' +
    montEsc(montRotuloCategoria(cat)) +
    ' <button type="button" class="chip__remover btn-x" onclick="limparFiltroCategoria()" title="Remover filtro de categoria" aria-label="Remover filtro de categoria">&times;</button></span>';
}

function montRenderChipFiltro() {
  var alvo = montById("alloc-filtro-chip");
  if (!alvo) return;
  alvo.innerHTML = montChipFiltroHtml(window._acCategoryFilter || "");
}

/* MONTAGEM-03: a pill é um toggle-button — a classe visual e o aria-pressed andam
   juntos. Deduz a categoria de cada pill do data-cat (quando existir) ou do onclick,
   em vez de confiar no event.target (que pode ser um filho do botão). */
function montCategoriaDaPill(pill) {
  if (!pill) return "";
  if (pill.hasAttribute && pill.hasAttribute("data-cat")) return pill.getAttribute("data-cat") || "";
  var attr = pill.getAttribute("onclick") || "";
  var m = attr.match(/filtrarCategoria\(\s*'([^']*)'\s*\)/);
  return m ? m[1] : "";
}

function montSincronizarPills(cat) {
  var alvo = String(cat || "");
  var pills = document.querySelectorAll(".cat-pill");
  for (var i = 0; i < pills.length; i++) {
    var ativo = (montCategoriaDaPill(pills[i]) === alvo);
    if (ativo) pills[i].classList.add("active");
    else pills[i].classList.remove("active");
    pills[i].setAttribute("aria-pressed", ativo ? "true" : "false");
  }
}

function limparFiltroCategoria() {
  window._acCategoryFilter = "";
  montSincronizarPills("");
  montRenderChipFiltro();
}

function filtrarCategoria(cat) {
  window._acCategoryFilter = cat || "";
  montSincronizarPills(window._acCategoryFilter);
  montRenderChipFiltro();

  var filtrados = cat ? montPool().filter(function (e) { return _matchesCategory(e, cat); }).slice(0, 50) : [];
  if (!filtrados.length) return;
  var targetIdx = -1;
  for (var i = 0; i < montagemAtual.length; i++) {
    if (!montagemAtual[i].ticker) { targetIdx = i; break; }
  }
  if (targetIdx === -1) targetIdx = 0;
  var input = document.querySelector("#ac-" + targetIdx + " input");
  if (input && !input.value) {
    showAutocompleteResults(targetIdx, filtrados);
    input.focus();
  }
}

/* =================================================================================
   6. FICHA DO ETF / LISTA COMPLETA / TUTORIAL (inalterados no comportamento)
   ================================================================================= */
function mostrarFichaETF(ticker) {
  var info = (typeof ETF_INFO !== "undefined") ? ETF_INFO[ticker] : null;
  if (!info) return;

  var eqMap = window._eqMap || {};
  var eqs = eqMap[ticker] ? eqMap[ticker] : [];
  var eqHtml = eqs.length > 0 ? '<div class="ficha-etf__eq"><span class="ficha-etf__eq-rotulo">Equivalentes:</span> ' + eqs.map(function (t) {
    return '<span class="chip chip--ghost">' + montEsc(t) + "</span>";
  }).join(" ") + "</div>" : "";

  var dataInfo = "";
  var serie = montSerieBruta(ticker);
  if (serie) {
    dataInfo = '<div style="margin-top:8px;font-size:11px;color:var(--text-soft);">' + serie.length + " dias de dados (" + serie[0].data + " &rarr; " + serie[serie.length - 1].data + ")</div>";
  }

  var custFlag = info.custodia === "B3" ? "B3" : info.custodia === "Irlanda" ? "UCITS" : "US";

  var html = '<div class="modal-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)montFecharFichaETF()">';
  html += '<div style="background:var(--bg-card);border-radius:16px;max-width:460px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:88vh;overflow-y:auto;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
  html += "<div>";
  html += '<div style="font-family:var(--font-mono);font-size:24px;font-weight:800;color:var(--brand-blue);">' + ticker + "</div>";
  html += '<div style="font-size:14px;color:var(--text);margin-top:2px;">' + info.nome + "</div>";
  html += "</div>";
  html += '<span style="font-size:12px;padding:4px 10px;border-radius:20px;background:rgba(0,136,204,0.1);color:var(--brand-blue);white-space:nowrap;">' + custFlag + "</span>";
  html += "</div>";

  function fichaMetric(rotulo, valor) {
    return '<div class="metric"><div class="metric__label">' + montEsc(rotulo) + '</div>' +
      '<div class="metric__value" style="font-size:13px;">' + montEsc(valor == null || valor === "" ? "\u2014" : valor) + "</div></div>";
  }
  html += '<div class="ficha-etf__grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">';
  html += fichaMetric("Gestora", info.gestora);
  html += fichaMetric("Taxa adm.", info.taxa);
  html += fichaMetric("Categoria", info.categoria);
  html += fichaMetric("Benchmark", info.benchmark);
  html += "</div>";

  html += eqHtml;
  html += dataInfo;

  var guia = (typeof ETF_GUIA !== "undefined") ? ETF_GUIA[ticker] : null;
  if (guia) {
    html += '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px;">';
    if (guia.papel) {
      html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:3px;">Papel na carteira</div><div style="font-size:13px;line-height:1.55;">' + guia.papel + "</div></div>";
    }
    if (guia.risco) {
      html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:3px;">O risco que você precisa nomear</div><div style="font-size:13px;line-height:1.55;">' + guia.risco + "</div></div>";
    }
    if (guia.pitch) {
      html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:3px;">Como explicar pro cliente</div><div style="font-size:13px;line-height:1.55;font-style:italic;color:var(--text);border-left:3px solid var(--brand-blue);padding-left:10px;">&ldquo;' + guia.pitch + "&rdquo;</div></div>";
    }
    html += '<a href="guia-etfs.html#' + ticker + '" target="_blank" rel="noopener" style="font-size:12px;font-weight:600;color:var(--brand-blue);text-decoration:none;">Ver no Super Guia de ETFs &rarr;</a>';
    html += "</div>";
  }

  html += '<button type="button" class="btn btn--primary" style="margin-top:16px;width:100%;justify-content:center;" onclick="montFecharFichaETF();adicionarDaLista(\'' + ticker + '\')">+ Adicionar à carteira</button>';
  html += "</div></div>";

  montFecharFichaETF();
  var div = document.createElement("div");
  div.innerHTML = html;
  // MONTAGEM-02: o atributo tem de ir no nó que entra no DOM (o overlay), não no
  // <div> temporário usado só para montar o HTML — senão a limpeza acima é código morto.
  var overlay = div.firstElementChild;
  if (!overlay) return;
  overlay.setAttribute("data-ficha-etf", ticker || "true");
  document.body.appendChild(overlay);
  document.addEventListener("keydown", montFichaEsc);
}

function montFecharFichaETF() {
  var abertas = document.querySelectorAll("[data-ficha-etf]");
  for (var i = 0; i < abertas.length; i++) abertas[i].remove();
  document.removeEventListener("keydown", montFichaEsc);
}

function montFichaEsc(ev) {
  if (ev && ev.key === "Escape") montFecharFichaETF();
}

function abrirTutorial() {
  var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">';
  html += '<div style="background:var(--bg-card);border-radius:16px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:32px;">';
  html += '<h3 style="font-family:var(--font-display);font-size:22px;margin:0 0 20px;">Como usar o simulador</h3>';
  html += '<div style="margin-bottom:20px;"><div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">1. Buscar ativos</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">Digite <strong>pelo menos 2 letras</strong>. Use as setas para navegar e Enter para escolher. Pode buscar por ticker, nome, tema ou classe.</p></div>';
  html += '<div style="margin-bottom:20px;"><div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">2. Filtrar por categoria</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">O filtro escolhido vira um chip ao lado da busca — clique no × para voltar a buscar em todas as categorias.</p></div>';
  html += '<div style="margin-bottom:20px;"><div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">3. Fechar os 100%</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">Use <strong>Distribuir igualmente</strong> ou <strong>Ajustar para 100%</strong>. Linhas travadas ficam fora do ajuste.</p></div>';
  html += '<div style="margin-bottom:20px;"><div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">4. Simulabilidade</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">O ponto ao lado do ativo mostra se ele tem histórico. Abaixo da lista aparece a janela comum do backtest e quem a limita.</p></div>';
  html += '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="width:100%;padding:10px;border:none;border-radius:8px;background:var(--brand-blue);color:white;font-weight:600;cursor:pointer;font-size:14px;">Entendi</button>';
  html += "</div></div>";
  var div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}

function abrirListaCompleta() {
  var pool = montPool();
  var grupos = {};
  pool.forEach(function (e) {
    var g = e.classe || "Não classificado";
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(e);
  });
  var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">';
  html += '<div style="background:var(--bg-card);border-radius:16px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;padding:28px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h3 style="font-family:var(--font-display);font-size:20px;margin:0;">Ativos disponíveis <span style="font-size:13px;color:var(--text-soft);font-weight:400;">(' + pool.length + ')</span></h3>';
  html += '<input type="text" placeholder="Buscar..." oninput="filtrarListaModal(this.value)" style="padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:var(--bg-soft);color:var(--text);font-size:13px;width:180px;">';
  html += "</div>";
  Object.keys(grupos).sort().forEach(function (g) {
    html += '<div class="lista-grupo" data-grupo="' + montEsc(g) + '">';
    html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);padding:8px 0 4px;border-bottom:1px solid var(--border);margin-top:12px;">' + montEsc(g) + ' <span style="opacity:0.5">(' + grupos[g].length + ")</span></div>";
    grupos[g].forEach(function (e) {
      var hasInfo = (typeof ETF_INFO !== "undefined" && ETF_INFO[e.ticker]) ? true : false;
      html += '<div class="lista-item" style="padding:6px 8px;font-size:13px;border-radius:4px;display:flex;align-items:center;gap:6px;">';
      html += '<span style="flex:1;cursor:pointer;" onclick="adicionarDaLista(\'' + e.ticker + '\')">';
      html += '<strong style="color:var(--brand-blue);font-family:var(--font-mono);">' + montEsc(e.ticker) + '</strong> <span style="color:var(--text-soft);font-size:11px;">' + montEsc(e.desc || "") + "</span>";
      html += "</span>";
      if (hasInfo) {
        html += '<span class="ac-info-btn" onclick="event.stopPropagation();mostrarFichaETF(\'' + e.ticker + '\')" title="Ver ficha do ETF" style="flex-shrink:0;">i</span>';
      }
      html += "</div>";
    });
    html += "</div>";
  });
  html += "</div></div>";
  var div = document.createElement("div");
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}

window.filtrarListaModal = function (q) {
  q = String(q || "").toLowerCase();
  document.querySelectorAll(".lista-grupo").forEach(function (g) {
    var items = g.querySelectorAll(".lista-item");
    var vis = 0;
    items.forEach(function (item) {
      var show = !q || item.textContent.toLowerCase().indexOf(q) > -1;
      item.hidden = !show;
      if (show) vis++;
    });
    g.hidden = vis === 0;
  });
};

window.adicionarDaLista = function (ticker) {
  var idx = -1;
  for (var i = 0; i < montagemAtual.length; i++) {
    if (!montagemAtual[i].ticker) { idx = i; break; }
  }
  if (idx === -1) {
    montagemAtual.push({ ticker: "", pct: 0 });
    idx = montagemAtual.length - 1;
  }
  montagemAtual[idx].ticker = ticker;
  renderLinhasAlocacao();
  calcularMontagem();
};

/* =================================================================================
   7. CÁLCULO, VALIDAÇÃO E PAINÉIS DA TELA 3
   ================================================================================= */
var _montLabelSubmeter = null;

function calcularMontagem() {
  var aporteEl = montById("aporte");
  var aporte = aporteEl ? (parseFloat(aporteEl.value) || 0) : 0;
  var soma = 0;

  montagemAtual.forEach(function (linha, idx) {
    soma += Number(linha.pct) || 0;
    var el = montById("valor-" + idx);
    if (el) el.textContent = montFmtBRL(((Number(linha.pct) || 0) / 100) * aporte);
  });
  soma = montLimparFloat(soma);

  montRenderTotal(soma);
  montAtualizarSubmeter(soma);
  montRenderComposicao(aporte, soma);
  montRenderJanela();
  montRenderAvisosSobreposicao();
  montSalvarEstado(aporte);
}

/* MONTAGEM-03: validação única, usada pelo botão e pela barra de total. */
function montValidarMontagem(soma) {
  if (typeof soma !== "number") soma = montSoma();
  var validas = montagemAtual.filter(montLinhaValida).length;
  if (validas < 2) {
    return { ok: false, estado: "bad", msg: "Selecione pelo menos 2 ativos" };
  }
  if (soma < 99.9) {
    return { ok: false, estado: soma >= 95 ? "warn" : "bad", msg: "Faltam " + montFmtPct(100 - soma) + " para fechar 100%" };
  }
  if (soma > 100.1) {
    return { ok: false, estado: soma <= 105 ? "warn" : "bad", msg: "Passou " + montFmtPct(soma - 100) + " de 100%" };
  }
  // No Modo Livre não há gabarito nem nota: o próximo passo é simular, não ser avaliado.
  var emLivre = (typeof modoLivre !== "undefined" && modoLivre);
  return {
    ok: true, estado: "ok",
    msg: emLivre ? "Carteira fechada em 100% — pronta para simular"
                 : "Carteira fechada em 100% — pronta para avaliação"
  };
}

function montRenderTotal(soma) {
  var el = montById("alloc-total") || montById("soma-total");
  if (!el) return;
  var v = montValidarMontagem(soma);

  el.classList.add("alloc-total");
  el.classList.remove("ok", "warn", "bad");
  el.classList.add(v.estado);
  el.setAttribute("data-estado", v.estado);

  el.innerHTML =
    '<div class="alloc-total__barra" id="alloc-total-barra"></div>' +
    '<div class="alloc-total__linha"><span>Total alocado</span>' +
    '<span class="alloc-total__pct" id="soma-pct">' + montFmtPct(soma) + "</span></div>" +
    '<div class="alloc-total__msg" role="status">' + montEsc(v.msg) + "</div>";

  var barra = montById("alloc-total-barra");
  if (barra) {
    montagemAtual.forEach(function (linha) {
      var pct = Number(linha.pct) || 0;
      if (pct <= 0) return;
      var seg = document.createElement("span");
      seg.className = "alloc-total__seg";
      var classe = linha.ticker ? montClasseDe(linha.ticker) : "Não classificado";
      var ci = montChartIdx(classe);
      seg.setAttribute("data-chart", String(ci));
      seg.style.setProperty("--w", Math.min(100, pct) + "%");
      seg.style.setProperty("--c", "var(--chart-" + ci + ")");
      seg.style.width = Math.min(100, pct) + "%";
      seg.title = (linha.ticker || "Sem ativo") + " · " + montFmtPct(pct);
      barra.appendChild(seg);
    });
  }
}

function montAtualizarSubmeter(soma) {
  var btn = montById("btn-submeter");
  if (!btn) return;
  if (_montLabelSubmeter === null) _montLabelSubmeter = btn.textContent;
  var v = montValidarMontagem(soma);
  btn.disabled = !v.ok;
  btn.setAttribute("aria-disabled", v.ok ? "false" : "true");
  btn.textContent = v.ok ? _montLabelSubmeter : v.msg;
  btn.title = v.ok ? "" : v.msg;
}

/* MONTAGEM-17: resumo permanente de janela comum. */
function montRenderJanela() {
  var el = montById("alloc-janela");
  if (!el) return;
  var j = montJanelaComum();
  var html = "";
  if (!j.inicio || !j.fim) {
    html = '<span class="alloc-janela__rotulo">Janela comum</span><span class="alloc-janela__valor">—</span>';
  } else {
    html = '<span class="alloc-janela__rotulo">Janela comum</span>' +
      '<span class="alloc-janela__valor">' + montMesAno(j.inicio) + " &rarr; " + montMesAno(j.fim) + "</span>";
    if (j.limitante) html += '<span class="alloc-janela__limite">· limitada por ' + montEsc(j.limitante) + "</span>";
  }
  if (j.semSerie.length) {
    html += '<span class="alloc-janela__alerta">· sem histórico: ' + montEsc(j.semSerie.join(", ")) + "</span>";
  }
  el.innerHTML = html;
}

/* MONTAGEM-15: aviso inline (não bloqueante) de sobreposição. */
var MONT_MOTIVO_TEXTO = {
  "mesmo índice": "replica o mesmo índice que",
  "mesmo fundo": "é o mesmo fundo que",
  "feeder": "é feeder do mesmo produto que"
};

function montRenderAvisosSobreposicao() {
  montagemAtual.forEach(function (linha, idx) {
    var el = montById("aviso-" + idx);
    if (el) { el.innerHTML = ""; el.hidden = true; }
  });

  var comTicker = [];
  montagemAtual.forEach(function (l, i) { if (l.ticker) comTicker.push({ idx: i, ticker: l.ticker, pct: Number(l.pct) || 0 }); });
  if (comTicker.length < 2) return;

  var pares = montSobreposicoes(comTicker.map(function (x) { return x.ticker; }));
  if (!pares.length) return;

  var porTicker = {};
  comTicker.forEach(function (x) { if (!porTicker[x.ticker]) porTicker[x.ticker] = x; });

  var mensagens = {};
  pares.forEach(function (p) {
    var a = porTicker[p.a], b = porTicker[p.b];
    if (!a || !b) return;
    var alvo = a.idx > b.idx ? a : b;
    var outro = a.idx > b.idx ? b : a;
    var texto = MONT_MOTIVO_TEXTO[p.motivo] || "tem exposição sobreposta com";
    var msg = alvo.ticker + " " + texto + " " + outro.ticker + " (" + montFmtPct(outro.pct) +
      ") — exposição combinada " + montFmtPct(alvo.pct + outro.pct);
    if (!mensagens[alvo.idx]) mensagens[alvo.idx] = [];
    mensagens[alvo.idx].push(msg);
  });

  Object.keys(mensagens).forEach(function (idx) {
    var el = montById("aviso-" + idx);
    if (!el) return;
    el.hidden = false;
    el.innerHTML = mensagens[idx].map(function (m) {
      return '<span class="alloc-row__aviso-item">' + montEsc(m) + "</span>";
    }).join("");
  });
}

/* MONTAGEM-10 + MONTAGEM-20: barra empilhada por classe + painel da carteira. */
function agruparPorClasse(alloc) {
  var out = {};
  (alloc || []).forEach(function (linha) {
    if (!linha || !linha.ticker) return;
    var pct = Number(linha.pct) || 0;
    if (!pct) return;
    var classe = montClasseDe(linha.ticker);
    if (!classe) classe = "Não classificado";
    out[classe] = (out[classe] || 0) + pct;
  });
  return out;
}

function renderComposicao(aporte, soma) {
  var alvo = montById("carteira-composicao") || montById("resumo-classes");
  if (!alvo) return;

  var canvas = montById("grafico-montagem");
  if (canvas) canvas.hidden = true;

  if (typeof aporte !== "number") {
    var aporteEl = montById("aporte");
    aporte = aporteEl ? (parseFloat(aporteEl.value) || 0) : 0;
  }
  if (typeof soma !== "number") soma = montSoma();

  var classes = agruparPorClasse(montagemAtual);
  var entradas = Object.keys(classes).map(function (k) { return { classe: k, pct: classes[k] }; })
    .sort(function (a, b) { return b.pct - a.pct; });
  var total = entradas.reduce(function (a, e) { return a + e.pct; }, 0);

  var html = "";
  if (!entradas.length) {
    html += '<div class="empty-state">Sem ativos alocados ainda — escolha ativos e defina os percentuais.</div>';
  } else {
    html += '<div class="compose" role="img" aria-label="Composição por classe">';
    entradas.forEach(function (e) {
      var largura = total > 0 ? (e.pct / total) * 100 : 0;
      var ci = montChartIdx(e.classe);
      html += '<span class="compose__seg" style="--w:' + largura.toFixed(2) + "%;--c:var(--chart-" + ci + ')" title="' +
        montEsc(e.classe) + " · " + montFmtPct(e.pct) + '"></span>';
    });
    html += "</div>";

    html += '<ul class="compose__legenda">';
    entradas.forEach(function (e) {
      var ci = montChartIdx(e.classe);
      html += '<li class="compose__item"><span class="compose__ponto" data-chart="' + ci + '"></span>' +
        '<span class="compose__nome">' + montEsc(e.classe) + "</span>" +
        '<span class="compose__pct">' + montFmtPct(e.pct) + "</span></li>";
    });
    html += "</ul>";
  }

  alvo.innerHTML = html;

  // Pintar os segmentos/pontos que dependem do índice de cor
  alvo.querySelectorAll(".compose__ponto").forEach(function (p) {
    p.style.setProperty("--c", "var(--chart-" + (p.getAttribute("data-chart") || 8) + ")");
  });

  var alvoInfo = montById("carteira-info");
  if (!alvoInfo) {
    alvoInfo = document.createElement("div");
    alvoInfo.id = "carteira-info";
    alvoInfo.className = "carteira-info";
    alvo.appendChild(alvoInfo);
  }
  alvoInfo.className = "carteira-info";
  alvoInfo.innerHTML = montHtmlCarteiraInfo(aporte, soma, entradas);
}
/* Nome antigo mantido como alias interno; a tela 3 usa renderComposicao. */
function montRenderComposicao(aporte, soma) { renderComposicao(aporte, soma); }

function montHtmlCarteiraInfo(aporte, soma, entradas) {
  var linhas = montagemAtual.filter(montLinhaValida);
  if (!linhas.length) {
    return '<div class="empty-state">O painel da carteira aparece quando houver pelo menos um ativo com percentual.</div>';
  }
  var base = linhas.reduce(function (a, l) { return a + (Number(l.pct) || 0); }, 0);
  var custodia = {}, moeda = {};
  var taxaPonderada = 0, taxaCompleta = true;
  var maior = null;

  linhas.forEach(function (l) {
    var pct = Number(l.pct) || 0;
    var reg = montReg(l.ticker);
    var cust = (reg && reg.custodia) || "—";
    var moe = (reg && reg.moeda) || "—";
    custodia[cust] = (custodia[cust] || 0) + pct;
    moeda[moe] = (moeda[moe] || 0) + pct;
    if (reg && typeof reg.taxa === "number" && isFinite(reg.taxa)) taxaPonderada += (pct / 100) * reg.taxa;
    else taxaCompleta = false;
    if (!maior || pct > maior.pct) maior = { ticker: l.ticker, pct: pct };
  });

  var maiorClasse = entradas && entradas.length ? entradas[0] : null;
  var taxaTexto = "—", taxaAno = "—";
  if (taxaCompleta && base > 0) {
    var taxaNormalizada = taxaPonderada * (100 / base);
    taxaTexto = montFmtPct2(taxaNormalizada) + " a.a.";
    taxaAno = aporte > 0 ? montFmtBRL((taxaNormalizada / 100) * aporte) + "/ano" : "—";
  }

  function distribuicao(mapa) {
    var chaves = Object.keys(mapa).sort(function (a, b) { return mapa[b] - mapa[a]; });
    if (!chaves.length) return "—";
    return chaves.map(function (k) {
      return k + " " + montFmtPct(base > 0 ? (mapa[k] / base) * 100 : 0);
    }).join(" · ");
  }

  function item(rotulo, valor, ctx) {
    return '<div class="metric"><div class="metric__label">' + montEsc(rotulo) + "</div>" +
      '<div class="metric__value">' + montEsc(valor) + "</div>" +
      (ctx ? '<div class="metric__ctx">' + montEsc(ctx) + "</div>" : "") + "</div>";
  }

  var html = '<div class="carteira-info__titulo">O que essa carteira é</div>';
  html += '<div class="carteira-info__grid">';
  html += item("Custódia", distribuicao(custodia));
  html += item("Moeda", distribuicao(moeda));
  html += item("Taxa média ponderada", taxaTexto, taxaAno === "—" ? "Custo anual não disponível" : "Custo estimado: " + taxaAno);
  html += item("Posições", String(linhas.length), soma !== 100 ? "Total alocado: " + montFmtPct(soma) : "Total alocado: 100,0%");
  html += item("Maior posição", maior ? maior.ticker + " · " + montFmtPct(maior.pct) : "—");
  html += item("Maior classe", maiorClasse ? maiorClasse.classe + " · " + montFmtPct(maiorClasse.pct) : "—");
  html += "</div>";
  if (!taxaCompleta) {
    html += '<div class="carteira-info__nota">Taxa média fica em &mdash; enquanto algum ativo da carteira não tiver taxa cadastrada.</div>';
  }
  return html;
}

/* Pizza legada — ainda usada pela tela 4 (score x gabarito). */
function renderPizza(canvasId, data, chartRef, setRef) {
  var el = document.getElementById(canvasId);
  if (!el || typeof Chart === "undefined") return;
  var ctx = el.getContext("2d");
  if (chartRef) chartRef.destroy();

  var palette = [
    "#0088cc", "#a12026", "#eb8105", "#ebe310",
    "#2d8c5c", "#6a5acd", "#cc6699", "#33b5e5", "#aa66cc", "#99cc00"
  ];

  var newChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: palette,
        borderWidth: 2,
        borderColor: getComputedStyle(document.body).getPropertyValue("--bg-card").trim()
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } } }
    }
  });
  if (typeof setRef === "function") setRef(newChart);
}

/* =================================================================================
   8. ESTADO (autosave)
   ================================================================================= */
function montCaseIdAtual() {
  if (typeof modoLivre !== "undefined" && modoLivre) return "livre";
  if (typeof caseAtual !== "undefined" && caseAtual && caseAtual.id) return caseAtual.id;
  return null;
}

function montSalvarEstado(aporte) {
  if (!window.Estado || typeof window.Estado.salvarCarteira !== "function") return;
  try {
    window.Estado.salvarCarteira({
      nome: (typeof modoLivre !== "undefined" && modoLivre)
        ? "Modo livre"
        : ((typeof caseAtual !== "undefined" && caseAtual && caseAtual.titulo) ? caseAtual.titulo : "Carteira"),
      aporte: aporte,
      linhas: montagemAtual.map(function (l) {
        return { ticker: l.ticker || "", pct: Number(l.pct) || 0 };
      }),
      caseId: montCaseIdAtual()
    });
  } catch (e) { /* autosave nunca quebra a montagem */ }
}

/* =================================================================================
   9. TELA 4 — submissão
   ================================================================================= */
function submeterProposta() {
  var v = montValidarMontagem();
  if (!v.ok) {
    montAtualizarSubmeter(montSoma());
    return;
  }

  if (modoLivre) {
    var header = document.querySelector(".score-header");
    if (header) header.style.display = "none";
    var grid = document.querySelector(".comparativo-grid");
    if (grid) grid.style.display = "none";
    var paineis4 = document.querySelectorAll("#tela4 > .painel");
    for (var i = 0; i < paineis4.length; i++) {
      var p = paineis4[i];
      p.style.display = (p.id === "painel-backtest-real") ? "" : "none";
    }
    var btnPitch = montById("btn-ir-pitch");
    if (btnPitch) {
      btnPitch.style.display = "";
      btnPitch.textContent = "Estruturar pitch e gerar apresentação →";
    }
    var btnVoltar = montById("btn-voltar-inicio-livre");
    if (btnVoltar) btnVoltar.style.display = "";
    var btnRefazer = montById("btn-refazer-montagem");
    if (btnRefazer) btnRefazer.textContent = "← Refazer montagem";
    if (window.AIDASim) AIDASim.render(montagemAtual, null);
    trocarTela("tela4");
    setTimeout(function () {
      var el = montById("painel-backtest-real");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
    return;
  }

  const score = calcularScore();
  registrarScore(caseAtual.id, score.total);

  // Monta o registro no formato da avaliação MAP (ver nota para o Lovable na função).
  // No protótipo só loga; no AdvisorPro este objeto deve ser persistido no Supabase.
  const registroMAP = montarRegistroAvaliacao(score);
  console.log("[AIDA → Avaliação MAP] Registro pronto para persistir:", registroMAP);

  renderTela4(score);
  trocarTela("tela4");
  setTimeout(function () {
    var el = montById("painel-backtest-real");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 150);
}
