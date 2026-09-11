// academia/js/app-programa.js — extraído de index.html (linhas 4047-4859 do monólito original)
function caseParaPitch() { return caseAtual || CASE_MODO_LIVRE; }
let chartMontagem = null;
let chartSua = null;
let chartGabarito = null;

// --- Modo de acesso (no AdvisorPro virá do login/role do Supabase) ---
// "MAP" e "FEA" são os dois tipos de acesso. FEA é o nivelamento pré-Beta;
// ambos consomem ESTA ferramenta (que treina a competência do nível Beta da MAP).
let modoAcesso = "MAP"; // "MAP" | "FEA"

/* =================================================================================
   PROGRAMA_CONFIG — CONFIGURAÇÃO PARAMETRIZÁVEL DO PROGRAMA
   =================================================================================
   Tudo que é específico de um programa/curso/mentoria vive AQUI.
   Para adaptar o simulador a outro programa (outra mentoria, outro curso),
   basta trocar este objeto — NADA é hard-coded no resto do código.

   NOTA PARA O ADVISORPRO (Lovable):
   No AdvisorPro, este objeto NÃO deve ficar no front. Ele deve vir do Supabase,
   de uma tabela tipo `programas` / `program_configs`, permitindo que o admin
   crie e edite programas pela interface — MAP, FEA, ou qualquer curso futuro —
   sem mexer em código. Cada programa tem: marca, níveis/trilhas, missões,
   textos de interface, regras de acesso. O front apenas CONSOME o config.
   A estrutura abaixo é o "schema" sugerido para essa tabela.
   ================================================================================= */
const PROGRAMA_CONFIG = {
  // ---- Identificação do programa ----
  id: "map",
  nome: "MAP",
  nomeCompleto: "Mentoria Advisor Pro",
  marca: {
    escola: "VocêBancário",
    arroba: "@vocebancario",
    submarca: "Academia do Assessor",
    nivelamento: "FEA", // o nivelamento obrigatório dentro da MAP
    // Logos dos produtos (claro/escuro). Padrão de URL do site:
    // https://vocebancario.com.br/wp-content/uploads/2026/05/logo-q-prod-{produto}-f-{tema}.{ext}
    //
    // NOTA: hoje os arquivos .png estão no servidor (testado, 200 OK).
    // Os .webp ainda NÃO estão publicados (404 em 14/05/2026).
    // Quando subir os .webp, basta trocar logoExt para "webp" — nada mais muda.
    logoBaseUrl: "https://vocebancario.com.br/wp-content/uploads/2026/05/",
    logoExt: "png", // trocar para "webp" quando os arquivos .webp estiverem no servidor
    logosProdutos: ["fea", "map", "ibankers"], // ibankers registrado, sem uso na UI ainda
    // logos[produto][tema] é montado dinamicamente por montarLogos() a partir do acima
    logos: {}
  },

  // ---- Textos de interface (tudo que menciona o programa) ----
  // Reposicionamento: esta ferramenta é de nível BETA.
  //  - Para o membro FEA, ela é a ferramenta PRINCIPAL (o destino do produto dele).
  //  - Para o aluno MAP, ela é UM NÍVEL (o Beta) — o começo de uma jornada de 6.
  textos: {
    tituloPagina: "AIDA Allocation — Simulador de Macroalocação · FEA / MAP®",
    heroSubtitulo: "15 cases reais para você treinar diagnóstico, montagem de carteira e justificativa técnica. A ferramenta principal do FEA e o nível Beta da jornada MAP®.",
    rodapeIniciativa: "Uma iniciativa <strong>@vocebancario</strong> · Academia do Assessor",
    rodapeConteudo: "Nível Beta · FEA / MAP®",
    bannerNivelamento: "Você está no <strong>Modo FEA</strong> — esta é a sua ferramenta principal de formação em macroalocação. Recursos marcados são exclusivos da Mentoria MAP®.",
    badgeExclusivo: "Exclusivo Mentoria MAP®",
    ctaUpgrade: "Quero fazer parte da MAP®",
    ctaUpgradeAlerta: "No AdvisorPro este botão levará o membro FEA para a página de upgrade da Mentoria MAP®.\n\n(Protótipo: ação simulada)",
    trilhaTitulo: "Onde esta ferramenta se encaixa",
    trilhaLegenda: "FEA (nivelamento) + 6 níveis de maturidade · Beta → Athos",
    trilhaCta: "Este simulador treina o <strong>nível Beta</strong>: montar carteira com ETFs e vender a tese. Para o membro <strong>FEA</strong>, é a ferramenta principal da sua formação. Para o aluno <strong>MAP</strong>, é o primeiro de seis níveis — os próximos destravam ativos individuais, fundos, previdência e geração de alfa.",
    programaPadraoMAP: "MAP®",
    programaPadraoFEA: "FEA"
  },

  // ---- Níveis / trilhas do programa ----
  // 'tipo' distingue: "nivelamento" (curso gravado, obrigatório a todos) vs
  // "maturidade" (as 6 trilhas da MAP, com sabatina prática).
  // 'disponivel: true' = fase/nível que ESTA ferramenta treina.
  // Os demais são vitrine (cards com cadeado) neste protótipo.
  // Fonte: ROTEIRO-TRILHAS-MAP (6 trilhas, 30 missões, 30 semanas).
  niveis: [
    { id: "fea", nome: "FEA", num: 0, disponivel: true,
      tipo: "nivelamento",
      tituloCard: "Nivelamento Essencial",
      foco: "Fundamentos: curso gravado obrigatório",
      desc: "Curso gravado de nivelamento — base obrigatória para membros FEA, iBankers e MAP.",
      ferramenta: "Este simulador é a ferramenta principal da formação FEA.",
      tooltip: "O FEA é um curso gravado de nivelamento, obrigatório para todos: membros FEA, iBankers e quem está na MAP. Este simulador é a ferramenta principal da formação do membro FEA.",
      logoKey: "fea",
      duracao: "Curso gravado" },
    { id: "beta",   nome: "Beta Advisor",   num: 1, disponivel: true,
      tipo: "maturidade",
      foco: "Macro alocação + pitch pessoal + ETFs",
      desc: "Sabe se vender, entende macro básico, monta carteira passiva com ETFs.",
      ferramenta: "É o nível que você treina aqui no AIDA Allocation.",
      tooltip: "Primeiro nível de maturidade da MAP. Para o aluno MAP, este simulador é o nível Beta — o começo da jornada. Diferente do FEA (gravado), o Beta tem sabatina prática: avaliação ao vivo da sua capacidade de montar e defender carteira.",
      duracao: "5 semanas" },
    { id: "gama",   nome: "Gama",   num: 2, disponivel: false,
      tipo: "maturidade",
      foco: "Produtos específicos (RF, crédito privado, COE)",
      desc: "Adiciona ativos individuais: títulos públicos, crédito privado, COE.",
      ferramenta: "Casos e ferramentas próprias na Mentoria MAP®.",
      duracao: "5 semanas" },
    { id: "delta",  nome: "Delta",  num: 3, disponivel: false,
      tipo: "maturidade",
      foco: "Fundos abertos + previdência",
      desc: "Explora ativos de maior risco via fundos de investimento e previdência.",
      ferramenta: "Casos e ferramentas próprias na Mentoria MAP®.",
      duracao: "5 semanas" },
    { id: "alfa",   nome: "Alfa",   num: 4, disponivel: false,
      tipo: "maturidade",
      foco: "Renda variável (fundos de ações, ações, FIIs, Fiagros)",
      desc: "Domina renda variável, busca geração de alfa com diferentes riscos.",
      ferramenta: "Casos e ferramentas próprias na Mentoria MAP®.",
      duracao: "5 semanas" },
    { id: "legacy", nome: "Legacy", num: 5, disponivel: false,
      tipo: "maturidade",
      foco: "Alternativos (derivativos, estruturadas, FIPs, PE, VC)",
      desc: "Entra no universo de produtos sofisticados e vira referência.",
      ferramenta: "Casos e ferramentas próprias na Mentoria MAP®.",
      duracao: "5 semanas" },
    { id: "athos",  nome: "Athos Advisor", num: 6, disponivel: false,
      tipo: "maturidade",
      foco: "Capstone: tributação, planejamento sucessório, banca final",
      desc: "Advisor completo: atendimento 360°, integra tudo, opera como mentor.",
      ferramenta: "Nível máximo da jornada MAP® — graduação.",
      duracao: "5 semanas" }
  ],

  // ---- Missões do nível que esta ferramenta treina (Beta) ----
  // Fonte: ROTEIRO-TRILHAS-MAP, Trilha 1 (Beta). Esta ferramenta cobre
  // especialmente as missões 3, 4 e 5 (classes de ativos e carteira de ETFs).
  // Por ora é REFERÊNCIA/metadado — não altera o fluxo do simulador.
  // No AdvisorPro, pode-se organizar os casos por missão e usar estes
  // critérios oficiais na rubrica de avaliação.
  missoesNivelAtivo: {
    nivelId: "beta",
    missoes: [
      { num: 1, nome: "Pitch Pessoal",
        resumo: "Quem sou → O que faço → Por que faço → Como faço.",
        criterios: ["Clareza e objetividade", "Postura e segurança na fala", "Uso das técnicas ensinadas", "Capacidade de se diferenciar"],
        coberturaSimulador: "parcial" },
      { num: 2, nome: "Marcar a Reunião (AIDA + Cold Call)",
        resumo: "Aplicar AIDA para converter lead ou giro de carteira em reunião.",
        criterios: ["Aplicação correta do AIDA", "Gerar urgência sem ser apelativo", "Tom profissional e seguro", "Conduziu para o agendamento?"],
        coberturaSimulador: "nenhuma" },
      { num: 3, nome: "Classes de Ativos e Alocação",
        resumo: "Apresentar classes de ativos e defender alocação por classe.",
        criterios: ["Domínio das classes de ativos", "Explicar o porquê de cada classe", "Contextualização com cenário macro", "Linguagem acessível"],
        coberturaSimulador: "total" },
      { num: 4, nome: "Carteira de ETFs (Parte 1)",
        resumo: "Montar carteira usando ETFs como veículo, com reserva de emergência.",
        criterios: ["Coerência com perfil do cliente", "Diversificação via ETFs", "Defesa de cada escolha", "Cenário macro como pano de fundo"],
        coberturaSimulador: "total" },
      { num: 5, nome: "Carteira de ETFs (Parte 2) + Alocação Global",
        resumo: "Segunda carteira incluindo ETF internacional; defender alocação global.",
        criterios: ["Tudo da Missão 4", "Defesa da alocação internacional", "Conhecimento do ETF internacional", "Visão global vs. home bias"],
        coberturaSimulador: "total" }
    ]
  },

  // ---- Regras de acesso (gating) ----
  // Quais "módulos" são exclusivos do programa principal (não do nivelamento).
  acesso: {
    // No protótipo, o modo "MAP" vê tudo; o modo "FEA" vê preview travado destes.
    exclusivosProgramaPrincipal: ["ia-cenario", "ia-pitch", "apresentacao-obrigatoria"]
  }
};

// Compat: parte do código já referencia NIVEIS_MAP. Mantém como alias do config.
const NIVEIS_MAP = PROGRAMA_CONFIG.niveis;


// --- Cenário: modo e conteúdo editável ---
let cenarioModo = "case"; // "case" (original do case) | "atual" (colado) | "ia" (travado)
let cenarioEditado = ""; // texto quando o aluno cola o cenário atual

// --- Identidade do aluno (no AdvisorPro virá do perfil do Supabase) ---
let alunoIdentidade = {
  nome: "",
  arroba: "",
  programa: "MAP®",
  fotoUrl: "",
  mostrarFoto: true,
  mostrarArroba: true,
  mostrarPrograma: true
};

// --- Slides (Tela 6) ---
let slideAtual = 0;
let totalSlides = 0;
let temaApresentacao = "claro"; // "claro" | "escuro" — salvo, independente do tema do app
let emModoApresentacao = false;

