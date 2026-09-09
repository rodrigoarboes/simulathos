// academia/data/catalogo.js — catálogo único (dono: catálogo). Expõe window.Catalogo
/* =================================================================================
   CATÁLOGO ÚNICO DE ATIVOS (ARQUITETURA-06 / ARQUITETURA-11)

   Fonte da verdade para classe, custódia, moeda, taxa, série e equivalências de
   TODO o universo do simulador (~670 ativos). Antes existiam quatro estruturas
   paralelas (ETFs, eqMap/ucitsMap/offMap/fundoClasses dentro de
   renderLinhasAlocacao, ETF_INFO e ETF_GUIA) e só os ativos do array ETFs eram
   reconhecidos pela pizza/resumo/score.

   Construído UMA vez no carregamento (memoizado). Depende de globais já
   carregados nesta ordem: dados.js (window.DADOS), manifest.js (window.MANIFEST),
   app-dados.js (ETFs), app-programa.js (ETF_INFO, ETF_GUIA).

   ---------------------------------------------------------------------------
   API ESTÁVEL (window.Catalogo) — o que pode ser usado pelas telas
   ---------------------------------------------------------------------------
   Catalogo.get(ticker)        -> registro completo ou null
   Catalogo.info(ticker)       -> FICHA ESTÁVEL do ticker (contrato abaixo) ou null
   Catalogo.classeDe(ticker)   -> string da taxonomia fechada ("Não classificado" no pior caso)
   Catalogo.janela(ticker)     -> { primeira, ultima, pontos, fonte } ou null
   Catalogo.risco(ticker)      -> { fatorRisco, liquidezEfetiva, moedaExposicao, duration }
   Catalogo.simulavel(ticker)  -> { temSerie, qualidadeOk, nivel: "ok"|"ressalva"|"sem" }
   Catalogo.equivalentes(t)    -> array de tickers que replicam a mesma exposição
   Catalogo.sobreposicoes(ts)  -> [{ a, b, motivo }] para uma lista de tickers
   Catalogo.atributos(classe)  -> atributos de risco/liquidez daquela CLASSE
   Catalogo.buscar(termo, cl)  -> registros que casam com o termo (e opcionalmente a classe)
   Catalogo.all() / .classes() / .resumo() / .reconstruir()

   Contrato de Catalogo.info(ticker) — todo campo desconhecido é null, NUNCA um
   valor inventado (a tela mostra "—"):
     { ticker, nome, classe, subclasse, custodia ("B3"|"US"|"IE"|"CVM"),
       moeda, taxa (número em % a.a. ou null), benchmark, gestora, desc,
       temSerie (bool), primeiraData, ultimaData, pontos, qualidadeOk (bool|null),
       janela: { primeira, ultima, pontos, fonte:"manifest"|"serie" } | null,
       risco: { fatorRisco, liquidezEfetiva, moedaExposicao, duration },
       simulavel: { temSerie, qualidadeOk, nivel },
       equivalentes: [ticker], papel, riscoTexto, pitch }
   ================================================================================= */
