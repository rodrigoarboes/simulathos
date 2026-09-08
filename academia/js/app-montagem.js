// academia/js/app-montagem.js — extraído de index.html (linhas 4860-5601 do monólito original)
function renderLinhasAlocacao() {
  const cont = document.getElementById("linhas-alocacao");
  cont.innerHTML = "";

  // Mapa de equivalências cruzadas BR ↔ US ↔ UCITS
  var eqMap = {
    // S&P 500
    "IVVB11":["VOO","IVV","SPY","VUAA","CSPX"], "VOO":["IVVB11","VUAA","CSPX","IVV"], "IVV":["IVVB11","VOO","CSPX"], "SPY":["IVVB11","VOO","CSPX"],
    "VUAA":["VOO","IVVB11","CSPX"], "CSPX":["IVV","IVVB11","VUAA"],
    // Nasdaq
    "NASD11":["QQQ","CNDX"], "QQQ":["NASD11","CNDX"], "CNDX":["QQQ","NASD11"],
    // Global/ACWI
    "ACWI11":["ACWI","VWRA","ISAC"], "ACWI":["ACWI11","VWRA","ISAC"], "VWRA":["ACWI11","ACWI","ISAC"], "ISAC":["ACWI11","ACWI","VWRA"],
    // Emergentes
    "VWO":["EIMI","IEMA"], "EIMI":["VWO","EEM"], "EEM":["EIMI","VWO"], "IEMG":["EIMI","VWO"],
    // Ouro
    "GOLD11":["GLD","IAU","SGOL"], "GLD":["GOLD11","IAU","SGOL"], "IAU":["GOLD11","GLD"], "SGOL":["GOLD11","GLD"],
    // Prata
    "SLV":["SIVR"], "SIVR":["SLV"],
    // RF Aggregate
    "AGG":["BND","VDPA"], "BND":["AGG","VDPA"], "VDPA":["AGG","BND"],
    // Treasuries
    "TLT":["BBTR"], "IEF":["BBTR"], "BBTR":["TLT","IEF","GOVT"],
    // T-Bills / Curto
    "SHV":["IB01","BIL"], "BIL":["SHV","IB01","U03A"], "IB01":["SHV","BIL"], "U03A":["BIL","SHV"],
    // Floating Rate
    "FLOT":["FLOA","USFR","TFLO"], "FLOA":["FLOT","USFR"], "USFR":["FLOT","FLOA"],
    // Small Caps EUA
    "SMAL11":["IWM","R2US"], "IWM":["SMAL11","R2US"], "R2US":["IWM","SMAL11"],
    // Dividendos
    "DIVO11":["VYM","VHYA","SCHD"], "VYM":["DIVO11","VHYA","SCHD"], "SCHD":["DIVO11","VYM"], "VHYA":["VYM","DIVO11"],
    // REITs
    "XFIX11":["VNQ","DPYA"], "VNQ":["XFIX11","DPYA"], "DPYA":["VNQ","XFIX11"],
    // Europa
    "EURP11":["VGK","ISFD","XMED"], "VGK":["EURP11","ISFD"], "ISFD":["VGK","EURP11"],
    // Value
    "VLUE":["IUVL"], "IUVL":["VLUE"],
    // Min Vol
    "USMV":["SPMV"], "SPMV":["USMV"],
    // Japão
    "EWJ":["IJPA","VJPA"], "IJPA":["EWJ"], "VJPA":["EWJ"],
    // India
    "INDA":["NDIA"], "NDIA":["INDA"],
    // China
    "FXI":["CNYA","MCHI"], "MCHI":["FXI","CNYA"], "CNYA":["FXI","MCHI"],
    // Global ex-US
    "IWDA":["VXUS","VEA","SWRD"], "SWRD":["IWDA","VXUS"],
    // Robótica/IA
    "BOTZ39":["BOTZ"], "BOTZ":["BOTZ39"],
    // Cyber
    "BBUG39":["BUG"], "BUG":["BBUG39"],
    // IA
    "BAIQ39":["AIQ"], "AIQ":["BAIQ39"],
    // Bitcoin
    "QBTC11":["IBIT","FBTC","GBTC","BITH11"], "BITH11":["IBIT","QBTC11"], "IBIT":["QBTC11","BITH11","FBTC"],
    "HASH11":["IBIT","FBTC"],
    // Equal Weight
    "RSP":["XDEW"], "XDEW":["RSP"],
  };
  window._eqMap = eqMap;
  function getEqText(ticker) {
    var eqs = eqMap[ticker];
    if (!eqs || eqs.length === 0) return "";
    return " (≈ " + eqs.slice(0, 3).join(" · ") + ")";
  }

  const etfsRelevantes = ETFs;

  const tickersDisponiveisSet = new Set(etfsRelevantes.map(e => e.ticker));
  const tickersExtras = [];
  if (window.DADOS) {
    if (window.DADOS.etfs) Object.keys(window.DADOS.etfs).forEach(t => {
      if (!tickersDisponiveisSet.has(t)) {
        tickersExtras.push({ ticker: t, desc: "B3" + getEqText(t), classe: "Outros", custodia: "BR" });
      }
    });
    if (window.DADOS.offshore) {
      var ucitsMap = {
        "VUAA": {eq:"VOO", sub:"Ações EUA"}, "CSPX": {eq:"IVV", sub:"Ações EUA"},
        "SPXS": {eq:"SPY", sub:"Ações EUA"}, "SPYL": {eq:"SPY", sub:"Ações EUA"},
        "CNDX": {eq:"QQQ", sub:"Ações EUA"}, "SASU": {eq:"", sub:"Ações EUA"},
        "XDEW": {eq:"RSP", sub:"Ações EUA"}, "SPY4": {eq:"SPY", sub:"Ações EUA"},
        "R2US": {eq:"IWM", sub:"Small Caps EUA"}, "CSUS": {eq:"", sub:"Ações EUA"},
        "IUVL": {eq:"VLUE", sub:"Ações EUA Value"}, "SPMV": {eq:"USMV", sub:"Ações EUA Min Vol"},
        "ISFD": {eq:"", sub:"Ações Europa"}, "XMED": {eq:"", sub:"Ações Europa"},
        "XEOU": {eq:"", sub:"Ações Europa"}, "HEDK": {eq:"", sub:"Ações Europa"},
        "IJPA": {eq:"EWJ", sub:"Ações Japão"}, "VJPA": {eq:"EWJ", sub:"Ações Japão"},
        "CPXJ": {eq:"", sub:"Ações Asia-Pac"},
        "EIMI": {eq:"EEM", sub:"Emergentes"}, "IEMA": {eq:"EEM", sub:"Emergentes"},
        "SAEM": {eq:"EEM", sub:"Emergentes"}, "NDIA": {eq:"INDA", sub:"Ações India"},
        "CNYA": {eq:"MCHI", sub:"Ações China"},
        "IWDA": {eq:"VTI", sub:"Ações Global"}, "VWRA": {eq:"VT", sub:"Ações Global"},
        "ISAC": {eq:"ACWI", sub:"Ações Global"}, "SWRD": {eq:"", sub:"Ações Global"},
        "VHYA": {eq:"VYM", sub:"Dividendos Global"}, "ACWD": {eq:"ACWI", sub:"Ações Global"},
        "WSML": {eq:"", sub:"Small Caps Global"},
        "IB01": {eq:"SHV", sub:"RF Curta USD"}, "U03A": {eq:"BIL", sub:"RF Curta USD"},
        "FLOA": {eq:"FLOT", sub:"RF Floating USD"}, "BBTR": {eq:"GOVT", sub:"Treasuries"},
        "VDPA": {eq:"BND", sub:"RF Aggregate USD"},
        "DPYA": {eq:"VNQ", sub:"REITs Global"},
        "EMUU": {eq:"", sub:"Emergentes"},
      };
      Object.keys(window.DADOS.offshore).forEach(t => {
        if (tickersDisponiveisSet.has(t)) return;
        var ucits = ucitsMap[t];
        if (ucits) {
          var eqText = ucits.eq ? ' (≈ ' + ucits.eq + ')' : '';
          var fullEq = getEqText(t) || eqText;
          tickersExtras.push({ ticker: t, desc: 'UCITS ' + ucits.sub + fullEq, classe: 'UCITS', custodia: 'OFFSHORE' });
        } else {
          var offMap = {
            VOO:"Ações EUA",VTI:"Ações EUA",SPY:"Ações EUA",IVV:"Ações EUA",QQQ:"Ações EUA (Nasdaq)",QQQM:"Ações EUA (Nasdaq)",RSP:"Ações EUA (Equal Weight)",
            SCHD:"Dividendos EUA",SCHX:"Ações EUA",SCHB:"Ações EUA",SCHF:"Ações Internacionais",SCHE:"Emergentes",SCHZ:"RF EUA",
            IWM:"Small Caps EUA",IWF:"Growth EUA",IWD:"Value EUA",IWB:"Ações EUA",IWN:"Small Value EUA",IWO:"Small Growth EUA",IWS:"Mid Value EUA",IWP:"Mid Growth EUA",
            VIG:"Dividendos EUA",VYM:"Dividendos EUA",VUG:"Growth EUA",VTV:"Value EUA",VO:"Mid Caps EUA",VB:"Small Caps EUA",
            HDV:"Dividendos EUA",DVY:"Dividendos EUA",DGRO:"Dividendos Growth EUA",DGRW:"Dividendos Growth EUA",
            QUAL:"Quality EUA",USMV:"Min Vol EUA",MTUM:"Momentum EUA",VLUE:"Value EUA",SIZE:"Size EUA",MOAT:"Wide Moat EUA",COWZ:"Cash Flow EUA",NOBL:"Dividendos Aristocratas",
            JEPI:"Income EUA",JEPQ:"Income Nasdaq",JPST:"RF Ultra Curta USD",
            SPLV:"Low Vol EUA",SPHD:"High Div Low Vol",SPHQ:"Quality EUA",KBWB:"Bancos EUA",KBWY:"REITs Yield",PGX:"Preferreds",
            XLK:"Tecnologia EUA",XLF:"Financeiro EUA",XLE:"Energia EUA",XLV:"Saúde EUA",XLI:"Indústria EUA",XLC:"Comunicação EUA",
            XLRE:"Imobiliário EUA",XLU:"Utilities EUA",XLP:"Consumo Básico EUA",XLB:"Materiais EUA",XLY:"Consumo Discricionário",
            EFA:"Desenvolvidos ex-EUA",EEM:"Emergentes",IEMG:"Emergentes",ACWI:"Global",IEFA:"Desenvolvidos ex-EUA",
            VEA:"Desenvolvidos ex-EUA",VGK:"Europa",VPL:"Pacífico",VXUS:"Global ex-EUA",VSS:"Small Caps Internacional",
            SCZ:"Small Caps Internacional",FXI:"China",MCHI:"China",INDA:"Índia",EWZ:"Brasil",
            SPDW:"Desenvolvidos ex-EUA",SPEM:"Emergentes",DGS:"Dividendos Emergentes",DEM:"Dividendos Emergentes",DLS:"Small Dividendos Intl",EPI:"Índia",
            EWJ:"Japão",KSA:"Arábia Saudita",BBCA:"Canadá",EWW:"México",EWQ:"França",EWG:"Alemanha",EWU:"Reino Unido",EZA:"África do Sul",ARGT:"Argentina",
            AGG:"RF Aggregate EUA",BND:"RF Aggregate EUA",TLT:"Treasuries Longos",IEF:"Treasuries Médios",SHV:"Treasuries Curtos",TIP:"TIPS (Inflação)",
            LQD:"Corporativo IG",HYG:"High Yield",EMB:"RF Emergentes",MBB:"Mortgage-Backed",
            BIL:"T-Bills",GOVT:"Treasuries",USFR:"Floating Rate",TFLO:"Floating Rate",
            IGIB:"Corporativo IG Médio",IGSB:"Corporativo IG Curto",USIG:"Corporativo IG",FLOT:"Floating Rate",NEAR:"Ultra Curta",
            VCIT:"Corporativo IG Médio",VCSH:"Corporativo IG Curto",VTIP:"TIPS Curto",VMBS:"Mortgage-Backed",
            BSV:"RF Curta",BIV:"RF Média",BLV:"RF Longa",SPTL:"Treasuries Longos",SPTS:"Treasuries Curtos",SPAB:"RF Aggregate",
            SDY:"Dividendos Aristocratas",SPYD:"High Div EUA",
            ARKK:"Inovação (ARK)",ARKW:"Internet (ARK)",ARKG:"Genômica (ARK)",ARKF:"Fintech (ARK)",ARKQ:"Robótica (ARK)",ARKX:"Espaço (ARK)",ARKB:"Bitcoin (ARK)",PRNT:"3D Printing (ARK)",
            BOTZ:"Robótica & IA",AIQ:"IA & Tecnologia",QYLD:"Covered Call Nasdaq",XYLD:"Covered Call S&P",RYLD:"Covered Call Russell",
            COPX:"Mineração Cobre",URA:"Urânio",SIL:"Mineração Prata",LIT:"Lítio & Baterias",
            BUG:"Cibersegurança",DRIV:"Veículos Autônomos",CLOU:"Cloud Computing",SNSR:"IoT",FINX:"Fintech",SOCL:"Mídias Sociais",HERO:"Jogos & eSports",GNOM:"Genômica",CTEC:"CleanTech",
            PFFD:"Preferreds",SRET:"REITs Global",MLPA:"MLP Energia",MLPX:"MLP & Infraestrutura",MLP:"MLP",POTX:"Cannabis",BKCH:"Blockchain",
            PAVE:"Infraestrutura EUA",SDIV:"Super Dividendos Global",DIV:"Dividendos US",
            ITA:"Defesa & Aeroespacial",PPA:"Defesa & Aeroespacial",XAR:"Defesa & Aeroespacial",IDEF:"Defesa",UFO:"Espaço",EUAD:"Defesa Europa",MISL:"Defesa",JEDI:"Drones & Defesa",FITE:"Segurança",
            XBI:"Biotech",IBB:"Biotech",FBT:"Biotech",BBH:"Biotech",PBE:"Biotech & Genômica",CANC:"Oncologia",IDNA:"Genômica & Saúde",SBIO:"Biotech Breakthroughs",
            IYW:"Tecnologia EUA",FTEC:"Tecnologia EUA",IGM:"Tech & Mídia",IXN:"Tech Global",QTUM:"Computação Quântica",FDN:"Internet",XT:"Tecnologias Exponenciais",KOMP:"New Economies",CHAT:"IA Generativa",
            MSOS:"Cannabis EUA",MJ:"Cannabis Global",
            CIBR:"Cibersegurança",HACK:"Cibersegurança",IHAK:"Cibersegurança",
            SHOP:"E-commerce (Ação)",HOOD:"Fintech (Ação)",COIN:"Crypto Exchange (Ação)",PYPL:"Pagamentos (Ação)",PLTR:"IA & Data (Ação)",FISV:"Fintech (Ação)",TOST:"Fintech (Ação)",INTU:"Fintech (Ação)",
            ICLN:"Energia Limpa Global",QCLN:"Energia Limpa",PBW:"Energia Limpa",CNRG:"Energia Limpa",LCTD:"Transição Carbono",PBD:"Energia Limpa Global",NZAC:"Clima Paris",FRNW:"Energia Limpa",HYDR:"Hidrogênio",ACES:"Energia Limpa",SMOG:"Low Carbon",BE:"Energia (Ação)",
            ESPO:"Gaming & eSports",NTES:"Gaming (Ação)",U:"Gaming Engine (Ação)",EA:"Gaming (Ação)",TTWO:"Gaming (Ação)",RBLX:"Metaverso (Ação)",GME:"Gaming Retail (Ação)",
            NVDA:"Semicondutores (Ação)",AAPL:"Big Tech (Ação)",MSFT:"Big Tech (Ação)",AMZN:"Big Tech (Ação)",GOOGL:"Big Tech (Ação)",AVGO:"Semicondutores (Ação)",META:"Big Tech (Ação)",TSLA:"EV & Energia (Ação)",BRKB:"Conglomerado (Ação)",
            RVMD:"Biotech (Ação)",AMGN:"Biotech (Ação)",CORT:"Biotech (Ação)",
            CRWD:"Cibersegurança (Ação)",FTNT:"Cibersegurança (Ação)",BB:"Cibersegurança (Ação)",PANW:"Cibersegurança (Ação)",CSCO:"Networking (Ação)",OKTA:"Identity (Ação)",AKAM:"CDN (Ação)",
            VFF:"Cannabis (Ação)",TLRY:"Cannabis (Ação)",CRON:"Cannabis (Ação)",SNDL:"Cannabis (Ação)",ACB:"Cannabis (Ação)",HITI:"Cannabis (Ação)",OGI:"Cannabis (Ação)",
            GLD:"Ouro",IAU:"Ouro",SLV:"Prata",SGOL:"Ouro Físico",SIVR:"Prata Física",GLTR:"Metais Preciosos",DBC:"Commodities Broad",DBA:"Agro Commodities",USO:"Petróleo",UNG:"Gás Natural",PDBC:"Commodities Broad",GSG:"Commodities Broad",CPER:"Cobre",COMT:"Commodities Broad",DJP:"Commodities Broad",KRBN:"Crédito de Carbono",
            VNQ:"REITs EUA",RWR:"REITs EUA",IYR:"Imobiliário EUA",REET:"REITs Global",REM:"Mortgage REITs",
            IBIT:"Bitcoin",FBTC:"Bitcoin",GBTC:"Bitcoin",ETHA:"Ethereum",BITO:"Bitcoin Futures",BITB:"Bitcoin",ETH:"Ethereum",
            DFAC:"Core EUA (Dimensional)",DFAI:"Core Intl (Dimensional)",DFAT:"Core EUA Total (Dimensional)",DFAX:"Core Emergentes (Dimensional)",DFUS:"Equity EUA (Dimensional)",DFLV:"Value EUA (Dimensional)",
          };
          var sub = offMap[t] || "Offshore US";
          tickersExtras.push({ ticker: t, desc: sub + getEqText(t), classe: 'Offshore US', custodia: 'OFFSHORE' });
        }
      });
    }
  }

  // Enriquecer ETFs do catálogo principal com equivalências cruzadas
  var etfsEnriquecidos = etfsRelevantes.map(function(e) {
    var eq = getEqText(e.ticker);
    if (eq && e.desc.indexOf('≈') === -1) {
      return Object.assign({}, e, { desc: e.desc + ' ' + eq });
    }
    return e;
  });

  // Registrar fundos abertos (CVM) no catálogo
  if (window.DADOS && window.DADOS.fundos) {
    var fundoClasses = {
      "JGP Strategy":"Macro","Kapitalo K10":"Macro","Kapitalo Kappa":"Macro","Kapitalo Zeta":"Macro",
      "Absolute Vertex":"Macro","Ibiuna Hedge STH":"Macro","Genoa Radar":"Macro","Itau Artax":"Macro",
      "ARX Vinson":"Crédito HG","Augme 45":"Crédito HG","Sparta Top":"Crédito HG","SPX Seahawk":"Crédito HG",
      "JGP Corporate":"Crédito HG","Capitania Premium":"Crédito Multi","Ibiuna Credit":"Crédito Multi",
      "Augme 180":"Crédito Multi","JGP Select":"Crédito Multi","Root High Yield":"Crédito HY",
      "Sparta Top Inflacao":"RF Inflação","Kinea IPCA Dinamico":"RF Inflação","Kinea Dakar":"RF Ativa",
      "Quantitas Galapagos":"RF Ativa","Itau Global Dinamico RF":"RF Ativa",
      "Trend DI Simples":"DI Simples","Melhores Fundos Multi":"FoF Multi",
    };
    Object.keys(window.DADOS.fundos).forEach(function(nome) {
      var cls = fundoClasses[nome] || "Fundo Aberto";
      tickersExtras.push({ ticker: nome, desc: cls + " (CVM, come-cotas)", classe: "Fundos Abertos", custodia: "BR" });
    });
  }

  const todosETFs = etfsEnriquecidos.concat(tickersExtras);
  window._allETFs = todosETFs;

  montagemAtual.forEach((linha, idx) => {
    const div = document.createElement("div");
    div.className = "linha-alocacao";

    // Determinar valor de exibição do input autocomplete
    var acDisplayValue = '';
    if (linha.ticker) {
      var etfMatch = todosETFs.find(function(e) { return e.ticker === linha.ticker; });
      acDisplayValue = etfMatch ? linha.ticker + ' — ' + etfMatch.desc : linha.ticker;
    }
    // Escape para atributo HTML
    var acDisplaySafe = acDisplayValue.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

    // Em modo livre, verificar se é ticker customizado (não está no catálogo)
    const isCustom = linha.ticker && !todosETFs.find(e => e.ticker === linha.ticker);
    const customInputId = `custom-ticker-${idx}`;
    const showCustom = modoLivre && isCustom;

    div.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:4px;flex:1;">
        <div class="ticker-autocomplete" id="ac-${idx}">
          <input type="text" placeholder="Digite ticker ou nome..."
            value="${acDisplaySafe}"
            oninput="onAutocompleteInput(${idx}, this.value)"
            onfocus="onAutocompleteFocus(${idx})"
            autocomplete="off"/>
          <div class="ac-dropdown" id="ac-drop-${idx}"></div>
        </div>
        ${modoLivre ? '<input type="text" id="' + customInputId + '" placeholder="Ex: PETR4, WEGE3, AAPL..." style="display:' + (showCustom ? '' : 'none') + '; font-family:var(--font-mono); font-size:13px; padding:6px 10px; border:1px solid var(--border); border-radius:5px; background:var(--bg-card); color:var(--text); text-transform:uppercase;" value="' + (isCustom ? linha.ticker : '') + '" onchange="onCustomTicker(' + idx + ', this.value)"/>' : ''}
      </div>
      <input type="number" min="0" max="100" step="0.1" value="${linha.pct}"
             placeholder="%" onchange="atualizarLinha(${idx}, 'pct', this.value)"
             oninput="atualizarLinha(${idx}, 'pct', this.value)"/>
      <span class="valor-calc" id="valor-${idx}">R$ 0</span>
      <button class="btn-x" onclick="removerLinha(${idx})">×</button>
    `;
    cont.appendChild(div);
  });
}

function onTickerSelect(idx, val) {
  montagemAtual[idx].ticker = val;
  var customInput = document.getElementById('custom-ticker-' + idx);
  if (customInput) customInput.style.display = 'none';
  calcularMontagem();
}

function onCustomTicker(idx, val) {
  montagemAtual[idx].ticker = val.trim().toUpperCase();
  calcularMontagem();
}

function atualizarLinha(idx, campo, valor) {
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

/* =================================================================================
   AUTOCOMPLETE — busca textual inline + pills por categoria (filtro global)
   ================================================================================= */
var _acTimeout = null;
window._acCategoryFilter = '';

function _matchesCategory(e, cat) {
  if (!cat) return true;
  var cl = (e.classe || '').toLowerCase();
  var desc = (e.desc || '').toLowerCase();
  var cust = (e.custodia || '').toLowerCase();
  if (cat === 'OFFSHORE') return cust === 'offshore' && cl.indexOf('ucits') === -1;
  if (cat === 'UCITS') return cl.indexOf('ucits') > -1;
  if (cat === 'Cripto') return cl.indexOf('cripto') > -1 || cl.indexOf('bitcoin') > -1 || desc.indexOf('bitcoin') > -1 || desc.indexOf('ethereum') > -1 || e.ticker.indexOf('BTC') > -1 || e.ticker.indexOf('ETH') > -1;
  if (cat === 'RF') return cl.indexOf('rf ') > -1 || cl.indexOf('renda fixa') > -1 || cl.indexOf('rf pós') > -1 || cl.indexOf('rf pre') > -1 || cl.indexOf('rf inf') > -1 || desc.indexOf('tesouro') > -1 || desc.indexOf('treasur') > -1 || desc.indexOf('bond') > -1 || desc.indexOf('renda fixa') > -1;
  if (cat === 'FII') return cl.indexOf('fii') > -1 || cl.indexOf('fiagro') > -1 || cl.indexOf('imobiliário') > -1;
  if (cat === 'Dividendos') return cl.indexOf('dividend') > -1 || desc.indexOf('dividend') > -1 || desc.indexOf('dividendo') > -1 || desc.indexOf('yield') > -1 || desc.indexOf('income') > -1;
  if (cat === 'Internacional') return cl.indexOf('internacional') > -1 || cl.indexOf('internacionais') > -1;
  if (cat === 'BDR') return cl.indexOf('bdr') > -1 || e.ticker.indexOf('34') > -1 || e.ticker.indexOf('39') > -1;
  if (cat === 'Alternativos') return cl.indexOf('alternativ') > -1 || cl.indexOf('setorial') > -1 || desc.indexOf('ouro') > -1 || desc.indexOf('gold') > -1 || desc.indexOf('commodit') > -1;
  if (cat === 'Fundos') return cl.indexOf('fundos') > -1 || desc.indexOf('cvm') > -1 || desc.indexOf('come-cotas') > -1;
  return cl.indexOf(cat.toLowerCase()) > -1;
}

// Sinônimos para busca expandida
var _searchSynonyms = {
  "eua":"s&p 500,ações eua,nasdaq,dow,americana,us-listed,estados unidos,usa",
  "estados unidos":"s&p 500,ações eua,nasdaq,americana,us-listed,eua,usa",
  "usa":"s&p 500,ações eua,nasdaq,americana,us-listed,eua,estados unidos",
  "bolsa americana":"s&p 500,ações eua,nasdaq,us-listed,eua",
  "ouro":"gold,ouro,sgol,gld,iau,precious",
  "prata":"silver,prata,slv,sivr",
  "tecnologia":"tech,tecnologia,semicondut,ai,artificial,software",
  "inteligencia artificial":"ai,artificial,inteligencia,botz,aiq,tech",
  "ia":"ai,artificial,inteligencia,botz,aiq,tech,robotic",
  "bitcoin":"btc,bitcoin,crypto,cripto",
  "ethereum":"eth,ethereum,crypto,cripto",
  "europa":"europe,europa,stoxx,euro,ftse,uk,reino unido,alemanha,frança",
  "china":"china,asia,hang seng,csi,shanghai",
  "japao":"japan,japão,nikkei,topix",
  "india":"india,índia,nifty",
  "emergentes":"emerging,emergentes,em,developing",
  "dividendos":"dividend,yield,income,proventos,jcp",
  "renda fixa":"bond,treasury,fixed income,rf ,tesouro,selic,ipca,prefixado,cdi",
  "imobiliario":"reit,imobiliário,imobiliario,fii,real estate,property",
  "energia":"energy,energia,oil,petróleo,gas,clean,solar,wind",
  "saude":"health,saúde,saude,biotech,pharma,genomic",
  "cannabis":"cannabis,weed,marijuana,hemp",
  "defesa":"defense,defesa,militar,aerospace,space",
  "gaming":"gaming,jogos,esports,video game",
  "cyber":"cyber,cibersegurança,security,hack",
};

function onAutocompleteInput(idx, value) {
  clearTimeout(_acTimeout);
  var query = value.trim();

  if (query.length < 2) {
    closeAutocomplete(idx);
    return;
  }

  _acTimeout = setTimeout(function() {
    var pool = window._allETFs || [];
    var catFilter = window._acCategoryFilter || '';
    var q = query.toLowerCase();

    // Expandir busca com sinônimos
    var expandedTerms = [q];
    Object.keys(_searchSynonyms).forEach(function(key) {
      if (q.indexOf(key) > -1 || key.indexOf(q) > -1) {
        _searchSynonyms[key].split(',').forEach(function(s) { expandedTerms.push(s.trim()); });
      }
    });

    var results = pool.filter(function(e) {
      if (catFilter && !_matchesCategory(e, catFilter)) return false;
      var text = (e.ticker + ' ' + e.desc + ' ' + e.classe + ' ' + (e.nome || '')).toLowerCase();
      return expandedTerms.some(function(term) { return text.indexOf(term) > -1; });
    }).slice(0, 50);

    showAutocompleteResults(idx, results);
  }, 150);
}

function onAutocompleteFocus(idx) {
  var input = document.querySelector('#ac-' + idx + ' input');
  if (input && input.value.length >= 2) {
    onAutocompleteInput(idx, input.value);
  }
}

function showAutocompleteResults(idx, results) {
  var drop = document.getElementById('ac-drop-' + idx);
  if (!drop || results.length === 0) { closeAutocomplete(idx); return; }

  var grupos = {};
  results.forEach(function(e) {
    var g = e.classe || 'Outros';
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(e);
  });

  var html = '';
  Object.keys(grupos).sort().forEach(function(g) {
    html += '<div class="ac-group-label">' + g + '</div>';
    grupos[g].forEach(function(e) {
      var safeDesc = (e.desc || '').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      var hasInfo = ETF_INFO[e.ticker] ? true : false;
      html += '<div class="ac-item">';
      html += '<span onclick="selectAutocomplete(' + idx + ',\'' + e.ticker + '\')" style="flex:1;cursor:pointer;">';
      html += '<span class="ac-ticker">' + e.ticker + '</span>';
      html += '<span class="ac-desc">' + safeDesc + '</span>';
      html += '</span>';
      if (hasInfo) {
        html += '<span class="ac-info-btn" onclick="event.stopPropagation();mostrarFichaETF(\'' + e.ticker + '\')" title="Ver ficha do ETF">ℹ️</span>';
      }
      html += '</div>';
    });
  });

  drop.innerHTML = html;
  drop.classList.add('open');
}

function mostrarFichaETF(ticker) {
  var info = ETF_INFO[ticker];
  if (!info) return;

  // Get equivalences
  var eqMap = window._eqMap || {};
  var eqs = eqMap[ticker] ? eqMap[ticker] : [];
  var eqHtml = eqs.length > 0 ? '<div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);"><span style="font-size:11px;color:var(--text-soft);">Equivalentes:</span> ' + eqs.map(function(t) {
    var ti = ETF_INFO[t];
    var flag = ti ? (ti.custodia === 'B3' ? '🇧🇷' : ti.custodia === 'Irlanda' ? '🇮🇪' : '🇺🇸') : '🌎';
    return '<span style="display:inline-block;padding:2px 8px;background:rgba(0,136,204,0.08);border-radius:4px;font-size:12px;margin:2px;font-family:var(--font-mono);">' + flag + ' ' + t + '</span>';
  }).join('') + '</div>' : '';

  // Data coverage
  var dataInfo = '';
  var series = (window.DADOS && window.DADOS.etfs && window.DADOS.etfs[ticker]) || (window.DADOS && window.DADOS.offshore && window.DADOS.offshore[ticker]);
  if (series && series.length > 0) {
    dataInfo = '<div style="margin-top:8px;font-size:11px;color:var(--text-soft);">📊 ' + series.length + ' dias de dados (' + series[0].data + ' → ' + series[series.length-1].data + ')</div>';
  }

  var custFlag = info.custodia === 'B3' ? '🇧🇷 B3' : info.custodia === 'Irlanda' ? '🇮🇪 UCITS' : '🇺🇸 US';

  var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">';
  html += '<div style="background:var(--bg-card);border-radius:16px;max-width:460px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.3);max-height:88vh;overflow-y:auto;">';

  // Header
  html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;">';
  html += '<div>';
  html += '<div style="font-family:var(--font-mono);font-size:24px;font-weight:800;color:var(--brand-blue);">' + ticker + '</div>';
  html += '<div style="font-size:14px;color:var(--text);margin-top:2px;">' + info.nome + '</div>';
  html += '</div>';
  html += '<span style="font-size:12px;padding:4px 10px;border-radius:20px;background:rgba(0,136,204,0.1);color:var(--brand-blue);white-space:nowrap;">' + custFlag + '</span>';
  html += '</div>';

  // Details grid
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">';
  html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:2px;">Gestora</div><div style="font-size:13px;font-weight:600;">' + info.gestora + '</div></div>';
  html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:2px;">Taxa Adm.</div><div style="font-size:13px;font-weight:600;">' + info.taxa + '</div></div>';
  html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:2px;">Categoria</div><div style="font-size:13px;font-weight:600;">' + info.categoria + '</div></div>';
  html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:2px;">Benchmark</div><div style="font-size:13px;font-weight:600;">' + info.benchmark + '</div></div>';
  html += '</div>';

  html += eqHtml;
  html += dataInfo;

  // Guia curado (papel / risco / pitch) — camada qualitativa do izinho
  var guia = (typeof ETF_GUIA !== 'undefined') ? ETF_GUIA[ticker] : null;
  if (guia) {
    html += '<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:10px;">';
    if (guia.papel) {
      html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:3px;">🎯 Papel na carteira</div><div style="font-size:13px;line-height:1.55;">' + guia.papel + '</div></div>';
    }
    if (guia.risco) {
      html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:3px;">⚠️ O risco que você precisa nomear</div><div style="font-size:13px;line-height:1.55;">' + guia.risco + '</div></div>';
    }
    if (guia.pitch) {
      html += '<div><div style="font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);margin-bottom:3px;">💬 Como explicar pro cliente</div><div style="font-size:13px;line-height:1.55;font-style:italic;color:var(--text);border-left:3px solid var(--brand-blue);padding-left:10px;">&ldquo;' + guia.pitch + '&rdquo;</div></div>';
    }
    html += '<a href="guia-etfs.html#' + ticker + '" target="_blank" rel="noopener" style="font-size:12px;font-weight:600;color:var(--brand-blue);text-decoration:none;">📖 Ver no Super Guia de ETFs &rarr;</a>';
    html += '</div>';
  }

  // Add to portfolio button
  html += '<button onclick="this.closest(\'div[style*=fixed]\').remove();adicionarDaLista(\'' + ticker + '\')" style="margin-top:16px;width:100%;padding:10px;border:none;border-radius:8px;background:var(--brand-blue);color:white;font-weight:600;cursor:pointer;font-size:14px;">+ Adicionar à carteira</button>';

  html += '</div></div>';

  // Remove existing fichas
  document.querySelectorAll('[data-ficha-etf]').forEach(function(el) { el.remove(); });

  var div = document.createElement('div');
  div.setAttribute('data-ficha-etf', 'true');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}

function selectAutocomplete(idx, ticker) {
  var input = document.querySelector('#ac-' + idx + ' input');
  var etf = (window._allETFs || []).find(function(e) { return e.ticker === ticker; });
  if (input) {
    input.value = ticker + (etf ? ' — ' + etf.desc : '');
  }
  closeAutocomplete(idx);
  onTickerSelect(idx, ticker);
}

function closeAutocomplete(idx) {
  var drop = document.getElementById('ac-drop-' + idx);
  if (drop) drop.classList.remove('open');
}

// Close all dropdowns when clicking outside
document.addEventListener('click', function(e) {
  if (!e.target.closest('.ticker-autocomplete')) {
    document.querySelectorAll('.ac-dropdown').forEach(function(d) { d.classList.remove('open'); });
  }
});

function filtrarCategoria(cat) {
  document.querySelectorAll('.cat-pill').forEach(function(p) { p.classList.remove('active'); });
  if (event && event.target) event.target.classList.add('active');
  window._acCategoryFilter = cat || '';
  // Mostrar resultados filtrados no primeiro autocomplete vazio
  var pool = window._allETFs || [];
  var filtered = cat ? pool.filter(function(e) { return _matchesCategory(e, cat); }).slice(0, 50) : [];
  if (filtered.length > 0) {
    // Encontrar o primeiro autocomplete sem ticker selecionado
    var targetIdx = -1;
    for (var i = 0; i < montagemAtual.length; i++) {
      if (!montagemAtual[i].ticker) { targetIdx = i; break; }
    }
    if (targetIdx === -1) targetIdx = 0;
    var input = document.querySelector('#ac-' + targetIdx + ' input');
    if (input && (!input.value || input.value === '')) {
      showAutocompleteResults(targetIdx, filtered);
      input.focus();
    }
  }
}

function abrirTutorial() {
  var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">';
  html += '<div style="background:var(--bg-card);border-radius:16px;max-width:520px;width:100%;max-height:85vh;overflow-y:auto;padding:32px;">';
  html += '<h3 style="font-family:var(--font-display);font-size:22px;margin:0 0 20px;">🎯 Como usar o simulador</h3>';

  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">1. Buscar ativos</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">Digite <strong>pelo menos 2 letras</strong> no campo de busca. Pode buscar por:</p>';
  html += '<ul style="font-size:13px;color:var(--text-soft);line-height:1.8;margin:6px 0 0 16px;padding:0;">';
  html += '<li><strong>Ticker</strong> — ex: LFTS11, VOO, PETR4</li>';
  html += '<li><strong>Nome</strong> — ex: "Tesouro", "Vanguard", "Bitcoin"</li>';
  html += '<li><strong>Tema</strong> — ex: "ouro", "dividendos", "tecnologia", "EUA"</li>';
  html += '<li><strong>Classe</strong> — ex: "renda fixa", "emergentes", "small caps"</li>';
  html += '</ul></div>';

  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">2. Filtrar por categoria</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">Use os <strong>botões de categoria</strong> (Renda Fixa, Ações BR, FIIs, etc.) para filtrar. Ao clicar, o campo de busca já mostra ativos daquela classe.</p>';
  html += '</div>';

  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">3. Ver lista completa</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">Clique no botão <strong style="color:var(--brand-orange);">📋 Ver lista</strong> para navegar por todos os 600+ ativos organizados por categoria. Clique em qualquer um para adicionar.</p>';
  html += '</div>';

  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">4. Ficha do ETF</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">Nos resultados da busca, clique no <strong>ℹ️</strong> ao lado do ticker para ver a ficha completa: gestora, taxa, benchmark e equivalentes em outros mercados.</p>';
  html += '</div>';

  html += '<div style="margin-bottom:20px;">';
  html += '<div style="font-weight:700;font-size:14px;color:var(--brand-blue);margin-bottom:6px;">5. Montar e simular</div>';
  html += '<p style="font-size:13px;color:var(--text-soft);line-height:1.6;margin:0;">Defina o <strong>percentual (%)</strong> de cada ativo. O total deve somar 100%. Clique <strong>"Simular"</strong> para rodar o backtest com dados históricos reais.</p>';
  html += '</div>';

  html += '<div style="background:rgba(0,136,204,0.06);border-radius:8px;padding:12px 16px;margin-bottom:16px;">';
  html += '<div style="font-size:12px;color:var(--brand-blue);font-weight:600;margin-bottom:4px;">💡 Dica</div>';
  html += '<p style="font-size:12px;color:var(--text-soft);line-height:1.6;margin:0;">Cada ativo mostra equivalentes entre mercados. Ex: <strong>IVVB11</strong> (B3) ≈ <strong>VOO</strong> (EUA) ≈ <strong>VUAA</strong> (UCITS). Assim você compara o mesmo produto em diferentes bolsas.</p>';
  html += '</div>';

  html += '<button onclick="this.closest(\'div[style*=fixed]\').remove()" style="width:100%;padding:10px;border:none;border-radius:8px;background:var(--brand-blue);color:white;font-weight:600;cursor:pointer;font-size:14px;">Entendi!</button>';
  html += '</div></div>';
  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}

function abrirListaCompleta() {
  var pool = window._allETFs || [];
  var grupos = {};
  pool.forEach(function(e) {
    var g = e.classe || 'Outros';
    if (!grupos[g]) grupos[g] = [];
    grupos[g].push(e);
  });
  var html = '<div style="position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:999;display:flex;align-items:center;justify-content:center;padding:20px;" onclick="if(event.target===this)this.remove()">';
  html += '<div style="background:var(--bg-card);border-radius:16px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;padding:28px;">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  html += '<h3 style="font-family:var(--font-display);font-size:20px;margin:0;">📋 Ativos Disponíveis <span style="font-size:13px;color:var(--text-soft);font-weight:400;">(' + pool.length + ')</span></h3>';
  html += '<input type="text" placeholder="🔍 Buscar..." oninput="filtrarListaModal(this.value)" style="padding:6px 12px;border-radius:6px;border:1px solid var(--border);background:var(--bg-soft);color:var(--text);font-size:13px;width:180px;">';
  html += '</div>';
  Object.keys(grupos).sort().forEach(function(g) {
    html += '<div class="lista-grupo" data-grupo="' + g + '">';
    html += '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-soft);padding:8px 0 4px;border-bottom:1px solid var(--border);margin-top:12px;">' + g + ' <span style="opacity:0.5">(' + grupos[g].length + ')</span></div>';
    grupos[g].forEach(function(e) {
      var hasInfo = ETF_INFO[e.ticker] ? true : false;
      html += '<div class="lista-item" style="padding:6px 8px;font-size:13px;border-radius:4px;display:flex;align-items:center;gap:6px;" onmouseover="this.style.background=\'rgba(0,136,204,0.08)\'" onmouseout="this.style.background=\'\'">';
      html += '<span style="flex:1;cursor:pointer;" onclick="adicionarDaLista(\'' + e.ticker + '\');var p=this.parentElement;p.style.background=\'rgba(45,140,92,0.15)\';p.innerHTML=\'<span style=color:var(--ok)>✓ ' + e.ticker + ' adicionado</span>\'">';
      html += '<strong style="color:var(--brand-blue);font-family:var(--font-mono);">' + e.ticker + '</strong> <span style="color:var(--text-soft);font-size:11px;">' + e.desc + '</span>';
      html += '</span>';
      if (hasInfo) {
        html += '<span class="ac-info-btn" onclick="event.stopPropagation();mostrarFichaETF(\'' + e.ticker + '\')" title="Ver ficha do ETF" style="flex-shrink:0;">ℹ️</span>';
      }
      html += '<span style="font-size:10px;color:var(--text-soft);opacity:0.5;flex-shrink:0;">' + (e.custodia === 'OFFSHORE' ? '🌎' : '🇧🇷') + '</span>';
      html += '</div>';
    });
    html += '</div>';
  });
  html += '</div></div>';
  var div = document.createElement('div');
  div.innerHTML = html;
  document.body.appendChild(div.firstChild);
}
window.filtrarListaModal = function(q) {
  q = q.toLowerCase();
  document.querySelectorAll('.lista-grupo').forEach(function(g) {
    var items = g.querySelectorAll('.lista-item');
    var vis = 0;
    items.forEach(function(item) { var show = !q || item.textContent.toLowerCase().indexOf(q) > -1; item.style.display = show ? '' : 'none'; if (show) vis++; });
    g.style.display = vis > 0 ? '' : 'none';
  });
};
window.adicionarDaLista = function(ticker) {
  var idx = -1;
  for (var i = 0; i < montagemAtual.length; i++) {
    if (!montagemAtual[i].ticker) { idx = i; break; }
  }
  if (idx === -1) {
    montagemAtual.push({ ticker: '', pct: 0 });
    idx = montagemAtual.length - 1;
    renderLinhasAlocacao();
  }
  montagemAtual[idx].ticker = ticker;
  var etf = (window._allETFs || []).find(function(e) { return e.ticker === ticker; });
  var input = document.querySelector('#ac-' + idx + ' input');
  if (input) input.value = ticker + (etf ? ' — ' + etf.desc : '');
  calcularMontagem();
};

function calcularMontagem() {
  const aporte = parseFloat(document.getElementById("aporte").value) || 0;
  let soma = 0;

  montagemAtual.forEach((linha, idx) => {
    soma += linha.pct;
    const valor = (linha.pct / 100) * aporte;
    const el = document.getElementById(`valor-${idx}`);
    if (el) el.textContent = `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  });

  const somaEl = document.getElementById("soma-total");
  const somaPctEl = document.getElementById("soma-pct");
  somaPctEl.textContent = `${soma.toFixed(1)}%`;

  somaEl.classList.remove("ok", "warn", "bad");
  if (soma === 100) somaEl.classList.add("ok");
  else if (Math.abs(soma - 100) <= 5) somaEl.classList.add("warn");
  else somaEl.classList.add("bad");

  // Gráfico pizza
  renderPizza("grafico-montagem", agruparPorClasse(montagemAtual), chartMontagem, (c) => chartMontagem = c);

  // Resumo classes
  const classes = agruparPorClasse(montagemAtual);
  document.getElementById("resumo-classes").innerHTML = Object.entries(classes)
    .filter(([k, v]) => v > 0)
    .map(([k, v]) => `<div class="dado-key"><span>${k}</span><span>${v.toFixed(1)}%</span></div>`)
    .join("");
}