/* =================================================================================
   ÍCONES — SVG de traço 16px em currentColor (substituem os emojis das telas 1 e 2)
   ---------------------------------------------------------------------------------
   Um só desenho por conceito, herdando cor e tamanho do texto ao redor.
   ================================================================================= */
var PROG_ICONES = {
  bussola: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8z"/>',
  cadeado: '<rect x="4.5" y="10.5" width="15" height="9.5" rx="2"/><path d="M8.5 10.5V7.8a3.5 3.5 0 0 1 7 0v2.7"/>',
  alvo: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none"/>',
  lampada: '<path d="M9.5 17.5h5"/><path d="M10 20.5h4"/><path d="M12 3.5a5.5 5.5 0 0 1 3.4 9.8c-.6.5-.9 1.1-.9 1.8v.4h-5v-.4c0-.7-.3-1.3-.9-1.8A5.5 5.5 0 0 1 12 3.5Z"/>',
  circulo: '<circle cx="12" cy="12" r="8.5"/>',
  relogio: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 1.8"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="m8.2 12.3 2.6 2.6 5-5.4"/>',
  grafico: '<path d="M4.5 4.5v15h15"/><path d="m8 15 3.2-3.8 2.6 2.2L19 8"/>',
  frasco: '<path d="M10 3.5h4"/><path d="M10.8 3.5v5.2L5.9 17a2 2 0 0 0 1.7 3h8.8a2 2 0 0 0 1.7-3l-4.9-8.3V3.5"/><path d="M8 14.5h8"/>'
};
function svgIcone(nome, classe) {
  var d = PROG_ICONES[nome];
  if (!d) return "";
  return '<svg class="ico' + (classe ? " " + classe : "") + '" width="16" height="16" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
    'aria-hidden="true" focusable="false">' + d + '</svg>';
}

/* =================================================================================
   MODO DE ACESSO — MAP / FEA + GATING
   ================================================================================= */
/* CARTEIRA-06 — todas as chaves deste arquivo vivem sob simulathos:academia:.
   A leitura cai na chave legada "aida_vo4_<chave>" quando a nova ainda não existe
   (migração silenciosa de quem já usava o simulador), e a legada é apagada na
   primeira escrita para não sobrar chave solta fora do namespace. */
function progStorageGet(chave) {
  if (window.Simulathos && Simulathos.storage && typeof Simulathos.storage.get === "function") {
    return Simulathos.storage.get("academia", chave);
  }
  try { return localStorage.getItem("aida_vo4_" + chave); } catch (e) { return null; }
}
function progStorageSet(chave, valor) {
  try { localStorage.removeItem("aida_vo4_" + chave); } catch (e) { /* storage bloqueado */ }
  if (window.Simulathos && Simulathos.storage && typeof Simulathos.storage.set === "function") {
    return Simulathos.storage.set("academia", chave, valor);
  }
  try { localStorage.setItem("simulathos:academia:" + chave, String(valor)); return true; }
  catch (e) { return false; }
}

function trocarModo(modo) {
  modoAcesso = modo;
  progStorageSet("modo", modo);

  document.querySelectorAll(".modo-opt").forEach(b => {
    b.classList.toggle("active", b.dataset.modo === modo);
  });

  const banner = document.getElementById("modo-banner");
  if (modo === "FEA") {
    banner.className = "modo-banner fea";
    banner.innerHTML = PROGRAMA_CONFIG.textos.bannerNivelamento;
  } else {
    banner.className = "modo-banner";
    banner.innerHTML = "";
  }

  // Filtro interno de "origem entrevista" só aparece no modo MAP (é ferramenta da mentoria)
  const filtroEntrevista = document.getElementById("filtro-grupo-entrevista");
  if (filtroEntrevista) {
    filtroEntrevista.style.display = (modo === "MAP") ? "flex" : "none";
  }

  // Re-renderiza telas que dependem do modo, se estiverem ativas
  if (caseAtual) {
    if (document.getElementById("tela5").classList.contains("ativo")) renderEtapasPitch();
    if (document.getElementById("tela6").classList.contains("ativo")) renderTela6();
  }
  // Grid sempre re-renderiza (filtro de entrevista muda com o modo)
  if (document.getElementById("tela1").classList.contains("ativo")) {
    renderGrid();
  }
}

// Helper: módulo bloqueado para o nivelamento (FEA)?
function moduloBloqueadoFEA(nomeModulo) {
  // Módulos exclusivos do programa principal. O nivelamento vê preview travado.
  const exclusivos = PROGRAMA_CONFIG.acesso.exclusivosProgramaPrincipal;
  return modoAcesso === "FEA" && exclusivos.includes(nomeModulo);
}

// Helper: gera HTML de um módulo travado com preview borrado
function htmlModuloTravado(tituloModulo, descricao, previewHtml) {
  return `
    <div class="locked-module">
      <div class="locked-preview">${previewHtml || ""}</div>
      <div class="locked-overlay">
        <div class="lock-icon">${svgIcone("cadeado")}</div>
        <span class="locked-badge">${PROGRAMA_CONFIG.textos.badgeExclusivo}</span>
        <h3>${tituloModulo}</h3>
        <p>${descricao}</p>
        <button class="primary" onclick="ctaUpgrade()">${PROGRAMA_CONFIG.textos.ctaUpgrade}</button>
      </div>
    </div>
  `;
}

function ctaUpgrade() {
  alert(PROGRAMA_CONFIG.textos.ctaUpgradeAlerta);
}

/* =================================================================================
   TRILHA DE NÍVEIS — vitrine na tela inicial
   O nível com 'disponivel: true' é o que ESTA ferramenta treina. Os demais são
   cosméticos (cards com cadeado) — o "fominho" para o aluno querer evoluir.
   Tudo vem do PROGRAMA_CONFIG — trocar de programa = trocar o config.
   ================================================================================= */
function renderTrilhaNiveis() {
  const cont = document.getElementById("trilha-niveis");
  if (!cont) return;

  // Tema atual define qual variante de logo usar
  const temaEscuro = document.body.classList.contains("dark");
  const logos = PROGRAMA_CONFIG.marca.logos;

  const cards = PROGRAMA_CONFIG.niveis.map(nivel => {
    // ---- FASE DE NIVELAMENTO (FEA) — visual distinto ----
    if (nivel.tipo === "nivelamento") {
      const logoUrl = nivel.logoKey && logos[nivel.logoKey]
        ? (temaEscuro ? logos[nivel.logoKey].escuro : logos[nivel.logoKey].claro)
        : null;
      const logoHtml = logoUrl
        ? `<img src="${logoUrl}" class="nivel-logo" alt="${nivel.nome}" onerror="this.style.display='none'"/>`
        : "";
      const tipHtml = nivel.tooltip
        ? `<span class="info-tip" data-tip="${nivel.tooltip.replace(/"/g, '&quot;')}"></span>`
        : "";
      return `
        <div class="nivel-card nivelamento" title="${nivel.desc}">
          <div class="nivel-card-topo">
            <span class="nivel-selo">Nivelamento obrigatório${tipHtml}</span>
          </div>
          ${logoHtml}
          <div class="nivel-nome">${nivel.tituloCard || nivel.nome}</div>
          <div class="nivel-desc">${nivel.desc}</div>
          <span class="nivel-badge nivelamento-badge">Base de todos</span>
        </div>
      `;
    }

    // ---- NÍVEIS DE MATURIDADE (Beta → Athos) ----
    const tipHtml = nivel.tooltip
      ? `<span class="info-tip" data-tip="${nivel.tooltip.replace(/"/g, '&quot;')}"></span>`
      : "";
    if (nivel.disponivel) {
      return `
        <div class="nivel-card disponivel" title="${nivel.desc}">
          <div class="nivel-card-topo">
            <span class="nivel-num">NÍVEL ${nivel.num}</span>
            <span class="nivel-status-icon">${svgIcone("alvo")}</span>
          </div>
          <div class="nivel-nome">${nivel.nome}${tipHtml}</div>
          <div class="nivel-desc">${nivel.desc}</div>
          <span class="nivel-badge aqui">Você está aqui</span>
        </div>
      `;
    }
    return `
      <div class="nivel-card travado" title="${nivel.desc} — ${nivel.ferramenta}">
        <div class="nivel-card-topo">
          <span class="nivel-num">NÍVEL ${nivel.num}</span>
          <span class="nivel-status-icon">${svgIcone("cadeado")}</span>
        </div>
        <div class="nivel-nome">${nivel.nome}</div>
        <div class="nivel-desc">${nivel.desc}</div>
        <span class="nivel-badge bloqueado">Próximos passos</span>
      </div>
    `;
  }).join("");

  cont.innerHTML = `
    <div class="trilha-header">
      <h5>${svgIcone("bussola")} ${PROGRAMA_CONFIG.textos.trilhaTitulo}</h5>
      <span class="trilha-legenda">${PROGRAMA_CONFIG.textos.trilhaLegenda}</span>
    </div>
    <div class="trilha-track">${cards}</div>
    <div class="trilha-cta">${PROGRAMA_CONFIG.textos.trilhaCta}</div>
  `;
}

/* =================================================================================
   CENÁRIO — 3 MODOS: original do case / atual (colado) / IA (travado)
   ================================================================================= */
// Retorna o texto de cenário que está ativo no momento
function getCenarioAtivo() {
  if (cenarioModo === "atual" && cenarioEditado.trim()) {
    return cenarioEditado.trim();
  }
  return caseAtual ? caseAtual.macro : "";
}

// Indica se o cenário foi editado pelo aluno
function cenarioFoiEditado() {
  return cenarioModo === "atual" && cenarioEditado.trim().length > 0;
}

function selecionarCenarioModo(modo) {
  // Modo IA é travado para FEA e ainda não funcional (vitrine)
  if (modo === "ia") {
    cenarioModo = "ia";
  } else {
    cenarioModo = modo;
  }
  renderCenarioEditor();
}

function renderCenarioEditor() {
  const cont = document.getElementById("cenario-editor-area");
  if (!cont) return;

  // Atualiza botões ativos
  document.querySelectorAll(".cenario-modo-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.cmodo === cenarioModo);
  });

  if (cenarioModo === "case") {
    cont.innerHTML = `
      <div class="cenario-display">
        ${caseAtual.macro}
      </div>
      <p style="font-size:12px; color:var(--text-soft); margin-top:8px;">
        Este é o cenário pré-definido do case. Treine a resolver com ele —
        ou troque para "Cenário atual" e cole a conjuntura de hoje.
      </p>
    `;
  }
  else if (cenarioModo === "atual") {
    cont.innerHTML = `
      <div class="cenario-editor">
        <textarea id="cenario-textarea" placeholder="Cole ou escreva o cenário macroeconômico atual: Selic, IPCA, câmbio, conflitos geopolíticos, ano eleitoral, etc. O simulador usará este cenário no lugar do original do case."
          oninput="atualizarCenarioEditado(this.value)">${cenarioEditado}</textarea>
        <p style="font-size:12px; color:var(--text-soft); margin-top:6px;">
          ${svgIcone("lampada")} Mantenha sua apresentação sempre atualizada — o cenário muda, o treino acompanha.
        </p>
      </div>
    `;
  }
  else if (cenarioModo === "ia") {
    // Vitrine travada — mostra preview do que a IA faria
    const previewIA = `
      <div class="cenario-display">
        <strong>Cenário gerado por IA (exemplo):</strong><br/>
        "Selic a 9,25% em trajetória estável após ciclo de cortes. IPCA ancorado em 3,8%,
        dentro da meta. Real apreciado a R$ 5,10 com fluxo estrangeiro positivo.
        Treasuries de 10 anos a 4,1%. Cenário externo construtivo, sem grandes
        choques geopolíticos no radar de curto prazo..."
      </div>
    `;
    cont.innerHTML = htmlModuloTravado(
      "Geração de cenário por IA",
      "A IA monta cenários macro realistas e variados automaticamente, para você treinar em qualquer conjuntura sem depender de cenário pré-definido. Exclusivo da Mentoria MAP®.",
      previewIA
    );
  }
}

function atualizarCenarioEditado(valor) {
  cenarioEditado = valor;
}

/* =================================================================================
   ANALYTICS LOCAL
   ================================================================================= */