(function () {
  "use strict";

  /* ---------------------------------------------------------------------------
     1. TAXONOMIA FECHADA
     --------------------------------------------------------------------------- */
  var CLASSES = [
    "RF Pós-Fixado", "RF Prefixado", "RF Inflação", "RF Internacional",
    "Ações BR", "Ações Internacionais", "Dividendos", "Mid/Small Caps", "Setorial",
    "FIIs Tijolo", "FIIs Papel", "FIAgros", "BDRs", "Cripto", "Alternativos",
    "Fundos Abertos", "Offshore US", "UCITS", "Não classificado"
  ];
  var CLASSES_SET = {};
  for (var ci = 0; ci < CLASSES.length; ci++) CLASSES_SET[CLASSES[ci]] = true;
  var NAO_CLASSIFICADO = "Não classificado";

  /* Atributos por classe — tabela fixa e documentada.
     fatorRisco:      peso de volatilidade relativo a "1 = bolsa BR à vista".
     liquidezEfetiva: 0..1, quão rápido dá pra sair sem machucar preço (D+0 = 1).
     moeda:           moeda de exposição econômica (não a de custódia).
     duration:        anos, só onde faz sentido (renda fixa); null nas demais. */
  var ATRIBUTOS = {
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

  /* Custódia e moeda derivadas da classe (fallback quando a fonte não informa). */
  var CUSTODIA_POR_CLASSE = {
    "Offshore US": "US", "UCITS": "IE", "Fundos Abertos": "CVM"
  };

  /* ---------------------------------------------------------------------------
     2. MAPAS COPIADOS DE app-montagem.js (renderLinhasAlocacao)
        Cópia deliberada: o dono da montagem removerá as versões locais depois.
     --------------------------------------------------------------------------- */
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
    "RSP":["XDEW"], "XDEW":["RSP"]
  };

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
    "EMUU": {eq:"", sub:"Emergentes"}
  };

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
    DFAC:"Core EUA (Dimensional)",DFAI:"Core Intl (Dimensional)",DFAT:"Core EUA Total (Dimensional)",DFAX:"Core Emergentes (Dimensional)",DFUS:"Equity EUA (Dimensional)",DFLV:"Value EUA (Dimensional)"
  };

  var fundoClasses = {
    "JGP Strategy":"Macro","Kapitalo K10":"Macro","Kapitalo Kappa":"Macro","Kapitalo Zeta":"Macro",
    "Absolute Vertex":"Macro","Ibiuna Hedge STH":"Macro","Genoa Radar":"Macro","Itau Artax":"Macro",
    "ARX Vinson":"Crédito HG","Augme 45":"Crédito HG","Sparta Top":"Crédito HG","SPX Seahawk":"Crédito HG",
    "JGP Corporate":"Crédito HG","Capitania Premium":"Crédito Multi","Ibiuna Credit":"Crédito Multi",
    "Augme 180":"Crédito Multi","JGP Select":"Crédito Multi","Root High Yield":"Crédito HY",
    "Sparta Top Inflacao":"RF Inflação","Kinea IPCA Dinamico":"RF Inflação","Kinea Dakar":"RF Ativa",
    "Quantitas Galapagos":"RF Ativa","Itau Global Dinamico RF":"RF Ativa",
    "Trend DI Simples":"DI Simples","Melhores Fundos Multi":"FoF Multi"
  };

  /* ---------------------------------------------------------------------------
     3. NORMALIZAÇÃO PARA A TAXONOMIA FECHADA
     --------------------------------------------------------------------------- */
  /* Categorias do ETF_INFO (sem acento) e classes legadas do array ETFs →
     taxonomia fechada. */
  var MAPA_CATEGORIA = {
    // Renda fixa BR
    "RF Pos-Fixado": "RF Pós-Fixado", "RF Pós-Fixado": "RF Pós-Fixado",
    "RF Credito": "RF Pós-Fixado", "RF Crédito": "RF Pós-Fixado",
    "RF Prefixado": "RF Prefixado",
    "RF Inflacao": "RF Inflação", "RF Inflação": "RF Inflação",
    "RF Inflacao Longa": "RF Inflação", "RF Inflacao Curta": "RF Inflação",
    // Renda fixa internacional
    "RF Aggregate EUA": "RF Internacional", "RF Internacional": "RF Internacional",
    "Treasuries Longos": "RF Internacional", "Treasuries Medios": "RF Internacional",
    "Treasuries Médios": "RF Internacional", "Treasuries": "RF Internacional",
    "T-Bills": "RF Internacional", "TIPS Inflacao": "RF Internacional",
    "Corporativo IG": "RF Internacional", "High Yield": "RF Internacional",
    "RF Emergentes": "RF Internacional", "RF Floating Rate": "RF Internacional",
    // Ações BR
    "Acoes BR": "Ações BR", "Ações BR": "Ações BR",
    "Governanca": "Ações BR", "ESG": "Ações BR",
    // Ações internacionais
    "Acoes Internacionais": "Ações Internacionais", "Ações Internacionais": "Ações Internacionais",
    "Acoes Globais": "Ações Internacionais", "Acoes EUA": "Ações Internacionais",
    "Acoes EUA Total": "Ações Internacionais", "Acoes EUA (Nasdaq)": "Ações Internacionais",
    "Acoes EUA Equal Weight": "Ações Internacionais", "Emergentes": "Ações Internacionais",
    "Desenvolvidos ex-EUA": "Ações Internacionais", "Europa": "Ações Internacionais",
    "China": "Ações Internacionais", "India": "Ações Internacionais",
    "Japao": "Ações Internacionais", "Brasil (USD)": "Ações Internacionais",
    "Growth EUA": "Ações Internacionais", "Value EUA": "Ações Internacionais",
    "Quality EUA": "Ações Internacionais", "Min Vol EUA": "Ações Internacionais",
    "Momentum EUA": "Ações Internacionais",
    // Dividendos
    "Dividendos BR": "Dividendos", "Dividendos EUA": "Dividendos",
    "Dividendos Growth": "Dividendos", "Dividendos/Utilities": "Dividendos",
    "Dividendos": "Dividendos",
    // Mid/Small
    "Small Caps BR": "Mid/Small Caps", "Small Caps EUA": "Mid/Small Caps",
    "Mid Caps EUA": "Mid/Small Caps", "Mid/Small Caps": "Mid/Small Caps",
    // Setorial / temático
    "Setorial": "Setorial", "Tecnologia": "Setorial", "Tecnologia EUA": "Setorial",
    "Financeiro EUA": "Setorial", "Energia EUA": "Setorial", "Saude EUA": "Setorial",
    "Robotica & IA": "Setorial", "IA & Tecnologia": "Setorial", "Ciberseguranca": "Setorial",
    "Inovacao Disruptiva": "Setorial", "Internet & Fintech": "Setorial", "Genomica": "Setorial",
    "Infraestrutura EUA": "Setorial", "Income EUA": "Setorial", "Income Nasdaq": "Setorial",
    "Covered Call": "Setorial", "Uranio": "Setorial", "Litio & Baterias": "Setorial",
    "Mineracao Cobre": "Setorial",
    // FIIs / FIAgro
    "FIIs": "FIIs Tijolo", "FIIs Tijolo": "FIIs Tijolo", "FIIs Papel": "FIIs Papel",
    "REITs EUA": "FIIs Tijolo", "FIAgros": "FIAgros",
    // Cripto
    "Bitcoin": "Cripto", "Criptoativos": "Cripto", "Cripto": "Cripto",
    // Alternativos
    "Commodities": "Alternativos", "Ouro": "Alternativos", "Prata": "Alternativos",
    "Alternativos": "Alternativos",
    // Containers
    "BDRs": "BDRs", "Fundos Abertos": "Fundos Abertos",
    "Offshore US": "Offshore US", "UCITS": "UCITS"
  };

  /* Classificação curada dos ativos B3 que não vêm do array ETFs nem do ETF_INFO.
     Derivada do prefixo/sufixo do ticker (regra documentada na cascata). */
  var B3_CURADO = {
    // Renda fixa pós-fixada (Selic/CDI)
    "LFIN11":"RF Pós-Fixado","LFIX11":"RF Pós-Fixado","LFTI11":"RF Pós-Fixado","LFTX11":"RF Pós-Fixado",
    "LLFT11":"RF Pós-Fixado","NLFA11":"RF Pós-Fixado","NCDI11":"RF Pós-Fixado","NTNS11":"RF Pós-Fixado",
    "GLFT11":"RF Pós-Fixado","HYBR11":"RF Pós-Fixado","BCIC11":"RF Pós-Fixado",
    // Renda fixa prefixada
    "5PRE11":"RF Prefixado","BPRE11":"RF Prefixado","PREX11":"RF Prefixado","FIXX11":"RF Prefixado",
    "SFIX11":"RF Prefixado","LTBX11":"RF Prefixado","LTNB11":"RF Prefixado",
    // Renda fixa inflação (Tesouro IPCA+ / IMA-B por vencimento)
    "IMBB11":"RF Inflação","GPCA11":"RF Inflação","GICP11":"RF Inflação",
    "TD3511":"RF Inflação","TD5011":"RF Inflação","TD6011":"RF Inflação",
    "XB3011":"RF Inflação","XB3511":"RF Inflação","XB4511":"RF Inflação","XB5011":"RF Inflação","XB6011":"RF Inflação",
    // Renda fixa internacional
    "BNDX11":"RF Internacional","USDB11":"RF Internacional","CLOB11":"RF Internacional","T10R11":"RF Internacional",
    // Ações BR (índices amplos e fatores locais)
    "BBOV11":"Ações BR","BOVB11":"Ações BR","BOVS11":"Ações BR","BOVX11":"Ações BR","XBOV11":"Ações BR",
    "IBOB11":"Ações BR","NBOV11":"Ações BR","BRAX11":"Ações BR","BRXC11":"Ações BR","XBCI11":"Ações BR",
    "ECOO11":"Ações BR","ESGB11":"Ações BR","QLBR11":"Ações BR","SPBZ11":"Ações BR","EWBZ11":"Ações BR",
    "AUVP11":"Ações BR","BVBR11":"Ações BR","BXPO11":"Ações BR","BOL511":"Ações BR",
    // Dividendos
    "BBSD11":"Dividendos","GDIV11":"Dividendos","NDIV11":"Dividendos","DVER11":"Dividendos",
    // Mid/Small caps
    "MIDB11":"Mid/Small Caps","SMAB11":"Mid/Small Caps","SMAC11":"Mid/Small Caps","SVAL11":"Mid/Small Caps",
    // Ações internacionais (feeders B3)
    "CAPE11":"Ações Internacionais","GXUS11":"Ações Internacionais","IVWO11":"Ações Internacionais",
    "IWMI11":"Ações Internacionais","NSDV11":"Ações Internacionais","QQQI11":"Ações Internacionais",
    "QQQQ11":"Ações Internacionais","SPXB11":"Ações Internacionais","SPXH11":"Ações Internacionais",
    "SPYR11":"Ações Internacionais","XSPI11":"Ações Internacionais","USAL11":"Ações Internacionais",
    "USTK11":"Ações Internacionais","VWRA11":"Ações Internacionais","XINA11":"Ações Internacionais",
    "ARGE11":"Ações Internacionais","BEST11":"Ações Internacionais","QDFI11":"Ações Internacionais",
    "GENB11":"Ações Internacionais","REVE11":"Ações Internacionais","BDOM11":"Ações Internacionais",
    // Setorial / temático
    "CHIP11":"Setorial","GPUS11":"Setorial","HTEK11":"Setorial","TECX11":"Setorial","UTEC11":"Setorial",
    "UTLL11":"Setorial","NUCL11":"Setorial","QSOL11":"Setorial","SOLH11":"Setorial","AGRI11":"Setorial",
    "BDEF11":"Setorial","META11":"Setorial","HERT11":"Setorial","MILL11":"Setorial","BREW11":"Setorial",
    "ELAS11":"Setorial","SILK11":"Setorial","TIRB11":"Setorial","PHIP11":"Setorial","BMMT11":"Setorial",
    "BDAP11":"Setorial","SCVB11":"Setorial","WEJR11":"Setorial","PKIN11":"Setorial","BBOI11":"Setorial",
    // FIIs
    "ALUG11":"FIIs Tijolo","AREA11":"FIIs Tijolo","HGBR11":"FIIs Tijolo","CASA11":"FIIs Tijolo",
    "BLFT11":"FIIs Papel",
    // Alternativos (ouro, prata, câmbio, commodities, ilíquidos)
    "OURO11":"Alternativos","GOLB11":"Alternativos","GOLX11":"Alternativos","GLDI11":"Alternativos",
    "GLDX11":"Alternativos","AUPO11":"Alternativos","AURO11":"Alternativos","SLVR11":"Alternativos",
    "CORN11":"Alternativos","CMDB11":"Alternativos","DOLA11":"Alternativos","DOLB11":"Alternativos",
    "DOLX11":"Alternativos","PEVC11":"Alternativos","PIPE11":"Alternativos","TRIG11":"Alternativos",
    "PACB11":"Alternativos","PACC11":"Alternativos","PACG11":"Alternativos","PACL11":"Alternativos",
    "RICO11":"Alternativos",
    // Cripto
    "BITC11":"Cripto","BITI11":"Cripto","COIN11":"Cripto","CRPT11":"Cripto","DEFI11":"Cripto",
    "EBIT11":"Cripto","EETH11":"Cripto","ETHE11":"Cripto","ETHY11":"Cripto","FOMO11":"Cripto",
    "GBIT11":"Cripto","GBTC11":"Cripto","HODL11":"Cripto","NBIT11":"Cripto","QETH11":"Cripto",
    "WEB311":"Cripto","XBIT11":"Cripto","XETH11":"Cripto",
    // Índices puros presentes na base
    "SMLL":"Mid/Small Caps","IDIV":"Dividendos"
  };

  /* Padrões de ticker, aplicados depois do curado. */
  var RE_BDR = /(34|35|39)$/;
  var RE_ACAO_BR = /^[A-Z]{4}(3|4|5|6)$/;
  var RE_FII_LIKE = /^[A-Z0-9]{4}11$/;
  var RE_LETRAS = /^[A-Z]{1,5}$/;
  var RE_CRIPTO = /(BIT|BTC|ETH|HASH|CRPT|DEFI|HODL|WEB3|BKCH|COIN)/;

  function normalizarClasse(valor) {
    if (!valor) return null;
    if (CLASSES_SET[valor]) return valor;
    if (MAPA_CATEGORIA[valor]) return MAPA_CATEGORIA[valor];
    return null;
  }

  /* Taxa "0,19%" → 0.19 (número em % a.a.). Sem valor → null. */
  function parseTaxa(txt) {
    if (typeof txt === "number" && isFinite(txt)) return txt;
    if (!txt || typeof txt !== "string") return null;
    var limpo = txt.replace(/%/g, "").replace(/\s/g, "").replace(/\./g, "").replace(/,/g, ".");
    var n = parseFloat(limpo);
    return isFinite(n) ? n : null;
  }

  /* ---------------------------------------------------------------------------
     4. CONSTRUÇÃO (uma vez, memoizada)
     --------------------------------------------------------------------------- */
  var _indice = null;   // { ticker: registro }
  var _lista = null;    // array de registros
  var _busca = null;    // array { reg, chave } pré-calculado

  function fonteETFs() {
    try { return (typeof ETFs !== "undefined" && ETFs) ? ETFs : []; } catch (e) { return []; }
  }
  function fonteInfo() {
    try { return (typeof ETF_INFO !== "undefined" && ETF_INFO) ? ETF_INFO : {}; } catch (e) { return {}; }
  }
  function fonteGuia() {
    try { return (typeof ETF_GUIA !== "undefined" && ETF_GUIA) ? ETF_GUIA : {}; } catch (e) { return {}; }
  }

  function serieDe(ticker, dados) {
    if (!dados) return null;
    var buckets = ["etfs", "offshore", "fundos"];
    for (var i = 0; i < buckets.length; i++) {
      var b = dados[buckets[i]];
      if (b && b[ticker] && b[ticker].length) return b[ticker];
    }
    return null;
  }

  function dataDe(ponto) {
    if (!ponto) return null;
    return ponto.data || ponto.date || null;
  }

  // Janela de dados: o MANIFEST é a fonte preferida (é ele que audita a série);
  // sem manifest, cai na própria série de dados.js. null quando não há nenhuma.
  function janelaDe(ticker, serie) {
    var man = (typeof window !== "undefined" && window.MANIFEST) ? window.MANIFEST : null;
    var m = (man && man.porTicker) ? man.porTicker[ticker] : null;
    if (m && (m.primeira || m.ultima)) {
      return {
        primeira: m.primeira || null,
        ultima: m.ultima || null,
        pontos: (typeof m.pontos === "number") ? m.pontos : null,
        fonte: "manifest"
      };
    }
    if (serie && serie.length) {
      return {
        primeira: dataDe(serie[0]),
        ultima: dataDe(serie[serie.length - 1]),
        pontos: serie.length,
        fonte: "serie"
      };
    }
    return null;
  }

  function qualidadeDe(ticker) {
    var man = (typeof window !== "undefined" && window.MANIFEST) ? window.MANIFEST : null;
    if (!man || !man.porTicker || !man.porTicker[ticker]) return null;
    var q = man.porTicker[ticker].qualidade;
    if (!q || typeof q.ok === "undefined") return null;
    return !!q.ok;
  }

  /* Classes do array ETFs que são guarda-chuva: quando o ETF_INFO conhece uma
     categoria mais específica dentro da mesma família, ela prevalece
     (ex.: DIVO11 "Ações BR" → "Dividendos"; SMAL11 "Ações BR" → "Mid/Small Caps"). */
  var CLASSES_GENERICAS = { "Ações BR": true, "FIIs Tijolo": true };
  var CLASSES_ESPECIFICAS = { "Dividendos": true, "Mid/Small Caps": true, "Setorial": true, "FIIs Papel": true };

  /* Cascata de classificação documentada no contrato. */
  function classificar(ticker, origem, baseETF, info) {
    // 1. classe declarada no array ETFs
    if (baseETF) {
      var c1 = normalizarClasse(baseETF.classe);
      if (c1) {
        if (CLASSES_GENERICAS[c1] && info) {
          var refino = normalizarClasse(info.categoria);
          if (refino && CLASSES_ESPECIFICAS[refino]) return refino;
        }
        return c1;
      }
    }
    // 2. containers de origem (offshore / fundos abertos)
    if (origem === "ucits") return "UCITS";
    if (origem === "offshore") return "Offshore US";
    if (origem === "fundo") return "Fundos Abertos";
    // 3. categoria do ETF_INFO
    if (info) {
      var c2 = normalizarClasse(info.categoria);
      if (c2) return c2;
    }
    // 4. curadoria por ticker B3
    if (B3_CURADO[ticker]) return B3_CURADO[ticker];
    // 5. padrão de ticker
    if (RE_BDR.test(ticker)) return "BDRs";
    if (RE_ACAO_BR.test(ticker)) return "Ações BR";
    if (RE_CRIPTO.test(ticker)) return "Cripto";
    if (ucitsMap[ticker]) return "UCITS";
    if (RE_LETRAS.test(ticker)) return "Offshore US";
    if (ticker.indexOf(" ") !== -1) return "Fundos Abertos";
    if (RE_FII_LIKE.test(ticker)) return "FIIs Tijolo";
    // 6. último recurso
    return NAO_CLASSIFICADO;
  }

  function custodiaDe(classe, origem, info) {
    if (info && info.custodia) {
      if (info.custodia === "B3") return "B3";
      if (info.custodia === "Irlanda" || info.custodia === "IE") return "IE";
      if (info.custodia === "US") return "US";
    }
    if (origem === "ucits") return "IE";
    if (origem === "offshore") return "US";
    if (origem === "fundo") return "CVM";
    return CUSTODIA_POR_CLASSE[classe] || "B3";
  }

  function moedaDe(custodia) {
    return (custodia === "US" || custodia === "IE") ? "USD" : "BRL";
  }

  function subclasseDe(ticker, origem, baseETF, info) {
    if (origem === "fundo") return fundoClasses[ticker] || "Fundo Aberto";
    if (origem === "ucits" && ucitsMap[ticker]) return ucitsMap[ticker].sub;
    if (origem === "offshore" && offMap[ticker]) return offMap[ticker];
    if (info && info.categoria) return info.categoria;
    if (baseETF && baseETF.classe) return baseETF.classe;
    return null;
  }

  /* Sufixo " (≈ A · B · C)" usado nas descrições do autocomplete. */
  function textoEquivalencias(ticker) {
    var eqs = equivalentesBrutos(ticker);
    if (!eqs.length) return "";
    return " (≈ " + eqs.slice(0, 3).join(" · ") + ")";
  }

  /* Descrição curta, no formato que o autocomplete atual já exibia. */
  function descricaoDe(ticker, origem, baseETF, info) {
    if (baseETF && baseETF.desc) return baseETF.desc;
    if (origem === "fundo") return (fundoClasses[ticker] || "Fundo Aberto") + " (CVM, come-cotas)";
    if (origem === "ucits") return "UCITS " + ((ucitsMap[ticker] && ucitsMap[ticker].sub) || "Offshore");
    if (origem === "offshore") return offMap[ticker] || "Offshore US";
    if (info && info.categoria) return info.categoria;
    return "B3";
  }

  function equivalentesBrutos(ticker) {
    var eq = eqMap[ticker];
    if (eq && eq.length) return eq.slice();
    if (ucitsMap[ticker] && ucitsMap[ticker].eq) return [ucitsMap[ticker].eq];
    return [];
  }

  // Atributos de risco/liquidez do ticker, herdados da classe (tabela ATRIBUTOS).
  function atributosDaClasse(classe) {
    var at = ATRIBUTOS[classe] || ATRIBUTOS[NAO_CLASSIFICADO];
    return {
      fatorRisco: at.fatorRisco,
      liquidezEfetiva: at.liquidezEfetiva,
      moedaExposicao: at.moeda,
      duration: at.duration
    };
  }

  function registrar(indice, ticker, origem, baseETF) {
    if (!ticker || indice[ticker]) return;
    var info = fonteInfo()[ticker] || null;
    var guia = fonteGuia()[ticker] || null;
    var classe = classificar(ticker, origem, baseETF, info);
    var custodia = custodiaDe(classe, origem, info);
    var serie = serieDe(ticker, (typeof window !== "undefined" ? window.DADOS : null));
    var janela = janelaDe(ticker, serie);
    var nome = (info && info.nome) || (baseETF && baseETF.nome) || ticker;
    var desc = descricaoDe(ticker, origem, baseETF, info);

    indice[ticker] = {
      ticker: ticker,
      nome: nome,
      classe: classe,
      subclasse: subclasseDe(ticker, origem, baseETF, info),
      custodia: custodia,
      moeda: moedaDe(custodia),
      gestora: (info && info.gestora) || null,
      taxa: parseTaxa(info && info.taxa),
      benchmark: (info && info.benchmark) || null,
      desc: desc,
      temSerie: !!serie,
      primeiraData: janela ? janela.primeira : null,
      ultimaData: janela ? janela.ultima : null,
      pontos: janela ? janela.pontos : null,
      janela: janela,
      risco: atributosDaClasse(classe),
      qualidadeOk: qualidadeDe(ticker),
      equivalentes: equivalentesBrutos(ticker),
      papel: (guia && guia.papel) || null,
      risco: (guia && guia.risco) || null,
      pitch: (guia && guia.pitch) || null,
      _origem: origem
    };
  }

  function construir() {
    var indice = {};
    var base = fonteETFs();
    var i;

    // 1. universo curado do array ETFs
    for (i = 0; i < base.length; i++) {
      registrar(indice, base[i].ticker, base[i].custodia === "OFFSHORE" ? "offshore" : "b3", base[i]);
    }

    var D = (typeof window !== "undefined" && window.DADOS) ? window.DADOS : null;
    if (D) {
      // 2. extras B3
      if (D.etfs) {
        var tb3 = Object.keys(D.etfs);
        for (i = 0; i < tb3.length; i++) registrar(indice, tb3[i], "b3", null);
      }
      // 3. extras offshore (UCITS x US)
      if (D.offshore) {
        var toff = Object.keys(D.offshore);
        for (i = 0; i < toff.length; i++) {
          registrar(indice, toff[i], ucitsMap[toff[i]] ? "ucits" : "offshore", null);
        }
      }
      // 4. fundos abertos CVM
      if (D.fundos) {
        var tf = Object.keys(D.fundos);
        for (i = 0; i < tf.length; i++) registrar(indice, tf[i], "fundo", null);
      }
    }

    _indice = indice;
    _lista = Object.keys(indice).map(function (t) { return indice[t]; });
    _busca = _lista.map(function (r) {
      return { reg: r, chave: (r.ticker + " " + (r.nome || "") + " " + (r.desc || "") + " " + (r.subclasse || "")).toLowerCase() };
    });
    return indice;
  }

  function garantir() {
    if (!_indice) construir();
    return _indice;
  }

  /* ---------------------------------------------------------------------------
     5. API PÚBLICA
     --------------------------------------------------------------------------- */
  var Catalogo = {
    get: function (ticker) {
      if (!ticker) return null;
      var ix = garantir();
      return ix[ticker] || ix[String(ticker).toUpperCase()] || null;
    },

    classeDe: function (ticker) {
      var reg = Catalogo.get(ticker);
      if (reg && reg.classe) return reg.classe;
      return NAO_CLASSIFICADO;
    },

    /* FICHA ESTÁVEL do ticker — o contrato documentado no topo do arquivo.
       Devolve sempre um objeto novo (ninguém muta o índice por engano) e null
       para ticker desconhecido. Campo sem fonte = null, nunca chute. */
    info: function (ticker) {
      var r = Catalogo.get(ticker);
      if (!r) return null;
      return {
        ticker: r.ticker,
        nome: r.nome || null,
        classe: r.classe,
        subclasse: r.subclasse || null,
        custodia: r.custodia || null,
        moeda: r.moeda || null,
        taxa: (typeof r.taxa === "number" && isFinite(r.taxa)) ? r.taxa : null,
        benchmark: r.benchmark || null,
        gestora: r.gestora || null,
        desc: r.desc || null,
        temSerie: !!r.temSerie,
        primeiraData: r.primeiraData || null,
        ultimaData: r.ultimaData || null,
        pontos: (typeof r.pontos === "number") ? r.pontos : null,
        qualidadeOk: (typeof r.qualidadeOk === "boolean") ? r.qualidadeOk : null,
        janela: r.janela ? {
          primeira: r.janela.primeira, ultima: r.janela.ultima,
          pontos: r.janela.pontos, fonte: r.janela.fonte
        } : null,
        risco: Catalogo.risco(r.ticker),
        simulavel: Catalogo.simulavel(r.ticker),
        equivalentes: r.equivalentes.slice(),
        papel: r.papel || null,
        riscoTexto: r.risco_texto || r.riscoTexto || null,
        pitch: r.pitch || null
      };
    },

    /* Janela de dados do ticker (do MANIFEST quando ele conhece o ticker). */
    janela: function (ticker) {
      var r = Catalogo.get(ticker);
      if (!r || !r.janela) return null;
      return {
        primeira: r.janela.primeira, ultima: r.janela.ultima,
        pontos: r.janela.pontos, fonte: r.janela.fonte
      };
    },

    /* Atributos de risco/liquidez do ticker (herdados da classe). */
    risco: function (ticker) {
      var r = Catalogo.get(ticker);
      return atributosDaClasse(r ? r.classe : NAO_CLASSIFICADO);
    },

    /* Dá para simular este ticker? "ok" = série auditada; "ressalva" = tem série
       mas o manifest apontou problema; "sem" = não há série. */
    simulavel: function (ticker) {
      var r = Catalogo.get(ticker);
      if (!r || !r.temSerie) {
        return { temSerie: false, qualidadeOk: null, nivel: "sem" };
      }
      var q = (typeof r.qualidadeOk === "boolean") ? r.qualidadeOk : null;
      return { temSerie: true, qualidadeOk: q, nivel: (q === false) ? "ressalva" : "ok" };
    },

    all: function () {
      garantir();
      return _lista.slice();
    },

    classes: function () { return CLASSES.slice(); },

    buscar: function (termo, filtroClasse) {
      garantir();
      var t = (termo || "").toString().trim().toLowerCase();
      var out = [];
      for (var i = 0; i < _busca.length; i++) {
        var item = _busca[i];
        if (filtroClasse && item.reg.classe !== filtroClasse) continue;
        if (t && item.chave.indexOf(t) === -1) continue;
        out.push(item.reg);
      }
      out.sort(function (a, b) {
        if (t) {
          var pa = a.ticker.toLowerCase().indexOf(t) === 0 ? 0 : 1;
          var pb = b.ticker.toLowerCase().indexOf(t) === 0 ? 0 : 1;
          if (pa !== pb) return pa - pb;
        }
        return a.ticker.localeCompare(b.ticker, "pt-BR");
      });
      return out;
    },

    equivalentes: function (ticker) {
      var reg = Catalogo.get(ticker);
      return reg ? reg.equivalentes.slice() : [];
    },

    /* Pares com exposição sobreposta dentro de uma lista de tickers. */
    sobreposicoes: function (tickers) {
      garantir();
      var lista = (tickers || []).filter(function (t) { return !!t; });
      var pares = [];
      for (var i = 0; i < lista.length; i++) {
        for (var j = i + 1; j < lista.length; j++) {
          var a = lista[i], b = lista[j];
          if (a === b) continue;
          var ra = Catalogo.get(a), rb = Catalogo.get(b);
          var eqA = Catalogo.equivalentes(a), eqB = Catalogo.equivalentes(b);
          var ligados = eqA.indexOf(b) !== -1 || eqB.indexOf(a) !== -1;
          var motivo = null;

          if (ligados) {
            var custA = ra ? ra.custodia : null, custB = rb ? rb.custodia : null;
            var ehFeeder = (custA === "B3" && (custB === "US" || custB === "IE")) ||
                           (custB === "B3" && (custA === "US" || custA === "IE"));
            if (ehFeeder) motivo = "feeder";
            else if (ucitsMap[a] && ucitsMap[b] && ucitsMap[a].eq && ucitsMap[a].eq === ucitsMap[b].eq) motivo = "mesmo fundo";
            else motivo = "mesmo índice";
          } else if (ucitsMap[a] && ucitsMap[b] && ucitsMap[a].eq && ucitsMap[a].eq === ucitsMap[b].eq) {
            motivo = "mesmo fundo";
          } else if (ra && rb && ra.benchmark && rb.benchmark && ra.benchmark === rb.benchmark) {
            motivo = "mesmo índice";
          }

          if (motivo) pares.push({ a: a, b: b, motivo: motivo });
        }
      }
      return pares;
    },

    atributos: function (classe) {
      var at = ATRIBUTOS[classe] || ATRIBUTOS[NAO_CLASSIFICADO];
      return { fatorRisco: at.fatorRisco, liquidezEfetiva: at.liquidezEfetiva, moeda: at.moeda, duration: at.duration };
    },

    /* Diagnóstico: contagem por classe (útil no console e nos testes). */
    resumo: function () {
      garantir();
      var out = {};
      for (var i = 0; i < _lista.length; i++) {
        out[_lista[i].classe] = (out[_lista[i].classe] || 0) + 1;
      }
      return out;
    },

    /* Reconstrói do zero (usado se os dados chegarem depois do boot). */
    reconstruir: function () {
      construir();
      publicarAllETFs();
      return _lista.length;
    }
  };

  /* ---------------------------------------------------------------------------
     6. COMPATIBILIDADE: window._allETFs no formato antigo
        (autocomplete atual em app-montagem.js ainda consome esta lista)
     --------------------------------------------------------------------------- */
  function publicarAllETFs() {
    if (typeof window === "undefined") return;
    window._allETFs = Catalogo.all().map(function (r) {
      var d = r.desc || "";
      if (d.indexOf("≈") === -1) d += textoEquivalencias(r.ticker);
      return {
        ticker: r.ticker,
        nome: r.nome,
        desc: d,
        classe: r.classe,
        custodia: (r.custodia === "US" || r.custodia === "IE") ? "OFFSHORE" : "BR"
      };
    });
    window._eqMap = eqMap;
  }

  if (typeof window !== "undefined") {
    window.Catalogo = Catalogo;
    try {
      construir();
      publicarAllETFs();
    } catch (e) {
      if (window.console && console.warn) console.warn("Catalogo: falha ao construir no boot", e);
    }
  }
})();