function agruparPorClasse(alloc) {
  const out = {};
  alloc.forEach(linha => {
    if (!linha.ticker) return;
    const etf = ETFs.find(e => e.ticker === linha.ticker);
    if (!etf) return;
    out[etf.classe] = (out[etf.classe] || 0) + linha.pct;
  });
  return out;
}

function renderPizza(canvasId, data, chartRef, setRef) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  if (chartRef) chartRef.destroy();

  const palette = [
    "#0088cc", "#a12026", "#eb8105", "#ebe310",
    "#2d8c5c", "#6a5acd", "#cc6699", "#33b5e5", "#aa66cc", "#99cc00"
  ];

  const newChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: Object.keys(data),
      datasets: [{
        data: Object.values(data),
        backgroundColor: palette,
        borderWidth: 2,
        borderColor: getComputedStyle(document.body).getPropertyValue('--bg-card').trim()
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });
  setRef(newChart);
}

/* =================================================================================
   TELA 4 — Score + Gabarito
   ================================================================================= */
function submeterProposta() {
  if (modoLivre) {
    // Modo Livre: skip scoring, go straight to backtest results
    document.querySelector('.score-header').style.display = 'none';
    document.querySelector('.comparativo-grid').style.display = 'none';
    var paineis4 = document.querySelectorAll('#tela4 > .painel');
    for (var i = 0; i < paineis4.length; i++) {
      var p = paineis4[i];
      if (p.id === 'painel-backtest-real') {
        p.style.display = '';
      } else {
        p.style.display = 'none';
      }
    }
    // Modo Livre também estrutura pitch e gera apresentação (pedido 18/08):
    // o botão fica visível, com rótulo que já anuncia a apresentação.
    document.getElementById("btn-ir-pitch").style.display = "";
    document.getElementById("btn-ir-pitch").textContent = "Estruturar pitch e gerar apresentação →";
    document.getElementById("btn-voltar-inicio-livre").style.display = "";
    document.getElementById("btn-refazer-montagem").textContent = "← Refazer montagem";
    if (window.AIDASim) AIDASim.render(montagemAtual, null);
    trocarTela("tela4");
    setTimeout(function() {
      var el = document.getElementById('painel-backtest-real');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
  setTimeout(function() {
    var el = document.getElementById('painel-backtest-real');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 150);
}