function lerAnalytics() {
  var raw = progStorageGet("analytics");
  if (!raw) return { tentativas: {}, scores: [], cases: {} };
  try { return JSON.parse(raw); } catch (e) { return { tentativas: {}, scores: [], cases: {} }; }
}
function salvarAnalytics(a) {
  progStorageSet("analytics", JSON.stringify(a));
}
/* ACADEMIA-10 — o progresso passa a ser guardado por case:
   { tentativas, melhorScore, ultimoScore, ultimaData }. Abrir o briefing NÃO conta
   tentativa: só a submissão conta, e por isso registrarTentativa exige o segundo
   argumento "submit". */
function normalizarAnalytics(a) {
  if (!a || typeof a !== "object") a = {};
  if (!a.tentativas || typeof a.tentativas !== "object") a.tentativas = {};
  if (!Array.isArray(a.scores)) a.scores = [];
  if (!a.cases || typeof a.cases !== "object") a.cases = {};
  return a;
}
function registroDoCase(a, caseId) {
  const chave = String(caseId);
  if (!a.cases[chave]) {
    a.cases[chave] = { tentativas: 0, melhorScore: null, ultimoScore: null, ultimaData: null };
  }
  return a.cases[chave];
}
function rotuloTentativas(n) {
  return n === 1 ? "1 tentativa" : n + " tentativas";
}
function estadoDoCase(caseId, analytics) {
  const a = normalizarAnalytics(analytics || lerAnalytics());
  const chave = String(caseId);
  const reg = a.cases[chave];
  if (!reg || !reg.tentativas) {
    return { situacao: "nao-iniciado", rotulo: "Não iniciado", melhorScore: null, tentativas: 0 };
  }
  // O card mostra sempre as três informações: situação, melhor score e tentativas.
  const melhor = (reg.melhorScore === null || reg.melhorScore === undefined)
    ? null : reg.melhorScore;
  const partes = [melhor !== null ? "melhor " + melhor + "/100" : "sem score", rotuloTentativas(reg.tentativas)];
  if (melhor !== null && melhor >= 70) {
    return { situacao: "concluido", rotulo: "Concluído · " + partes.join(" · "), melhorScore: melhor, tentativas: reg.tentativas };
  }
  return {
    situacao: "em-progresso",
    rotulo: "Em progresso · " + partes.join(" · "),
    melhorScore: melhor,
    tentativas: reg.tentativas
  };
}

function registrarTentativa(caseId, origem) {
  // Só conta quando a proposta é submetida (ACADEMIA-10). Abrir o briefing não conta.
  if (origem !== "submit") return;
  if (caseId === null || caseId === undefined) return;
  const a = normalizarAnalytics(lerAnalytics());
  a.tentativas[caseId] = (a.tentativas[caseId] || 0) + 1;
  const reg = registroDoCase(a, caseId);
  reg.tentativas += 1;
  reg.ultimaData = new Date().toISOString();
  salvarAnalytics(a);
  atualizarStatsHome();
}
function registrarScore(caseId, score) {
  if (caseId === null || caseId === undefined) return;
  const a = normalizarAnalytics(lerAnalytics());
  a.scores.push({ caseId, score, ts: Date.now() });
  const reg = registroDoCase(a, caseId);
  // A tentativa já foi contada por calcularScore; se não foi (chamada direta), conta aqui.
  if (!reg.tentativas) {
    reg.tentativas = 1;
    a.tentativas[caseId] = (a.tentativas[caseId] || 0) + 1;
  }
  reg.ultimoScore = score;
  reg.melhorScore = (reg.melhorScore === null || reg.melhorScore === undefined)
    ? score : Math.max(reg.melhorScore, score);
  reg.ultimaData = new Date().toISOString();
  salvarAnalytics(a);
  atualizarStatsHome();
  // Atualiza a faixa de estado nos cards da tela 1.
  if (typeof document !== "undefined" && document.getElementById("grid-cases")) renderGrid();
}
function atualizarStatsHome() {
  const a = normalizarAnalytics(lerAnalytics());
  const ids = Object.keys(a.cases);
  const tentados = ids.filter(id => (a.cases[id].tentativas || 0) > 0).length;
  const scores = a.scores.map(s => s.score).filter(v => typeof v === "number");
  const media = scores.length ? Math.round(scores.reduce((x, y) => x + y, 0) / scores.length) : null;
  const melhor = scores.length ? Math.max(...scores) : null;

  const elTentados = document.getElementById("stat-tentados");
  const elMedia = document.getElementById("stat-media");
  const elMelhor = document.getElementById("stat-melhor");
  if (elTentados) elTentados.textContent = tentados;
  if (elMedia) elMedia.textContent = media !== null ? media : "-";
  if (elMelhor) elMelhor.textContent = melhor !== null ? melhor : "-";
}

/* =================================================================================
   TELA 1 — Grid de Cases
   ================================================================================= */
function renderGrid() {
  const grid = document.getElementById("grid-cases");
  const fCiclo = document.getElementById("filtro-ciclo").value;
  const fPerfil = document.getElementById("filtro-perfil").value;
  const fPatrim = document.getElementById("filtro-patrim").value;
  const fCustodia = document.getElementById("filtro-custodia").value;
  const fEntrevista = document.getElementById("filtro-entrevista").value;

  const filtrados = CASES.filter(c => {
    if (fCiclo && c.ciclo !== fCiclo) return false;
    if (fPerfil && c.perfil !== fPerfil) return false;
    if (fPatrim && c.patrimonio !== fPatrim) return false;
    if (fCustodia && c.custodia !== fCustodia) return false;
    // Filtro interno de entrevista — só funciona no modo MAP
    if (modoAcesso === "MAP" && fEntrevista === "sim" && !c._entrevista) return false;
    if (modoAcesso === "MAP" && fEntrevista === "nao" && c._entrevista) return false;
    return true;
  });

  grid.innerHTML = "";
  if (filtrados.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--text-soft);">Nenhum case com esses filtros. Tente combinar diferente.</div>`;
    return;
  }

  // ACADEMIA-10 — lê o progresso uma única vez para todos os cards.
  const analytics = normalizarAnalytics(lerAnalytics());

  filtrados.forEach(c => {
    const card = document.createElement("div");
    card.className = "case-card";
    card.dataset.ciclo = c.ciclo;
    card.onclick = () => abrirCase(c.id);

    const estado = estadoDoCase(c.id, analytics);
    card.dataset.estado = estado.situacao;

    const tagsHtml = `
      <span class="tag perfil-${c.perfil.slice(0,5)}">${c.perfil}</span>
      <span class="tag">${labelCiclo(c.ciclo)}</span>
      <span class="tag">${labelPatrim(c.patrimonio)}</span>
      <span class="tag">${c.custodia === "OFFSHORE" ? "Offshore" : "Brasil"}</span>
    `;

    card.innerHTML = `
      <div class="case-numero">CASE ${String(c.id).padStart(2,'0')}</div>
      <div class="case-titulo">${c.titulo}</div>
      <div class="case-meta">${tagsHtml}</div>
      <div class="case-resumo">${c.resumo}</div>
      <div class="case-estado estado-${estado.situacao}"><span class="tag">${svgIcone(iconeEstadoCase(estado.situacao))} ${estado.rotulo}</span></div>
      <div class="case-cta">${estado.situacao === "nao-iniciado" ? "Abrir briefing →" : "Refazer o case →"}</div>
    `;
    grid.appendChild(card);
  });

  // CARTEIRA-05 — a tela 1 é o único lugar onde a carteira recebida por link pode
  // se anunciar; sem isso o #c= da URL fica calculado e nunca é consumido.
  renderAvisoCarteiraDoLink();
}
function iconeEstadoCase(situacao) {
  if (situacao === "concluido") return "check";
  if (situacao === "em-progresso") return "relogio";
  return "circulo";
}
function filtrarCases() { renderGrid(); }
function labelCiclo(c) {
  return { "alta-selic": "Selic alta", "queda-selic": "Selic em queda", "crise": "Crise", "estavel": "Estável" }[c] || c;
}
function labelPatrim(p) {
  return { "baixo": "Até R$250k", "medio": "R$250k–1MM", "alto": ">R$1MM" }[p] || p;
}

/* =================================================================================
   TELA 2 — Briefing
   ================================================================================= */
function iniciarModoLivre() {
  modoLivre = true;
  caseAtual = null;
  // CARTEIRA-01 — não zera nada aqui: quem decide entre rascunho salvo e três
  // linhas vazias é irTela3(). Antes esta função sobrescrevia o rascunho.
  montagemAtual = [];
  document.getElementById("aporte").value = 100000;
  document.getElementById("montagem-titulo").textContent = "Modo Livre — Monte sua carteira";
  document.getElementById("montagem-subtitulo").textContent = "Escolha ETFs da lista ou digite qualquer ticker. A simulação roda com dados históricos reais.";
  var infoLivre = document.getElementById("modo-livre-info");
  if (infoLivre) infoLivre.hidden = true;   // o card "Modo Case" já explica o contexto
  var cardCase = document.getElementById("btn-modo-case");
  if (cardCase) cardCase.hidden = false;    // no Livre, oferecemos o treino
  document.getElementById("btn-voltar-briefing").style.display = "none";
  document.getElementById("btn-submeter").textContent = "Simular →";
  // irTela3() é o único lugar que restaura rascunho (localStorage + hash #c=).
  irTela3();
}

function abrirCase(id) {
  caseAtual = CASES.find(c => c.id === id);
  if (!caseAtual) return;
  modoLivre = false;
  // CARTEIRA-03 — a carteira do case anterior não pode vazar para este case.
  // Zera aqui; irTela3() decide entre o rascunho DESTE case e três linhas vazias.
  montagemAtual = [];
  document.getElementById("btn-voltar-briefing").style.display = "";
  document.getElementById("btn-submeter").textContent = "Submeter proposta para avaliação →";
  var infoLivreCase = document.getElementById("modo-livre-info");
  if (infoLivreCase) infoLivreCase.hidden = true;
  var cardCaseAtivo = document.getElementById("btn-modo-case");
  if (cardCaseAtivo) cardCaseAtivo.hidden = true;  // já estamos num case: o caminho de volta é o stepper
  document.getElementById("montagem-subtitulo").textContent = "Selecione os ETFs e defina os percentuais. A lista é fechada por ETFs adequados ao mercado brasileiro e/ou offshore.";
  registrarTentativa(id);

  document.getElementById("brief-numero").textContent = `CASE ${String(caseAtual.id).padStart(2,'0')}`;
  document.getElementById("brief-titulo").textContent = caseAtual.titulo;
  document.getElementById("brief-cliente").innerHTML = `<p>${caseAtual.cliente}</p>`;

  document.getElementById("brief-tags").innerHTML = `
    <span class="tag perfil-${caseAtual.perfil.slice(0,5)}">${caseAtual.perfil}</span>
    <span class="tag">${labelCiclo(caseAtual.ciclo)}</span>
    <span class="tag">${labelPatrim(caseAtual.patrimonio)}</span>
    <span class="tag">${caseAtual.custodia === "OFFSHORE" ? "Custódia Offshore" : "Custódia Brasil"}</span>
  `;

  const dadosHtml = Object.entries(caseAtual.dados).map(([k,v]) => 
    `<div class="dado-key"><span>${k}</span><span>${v}</span></div>`
  ).join("");
  document.getElementById("brief-dados").innerHTML = dadosHtml;

  document.getElementById("brief-objetivos").innerHTML = 
    caseAtual.objetivos.map(o => `<li>${o}</li>`).join("");
  document.getElementById("brief-restricoes").innerHTML = 
    caseAtual.restricoes.map(r => `<li>${r}</li>`).join("");

  // Cenário: reseta para o modo "case" ao abrir novo case e renderiza o editor
  cenarioModo = "case";
  cenarioEditado = "";
  renderCenarioEditor();

  trocarTela("tela2");
}

/* =================================================================================
   TELA 3 — Montagem
   ================================================================================= */
/* Normaliza o identificador de contexto da carteira: modo livre é "livre",
   case é o id como string, e ausência de id vale como modo livre. */
function idDeCaseNormalizado(id) {
  if (id === null || id === undefined || id === "") return "livre";
  return String(id);
}
function mesmoIdDeCase(a, b) {
  return idDeCaseNormalizado(a) === idDeCaseNormalizado(b);
}

/* CARTEIRA-05 — carteira que chega pelo link (#c=...). O boot do estado.js só
   calcula Estado.carteiraDaURL; sem ninguém consumir, o link não fazia nada.
   Aqui a tela 1 avisa que existe uma carteira recebida e oferece abri-la. */
function carteiraDoLinkRecebida() {
  if (!window.Estado || !window.Estado.carteiraDaURL) return null;
  var c = window.Estado.carteiraDaURL;
  if (!c || !Array.isArray(c.linhas) || !c.linhas.length) return null;
  return c;
}

function abrirCarteiraDoLink() {
  var c = carteiraDoLinkRecebida();
  if (!c) return;
  var id = idDeCaseNormalizado(c.caseId);
  var caso = (id !== "livre" && typeof CASES !== "undefined")
    ? CASES.find(function (x) { return String(x.id) === id; })
    : null;
  if (caso) {
    abrirCase(caso.id);   // briefing do case certo
    irTela3();            // e já entra na montagem com o rascunho do link
  } else {
    iniciarModoLivre();   // iniciarModoLivre já passa por irTela3()
  }
}

function renderAvisoCarteiraDoLink() {
  var tela1 = document.getElementById("tela1");
  if (!tela1) return;
  var aviso = document.getElementById("aviso-carteira-link");
  var c = carteiraDoLinkRecebida();
  if (!c) { if (aviso) aviso.remove(); return; }
  if (!aviso) {
    aviso = document.createElement("div");
    aviso.id = "aviso-carteira-link";
    // .painel já existe no design system; o resto é layout mínimo, sem depender
    // de CSS novo (o markup e o CSS pertencem a outros arquivos).
    aviso.className = "painel";
    aviso.setAttribute("role", "status");
    aviso.style.display = "flex";
    aviso.style.alignItems = "center";
    aviso.style.justifyContent = "space-between";
    aviso.style.gap = "16px";
    aviso.style.flexWrap = "wrap";
    aviso.style.marginBottom = "24px";
    aviso.style.borderLeft = "3px solid var(--brand-blue)";
    tela1.insertBefore(aviso, tela1.firstChild);
  }
  var qtd = c.linhas.filter(function (l) { return l.ticker; }).length;
  var nome = c.nome ? String(c.nome) : "Carteira compartilhada";
  aviso.innerHTML =
    '<span>' + svgIcone("grafico") + ' <strong>Você recebeu uma carteira por link</strong> — ' +
    nome + ' · ' + qtd + ' ativo(s).</span>' +
    '<button type="button" class="btn btn--primary" onclick="abrirCarteiraDoLink()">Abrir esta carteira</button>';
}

function irTela3() {
  if (modoLivre) {
    document.getElementById("montagem-titulo").textContent = "Modo Livre — Monte sua carteira";
  } else {
    document.getElementById("montagem-titulo").textContent = `Montar carteira — ${caseAtual.titulo}`;
    document.getElementById("aporte").value = caseAtual.aporte_sugerido;
  }
  // Rascunho salvo (hash > localStorage) tem prioridade sobre as três linhas vazias,
  // desde que seja do mesmo case (ou do modo livre).
  var idAtual = modoLivre ? "livre" : (caseAtual ? caseAtual.id : null);
  var rascunho = null;
  if (window.Estado && typeof window.Estado.restaurarCarteira === "function") {
    try { rascunho = window.Estado.restaurarCarteira(); } catch (e) { rascunho = null; }
  }
  // CARTEIRA-02 — o rascunho guarda caseId sempre como string (estado.js normaliza),
  // e caseAtual.id é number. A comparação precisa ser feita na mesma escala.
  var mesmoCase = rascunho && mesmoIdDeCase(rascunho.caseId, idAtual);

  if (mesmoCase && Array.isArray(rascunho.linhas) && rascunho.linhas.length) {
    montagemAtual = rascunho.linhas.map(function (l) {
      return { ticker: l.ticker || "", pct: Number(l.pct) || 0 };
    });
    var aporteSalvo = Number(rascunho.aporte);
    if (aporteSalvo > 0) document.getElementById("aporte").value = aporteSalvo;
  } else if (montagemAtual.length === 0) {
    montagemAtual = [{ ticker: "", pct: 0 }, { ticker: "", pct: 0 }, { ticker: "", pct: 0 }];
  }

  renderLinhasAlocacao();
  calcularMontagem();
  trocarTela("tela3");
}

// ==================== ETF INFO CARDS (FICHAS) ====================
var ETF_INFO = {
  // === ETFs BR - Renda Fixa ===
  "LFTS11": { nome: "It Now Tesouro Selic", gestora: "Itau Asset", tipo: "ETF", categoria: "RF Pos-Fixado", benchmark: "Tesouro Selic", taxa: "0,19%", custodia: "B3" },
  "IMAB11": { nome: "It Now IMA-B", gestora: "Itau Asset", tipo: "ETF", categoria: "RF Inflacao", benchmark: "IMA-B", taxa: "0,25%", custodia: "B3" },
  "IB5M11": { nome: "It Now IMA-B 5+", gestora: "Itau Asset", tipo: "ETF", categoria: "RF Inflacao Longa", benchmark: "IMA-B 5+", taxa: "0,25%", custodia: "B3" },
  "B5P211": { nome: "It Now IMA-B 5 P2", gestora: "Itau Asset", tipo: "ETF", categoria: "RF Inflacao Curta", benchmark: "IMA-B 5 P2", taxa: "0,20%", custodia: "B3" },
  "IRFM11": { nome: "It Now IRF-M P2", gestora: "Itau Asset", tipo: "ETF", categoria: "RF Prefixado", benchmark: "IRF-M P2", taxa: "0,20%", custodia: "B3" },
  "FIXA11": { nome: "Mirae RF Pre", gestora: "Mirae Asset", tipo: "ETF", categoria: "RF Prefixado", benchmark: "S&P/B3 Prefixados", taxa: "0,30%", custodia: "B3" },
  "IDKA11": { nome: "It Now IRF-M P3", gestora: "Itau Asset", tipo: "ETF", categoria: "RF Prefixado", benchmark: "IRF-M P3", taxa: "0,25%", custodia: "B3" },
  "DEBB11": { nome: "BTG Debentures DI", gestora: "BTG Pactual", tipo: "ETF", categoria: "RF Credito", benchmark: "Teva Debentures DI", taxa: "0,60%", custodia: "B3" },
  "LFTB11": { nome: "Investo Tesouro Selic", gestora: "Investo", tipo: "ETF", categoria: "RF Pos-Fixado", benchmark: "Tesouro Selic Target 760", taxa: "0,19%", custodia: "B3" },
  // === ETFs BR - Acoes ===
  "BOVA11": { nome: "iShares Ibovespa", gestora: "BlackRock", tipo: "ETF", categoria: "Acoes BR", benchmark: "Ibovespa", taxa: "0,10%", custodia: "B3" },
  "BOVV11": { nome: "It Now Ibovespa", gestora: "Itau Asset", tipo: "ETF", categoria: "Acoes BR", benchmark: "Ibovespa", taxa: "0,10%", custodia: "B3" },
  "SMAL11": { nome: "iShares Small Cap", gestora: "BlackRock", tipo: "ETF", categoria: "Small Caps BR", benchmark: "SMLL", taxa: "0,50%", custodia: "B3" },
  "DIVO11": { nome: "It Now Dividendos", gestora: "Itau Asset", tipo: "ETF", categoria: "Dividendos BR", benchmark: "IDIV", taxa: "0,50%", custodia: "B3" },
  "IVVB11": { nome: "iShares S&P 500 BRL", gestora: "BlackRock", tipo: "ETF", categoria: "Acoes Internacionais", benchmark: "S&P 500", taxa: "0,23%", custodia: "B3" },
  "NASD11": { nome: "It Now Nasdaq 100", gestora: "Itau Asset", tipo: "ETF", categoria: "Acoes Internacionais", benchmark: "Nasdaq 100", taxa: "0,30%", custodia: "B3" },
  "ACWI11": { nome: "iShares MSCI ACWI", gestora: "BlackRock", tipo: "ETF", categoria: "Acoes Globais", benchmark: "MSCI ACWI", taxa: "0,30%", custodia: "B3" },
  "XFIX11": { nome: "iShares IFIX", gestora: "BlackRock", tipo: "ETF", categoria: "FIIs", benchmark: "IFIX", taxa: "0,29%", custodia: "B3" },
  "HASH11": { nome: "Hashdex Crypto", gestora: "Hashdex", tipo: "ETF", categoria: "Criptoativos", benchmark: "NCI Top 10", taxa: "1,30%", custodia: "B3" },
  "GOLD11": { nome: "Trend Ouro", gestora: "XP Asset", tipo: "ETF", categoria: "Commodities", benchmark: "LBMA Gold Price", taxa: "0,30%", custodia: "B3" },
  "EURP11": { nome: "It Now Europa", gestora: "Itau Asset", tipo: "ETF", categoria: "Acoes Internacionais", benchmark: "Stoxx Europe 600", taxa: "0,30%", custodia: "B3" },
  "MATB11": { nome: "It Now Materiais", gestora: "Itau Asset", tipo: "ETF", categoria: "Setorial", benchmark: "Materiais Basicos", taxa: "0,50%", custodia: "B3" },
  "PIBB11": { nome: "It Now IBrX-50", gestora: "Itau Asset", tipo: "ETF", categoria: "Acoes BR", benchmark: "IBrX-50", taxa: "0,06%", custodia: "B3" },
  "FIND11": { nome: "It Now Financeiro", gestora: "Itau Asset", tipo: "ETF", categoria: "Setorial", benchmark: "IFNC", taxa: "0,60%", custodia: "B3" },
  "GOVE11": { nome: "It Now Governanca", gestora: "Itau Asset", tipo: "ETF", categoria: "Governanca", benchmark: "IGC-NM", taxa: "0,50%", custodia: "B3" },
  "ISUS11": { nome: "It Now Sustentabilidade", gestora: "Itau Asset", tipo: "ETF", categoria: "ESG", benchmark: "ISE", taxa: "0,40%", custodia: "B3" },
  "DIVD11": { nome: "It Now Dividendos Dist", gestora: "Itau Asset", tipo: "ETF", categoria: "Dividendos BR", benchmark: "IDIV", taxa: "0,50%", custodia: "B3" },
  "TECK11": { nome: "It Now Top 10 Tech", gestora: "Itau Asset", tipo: "ETF", categoria: "Tecnologia", benchmark: "Top 10 Tech", taxa: "0,25%", custodia: "B3" },
  "WRLD11": { nome: "Investo FTSE Global", gestora: "Investo", tipo: "ETF", categoria: "Acoes Globais", benchmark: "FTSE All-World", taxa: "0,30%", custodia: "B3" },
  "SPXI11": { nome: "It Now S&P 500", gestora: "Itau Asset", tipo: "ETF", categoria: "Acoes Internacionais", benchmark: "S&P 500", taxa: "0,21%", custodia: "B3" },
  "QBTC11": { nome: "QR Bitcoin", gestora: "QR Asset", tipo: "ETF", categoria: "Bitcoin", benchmark: "CME CF Bitcoin", taxa: "0,70%", custodia: "B3" },
  "BITH11": { nome: "Hashdex Bitcoin", gestora: "Hashdex", tipo: "ETF", categoria: "Bitcoin", benchmark: "Nasdaq Bitcoin", taxa: "0,70%", custodia: "B3" },
  // === ETFs US - Vanguard ===
  "VOO": { nome: "Vanguard S&P 500", gestora: "Vanguard", tipo: "ETF", categoria: "Acoes EUA", benchmark: "S&P 500", taxa: "0,03%", custodia: "US" },
  "VTI": { nome: "Vanguard Total Market", gestora: "Vanguard", tipo: "ETF", categoria: "Acoes EUA Total", benchmark: "CRSP US Total", taxa: "0,03%", custodia: "US" },
  "VWO": { nome: "Vanguard Emerging Markets", gestora: "Vanguard", tipo: "ETF", categoria: "Emergentes", benchmark: "FTSE Emerging", taxa: "0,08%", custodia: "US" },
  "VIG": { nome: "Vanguard Dividend Appreciation", gestora: "Vanguard", tipo: "ETF", categoria: "Dividendos EUA", benchmark: "S&P Dividend Growers", taxa: "0,06%", custodia: "US" },
  "VYM": { nome: "Vanguard High Dividend", gestora: "Vanguard", tipo: "ETF", categoria: "Dividendos EUA", benchmark: "FTSE High Dividend", taxa: "0,06%", custodia: "US" },
  "VUG": { nome: "Vanguard Growth", gestora: "Vanguard", tipo: "ETF", categoria: "Growth EUA", benchmark: "CRSP US Large Growth", taxa: "0,04%", custodia: "US" },
  "VTV": { nome: "Vanguard Value", gestora: "Vanguard", tipo: "ETF", categoria: "Value EUA", benchmark: "CRSP US Large Value", taxa: "0,04%", custodia: "US" },
  "VEA": { nome: "Vanguard FTSE Developed", gestora: "Vanguard", tipo: "ETF", categoria: "Desenvolvidos ex-EUA", benchmark: "FTSE Developed ex-US", taxa: "0,05%", custodia: "US" },
  "VGK": { nome: "Vanguard FTSE Europe", gestora: "Vanguard", tipo: "ETF", categoria: "Europa", benchmark: "FTSE Developed Europe", taxa: "0,06%", custodia: "US" },
  "VNQ": { nome: "Vanguard Real Estate", gestora: "Vanguard", tipo: "ETF", categoria: "REITs EUA", benchmark: "MSCI US REIT", taxa: "0,12%", custodia: "US" },
  "VO": { nome: "Vanguard Mid-Cap", gestora: "Vanguard", tipo: "ETF", categoria: "Mid Caps EUA", benchmark: "CRSP US Mid Cap", taxa: "0,04%", custodia: "US" },
  "VB": { nome: "Vanguard Small-Cap", gestora: "Vanguard", tipo: "ETF", categoria: "Small Caps EUA", benchmark: "CRSP US Small Cap", taxa: "0,05%", custodia: "US" },
  // === ETFs US - iShares/BlackRock ===
  "IVV": { nome: "iShares Core S&P 500", gestora: "BlackRock", tipo: "ETF", categoria: "Acoes EUA", benchmark: "S&P 500", taxa: "0,03%", custodia: "US" },
  "IWM": { nome: "iShares Russell 2000", gestora: "BlackRock", tipo: "ETF", categoria: "Small Caps EUA", benchmark: "Russell 2000", taxa: "0,19%", custodia: "US" },
  "EFA": { nome: "iShares MSCI EAFE", gestora: "BlackRock", tipo: "ETF", categoria: "Desenvolvidos ex-EUA", benchmark: "MSCI EAFE", taxa: "0,32%", custodia: "US" },
  "EEM": { nome: "iShares MSCI Emerging", gestora: "BlackRock", tipo: "ETF", categoria: "Emergentes", benchmark: "MSCI Emerging", taxa: "0,68%", custodia: "US" },
  "ACWI": { nome: "iShares MSCI ACWI", gestora: "BlackRock", tipo: "ETF", categoria: "Acoes Globais", benchmark: "MSCI ACWI", taxa: "0,32%", custodia: "US" },
  "AGG": { nome: "iShares Core Aggregate Bond", gestora: "BlackRock", tipo: "ETF", categoria: "RF Aggregate EUA", benchmark: "Bloomberg Aggregate", taxa: "0,03%", custodia: "US" },
  "TLT": { nome: "iShares 20+ Year Treasury", gestora: "BlackRock", tipo: "ETF", categoria: "Treasuries Longos", benchmark: "ICE 20+ Year Treasury", taxa: "0,15%", custodia: "US" },
  "IEF": { nome: "iShares 7-10 Year Treasury", gestora: "BlackRock", tipo: "ETF", categoria: "Treasuries Medios", benchmark: "ICE 7-10 Year Treasury", taxa: "0,15%", custodia: "US" },
  "SHV": { nome: "iShares Short Treasury", gestora: "BlackRock", tipo: "ETF", categoria: "T-Bills", benchmark: "ICE Short Treasury", taxa: "0,15%", custodia: "US" },
  "TIP": { nome: "iShares TIPS Bond", gestora: "BlackRock", tipo: "ETF", categoria: "TIPS Inflacao", benchmark: "Bloomberg TIPS", taxa: "0,19%", custodia: "US" },
  "LQD": { nome: "iShares Investment Grade Bond", gestora: "BlackRock", tipo: "ETF", categoria: "Corporativo IG", benchmark: "Markit iBoxx IG", taxa: "0,14%", custodia: "US" },
  "HYG": { nome: "iShares High Yield Bond", gestora: "BlackRock", tipo: "ETF", categoria: "High Yield", benchmark: "Markit iBoxx HY", taxa: "0,49%", custodia: "US" },
  "EMB": { nome: "iShares EM Bond", gestora: "BlackRock", tipo: "ETF", categoria: "RF Emergentes", benchmark: "JPM EMBI Global", taxa: "0,39%", custodia: "US" },
  "GLD": { nome: "SPDR Gold Trust", gestora: "State Street", tipo: "ETF", categoria: "Ouro", benchmark: "LBMA Gold Price", taxa: "0,40%", custodia: "US" },
  "IAU": { nome: "iShares Gold Trust", gestora: "BlackRock", tipo: "ETF", categoria: "Ouro", benchmark: "LBMA Gold Price", taxa: "0,25%", custodia: "US" },
  "SLV": { nome: "iShares Silver Trust", gestora: "BlackRock", tipo: "ETF", categoria: "Prata", benchmark: "LBMA Silver Price", taxa: "0,50%", custodia: "US" },
  "HDV": { nome: "iShares Core High Dividend", gestora: "BlackRock", tipo: "ETF", categoria: "Dividendos EUA", benchmark: "Morningstar Dividend Yield", taxa: "0,08%", custodia: "US" },
  "DGRO": { nome: "iShares Core Dividend Growth", gestora: "BlackRock", tipo: "ETF", categoria: "Dividendos Growth", benchmark: "Morningstar Dividend Growth", taxa: "0,08%", custodia: "US" },
  "QUAL": { nome: "iShares MSCI USA Quality", gestora: "BlackRock", tipo: "ETF", categoria: "Quality EUA", benchmark: "MSCI USA Quality", taxa: "0,15%", custodia: "US" },
  "USMV": { nome: "iShares MSCI Min Vol USA", gestora: "BlackRock", tipo: "ETF", categoria: "Min Vol EUA", benchmark: "MSCI USA Min Vol", taxa: "0,15%", custodia: "US" },
  "MTUM": { nome: "iShares MSCI Momentum", gestora: "BlackRock", tipo: "ETF", categoria: "Momentum EUA", benchmark: "MSCI USA Momentum", taxa: "0,15%", custodia: "US" },
  "IBIT": { nome: "iShares Bitcoin Trust", gestora: "BlackRock", tipo: "ETF", categoria: "Bitcoin", benchmark: "CME CF Bitcoin", taxa: "0,25%", custodia: "US" },
  "MCHI": { nome: "iShares MSCI China", gestora: "BlackRock", tipo: "ETF", categoria: "China", benchmark: "MSCI China", taxa: "0,59%", custodia: "US" },
  "FXI": { nome: "iShares China Large-Cap", gestora: "BlackRock", tipo: "ETF", categoria: "China", benchmark: "FTSE China 50", taxa: "0,74%", custodia: "US" },
  "INDA": { nome: "iShares MSCI India", gestora: "BlackRock", tipo: "ETF", categoria: "India", benchmark: "MSCI India", taxa: "0,65%", custodia: "US" },
  "EWZ": { nome: "iShares MSCI Brazil", gestora: "BlackRock", tipo: "ETF", categoria: "Brasil (USD)", benchmark: "MSCI Brazil", taxa: "0,58%", custodia: "US" },
  "EWJ": { nome: "iShares MSCI Japan", gestora: "BlackRock", tipo: "ETF", categoria: "Japao", benchmark: "MSCI Japan", taxa: "0,50%", custodia: "US" },
  // === ETFs US - SPDR/State Street ===
  "SPY": { nome: "SPDR S&P 500", gestora: "State Street", tipo: "ETF", categoria: "Acoes EUA", benchmark: "S&P 500", taxa: "0,09%", custodia: "US" },
  "XLK": { nome: "SPDR Technology Select", gestora: "State Street", tipo: "ETF", categoria: "Tecnologia EUA", benchmark: "S&P Technology Select", taxa: "0,09%", custodia: "US" },
  "XLF": { nome: "SPDR Financial Select", gestora: "State Street", tipo: "ETF", categoria: "Financeiro EUA", benchmark: "S&P Financial Select", taxa: "0,09%", custodia: "US" },
  "XLE": { nome: "SPDR Energy Select", gestora: "State Street", tipo: "ETF", categoria: "Energia EUA", benchmark: "S&P Energy Select", taxa: "0,09%", custodia: "US" },
  "XLV": { nome: "SPDR Health Care Select", gestora: "State Street", tipo: "ETF", categoria: "Saude EUA", benchmark: "S&P Health Care Select", taxa: "0,09%", custodia: "US" },
  // === ETFs US - Invesco ===
  "QQQ": { nome: "Invesco QQQ Trust", gestora: "Invesco", tipo: "ETF", categoria: "Acoes EUA (Nasdaq)", benchmark: "Nasdaq 100", taxa: "0,20%", custodia: "US" },
  "RSP": { nome: "Invesco S&P 500 Equal Weight", gestora: "Invesco", tipo: "ETF", categoria: "Acoes EUA Equal Weight", benchmark: "S&P 500 Equal Weight", taxa: "0,20%", custodia: "US" },
  // === ETFs US - Schwab ===
  "SCHD": { nome: "Schwab US Dividend Equity", gestora: "Schwab", tipo: "ETF", categoria: "Dividendos EUA", benchmark: "Dow Jones US Dividend 100", taxa: "0,06%", custodia: "US" },
  // === ETFs US - ARK ===
  "ARKK": { nome: "ARK Innovation", gestora: "ARK Invest", tipo: "ETF", categoria: "Inovacao Disruptiva", benchmark: "Gestao Ativa", taxa: "0,75%", custodia: "US" },
  "ARKW": { nome: "ARK Next Gen Internet", gestora: "ARK Invest", tipo: "ETF", categoria: "Internet & Fintech", benchmark: "Gestao Ativa", taxa: "0,87%", custodia: "US" },
  "ARKG": { nome: "ARK Genomic Revolution", gestora: "ARK Invest", tipo: "ETF", categoria: "Genomica", benchmark: "Gestao Ativa", taxa: "0,75%", custodia: "US" },
  // === ETFs US - Global X ===
  "BOTZ": { nome: "Global X Robotics & AI", gestora: "Global X", tipo: "ETF", categoria: "Robotica & IA", benchmark: "Indxx Global Robotics", taxa: "0,68%", custodia: "US" },
  "AIQ": { nome: "Global X AI & Technology", gestora: "Global X", tipo: "ETF", categoria: "IA & Tecnologia", benchmark: "Indxx AI & Big Data", taxa: "0,68%", custodia: "US" },
  "URA": { nome: "Global X Uranium", gestora: "Global X", tipo: "ETF", categoria: "Uranio", benchmark: "Solactive Global Uranium", taxa: "0,69%", custodia: "US" },
  "LIT": { nome: "Global X Lithium & Battery", gestora: "Global X", tipo: "ETF", categoria: "Litio & Baterias", benchmark: "Solactive Global Lithium", taxa: "0,75%", custodia: "US" },
  "QYLD": { nome: "Global X Nasdaq Covered Call", gestora: "Global X", tipo: "ETF", categoria: "Covered Call", benchmark: "CBOE Nasdaq BuyWrite", taxa: "0,60%", custodia: "US" },
  "BUG": { nome: "Global X Cybersecurity", gestora: "Global X", tipo: "ETF", categoria: "Ciberseguranca", benchmark: "Indxx Cybersecurity", taxa: "0,50%", custodia: "US" },
  "COPX": { nome: "Global X Copper Miners", gestora: "Global X", tipo: "ETF", categoria: "Mineracao Cobre", benchmark: "Solactive Global Copper Miners", taxa: "0,65%", custodia: "US" },
  "PAVE": { nome: "Global X US Infrastructure", gestora: "Global X", tipo: "ETF", categoria: "Infraestrutura EUA", benchmark: "Indxx US Infrastructure", taxa: "0,47%", custodia: "US" },
  // === ETFs US - JPMorgan ===
  "JEPI": { nome: "JPMorgan Equity Premium Income", gestora: "JPMorgan", tipo: "ETF", categoria: "Income EUA", benchmark: "S&P 500 + covered calls", taxa: "0,35%", custodia: "US" },
  "JEPQ": { nome: "JPMorgan Nasdaq Premium Income", gestora: "JPMorgan", tipo: "ETF", categoria: "Income Nasdaq", benchmark: "Nasdaq 100 + covered calls", taxa: "0,35%", custodia: "US" },
  // === UCITS ===
  "VUAA": { nome: "Vanguard S&P 500 UCITS", gestora: "Vanguard", tipo: "UCITS", categoria: "Acoes EUA", benchmark: "S&P 500", taxa: "0,07%", custodia: "Irlanda" },
  "CSPX": { nome: "iShares Core S&P 500 UCITS", gestora: "BlackRock", tipo: "UCITS", categoria: "Acoes EUA", benchmark: "S&P 500", taxa: "0,07%", custodia: "Irlanda" },
  "CNDX": { nome: "iShares Nasdaq 100 UCITS", gestora: "BlackRock", tipo: "UCITS", categoria: "Acoes EUA (Nasdaq)", benchmark: "Nasdaq 100", taxa: "0,30%", custodia: "Irlanda" },
  "VWRA": { nome: "Vanguard FTSE All-World UCITS", gestora: "Vanguard", tipo: "UCITS", categoria: "Acoes Globais", benchmark: "FTSE All-World", taxa: "0,22%", custodia: "Irlanda" },
  "IWDA": { nome: "iShares Core MSCI World UCITS", gestora: "BlackRock", tipo: "UCITS", categoria: "Acoes Globais", benchmark: "MSCI World", taxa: "0,20%", custodia: "Irlanda" },
  "EIMI": { nome: "iShares Core MSCI EM UCITS", gestora: "BlackRock", tipo: "UCITS", categoria: "Emergentes", benchmark: "MSCI EM IMI", taxa: "0,18%", custodia: "Irlanda" },
  "IB01": { nome: "iShares $ Treasury Bond 0-1yr UCITS", gestora: "BlackRock", tipo: "UCITS", categoria: "T-Bills", benchmark: "ICE US Treasury Short", taxa: "0,07%", custodia: "Irlanda" },
  "FLOA": { nome: "iShares $ Floating Rate Bond UCITS", gestora: "BlackRock", tipo: "UCITS", categoria: "RF Floating Rate", benchmark: "Bloomberg US Floating Rate", taxa: "0,10%", custodia: "Irlanda" },
  "SWRD": { nome: "SPDR MSCI World UCITS", gestora: "State Street", tipo: "UCITS", categoria: "Acoes Globais", benchmark: "MSCI World", taxa: "0,12%", custodia: "Irlanda" },
};

/* Camada curada do "izinho" (ficha expandida): papel na carteira, risco que
   precisa ser nomeado e pitch de 1 frase pro cliente — por ativo. Conteúdo
   qualitativo e estável; números (taxa, benchmark) continuam no ETF_INFO. */
var ETF_GUIA = {
  // === RF Brasil ===
  "LFTS11": { papel: "O caixa remunerado da carteira: reserva e dinheiro com data marcada, rendendo perto da Selic todo dia.", risco: "Quase nenhum de mercado — o risco é de USO: deixar demais aqui parado e perder os prêmios das outras classes.", pitch: "É a sua reserva rendendo Selic sem vencimento e com liquidez de bolsa — o dinheiro que dorme tranquilo." },
  "LFTB11": { papel: "Mesma função do LFTS11 (caixa em Tesouro Selic) — alternativa de gestora pra mesma prateleira.", risco: "Igual ao LFTS11: o risco é comportamental, não de mercado. Compare liquidez em tela antes de escolher entre os dois.", pitch: "Seu caixa no Tesouro Selic, negociado em bolsa — segurança de título público com praticidade de ação." },
  "IRFM11": { papel: "Aposta em queda de juros com prazo médio: prefixados que se valorizam quando a curva fecha.", risco: "Se o juro SOBE, a cota cai — marcação a mercado dói no curto prazo. Não é 'renda fixa que não mexe'.", pitch: "Se a Selic cair como o mercado espera, você trava o juro alto de hoje — e o preço do título te paga por isso." },
  "FIXA11": { papel: "Prefixados pela régua S&P/B3 — mesma tese do IRFM11 com outro índice e gestora.", risco: "Mesma física do prefixado: alta de juros machuca a cota. Tamanho da posição é quem controla a dor.", pitch: "Uma cesta de prefixados pra capturar o ciclo de queda de juros sem escolher vencimento a dedo." },
  "IDKA11": { papel: "Prefixados mais longos (IRF-M P3): mais sensibilidade à curva = mais prêmio se o juro ceder.", risco: "Duração maior amplifica TUDO — os ganhos e as quedas. Exige estômago e horizonte.", pitch: "A versão turbinada da aposta em juros: prazo maior, prêmio maior — pra quem aguenta ver o preço balançar." },
  "IMAB11": { papel: "O núcleo de inflação da carteira: cesta de Tesouro IPCA+ que protege o poder de compra no médio-longo prazo.", risco: "No curto prazo se comporta como renda variável 'light': juro real subindo derruba a cota. Proteção é no HORIZONTE, não no dia a dia.", pitch: "Inflação alta? Você recebe IPCA + juro real. É o seguro do seu poder de compra — pense em anos, não em meses." },
  "B5P211": { papel: "IPCA+ de prazo curto (até 5 anos): proteção de inflação com MUITO menos solavanco que o IMA-B cheio.", risco: "Menos volátil, mas também menos prêmio — em rali de fechamento de curva, fica pra trás dos longos.", pitch: "Proteção contra inflação sem montanha-russa: a versão suave do Tesouro IPCA+ pra objetivos mais próximos." },
  "IB5M11": { papel: "IPCA+ longo (5+ anos): a ponta agressiva da renda fixa — máxima sensibilidade ao juro real.", risco: "Cai como ação em estresse de curva. Só faz sentido com horizonte LONGO de verdade e posição dimensionada.", pitch: "O prêmio mais gordo da renda fixa brasileira — pra quem pode esperar o longo prazo trabalhar a favor." },
  "DEBB11": { papel: "Crédito privado incentivado atrelado ao CDI: turbina o pós-fixado com o spread das debêntures.", risco: "Risco de crédito das emissoras + liquidez menor em estresse. O spread é o pagamento por esses riscos.", pitch: "CDI + um extra: uma cesta de debêntures incentivadas diversificada, sem você escolher emissor a emissor." },
  // === Ações Brasil ===
  "BOVA11": { papel: "O beta do Brasil em 1 ticker: núcleo de renda variável local, líquido e barato.", risco: "Concentração setorial do índice (bancos + commodities) — você compra o Brasil COM os defeitos do Ibovespa.", pitch: "As maiores empresas do país numa cota só — o jeito mais simples e líquido de ter bolsa brasileira." },
  "BOVV11": { papel: "Mesma exposição do BOVA11 (Ibovespa) — alternativa de gestora, útil pra comparar spread e liquidez.", risco: "Idêntico ao BOVA11: risco Brasil concentrado. A escolha entre eles é operacional, não estratégica.", pitch: "Ibovespa em cota única — mesma tese do BOVA11, escolha pelo custo de operar no dia." },
  "PIBB11": { papel: "IBrX-50 com taxa mínima histórica: as 50 mais negociadas, custo de manutenção quase zero.", risco: "Liquidez em tela menor que BOVA11 — spread pode comer a vantagem da taxa em quem gira muito.", pitch: "Bolsa brasileira com uma das menores taxas do mercado — feita pra quem compra e SEGURA." },
  "SMAL11": { papel: "Small caps brasileiras: o motor de crescimento da RV local, ciclo-sensível.", risco: "Volatilidade e drawdowns bem maiores que o Ibovespa — e sofre primeiro em aperto de liquidez.", pitch: "As empresas que podem dobrar de tamanho — em cesta, porque escolher UMA small é loteria." },
  "DIVO11": { papel: "Empresas pagadoras (IDIV): perfil mais defensivo dentro da bolsa BR, caixa recorrente.", risco: "ETF de ações BR historicamente REINVESTE — o cliente que espera 'pix de dividendo' se frustra; o retorno vem na cota.", pitch: "As boas pagadoras do Brasil numa cesta — perfil mais estável de bolsa, com o retorno compondo dentro da cota." },
  "DIVD11": { papel: "Mesma prateleira do DIVO11 (IDIV) — confira na B3 o tratamento de proventos da versão atual antes de prometer renda.", risco: "Igual DIVO11: nunca prometa 'renda mensal' sem confirmar o regulamento vigente do ETF.", pitch: "Bolsa de dividendos em cota única — o filtro das empresas que remuneram o acionista." },
  "FIND11": { papel: "Setorial financeiro (IFNC): concentra bancos, seguradoras e B3 — aposta direcional no setor.", risco: "Setor único = risco único: regulação, spread bancário e ciclo de crédito batem juntos.", pitch: "O sistema financeiro brasileiro em uma cota — pra quem acredita no setor mais lucrativo da bolsa." },
  "GOVE11": { papel: "Filtro de governança (IGC-NM): empresas com padrões mais altos de gestão.", risco: "Filtro não é escudo — continua sendo bolsa BR com volatilidade cheia.", pitch: "Investir nas empresas que tratam o minoritário a sério — governança como critério, não como discurso." },
  "ISUS11": { papel: "ESG brasileiro (ISE): tese de sustentabilidade aplicada à bolsa local.", risco: "Universo menor = mais concentração; performance pode descolar do Ibovespa pros dois lados.", pitch: "Pra quem quer que o dinheiro invista de acordo com os valores — sem abrir mão de ser bolsa." },
  "MATB11": { papel: "Setorial de materiais básicos: mineração, siderurgia, papel — o Brasil exportador.", risco: "Refém do ciclo global de commodities e da China — pode passar anos fora de moda.", pitch: "A aposta no Brasil que o mundo compra: commodities em cesta, sem escolher entre Vale e Suzano." },
  "TECK11": { papel: "Tecnologia via B3: cesta enxuta das top 10 techs disponíveis ao investidor local.", risco: "Pouquíssimos papéis = concentração alta; 'tech BR' é um universo pequeno e volátil.", pitch: "O jeito local de ter tecnologia na carteira — concentrado, então dimensione como tempero, não como base." },
  // === FIIs ===
  "XFIX11": { papel: "O IFIX em cota única: exposição diversificada a fundos imobiliários sem montar carteira tijolo a tijolo.", risco: "NÃO herda a isenção de rendimento do FII direto — no ETF o retorno vem via cota. Explique isso ANTES do cliente comparar.", pitch: "Todo o mercado de FIIs numa cota — diversificação imobiliária instantânea, com a tributação própria de ETF." },
  // === Cripto B3 ===
  "HASH11": { papel: "Cesta das maiores criptos (NCI): exposição ao tema sem escolher moeda nem abrir exchange.", risco: "Volatilidade extrema e drawdowns históricos acima de 70% — é posição SATÉLITE por definição.", pitch: "O mercado cripto inteiro numa cota regulada na B3 — participação no tema com tamanho sob controle." },
  "QBTC11": { papel: "Bitcoin puro via B3: a tese 'ouro digital' isolada, sem altcoins.", risco: "A volatilidade do Bitcoin, ponto. Quem entra precisa saber que 50% de queda faz parte do jogo.", pitch: "Bitcoin na sua corretora de sempre, sem carteira digital nem chave privada — exposição direta e regulada." },
  "BITH11": { papel: "Bitcoin via Hashdex — mesma prateleira do QBTC11, alternativa de emissor.", risco: "Idêntico ao QBTC11: o risco é o ativo, não o veículo. Compare custos e liquidez.", pitch: "O mesmo Bitcoin, em outro emissor — escolha operacional pra mesma convicção." },
  // === Commodities B3 ===
  "GOLD11": { papel: "Ouro em reais: o seguro clássico contra crise e inflação global, com efeito câmbio embutido.", risco: "Não rende nada por si — passa anos de lado; o valor aparece justamente quando o resto quebra.", pitch: "O ativo de 5 mil anos na sua corretora: proteção que sobe quando o mercado treme — e em dólar." },
  // === Internacional via B3 ===
  "IVVB11": { papel: "S&P 500 em reais: o núcleo internacional da carteira local — 500 maiores dos EUA + dólar.", risco: "Dupla exposição: bolsa americana E câmbio. Real forte pode comer retorno de bolsa boa.", pitch: "As 500 maiores empresas do mundo desenvolvido + proteção cambial, sem sair da B3 nem abrir conta fora." },
  "SPXI11": { papel: "Mesmo S&P 500 do IVVB11 — alternativa de emissor pra mesma tese núcleo.", risco: "Igual IVVB11 (bolsa EUA + câmbio). Decida pelo custo total de operar.", pitch: "S&P 500 em reais — mesma tese, outro emissor; o que importa é ESTAR posicionado." },
  "NASD11": { papel: "Nasdaq-100 em reais: o growth americano concentrado em tecnologia, com câmbio junto.", risco: "Mais volátil que o S&P e concentrado em poucas mega-techs — quedas de 30%+ fazem parte do histórico.", pitch: "As empresas que estão construindo o futuro — Apple, Microsoft, Nvidia — em uma cota na B3." },
  "EURP11": { papel: "Europa desenvolvida (Stoxx 600): diversificação geográfica fora do eixo EUA.", risco: "Crescimento estrutural menor que os EUA — é diversificação, raramente é o motor.", pitch: "As grandes da Europa — Nestlé, ASML, LVMH — completando o mapa-múndi da carteira." },
  "ACWI11": { papel: "O mundo inteiro numa cota (desenvolvidos + emergentes): diversificação geográfica máxima em 1 linha.", risco: "‘Mundo’ hoje é ~60% EUA — você ainda carrega bastante América, só que com o resto junto.", pitch: "Um clique, todos os mercados: a carteira global pronta pra quem quer simplicidade com classe." },
  "WRLD11": { papel: "FTSE All-World via B3 — irmão do ACWI11, mesma função de núcleo global.", risco: "Mesmo perfil do ACWI11; escolha por custo e liquidez local.", pitch: "O mundo todo em reais — o atalho da diversificação internacional séria." },
  // === EUA - núcleo ===
  "VOO": { papel: "S&P 500 na fonte, custo mínimo: o núcleo clássico de quem investe direto nos EUA.", risco: "Bolsa americana cheia — e pra brasileiro, o pacote offshore: estate tax acima de US$ 60 mil e sucessão mais complexa.", pitch: "O índice mais vencedor da história pelo menor custo do mercado — o padrão-ouro do buy and hold." },
  "IVV": { papel: "Mesmo S&P 500 do VOO (iShares) — gêmeos de função, escolha operacional.", risco: "Igual VOO, incluindo as questões de sucessão do investimento direto nos EUA.", pitch: "S&P 500 puro pela BlackRock — mesma tese núcleo, mesmo custo mínimo." },
  "SPY": { papel: "O ETF mais líquido do planeta (S&P 500): padrão pra grandes volumes e operações táticas.", risco: "Taxa maior que VOO/IVV — pra segurar anos, os irmãos mais baratos ganham.", pitch: "A liquidez absoluta do mercado americano — entra e sai qualquer tamanho, a qualquer momento." },
  "VTI": { papel: "TODO o mercado americano (large a micro caps): a versão 'mercado completo' do núcleo EUA.", risco: "Na prática anda colado no S&P; a diferença é filosófica — e o pacote offshore de sempre.", pitch: "Não escolha quais empresas americanas: leve TODAS, de gigantes a novatas, numa cota só." },
  "QQQ": { papel: "Nasdaq-100 na fonte: o motor growth/tech pra quem opera direto nos EUA.", risco: "Concentração em mega-techs e volatilidade alta — históricos de -30% não são exceção.", pitch: "A elite da inovação americana — o índice que capturou as maiores criações de valor da era digital." },
  "RSP": { papel: "S&P 500 em pesos IGUAIS: tira a concentração das mega caps, dá voz às 500.", risco: "Quando as gigantes puxam o mercado, o equal weight fica pra trás — é aposta na 'média', não nos líderes.", pitch: "As mesmas 500 empresas, sem deixar 7 delas mandarem no resultado — diversificação de verdade dentro do índice." },
  "IWM": { papel: "Small caps americanas (Russell 2000): ciclo doméstico dos EUA, beta alto.", risco: "Mais voláteis, mais sensíveis a juros e crédito — sofrem primeiro e mais fundo.", pitch: "As 2000 pequenas que podem virar as próximas grandes — o lado agressivo do mercado americano." },
  "VO": { papel: "Mid caps EUA: o meio-termo esquecido — mais crescimento que large, menos susto que small.", risco: "Menos cobertura e menos glamour; exige paciência com ciclos.", pitch: "Empresas grandes o bastante pra sobreviver, pequenas o bastante pra crescer — o ponto doce do mercado." },
  "VB": { papel: "Small caps EUA pela régua Vanguard — função gêmea do IWM com custo menor.", risco: "Mesmo perfil de volatilidade do universo small; escolha pelo custo.", pitch: "O motor pequeno do mercado americano, na gestora do custo mínimo." },
  // === EUA - fatores e dividendos ===
  "VUG": { papel: "A metade growth do mercado americano: as empresas que crescem acima da média — tech pesa muito.", risco: "Paga caro pelo crescimento: quando juros sobem ou o lucro decepciona, a queda é maior que a do índice cheio.", pitch: "A metade acelerada dos EUA — as empresas que mais crescem, aceitando pagar mais caro por isso." },
  "VTV": { papel: "A metade value: empresas maduras e baratas (financeiro, saúde, energia) — contrapeso natural do growth.", risco: "Barato pode ficar barato por anos — o value atravessa ciclos longos atrás do growth.", pitch: "A metade 'sem glamour' da bolsa americana: negócios maduros, dividendos e menos susto no preço." },
  "VIG": { papel: "Empresas que AUMENTAM dividendo há 10+ anos: qualidade disfarçada de renda.", risco: "Yield atual baixo — a tese é crescimento do dividendo, não renda alta hoje.", pitch: "Não é quem paga mais hoje — é quem aumenta o pagamento todo ano há uma década. Isso filtra qualidade." },
  "VYM": { papel: "Alto dividendo americano: yield acima da média com diversificação ampla.", risco: "Yield alto às vezes é preço caído — setores value dominam, pode ficar atrás em bull de tech.", pitch: "Um salário em dólar da América corporativa — centenas de pagadoras num ticker só." },
  "SCHD": { papel: "O queridinho dos dividendos: filtro de qualidade + yield + crescimento, tudo junto.", risco: "Concentrado em value; em anos de tech eufórica, fica olhando de fora.", pitch: "Dividendos com critério de engenheiro: só entra quem tem balanço, histórico e capacidade de pagar mais." },
  "HDV": { papel: "Dividendos com filtro de saúde financeira (Morningstar): renda com colchão defensivo.", risco: "Cesta concentrada em setores maduros — energia e saúde pesam.", pitch: "As pagadoras mais sólidas da América — renda com o pé no chão." },
  "DGRO": { papel: "Crescimento de dividendos (5+ anos): o VIG mais acessível da iShares.", risco: "Mesma pegada do VIG: renda ainda modesta hoje, aposta no amanhã.", pitch: "Dividendos que crescem — a bola de neve começando pequena e ganhando corpo." },
  "QUAL": { papel: "Fator qualidade puro: ROE alto, dívida baixa, lucro estável.", risco: "Qualidade fica cara em pânico — o fator não imuniza contra quedas de mercado.", pitch: "As empresas com o dever de casa em dia — o filtro que Warren Buffett aprovaria." },
  "USMV": { papel: "Mínima volatilidade EUA: mesma bolsa, passeio menos turbulento.", risco: "Em rali forte, sobe menos — o preço da suavidade é deixar prêmio na mesa.", pitch: "Bolsa americana pra quem não gosta de sobressalto: menos tranco na descida, chegada mais serena." },
  "MTUM": { papel: "Momentum: surfa o que está subindo, corta o que enfraquece.", risco: "Vira a chave com atraso nas mudanças bruscas de mercado — chicotes machucam.", pitch: "A estratégia de seguir a força do mercado, sistematizada e sem emoção." },
  // === EUA - setoriais ===
  "XLK": { papel: "Setor de tecnologia do S&P: a fatia mais inovadora do índice, isolada.", risco: "Setor único e concentrado — Apple e Microsoft dominam a cesta.", pitch: "O coração tech do S&P 500 — pra sobre-alocar no setor que lidera o século." },
  "XLF": { papel: "Financeiro americano: bancos, seguradoras e gestoras — sensível a juros e crédito.", risco: "Cíclico clássico: crises bancárias batem aqui primeiro.", pitch: "O sistema financeiro dos EUA numa cota — aposta em juros saudáveis e crédito fluindo." },
  "XLE": { papel: "Energia (petróleo e gás): proteção contra choque de oferta e inflação de commodities.", risco: "Volatilidade de commodity + transição energética no horizonte estrutural.", pitch: "As petroleiras americanas — o hedge que paga dividendo quando o barril sobe." },
  "XLV": { papel: "Saúde americana: defensivo estrutural com vento demográfico a favor.", risco: "Regulação de preços de medicamentos é o fantasma permanente do setor.", pitch: "Um setor que não depende do humor da economia: o mundo não para de precisar de saúde." },
  "VNQ": { papel: "REITs americanos: renda imobiliária em dólar — shoppings, galpões logísticos, data centers e torres de celular.", risco: "Muito sensível a juros americanos; e o dividendo de REIT sofre retenção de 30% na fonte para estrangeiro.", pitch: "O 'fundo imobiliário' dos EUA num ticker só — imóvel de verdade, dolarizado e diversificado." },
  // === EUA - RF e proteção ===
  "AGG": { papel: "A renda fixa americana inteira (Treasuries + corporativos IG): o lastro clássico do portfólio 60/40.", risco: "Sensível a juros dos EUA — 2022 provou que bond também cai.", pitch: "O contrapeso tradicional da bolsa: renda fixa americana ampla, de qualidade, num ticker." },
  "TLT": { papel: "Treasuries 20+ anos: a aposta mais alavancada em QUEDA de juro americano.", risco: "Duração gigante = volatilidade de ação; se o juro sobe, cai forte e sem dó.", pitch: "Se os juros americanos caírem, isso aqui é o turbo — proteção de recessão com prêmio grande." },
  "IEF": { papel: "Treasuries 7-10 anos: o meio da curva — proteção com menos violência que o TLT.", risco: "Mesmo vetor do TLT, amplitude menor. Ainda assim, juro subindo machuca.", pitch: "Título do Tesouro americano no prazo clássico — o porto seguro global na dose intermediária." },
  "SHV": { papel: "T-Bills (curtíssimo prazo): o caixa em dólar, praticamente sem risco de preço.", risco: "Rende o juro curto e só — é estacionamento, não investimento.", pitch: "Dólar rendendo o juro americano de curto prazo — o caixa mais seguro do planeta." },
  "TIP": { papel: "TIPS: Tesouro americano indexado à inflação dos EUA — o IMA-B deles.", risco: "Juro REAL subindo derruba a cota mesmo com inflação alta — proteção é no horizonte.", pitch: "Proteção contra a inflação americana com garantia do Tesouro dos EUA." },
  "LQD": { papel: "Crédito corporativo investment grade: um degrau de prêmio acima dos Treasuries.", risco: "Em crise, o spread abre e cai junto com bolsa — diversifica menos do que parece.", pitch: "Emprestar para as maiores empresas dos EUA — prêmio sobre o Tesouro com grau de investimento." },
  "HYG": { papel: "High yield: crédito 'apimentado' — renda alta, comportamento meio-bolsa.", risco: "Em recessão, calotes sobem e ele cai COM a bolsa — não conte com ele como defesa.", pitch: "O prêmio gordo do crédito mais arriscado — renda alta para quem entende que é RISCO, não renda fixa." },
  "EMB": { papel: "Dívida soberana emergente em dólar: prêmio de país sem risco de moeda local.", risco: "Crises de emergentes (calote, política) batem direto; correlaciona com apetite a risco global.", pitch: "Receber em dólar o prêmio que os países emergentes pagam pra se financiar." },
  "GLD": { papel: "O maior ETF de ouro do mundo: proteção clássica em dólar.", risco: "Não paga renda; anda de lado por anos até o momento dele chegar.", pitch: "Ouro físico guardado em cofre, negociado como ação — o seguro global na forma mais líquida." },
  "IAU": { papel: "Ouro com taxa menor que o GLD: mesma proteção, custo de carregar mais leve.", risco: "Igual GLD — a diferença é só o custo de manutenção.", pitch: "O mesmo ouro, mais barato de segurar — pra posição de longo prazo." },
  "SLV": { papel: "Prata: metal precioso com pé na indústria (solar, eletrônica) — híbrido de proteção e ciclo.", risco: "Bem mais volátil que o ouro; o lado industrial cobra pedágio em recessão.", pitch: "A prima agitada do ouro: proteção que também surfa o ciclo industrial." },
  // === Internacional ex-EUA ===
  "VEA": { papel: "Desenvolvidos ex-EUA (Europa + Japão + outros): a perna internacional madura da carteira.", risco: "Décadas de retorno abaixo dos EUA — é diversificação, não promessa de liderança.", pitch: "O resto do mundo rico numa cota — porque nem só de América vive um portfólio global." },
  "EFA": { papel: "MSCI EAFE — função gêmea do VEA (desenvolvidos ex-EUA) com taxa maior.", risco: "Igual VEA; se for segurar muito tempo, o custo pesa a favor do VEA.", pitch: "Europa, Austrália e Extremo Oriente no índice mais tradicional da categoria." },
  "VGK": { papel: "Europa desenvolvida isolada: sobre-alocação na tese europeia.", risco: "Crescimento estrutural modesto; energia e geopolítica são fantasmas recorrentes.", pitch: "As multinacionais europeias — valuation historicamente mais gentil que o americano." },
  "EWJ": { papel: "Japão isolado: governança em reforma e indústria de precisão.", risco: "Iene mexe forte no resultado em dólar; décadas de andar de lado no retrovisor.", pitch: "O Japão que voltou ao radar global — reformas corporativas destravando valor antigo." },
  "VWO": { papel: "Emergentes na fonte (FTSE): China, Índia, Taiwan e cia — inclui menos Coreia que o MSCI.", risco: "Volatilidade e política em dose dupla; China pesa muito na cesta.", pitch: "O crescimento demográfico do planeta numa cota — os mercados onde o século XXI acontece." },
  "EEM": { papel: "Emergentes MSCI — o veterano da categoria, mais caro que o VWO.", risco: "Igual VWO com taxa maior; usado por liquidez em derivativos.", pitch: "O índice emergente clássico do mercado — o mesmo mundo em outra régua." },
  "ACWI": { papel: "Mundo inteiro (desenvolvidos + emergentes) na fonte americana.", risco: "~60% EUA na prática; e o pacote offshore de sempre pra brasileiro.", pitch: "Um ticker, o planeta: a alocação global definitiva pra quem quer parar de escolher país." },
  "MCHI": { papel: "China ampla (MSCI): a segunda economia do mundo isolada na carteira.", risco: "Risco regulatório e geopolítico em outro patamar — posição satélite, nunca núcleo.", pitch: "A China investível inteira — tecnologia, consumo e indústria do gigante asiático." },
  "FXI": { papel: "China large caps (50 maiores): a versão concentrada e estatal-pesada do gigante.", risco: "Mais bancos estatais, menos tech — e o mesmo risco político do MCHI.", pitch: "As blue chips chinesas — o jeito mais direto de expressar visão sobre Pequim." },
  "INDA": { papel: "Índia isolada: demografia, digitalização e a tese estrutural mais querida da década.", risco: "Valuation cronicamente caro — o mercado já sabe da história e cobra por ela.", pitch: "O país que mais cresce entre os grandes — a aposta demográfica do século em uma cota." },
  "EWZ": { papel: "Brasil em dólar: nosso mercado visto de fora — útil pra comparações e hedge tático.", risco: "Volatilidade dupla (bolsa + câmbio) e a mesma concentração do Ibovespa.", pitch: "O Brasil como o gringo enxerga — bolsa local com o dólar embutido no retorno." },
  // === Temáticos e renda ===
  "ARKK": { papel: "Inovação disruptiva com gestão ativa: a aposta concentrada em futuro distante.", risco: "Drawdowns brutais (histórico de -70%+) — tese de convicção, tamanho de tempero.", pitch: "As empresas que podem mudar o mundo em 10 anos — com a volatilidade que essa promessa cobra." },
  "ARKW": { papel: "Internet de próxima geração e fintech — recorte digital da família ARK.", risco: "Mesmo DNA do ARKK: concentração, convicção e solavancos épicos.", pitch: "A carteira de quem acredita que a internet ainda está no começo." },
  "ARKG": { papel: "Genômica e biotecnologia de fronteira: a aposta mais científica da prateleira.", risco: "Empresas pré-lucro, aprovações regulatórias binárias — o mais volátil dos temas.", pitch: "A medicina do futuro — edição genética e diagnóstico molecular — pra quem tem estômago de pioneiro." },
  "BOTZ": { papel: "Robótica e IA global: automação industrial + inteligência artificial em cesta.", risco: "Tema quente = valuation esticado; Japão pesa mais do que se imagina na cesta.", pitch: "As fábricas do futuro e quem as constrói — automação como tese de década." },
  "AIQ": { papel: "IA e big data em cesta ampla: o tema mais falado do mundo, diversificado.", risco: "Todo mundo já correu pra cá — pagar caro pelo óbvio é o risco número um.", pitch: "A revolução da inteligência artificial inteira, sem apostar numa empresa só." },
  "URA": { papel: "Urânio e nuclear: energia limpa firme — tese de oferta apertada.", risco: "Setor minúsculo e político: um acidente nuclear no mundo muda tudo de preço.", pitch: "A volta da energia nuclear — o combustível da transição que ninguém quer nomear." },
  "LIT": { papel: "Lítio e baterias: a cadeia de suprimento da eletrificação.", risco: "Preço do lítio é montanha-russa; China domina a cadeia — risco geopolítico embutido.", pitch: "Da mina à bateria: a matéria-prima da era elétrica em uma cota." },
  "BUG": { papel: "Cibersegurança: gasto corporativo obrigatório e crescente — tema defensivo dentro de tech.", risco: "Múltiplos altos; consolidação do setor muda líderes rápido.", pitch: "O único orçamento de TI que nenhum CEO corta — segurança digital como tese perene." },
  "COPX": { papel: "Mineradoras de cobre: a aposta indireta em eletrificação e infraestrutura.", risco: "Alavancado no preço do metal — cai mais que o cobre na baixa.", pitch: "O metal da eletrificação pelo lado de quem o tira do chão." },
  "PAVE": { papel: "Infraestrutura americana: construção, materiais e engenharia — vento fiscal a favor.", risco: "Depende de ciclo de investimento público — eleições mexem na tese.", pitch: "A reconstrução da infraestrutura dos EUA — concreto, aço e décadas de obra pela frente." },
  "QYLD": { papel: "Covered call sobre Nasdaq: transforma volatilidade em renda mensal ALTA.", risco: "Vende a alta em troca da renda: em bull market fica MUITO pra trás; o principal tende a se erodir.", pitch: "Renda mensal gorda extraída da volatilidade da Nasdaq — pra quem prioriza o fluxo e aceita abrir mão da valorização." },
  "JEPI": { papel: "Renda mensal com S&P 500 + opções: o meio-termo entre bolsa e fluxo de caixa.", risco: "Em rali forte, participa só em parte da alta — o prêmio da renda tem esse custo.", pitch: "Bolsa americana que paga aluguel mensal — volatilidade menor, fluxo constante." },
  "JEPQ": { papel: "O JEPI da Nasdaq: renda mensal com motor growth por trás.", risco: "Mais volátil que o JEPI (a base é tech) e mesma troca: renda hoje por alta amanhã.", pitch: "Renda mensal com as empresas de tecnologia como lastro — fluxo e futuro no mesmo ticker." },
  "IBIT": { papel: "Bitcoin spot pela BlackRock: o selo institucional definitivo do ativo.", risco: "O risco é o Bitcoin, não o veículo: metade do valor pode sumir num ciclo — e voltar no outro.", pitch: "Bitcoin com a chancela da maior gestora do mundo — acesso institucional ao ouro digital." },
  // === UCITS (Irlanda) ===
  "VUAA": { papel: "S&P 500 UCITS acumulador: núcleo EUA sem estate tax americano e sem dividendo pra declarar.", risco: "Liquidez menor que os irmãos americanos; horário europeu de negociação.", pitch: "O S&P 500 na embalagem mais eficiente pra brasileiro: acumula dividendo sozinho e simplifica a sucessão." },
  "CSPX": { papel: "Gêmeo do VUAA (iShares): S&P 500 acumulador na Irlanda — o mais tradicional dos UCITS.", risco: "Mesmo pacote do VUAA; escolha por corretora e liquidez disponível.", pitch: "S&P 500 blindado pra herança e sem pingar dividendo — compõe em silêncio." },
  "CNDX": { papel: "Nasdaq-100 UCITS acumulador: o growth americano na embalagem europeia.", risco: "Volatilidade cheia da Nasdaq + liquidez UCITS — dimensione com calma.", pitch: "As mega-techs americanas com eficiência fiscal europeia — crescimento que se reinveste sozinho." },
  "VWRA": { papel: "Mundo TODO acumulador (FTSE All-World): a carteira global de 1 linha na melhor embalagem.", risco: "Como todo 'mundo': maioria EUA; e liquidez menor que os ETFs americanos.", pitch: "Um ticker pra vida inteira: o planeta acumulando dividendos automaticamente, sem estate tax." },
  "IWDA": { papel: "MSCI World acumulador (só desenvolvidos): o núcleo global clássico UCITS.", risco: "Sem emergentes — quem quiser, completa com EIMI.", pitch: "Os mercados desenvolvidos do mundo compondo em piloto automático." },
  "EIMI": { papel: "Emergentes UCITS (MSCI EM IMI): o complemento do IWDA pra fechar o mundo.", risco: "Volatilidade emergente de sempre, na embalagem irlandesa.", pitch: "A peça que falta do quebra-cabeça global — emergentes acumulando junto." },
  "SWRD": { papel: "MSCI World da State Street: mesma função do IWDA com taxa menor.", risco: "Mais novo e menos líquido que o IWDA; a taxa compensa pra quem segura.", pitch: "O mundo desenvolvido pela menor taxa da categoria UCITS." },
  "IB01": { papel: "T-Bills UCITS: caixa em dólar na embalagem irlandesa — o SHV sem estate tax.", risco: "É estacionamento em dólar: rende o juro curto, nada além.", pitch: "Dólar parado rendendo Treasury de curtíssimo prazo — o caixa offshore bem resolvido." },
  "FLOA": { papel: "Floating rate em dólar: pós-fixado americano — rende mais quando o Fed sobe juro.", risco: "Crédito corporativo por trás — não é Treasury puro.", pitch: "O 'CDI americano': renda que acompanha o juro do Fed, sem risco de marcação." },
};

