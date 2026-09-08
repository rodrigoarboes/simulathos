// academia/js/app-apresentacao.js — extraído de index.html (linhas 6647-7672 do monólito original)

/* =================================================================================
   REGISTRO DE CHARTS DOS SLIDES (APRESENTACAO-10)
   Todo Chart.js criado dentro de um slide passa por aqui. Antes de recriar,
   destrói a instância anterior daquele canvas — sem isso, cada re-render deixava
   um Chart órfão preso ao canvas (memória + tooltips fantasma).
   ================================================================================= */
var chartsDosSlides = {};

function destruirChartsDosSlides() {
  Object.keys(chartsDosSlides).forEach(function (k) {
    var c = chartsDosSlides[k];
    if (c && typeof c.destroy === "function") {
      try { c.destroy(); } catch (e) {}
    }
    delete chartsDosSlides[k];
  });
}

function criarChartSlide(chaveOuCanvas, config) {
  var canvas = typeof chaveOuCanvas === "string"
    ? document.getElementById(chaveOuCanvas)
    : chaveOuCanvas;
  if (!canvas) return null;
  var chave = canvas.id || String(chaveOuCanvas);
  if (chartsDosSlides[chave] && typeof chartsDosSlides[chave].destroy === "function") {
    try { chartsDosSlides[chave].destroy(); } catch (e) {}
  }
  delete chartsDosSlides[chave];
  if (typeof Chart === "undefined") return null;
  var inst = new Chart(canvas.getContext("2d"), config);
  chartsDosSlides[chave] = inst;
  return inst;
}

/* ---- Formatação pt-BR (Intl) usada em todos os slides ---- */
var FMT_BRL_APRES = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
var FMT_PCT1_APRES = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
var FMT_NUM2_APRES = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function apresBRL(v) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  return FMT_BRL_APRES.format(v);
}
function apresPct(fracao, casas) {
  if (fracao === null || fracao === undefined || !isFinite(fracao)) return "—";
  var f = new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas === undefined ? 1 : casas,
    maximumFractionDigits: casas === undefined ? 1 : casas
  });
  return f.format(fracao * 100) + "%";
}
function apresNum(v, casas) {
  if (v === null || v === undefined || !isFinite(v)) return "—";
  if (casas === undefined || casas === null) casas = 1;
  if (casas === 1) return FMT_PCT1_APRES.format(v);
  if (casas === 2) return FMT_NUM2_APRES.format(v);
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas, maximumFractionDigits: casas
  }).format(v);
}

/* ---- Ícones inline (substituem os emojis dos títulos de etapa) ---- */
var ICONES_ETAPA = {
  olho:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/></svg>',
  lupa:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
  chama:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3c3 3.4 5.5 6 5.5 9.5A5.5 5.5 0 0 1 12 18a5.5 5.5 0 0 1-5.5-5.5C6.5 9.6 8.4 7.7 12 3z"/><path d="M12 18c1.8 0 3-1.2 3-2.8 0-1.5-1.2-2.4-3-4.2-1.8 1.8-3 2.7-3 4.2 0 1.6 1.2 2.8 3 2.8z"/></svg>',
  check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5"/></svg>',
  alerta:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4l9 16H3z"/><path d="M12 10v4"/><path d="M12 17.2v.1"/></svg>',
  barras:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M21 20H3"/></svg>',
  lampada: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5.9 1.1 1 1.6h5c.1-.5.4-1.1 1-1.6A6 6 0 0 0 12 3z"/></svg>',
  diamante:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18"/><path d="M12 3l-3 6 3 12 3-12-3-6z"/></svg>',
  presente:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="9" width="18" height="11" rx="1.5"/><path d="M3 13h18"/><path d="M12 9v11"/><path d="M12 9S9.5 4.5 7.5 5.4C6.2 6 6.6 9 12 9zM12 9s2.5-4.5 4.5-3.6C17.8 6 17.4 9 12 9z"/></svg>',
  subida:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>'
};
function iconeEtapa(chave) {
  return '<span class="etapa-icone-svg">' + (ICONES_ETAPA[chave] || ICONES_ETAPA.check) + '</span>';
}

function inserirGraficoNoSlide(tipo) {
  const i = graficosInseridos.findIndex(g => g.tipo === tipo);
  if (i === -1) {
    // Insere com posição padrão "fim" — o aluno ajusta no select
    graficosInseridos.push({ tipo: tipo, posicao: "fim" });
  } else {
    graficosInseridos.splice(i, 1); // toggle: clicar de novo remove
  }
  atualizarBotoesInseridos();
  salvarPitchPersistido();
  if (frameworkAtual && document.getElementById("slide-viewport") &&
      document.getElementById("slide-viewport").children.length > 0) {
    renderSlides();
  }
}

// Valida a posição contra o framework atual (APRESENTACAO-05): ao trocar de
// framework, uma posição "etapa-N" antiga pode não existir mais.
function posicaoValida(posicao) {
  return opcoesDePosicao().some(o => o.val === posicao);
}

function normalizarPosicoesGraficos() {
  let mudou = false;
  graficosInseridos.forEach(g => {
    if (!posicaoValida(g.posicao)) { g.posicao = "fim"; mudou = true; }
  });
  return mudou;
}

function mudarPosicaoGrafico(tipo, posicao) {
  const g = graficosInseridos.find(g => g.tipo === tipo);
  if (!g) return;
  if (!posicaoValida(posicao)) posicao = "fim";
  g.posicao = posicao;
  salvarPitchPersistido();
  atualizarBotoesInseridos();
  if (frameworkAtual && document.getElementById("slide-viewport") &&
      document.getElementById("slide-viewport").children.length > 0) {
    renderSlides();
  }
}

// Opções de posição disponíveis (depende do framework escolhido)
function opcoesDePosicao() {
  const ops = [{ val: "inicio", label: "No início (antes de tudo)" }];
  if (frameworkAtual && FRAMEWORKS[frameworkAtual]) {
    FRAMEWORKS[frameworkAtual].etapas.forEach((et, idx) => {
      ops.push({ val: `etapa-${idx}`, label: `Depois da etapa ${idx + 1} (${et.titulo})` });
    });
  }
  ops.push({ val: "fim", label: "No fim (antes do encerramento)" });
  return ops;
}

function atualizarBotoesInseridos() {
  // Atualiza o estado visual dos botões de inserir
  document.querySelectorAll(".btn-inserir-slide").forEach(btn => {
    const onclick = btn.getAttribute("onclick") || "";
    const m = onclick.match(/'(\w+)'/);
    if (m) {
      const inserido = graficosInseridos.some(g => g.tipo === m[1]);
      btn.classList.toggle("inserido", inserido);
      btn.textContent = inserido ? "Inserido — clique para remover" : "Inserir nos slides do pitch";
    }
  });

  // Aviso + seletores de posição
  const aviso = document.getElementById("graficos-inseridos-aviso");
  if (!aviso) return;
  if (graficosInseridos.length > 0) {
    normalizarPosicoesGraficos();
    const ops = opcoesDePosicao();
    const linhas = graficosInseridos.map(g => {
      const meta = GRAFICOS_META[g.tipo] || { titulo: g.tipo };
      const selectOps = ops.map(o =>
        `<option value="${o.val}" ${o.val === g.posicao ? 'selected' : ''}>${o.label}</option>`
      ).join("");
      return `
        <div class="grafico-pos-linha">
          <span class="grafico-pos-nome">${escapeHtml(meta.titulo)}</span>
          <select class="grafico-pos-select" onchange="mudarPosicaoGrafico('${g.tipo}', this.value)">
            ${selectOps}
          </select>
        </div>
      `;
    }).join("");
    aviso.className = "graficos-inseridos-aviso show";
    aviso.innerHTML = `
      <strong>${graficosInseridos.length} gráfico(s) na apresentação.</strong>
      Escolha onde cada um aparece:
      ${linhas}
    `;
  } else {
    aviso.className = "graficos-inseridos-aviso";
    aviso.innerHTML = "";
  }
}

// Renderiza os Chart.js dentro dos slides de gráfico (chamado após renderSlides)
function renderChartsNosSlides() {
  graficosInseridos.forEach(g => {
    const tipo = g.tipo;
    const canvas = document.getElementById(`slide-canvas-${tipo}`);
    if (!canvas) return;
    const d = DADOS_MERCADO;

    if (tipo === "r100") {
      criarChartSlide(canvas, {
        type: "line",
        data: {
          labels: d.dolar.meses,
          datasets: [{
            data: d.dolar.r100emdolar,
            borderColor: corCSS("--brand-red"),
            backgroundColor: "rgba(161,32,38,0.12)",
            borderWidth: 2, fill: true, pointRadius: 0, tension: 0.2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } },
            y: { beginAtZero: true, ticks: { font: { size: 11 }, callback: v => "US$ " + v } }
          }
        }
      });
    }
    else if (tipo === "dolar") {
      criarChartSlide(canvas, {
        type: "line",
        data: {
          labels: d.dolar.meses,
          datasets: [{
            data: d.dolar.valores,
            borderColor: corCSS("--brand-blue"),
            backgroundColor: "rgba(0,136,204,0.08)",
            borderWidth: 2, fill: true, pointRadius: 0, tension: 0.2
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { font: { size: 11 }, callback: v => "R$ " + v.toFixed(2) } }
          }
        }
      });
    }
    else if (tipo === "indices") {
      criarChartSlide(canvas, {
        type: "line",
        data: {
          labels: d.indices.meses,
          datasets: [
            { label: "CDI", data: d.indices.cdi, borderColor: corCSS("--brand-blue"), borderWidth: 2, pointRadius: 0, tension: 0.2 },
            { label: "IPCA", data: d.indices.ipca, borderColor: corCSS("--brand-red"), borderWidth: 2, pointRadius: 0, tension: 0.2 },
            { label: "Poupança", data: d.indices.poupanca, borderColor: corCSS("--brand-orange"), borderWidth: 2, pointRadius: 0, tension: 0.2, borderDash: [5,4] }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } } },
          scales: {
            x: { ticks: { maxTicksLimit: 7, font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { font: { size: 11 }, callback: v => "R$ " + v.toFixed(0) } }
          }
        }
      });
    }
    else if (tipo === "imablongo") {
      const payload = imabLongoUltimo || leCacheImabLongo();
      if (!payload) return;
      const s = payload.series;
      criarChartSlide(canvas, {
        type: "line",
        data: {
          labels: s.meses.map(mesLabel),
          datasets: [
            { label: "IMA-B", data: s.imab, borderColor: corCSS("--ok"), borderWidth: 2.5, pointRadius: 0, tension: 0.2 },
            { label: "CDI", data: s.cdi, borderColor: corCSS("--brand-blue"), borderWidth: 2, pointRadius: 0, tension: 0.2 },
            { label: "IPCA", data: s.ipca, borderColor: corCSS("--brand-red"), borderWidth: 2, pointRadius: 0, tension: 0.2 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } } },
          scales: {
            x: { ticks: { maxTicksLimit: 8, font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { font: { size: 11 }, callback: v => "R$ " + Number(v).toFixed(0) } }
          }
        }
      });
    }
    else if (tipo === "imab") {
      const dImab = dadosGraficoImab();
      if (!dImab) return;
      criarChartSlide(canvas, {
        type: "line",
        data: {
          labels: dImab.meses,
          datasets: [
            { label: "IMA-B (IMAB11)", data: dImab.imab, borderColor: corCSS("--ok"), borderWidth: 2.5, pointRadius: 0, tension: 0.2 },
            { label: "CDI", data: dImab.cdi, borderColor: corCSS("--brand-blue"), borderWidth: 2, pointRadius: 0, tension: 0.2 },
            { label: "IPCA", data: dImab.ipca, borderColor: corCSS("--brand-red"), borderWidth: 2, pointRadius: 0, tension: 0.2 }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } } },
          scales: {
            x: { ticks: { maxTicksLimit: 7, font: { size: 11 } }, grid: { display: false } },
            y: { ticks: { font: { size: 11 }, callback: v => "R$ " + v.toFixed(0) } }
          }
        }
      });
    }
  });
}

// Gera o HTML de um slide de gráfico
function htmlSlideGrafico(tipo) {
  const meta = GRAFICOS_META[tipo];
  if (!meta) return "";
  return montarSlide("", `
    <div class="slide-num">DADO DE MERCADO</div>
    <h3>${escapeHtml(meta.titulo)}</h3>
    <div class="slide-grafico-wrap">
      <div class="slide-grafico-canvas">
        <canvas id="slide-canvas-${tipo}"></canvas>
      </div>
      <div class="slide-grafico-fonte">Fonte: ${escapeHtml(meta.fonte)} · dados congelados em ${escapeHtml(meta.congelado || DADOS_MERCADO._atualizado)}</div>
    </div>
  `, marcaCaseRodape());
}


// Fechar qualquer drawer aberto com tecla ESC
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    fecharDrawer();
    fecharAjudaMacro();
    fecharGraficos();
    if (emModoApresentacao) sairModoApresentacao();
  }
});

/* =================================================================================
   TELA 5 — Estruturação do Pitch (AIDA/PASA/GBGA)
   ================================================================================= */
const FRAMEWORKS = {
  AIDA: {
    nome: "AIDA",
    etapas: [
      { id: "A", icone: "olho", titulo: "Atenção", desc: "Como você quebra o piloto automático do cliente? O que o faz parar e ouvir? Use um número que dói, uma comparação inesperada, uma pergunta provocadora." },
      { id: "I", icone: "lupa", titulo: "Interesse", desc: "Por que isso é relevante para ELE especificamente? Conecte com a vida, dores, objetivos. Mostre que você entendeu o caso." },
      { id: "D", icone: "chama", titulo: "Desejo", desc: "Por que AGORA é o momento? O que muda com sua proposta? Pinte o cenário do 'depois' — concreto, mensurável." },
      { id: "Ação", icone: "check", titulo: "Ação", desc: "Próximo passo claro, simples, com prazo. NÃO use 'pensar' ou 'considerar'. Use: 'assinar', 'transferir', 'agendar para sexta'." }
    ]
  },
  PASA: {
    nome: "PASA",
    etapas: [
      { id: "P", icone: "alerta", titulo: "Problema", desc: "Nomeie a dor real que o cliente está vivendo (mesmo que ele ainda não tenha verbalizado). Use os dados do caso para tornar tangível." },
      { id: "A1", icone: "barras", titulo: "Argumentos / Ampliação", desc: "Mostre o tamanho do problema com números. Não basta dizer 'você está perdendo'. Quantifique. Compare. Mostre o custo de não agir." },
      { id: "S", icone: "lampada", titulo: "Solução", desc: "Apresente sua carteira como a resposta direta ao problema. Cada ETF deve ter uma justificativa ligada à dor levantada." },
      { id: "A2", icone: "check", titulo: "Ação", desc: "Conduza ao próximo passo. Quanto, quando, como. Remova fricção. Antecipe objeção e responda antes que apareça." }
    ]
  },
  GBGA: {
    nome: "GBGA",
    etapas: [
      { id: "G1", icone: "diamante", titulo: "Ganância", desc: "Acione o desejo de ganho. Mostre o que outros (com o perfil dele) já estão construindo. Estimule ambição, não medo." },
      { id: "B", icone: "presente", titulo: "Benefícios", desc: "Liste as vantagens estruturais da sua proposta: diversificação, custo, tributação, retorno esperado. Use os ETFs alocados como prova." },
      { id: "G2", icone: "subida", titulo: "Ganhos", desc: "Projete o resultado em 5, 10, 20 anos. Use cenários (conservador/base/otimista). Mostre o efeito composto. Faça o cliente VER o patrimônio futuro." },
      { id: "A", icone: "check", titulo: "Ação", desc: "Próximo passo concreto, agressivo, com senso de janela curta (sem ser ansioso). Aproveite o momentum criado." }
    ]
  }
};

let frameworkAtual = null;
let pitchData = {}; // { etapaId: "texto..." }

/* =================================================================================
   STORAGE NAMESPACED (CARTEIRA-06)
   Todas as chaves desta tela passam a viver sob "simulathos:academia:". O helper de
   shared/js/utils.js já lê a chave legada "aida_vo4_<chave>" como fallback, então
   quem tinha tema/identidade salvos não perde nada — a próxima escrita já grava no
   namespace certo.
   ================================================================================= */
function apresStorageGet(chave) {
  try {
    if (window.Simulathos && window.Simulathos.storage &&
        typeof window.Simulathos.storage.get === "function") {
      return window.Simulathos.storage.get("academia", chave);
    }
  } catch (e) {}
  try { return localStorage.getItem("aida_vo4_" + chave); } catch (e) { return null; }
}

function apresStorageSet(chave, valor) {
  try {
    if (window.Simulathos && window.Simulathos.storage &&
        typeof window.Simulathos.storage.set === "function") {
      window.Simulathos.storage.set("academia", chave, valor);
      return;
    }
  } catch (e) {}
  try { localStorage.setItem("aida_vo4_" + chave, String(valor)); } catch (e) {}
}

/* =================================================================================
   PERSISTÊNCIA DO PITCH POR CASE (APRESENTACAO-03)
   Antes, pitchData/framework/graficosInseridos viviam só em memória: um F5 (ou um
   fechar de aba sem querer) apagava um pitch inteiro. Agora tudo é salvo por case,
   via Estado.salvarPitch quando disponível, com fallback direto em localStorage.
   ================================================================================= */
const PITCH_STORAGE_PREFIXO = "simulathos:academia:pitch:";

function pitchCaseId() {
  const c = (typeof caseParaPitch === "function") ? caseParaPitch() : null;
  if (c && c.id !== undefined && c.id !== null) return String(c.id);
  return "livre";
}

function pitchPayloadAtual() {
  return {
    framework: frameworkAtual,
    pitchData: pitchData,
    graficosInseridos: graficosInseridos.map(g => ({ tipo: g.tipo, posicao: g.posicao })),
    apresentacao: {
      tituloApresentacao: alunoIdentidade.tituloApresentacao || "",
      nomeCliente: alunoIdentidade.nomeCliente || ""
    },
    salvoEm: new Date().toISOString()
  };
}

function salvarPitchPersistido() {
  const id = pitchCaseId();
  const payload = pitchPayloadAtual();
  if (window.Estado && typeof window.Estado.salvarPitch === "function") {
    try { window.Estado.salvarPitch(id, payload); return; } catch (e) {}
  }
  try {
    localStorage.setItem(PITCH_STORAGE_PREFIXO + id, JSON.stringify(payload));
  } catch (e) {}
}

let _pitchSaveTimer = null;
function salvarPitchDebounce() {
  clearTimeout(_pitchSaveTimer);
  _pitchSaveTimer = setTimeout(salvarPitchPersistido, 300);
}

function lerPitchPersistido() {
  const id = pitchCaseId();
  if (window.Estado && typeof window.Estado.restaurarPitch === "function") {
    try {
      const r = window.Estado.restaurarPitch(id);
      if (r && typeof r === "object") return r;
    } catch (e) {}
  }
  try {
    const bruto = localStorage.getItem(PITCH_STORAGE_PREFIXO + id);
    if (bruto) return JSON.parse(bruto);
  } catch (e) {}
  return null;
}

// Restaura o pitch do case atual para a memória. Retorna true se achou algo.
function restaurarPitchPersistido() {
  const r = lerPitchPersistido();
  if (!r) return false;
  if (r.pitchData && typeof r.pitchData === "object") {
    // Só sobrescreve o que está em memória se a memória estiver vazia para a chave
    Object.keys(r.pitchData).forEach(k => {
      if (!pitchData[k] || !String(pitchData[k]).trim()) pitchData[k] = r.pitchData[k];
    });
  }
  if (!frameworkAtual && r.framework && FRAMEWORKS[r.framework]) {
    frameworkAtual = r.framework;
  }
  if (Array.isArray(r.graficosInseridos) && graficosInseridos.length === 0) {
    r.graficosInseridos.forEach(g => {
      if (g && g.tipo && GRAFICOS_META[g.tipo]) {
        graficosInseridos.push({ tipo: g.tipo, posicao: g.posicao || "fim" });
      }
    });
  }
  if (r.apresentacao) {
    if (!alunoIdentidade.tituloApresentacao && r.apresentacao.tituloApresentacao) {
      alunoIdentidade.tituloApresentacao = r.apresentacao.tituloApresentacao;
    }
    if (!alunoIdentidade.nomeCliente && r.apresentacao.nomeCliente) {
      alunoIdentidade.nomeCliente = r.apresentacao.nomeCliente;
    }
  }
  return true;
}

/* =================================================================================
   ISOLAMENTO DE PITCH POR CASE (CARTEIRA-04)
   pitchData / frameworkAtual / graficosInseridos e o nome do cliente são variáveis de
   módulo. Ao trocar de case dentro da mesma sessão, elas continuavam com o conteúdo do
   case anterior e o texto do cliente A vazava para a tela do cliente B. Agora todo
   ponto de entrada da tela 5/6 chama sincronizarPitchComCase(): se o case mudou, o
   estado é zerado ANTES de tentar restaurar o pitch salvo do novo case.
   ================================================================================= */
let pitchCaseCarregado = null;

function resetarEstadoPitch() {
  pitchData = {};
  frameworkAtual = null;
  if (Array.isArray(graficosInseridos)) graficosInseridos.length = 0;
  // Cliente e título são do case/cliente, não do aluno: não podem atravessar.
  if (typeof alunoIdentidade === "object" && alunoIdentidade) {
    alunoIdentidade.nomeCliente = "";
    alunoIdentidade.tituloApresentacao = "";
  }
  const elCli = document.getElementById("id-cliente");
  if (elCli) elCli.value = "";
  const elTit = document.getElementById("id-titulo-apres");
  if (elTit) elTit.value = "";
  resetCronometro();
}

// Retorna true se houve troca de case (e portanto reset).
function sincronizarPitchComCase() {
  const id = pitchCaseId();
  if (pitchCaseCarregado !== null && pitchCaseCarregado !== id) {
    resetarEstadoPitch();
    pitchCaseCarregado = id;
    return true;
  }
  pitchCaseCarregado = id;
  return false;
}

function limparPitchPersistido() {
  const id = pitchCaseId();
  if (window.Estado && typeof window.Estado.limparPitch === "function") {
    try { window.Estado.limparPitch(id); } catch (e) {}
  }
  try { localStorage.removeItem(PITCH_STORAGE_PREFIXO + id); } catch (e) {}
}

function sugerirFramework() {
  const c = caseParaPitch();
  // Lógica de sugestão baseada no perfil e contexto (Modo Livre cai no AIDA)
  const perfil = c.perfil;
  const ciclo = c.ciclo;

  if (perfil === "arrojado") return "GBGA"; // Ambição, crescimento
  if (perfil === "conservador" && (ciclo === "crise" || ciclo === "queda-selic")) return "PASA"; // Dor concreta
  return "AIDA"; // Padrão universal
}

function irTela5() {
  // Case mudou desde o último pitch em memória? Zera antes de qualquer render.
  sincronizarPitchComCase();
  // Inicializa contexto (Modo Livre usa o pseudo-case "Carteira própria")
  document.getElementById("tela5-titulo").textContent = `Estruturar pitch — ${caseParaPitch().titulo}`;
  renderContextoResumo();

  // Limpa sugestões anteriores
  ["AIDA", "PASA", "GBGA"].forEach(f => {
    document.getElementById(`suger-${f}`).style.display = "none";
  });
  // Marca sugestão
  const sugerido = sugerirFramework();
  if (sugerido) {
    document.getElementById(`suger-${sugerido}`).style.display = "inline-block";
  }

  // Restaura o pitch salvo deste case (framework, textos e gráficos escolhidos)
  restaurarPitchPersistido();

  // Se já tinha framework selecionado, mantém. Senão, aplica o sugerido
  if (!frameworkAtual) {
    frameworkAtual = sugerido;
  }
  selecionarFramework(frameworkAtual, true);
  normalizarPosicoesGraficos();
  atualizarBotoesInseridos();

  // Reseta cronômetro ao entrar na tela
  resetCronometro();

  trocarTela("tela5");
}

function renderContextoResumo() {
  // Resumo carteira (top 3 ETFs por %)
  const tickers = montagemAtual
    .filter(l => l.ticker && l.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3)
    .map(l => `${l.ticker} (${l.pct.toFixed(0)}%)`)
    .join(", ");

  const cont = document.getElementById("contexto-grid-tela5");
  cont.innerHTML = `
    <div class="contexto-item">
      <strong>Cliente</strong>
      ${caseParaPitch().cliente.split(',').slice(0, 2).join(',')}
    </div>
    <div class="contexto-item">
      <strong>Perfil</strong>
      ${caseAtual ? `${caseAtual.perfil} · ${labelCiclo(caseAtual.ciclo)}` : 'Modo Livre — você define na conversa'}
    </div>
    <div class="contexto-item">
      <strong>Top carteira</strong>
      ${tickers || "Não montada"}
    </div>
    <div class="contexto-item">
      <strong>Macro-chave</strong>
      ${getCenarioAtivo().trim() ? getCenarioAtivo().split('.')[0] + '.' : 'Modo Livre — traga o cenário na sua fala'}
    </div>
  `;
}

function selecionarFramework(fw, silencioso = false) {
  frameworkAtual = fw;

  // Atualiza UI dos botões
  document.querySelectorAll(".framework-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.framework === fw);
  });

  // Renderiza as 4 etapas
  renderEtapasPitch();

  // Reset do pitch data se trocou de framework (mas não se for restauração)
  if (!silencioso) {
    pitchData = {};
    normalizarPosicoesGraficos();
    renderEtapasPitch();
    atualizarBotoesInseridos();
  }
  salvarPitchDebounce();
}

function renderEtapasPitch() {
  if (!frameworkAtual) return;
  const fw = FRAMEWORKS[frameworkAtual];
  const cont = document.getElementById("etapas-pitch");
  if (!cont) return;

  // Restauração: se a memória está vazia, recupera o que foi salvo neste case
  const temTexto = fw.etapas.some(et => (pitchData[et.id] || "").trim());
  if (!temTexto) restaurarPitchPersistido();

  cont.innerHTML = fw.etapas.map((et, idx) => {
    const conectores = gerarConectores(idx, et);
    const textoSalvo = pitchData[et.id] || "";
    const preenchidoClass = textoSalvo.trim().length > 30 ? "preenchido" : "";

    return `
      <div class="etapa-pitch" data-etapa="${idx + 1}">
        <div class="etapa-header">
          <div class="etapa-titulo">
            ${iconeEtapa(et.icone)}
            ${et.titulo}
          </div>
          <div class="etapa-header-dir" style="display:flex;align-items:center;gap:10px;">
            <span class="etapa-numero">ETAPA ${idx + 1}/4</span>
            <button type="button" class="btn btn--secondary btn-rascunho-bloco"
                    onclick="gerarRascunhoEtapa('${et.id}', this)"
                    title="Monta um rascunho com os dados reais deste case e da sua carteira">Gerar rascunho</button>
            <button type="button" class="btn btn--ghost btn-copiar-bloco" onclick="copiarBlocoPitch('${et.id}', this)">Copiar</button>
          </div>
        </div>
        <div class="etapa-descricao">${et.desc}</div>

        ${conectores ? `
          <div class="conectores">
            <h6>Conexões sugeridas para este case</h6>
            ${conectores}
          </div>
        ` : ""}

        <textarea class="etapa-textarea ${preenchidoClass}" 
                  id="textarea-${et.id}"
                  placeholder="Escreva aqui como você abordaria essa etapa com o cliente..."
                  oninput="atualizarPitch('${et.id}', this.value)">${textoSalvo}</textarea>
        <div class="contador-chars" id="contador-${et.id}">${textoSalvo.length} caracteres</div>
      </div>
    `;
  }).join("");
}

function gerarConectores(idx, etapa) {
  if (!caseAtual) return null;
  const conectores = [];

  // Pega top 2 ETFs da carteira do aluno
  const topETFs = montagemAtual
    .filter(l => l.ticker && l.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2);

  // Lógica por etapa (idx 0=atenção/problema/ganância, 3=ação)
  if (idx === 0) {
    // Atenção / Problema / Ganância — gancho inicial
    const objetivoChave = caseAtual.objetivos[0] || "";
    const restricaoChave = caseAtual.restricoes[0] || "";
    conectores.push({ tag: "Macro", txt: getCenarioAtivo().split('.')[0] + "." });
    if (objetivoChave) conectores.push({ tag: "Objetivo", txt: objetivoChave });
    if (restricaoChave) conectores.push({ tag: "Medo / Dor", txt: restricaoChave });
  }
  else if (idx === 1) {
    // Interesse / Argumentos / Benefícios — sustentação
    if (caseAtual.objetivos[1]) conectores.push({ tag: "Objetivo 2", txt: caseAtual.objetivos[1] });
    conectores.push({ tag: "Dados patrimônio", txt: Object.entries(caseAtual.dados).slice(0, 2).map(([k, v]) => `${k}: ${v}`).join(" · ") });
    if (topETFs[0]) {
      const a = resolverAtivo(topETFs[0].ticker);
      if (a) {
        const d = descricaoAtivo(a.ticker);
        conectores.push({
          tag: "Ativo principal",
          txt: `${a.ticker} (${apresNum(topETFs[0].pct, 0)}%)` + (d ? ` — ${d}` : "")
        });
      }
    }
  }
  else if (idx === 2) {
    // Desejo / Solução / Ganhos — projeção
    if (topETFs[0] && topETFs[1]) {
      const e1 = resolverAtivo(topETFs[0].ticker);
      const e2 = resolverAtivo(topETFs[1].ticker);
      if (e1 && e2) {
        conectores.push({
          tag: "Composição",
          txt: `${e1.ticker} + ${e2.ticker} = ${apresNum(topETFs[0].pct + topETFs[1].pct, 0)}% da carteira`
        });
      }
    }
    conectores.push({ tag: "Justificativa", txt: caseAtual.justificativa.split('.')[0] + "." });
    if (caseAtual.objetivos[2]) conectores.push({ tag: "Resultado-alvo", txt: caseAtual.objetivos[2] });
  }
  else if (idx === 3) {
    // Ação
    conectores.push({ tag: "Aporte sugerido", txt: apresBRL(caseAtual.aporte_sugerido || 0) });
    conectores.push({ tag: "Cuidado", txt: caseAtual.restricoes[caseAtual.restricoes.length - 1] || "Verifique restrições do briefing" });
  }

  if (conectores.length === 0) return null;
  return conectores.map(c => `
    <div class="conector-item">
      <span class="conector-tag">${c.tag}</span>
      <span>${c.txt}</span>
    </div>
  `).join("");
}

/* =================================================================================
   GERAR RASCUNHO DA ETAPA (tela 5)
   Determinístico: mesma carteira + mesmo case = mesmo texto, sempre. Nada é
   inventado — toda frase sai do briefing do case, da carteira montada ou do
   backtest já calculado. Onde não há dado, a frase simplesmente não entra.
   ================================================================================= */

// Primeira frase de um texto, sem ponto final duplicado.
function _fraseInicial(txt) {
  const t = String(txt || "").trim();
  if (!t) return "";
  const corte = t.split(/(?<=[.!?])\s/)[0].trim();
  return corte.replace(/[.;,]+$/, "") + ".";
}

function _pitchPrimeiroNome() {
  const cli = (alunoIdentidade && alunoIdentidade.nomeCliente ? String(alunoIdentidade.nomeCliente) : "").trim();
  if (cli) return cli.split(/[\s,]+/)[0];
  const c = caseParaPitch();
  const bruto = (c && c.cliente) ? String(c.cliente).trim() : "";
  if (!bruto) return "";
  const primeiro = bruto.split(",")[0].trim().split(/\s+/)[0];
  return /^[A-Za-zÀ-ÿ]/.test(primeiro) ? primeiro : "";
}

function _pitchVocativo() {
  const n = _pitchPrimeiroNome();
  return n ? n + ", " : "";
}

// Junta vocativo + frase sem deixar maiúscula no meio da frase ("Pedro, Antes de...").
function _pitchAbrirCom(voc, frase) {
  if (!voc) return frase;
  const f = String(frase || "");
  if (!f) return voc.replace(/,\s*$/, "");
  const resto = f.slice(1);
  // Só rebaixa a inicial se a palavra não for um nome próprio/sigla (2+ maiúsculas seguidas).
  const ehSigla = /^[A-ZÀ-Ý]{2,}/.test(f);
  return voc + (ehSigla ? f : f.charAt(0).toLowerCase() + resto);
}

// Pega um dado do briefing por trecho de chave (case-insensitive). null se não houver.
function _pitchDado(trechos) {
  const c = caseParaPitch();
  if (!c || !c.dados) return null;
  const chaves = Object.keys(c.dados);
  for (let i = 0; i < trechos.length; i++) {
    const alvo = trechos[i].toLowerCase();
    for (let j = 0; j < chaves.length; j++) {
      if (chaves[j].toLowerCase().indexOf(alvo) !== -1) {
        return { chave: chaves[j], valor: String(c.dados[chaves[j]]) };
      }
    }
  }
  return null;
}

function _pitchTopAtivos(n) {
  return montagemAtual
    .filter(l => l.ticker && l.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, n || 3);
}

function _pitchLinhaAtivo(linha) {
  const aporte = aporteApresentacao();
  const desc = descricaoAtivo(linha.ticker);
  const classe = classeAtivo(linha.ticker);
  const reais = (aporte !== null) ? " (" + apresBRL(aporte * ((Number(linha.pct) || 0) / 100)) + ")" : "";
  return "- " + linha.ticker + " · " + apresNum(Number(linha.pct) || 0, 1) + "%" + reais +
         " — " + (desc || classe);
}

const RASCUNHO_ABERTURA = {
  AIDA: [
    "Antes de falar de produto, quero te mostrar um número.",
    "Por que isso é sobre você, e não sobre o mercado:",
    "O que muda na prática se a gente fizer isso agora:",
    "O próximo passo é curto e é hoje:"
  ],
  PASA: [
    "O problema não é quanto você tem. É onde está.",
    "Deixa eu dimensionar isso com número, não com opinião:",
    "A proposta responde exatamente a esse problema:",
    "Para resolver, o passo é este:"
  ],
  GBGA: [
    "Tem um ganho que hoje passa ao lado da sua carteira.",
    "O que essa estrutura te entrega, item por item:",
    "Onde isso te coloca daqui pra frente:",
    "Para começar a capturar isso:"
  ]
};

function rascunhoTextoEtapa(idx) {
  const fw = FRAMEWORKS[frameworkAtual];
  if (!fw) return "";
  const c = caseParaPitch();
  const aberturas = RASCUNHO_ABERTURA[frameworkAtual] || RASCUNHO_ABERTURA.AIDA;
  const partes = [];
  const voc = _pitchVocativo();
  const tops = _pitchTopAtivos(3);
  const aporte = aporteApresentacao();
  const bt = backtestParaSlides();

  if (idx === 0) {
    partes.push(_pitchAbrirCom(voc, aberturas[0]));
    const comp = _pitchDado(["composição atual", "composicao atual", "composição", "patrimônio total", "patrimonio total"]);
    if (comp) partes.push(comp.chave + ": " + comp.valor + ". É daqui que a gente parte.");
    const macro = _fraseInicial(getCenarioAtivo());
    if (macro) partes.push(macro + " Esse é o pano de fundo da conversa de hoje.");
    if (c && c.objetivos && c.objetivos[0]) {
      partes.push("O que você me colocou como prioridade foi: " + _fraseInicial(c.objetivos[0]));
    }
    if (c && c.restricoes && c.restricoes[0]) {
      partes.push("E o que não pode acontecer: " + _fraseInicial(c.restricoes[0]));
    }
  }
  else if (idx === 1) {
    partes.push(aberturas[1]);
    const renda = _pitchDado(["renda", "aporte mensal", "custo mensal"]);
    const horiz = _pitchDado(["horizonte", "reserva"]);
    if (renda) partes.push(renda.chave + ": " + renda.valor + ".");
    if (horiz) partes.push(horiz.chave + ": " + horiz.valor + ".");
    if (c && c.objetivos && c.objetivos[1]) {
      partes.push("Isso conversa direto com o seu segundo objetivo: " + _fraseInicial(c.objetivos[1]));
    }
    if (tops[0]) {
      const d = descricaoAtivo(tops[0].ticker);
      partes.push("A maior posição da proposta é " + tops[0].ticker + " com " +
        apresNum(Number(tops[0].pct) || 0, 1) + "%" +
        (aporte !== null ? " (" + apresBRL(aporte * ((Number(tops[0].pct) || 0) / 100)) + ")" : "") +
        (d ? " — " + d + "." : "."));
    }
  }
  else if (idx === 2) {
    partes.push(aberturas[2]);
    if (tops.length) {
      partes.push("A carteira proposta fica assim:\n" + tops.map(_pitchLinhaAtivo).join("\n"));
    }
    if (c && c.justificativa) partes.push(_fraseInicial(c.justificativa));
    if (bt && bt.resumo) {
      const r = bt.resumo;
      const anos = isFinite(r.diasCorridos) && r.diasCorridos > 0 ? r.diasCorridos / 365.25 : null;
      const usaAnual = anos !== null && anos >= 1.5;
      const val = usaAnual ? r.retornoAnualizado : r.retornoAcumulado;
      if (isFinite(val)) {
        partes.push("No histórico simulado desta carteira, o " +
          (usaAnual ? "retorno anualizado" : "retorno do período") + " foi de " + apresPct(val, 1) +
          (isFinite(r.drawdownMaximo)
            ? ", com uma pior queda de " + apresPct(Math.abs(r.drawdownMaximo), 1) +
              (aporte !== null ? " (o equivalente a " + apresBRL(aporte * Math.abs(r.drawdownMaximo)) + " sobre o seu aporte)" : "")
            : "") +
          ". Rentabilidade passada não garante rentabilidade futura; é referência de comportamento, não promessa.");
      }
    }
    if (c && c.objetivos && c.objetivos[2]) {
      partes.push("Onde isso te coloca: " + _fraseInicial(c.objetivos[2]));
    }
  }
  else {
    partes.push(aberturas[3]);
    partes.push(aporte !== null
      ? "1) Confirmar hoje o aporte de " + apresBRL(aporte) + " na distribuição que acabei de mostrar."
      : "1) Confirmar o valor do aporte e a distribuição que acabei de mostrar.");
    partes.push("2) Assinar o suitability e as ordens dos ativos da proposta.");
    partes.push("3) Agendar a revisão da carteira em 90 dias — data marcada agora, comigo.");
    if (c && c.restricoes && c.restricoes.length) {
      partes.push("Cuidado que eu já deixo combinado: " + _fraseInicial(c.restricoes[c.restricoes.length - 1]));
    }
    partes.push("Se cair no meio do caminho, quem liga primeiro sou eu — e a decisão de venda em queda espera 72 horas.");
  }

  return partes.filter(p => p && String(p).trim()).join("\n\n");
}

function gerarRascunhoEtapa(etapaId, btn) {
  if (!frameworkAtual) return;
  const fw = FRAMEWORKS[frameworkAtual];
  const idx = fw.etapas.findIndex(e => e.id === etapaId);
  if (idx === -1) return;

  const ta = document.getElementById("textarea-" + etapaId);
  const atual = ta ? String(ta.value || "").trim() : String(pitchData[etapaId] || "").trim();
  if (atual && !confirm("Já existe texto nesta etapa. Substituir pelo rascunho gerado?")) return;

  const txt = rascunhoTextoEtapa(idx);
  if (!txt) return;
  if (ta) {
    ta.value = txt;
    ta.focus();
    try { ta.setSelectionRange(txt.length, txt.length); } catch (e) {}
  }
  atualizarPitch(etapaId, txt);

  if (btn) {
    const original = btn.dataset.rotuloOriginal || btn.textContent;
    btn.dataset.rotuloOriginal = original;
    btn.textContent = "Rascunho gerado";
    setTimeout(() => { btn.textContent = original; }, 1800);
  }
}

function atualizarPitch(etapaId, valor) {
  pitchData[etapaId] = valor;
  const contador = document.getElementById(`contador-${etapaId}`);
  if (contador) contador.textContent = `${valor.length} caracteres`;
  const ta = document.getElementById(`textarea-${etapaId}`);
  if (ta) ta.classList.toggle("preenchido", valor.trim().length > 30);
  salvarPitchDebounce();
}

function irTela4FromTela5() {
  trocarTela("tela4");
}

/* =================================================================================
   CRONÔMETRO DE LEITURA EM VOZ ALTA (Feature: testar tempo do pitch)
   ================================================================================= */
let cronoInterval = null;
let cronoSegundos = 0;
let cronoRodando = false;

function formatarTempo(seg) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function corDoTempo(seg) {
  // 0-3min: verde (ainda construindo) | 3-5min: verde (ideal) | 5-6min: warn | 6min+: bad
  if (seg < 300) return "ok";       // até 5 min
  if (seg < 360) return "warn";     // 5-6 min
  return "bad";                     // 6 min+
}

function atualizarDisplayCrono() {
  const display = document.getElementById("crono-display");
  if (!display) return;
  display.textContent = formatarTempo(cronoSegundos);
  display.className = "cronometro-display " + corDoTempo(cronoSegundos);
}

function toggleCronometro() {
  const btn = document.getElementById("crono-btn");
  if (!btn) return;
  if (!cronoRodando) {
    // Iniciar
    cronoRodando = true;
    btn.textContent = "Parar leitura";
    btn.classList.remove("primary");
    document.getElementById("crono-resultado").classList.remove("show");
    cronoInterval = setInterval(() => {
      cronoSegundos++;
      atualizarDisplayCrono();
    }, 1000);
  } else {
    // Parar e avaliar
    cronoRodando = false;
    btn.textContent = "Iniciar leitura";
    btn.classList.add("primary");
    clearInterval(cronoInterval);
    avaliarTempoLeitura();
  }
}

function resetCronometro() {
  cronoRodando = false;
  clearInterval(cronoInterval);
  cronoInterval = null;
  cronoSegundos = 0;
  atualizarDisplayCrono();
  const btn = document.getElementById("crono-btn");
  if (btn) {
    btn.textContent = "Iniciar leitura";
    btn.classList.add("primary");
  }
  const res = document.getElementById("crono-resultado");
  if (res) res.classList.remove("show");
}

function avaliarTempoLeitura() {
  const res = document.getElementById("crono-resultado");
  const seg = cronoSegundos;
  const tempo = formatarTempo(seg);
  let tipo, msg;

  if (seg < 90) {
    tipo = "warn";
    msg = `<strong>${tempo} — provavelmente curto demais.</strong> Um pitch de menos de 1min30 raramente cobre cenário + estratégia + produto + fechamento com a profundidade necessária. Confira se você não pulou etapas. A não ser que seja um pitch de abertura/convite — aí pode ser curto mesmo.`;
  } else if (seg <= 300) {
    tipo = "ok";
    msg = `<strong>${tempo} — tempo ideal.</strong> Você está na faixa que respeita o tempo do cliente sem sacrificar conteúdo. O cliente quer saber: qual o risco, se faz sentido pra ele, quanto paga e se vale a pena agora. Se você cobriu isso nesse tempo, está no caminho certo.`;
  } else if (seg <= 360) {
    tipo = "warn";
    msg = `<strong>${tempo} — no limite.</strong> Passou um pouco do ideal. Reveja: tem algum trecho onde você está "dando aula" sobre o produto em vez de vender a ideia? O excesso de detalhe técnico costuma ser o vilão. Tente cortar 1 minuto.`;
  } else {
    tipo = "bad";
    msg = `<strong>${tempo} — longo demais.</strong> Acima de 6 minutos o cliente cansa e perde o fio. O erro mais comum: explicar cada ativo da carteira em vez de trazer a grande ideia. Lembre — é raro precisar fazer a defesa completa da carteira. Vá direto ao problema → solução → ação. Tente chegar em 3-4 min.`;
  }

  res.className = `crono-resultado show ${tipo}`;
  res.innerHTML = msg;
}

/* =================================================================================
   TELA 6 — Apresentação em Slides + Identidade do Aluno
   ================================================================================= */
function irTela6() {
  sincronizarPitchComCase();
  if (!frameworkAtual) {
    alert("Selecione um framework primeiro.");
    return;
  }
  carregarIdentidadeNoForm();
  atualizarObrigatoriedade();
  carregarTemaApresentacao();
  renderSlides();
  trocarTela("tela6");
}

/* ---- Tema da apresentação (claro/escuro, salvo, independente do tema do app) ---- */
function carregarTemaApresentacao() {
  const salvo = apresStorageGet("tema_apres");
  if (salvo === "claro" || salvo === "escuro") {
    temaApresentacao = salvo;
  }
  aplicarTemaApresentacao();
}

function aplicarTemaApresentacao() {
  const container = document.getElementById("slides-container");
  if (container) {
    container.setAttribute("data-tema-slide", temaApresentacao);
  }
  document.querySelectorAll(".apres-tema-opt").forEach(b => {
    b.classList.toggle("active", b.dataset.tema === temaApresentacao);
  });
}

function trocarTemaApresentacao(tema) {
  temaApresentacao = tema;
  apresStorageSet("tema_apres", tema);
  aplicarTemaApresentacao();
  // Os Chart.js herdam cores do tema: re-renderiza (com destroy) para não
  // deixar gráfico do tema anterior preso no canvas.
  const viewport = document.getElementById("slide-viewport");
  if (frameworkAtual && viewport && viewport.children.length > 0) {
    const idx = slideAtual;
    renderSlides();
    if (idx > 0 && idx < totalSlides) mostrarSlide(idx);
  }
}

/* ---- Modo apresentação (tela cheia, apresenta dali mesmo sem baixar PDF) ---- */
function entrarModoApresentacao() {
  const container = document.getElementById("slides-container");
  container.classList.add("modo-apresentacao");
  document.getElementById("btn-sair-apresentacao").classList.add("visible");
  document.body.style.overflow = "hidden";
  emModoApresentacao = true;

  // Tenta usar fullscreen real do navegador (alguns bloqueiam — degrada graciosamente)
  if (container.requestFullscreen) {
    container.requestFullscreen().catch(() => {});
  }
}

function sairModoApresentacao() {
  const container = document.getElementById("slides-container");
  container.classList.remove("modo-apresentacao");
  document.getElementById("btn-sair-apresentacao").classList.remove("visible");
  document.body.style.overflow = "";
  emModoApresentacao = false;

  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }
}

// Se o usuário sair do fullscreen pelo navegador (F11/Esc nativo), sincroniza o estado
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && emModoApresentacao) {
    sairModoApresentacao();
  }
});

/* ---- Identidade do aluno (no AdvisorPro virá do perfil Supabase) ---- */
function carregarIdentidadeNoForm() {
  // Carrega do localStorage se existir
  const salvo = apresStorageGet("identidade");
  if (salvo) {
    try { alunoIdentidade = { ...alunoIdentidade, ...JSON.parse(salvo) }; } catch(e) {}
  }
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ""; };
  const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!v; };
  setVal("id-nome", alunoIdentidade.nome);
  setVal("id-arroba", alunoIdentidade.arroba);
  setVal("id-programa", alunoIdentidade.programa || (modoAcesso === "MAP" ? PROGRAMA_CONFIG.textos.programaPadraoMAP : PROGRAMA_CONFIG.textos.programaPadraoFEA));
  setVal("id-foto", alunoIdentidade.fotoUrl);
  setVal("id-whatsapp", alunoIdentidade.whatsapp);
  setVal("id-email", alunoIdentidade.email);
  setVal("id-cliente", alunoIdentidade.nomeCliente);
  // Título da apresentação: se o aluno nunca digitou, mostra o default calculado
  setVal("id-titulo-apres", alunoIdentidade.tituloApresentacao || tituloApresentacao());
  setChk("tg-foto", alunoIdentidade.mostrarFoto);
  setChk("tg-arroba", alunoIdentidade.mostrarArroba);
  setChk("tg-programa", alunoIdentidade.mostrarPrograma);
}

function atualizarIdentidade() {
  const val = (id) => { const el = document.getElementById(id); return el ? el.value : ""; };
  const chk = (id) => { const el = document.getElementById(id); return el ? el.checked : false; };
  alunoIdentidade.nome = val("id-nome");
  alunoIdentidade.arroba = val("id-arroba");
  alunoIdentidade.programa = val("id-programa");
  alunoIdentidade.fotoUrl = val("id-foto");
  alunoIdentidade.whatsapp = val("id-whatsapp");
  alunoIdentidade.email = val("id-email");
  alunoIdentidade.nomeCliente = val("id-cliente");
  alunoIdentidade.tituloApresentacao = val("id-titulo-apres");
  alunoIdentidade.mostrarFoto = chk("tg-foto");
  alunoIdentidade.mostrarArroba = chk("tg-arroba");
  alunoIdentidade.mostrarPrograma = chk("tg-programa");
  apresStorageSet("identidade", JSON.stringify(alunoIdentidade));
  salvarPitchDebounce();
  renderSlides(); // re-renderiza para refletir na capa/próximos passos
}

// Se o cliente muda e o título ainda é o default antigo, atualiza o título junto.
function atualizarClienteEtitulo() {
  const elTitulo = document.getElementById("id-titulo-apres");
  const elCliente = document.getElementById("id-cliente");
  if (elTitulo && elCliente) {
    const antigo = (elTitulo.value || "").trim();
    const ehDefault = antigo === "" || /^Proposta de alocação( — .*)?$/.test(antigo);
    if (ehDefault) {
      const cli = (elCliente.value || "").trim();
      elTitulo.value = cli ? `Proposta de alocação — ${cli}` : "Proposta de alocação";
    }
  }
  atualizarIdentidade();
}

function atualizarObrigatoriedade() {
  const el = document.getElementById("identidade-obrigatorio");
  if (!el) return;
  if (modoAcesso === "MAP") {
    el.textContent = "No Modo MAP, a apresentação em slides é entrega obrigatória — faz parte da avaliação do MBA.";
  } else {
    el.textContent = "";
  }
}

/* ---- Geração de HTML da identidade (usado em capa e encerramento) ---- */
function htmlIdentidadeAluno() {
  const id = alunoIdentidade;
  if (!id.nome && !id.arroba) {
    return `<div class="aluno-identidade aluno-identidade-vazia">
      Preencha sua identificação no formulário acima
    </div>`;
  }
  let fotoHtml = "";
  if (id.mostrarFoto) {
    fotoHtml = id.fotoUrl
      ? `<img src="${escapeHtml(id.fotoUrl)}" class="aluno-foto" alt="Foto do assessor" onerror="this.outerHTML='<div class=\\'aluno-foto-placeholder\\'></div>'"/>`
      : `<div class="aluno-foto-placeholder"></div>`;
  }
  return `
    <div class="aluno-identidade">
      ${fotoHtml}
      <div class="aluno-dados">
        ${id.nome ? `<div class="aluno-nome">${escapeHtml(id.nome)}</div>` : ''}
        ${id.mostrarArroba && id.arroba ? `<div class="aluno-arroba">${escapeHtml(id.arroba)}</div>` : ''}
        ${id.mostrarPrograma && id.programa ? `<div class="aluno-programa">${escapeHtml(id.programa)} · Academia do Assessor</div>` : ''}
      </div>
    </div>
  `;
}

/* =================================================================================
   SLIDES — helpers de conteúdo (APRESENTACAO-01/02/04/16/19 e NOVO-04)
   ================================================================================= */

// Disclaimer obrigatório em TODO slide. Configurável pelo programa, se houver campo.
const DISCLAIMER_APRESENTACAO_PADRAO =
  "Simulação educacional com dados históricos. Rentabilidade passada não garante rentabilidade futura. Não constitui recomendação de investimento.";

function textoDisclaimer() {
  try {
    if (typeof PROGRAMA_CONFIG !== "undefined" && PROGRAMA_CONFIG.textos &&
        PROGRAMA_CONFIG.textos.disclaimerApresentacao) {
      return PROGRAMA_CONFIG.textos.disclaimerApresentacao;
    }
  } catch (e) {}
  return DISCLAIMER_APRESENTACAO_PADRAO;
}

function htmlRodapeSlide(marcaCase) {
  const caseTag = marcaCase
    ? `<span class="slide-rodape-case">${escapeHtml(marcaCase)}</span>`
    : "";
  return `<div class="slide-rodape">${caseTag}<span class="slide-rodape-disclaimer">${escapeHtml(textoDisclaimer())}</span></div>`;
}

// Monta um slide já com o rodapé de disclaimer.
function montarSlide(classes, conteudo, marcaCase) {
  return `<div class="slide ${classes || ""}">${conteudo}${htmlRodapeSlide(marcaCase)}</div>`;
}

// Marca discreta "Case NN" — só no Modo MAP, e só quando há case real.
function marcaCaseRodape() {
  if (typeof modoAcesso !== "undefined" && modoAcesso === "MAP" && caseAtual) {
    return `Case ${String(caseAtual.id).padStart(2, "0")}`;
  }
  return "";
}

/* ---- APRESENTACAO-04: resolução de ativo pelo catálogo único ----
   Antes era ETFs.find(): qualquer ativo fora do array ETFs (offshore, UCITS,
   fundo aberto) saía sem descrição e o separador " — " ficava pendurado. */
function resolverAtivo(ticker) {
  if (!ticker) return null;
  const t = String(ticker).trim().toUpperCase();
  if (window.Catalogo && typeof window.Catalogo.get === "function") {
    try {
      const reg = window.Catalogo.get(t);
      if (reg) return reg;
    } catch (e) {}
  }
  const fontes = [];
  if (typeof ETFs !== "undefined" && Array.isArray(ETFs)) fontes.push(ETFs);
  if (Array.isArray(window._allETFs)) fontes.push(window._allETFs);
  for (let i = 0; i < fontes.length; i++) {
    const achado = fontes[i].find(e => e && String(e.ticker).toUpperCase() === t);
    if (achado) {
      return {
        ticker: achado.ticker,
        nome: achado.nome || "",
        desc: achado.desc || "",
        classe: achado.classe || "",
        custodia: achado.custodia || ""
      };
    }
  }
  return null;
}

// Descrição curta e segura: nunca devolve string vazia disfarçada.
function descricaoAtivo(ticker) {
  const a = resolverAtivo(ticker);
  if (!a) return "";
  const d = (a.desc || "").trim() || (a.nome || "").trim();
  return d;
}

function classeAtivo(ticker) {
  if (window.Catalogo && typeof window.Catalogo.classeDe === "function") {
    try {
      const c = window.Catalogo.classeDe(ticker);
      if (c) return c;
    } catch (e) {}
  }
  const a = resolverAtivo(ticker);
  return (a && a.classe) ? a.classe : "Não classificado";
}

// Aporte usado nos slides: campo da tela 3 → carteira salva → sugestão do case.
function aporteApresentacao() {
  const el = document.getElementById("aporte");
  if (el) {
    let v = parseFloat(el.value);
    if (!isFinite(v)) v = parseFloat(String(el.value).replace(/\./g, "").replace(",", "."));
    if (isFinite(v) && v > 0) return v;
  }
  if (window.Estado && typeof window.Estado.restaurarCarteira === "function") {
    try {
      const c = window.Estado.restaurarCarteira();
      if (c && isFinite(c.aporte) && c.aporte > 0) return c.aporte;
    } catch (e) {}
  }
  const cs = caseParaPitch();
  if (cs && isFinite(cs.aporte_sugerido) && cs.aporte_sugerido > 0) return cs.aporte_sugerido;
  return null;
}

function nomeClienteApresentacao() {
  const n = (alunoIdentidade.nomeCliente || "").trim();
  return n || "";
}

function tituloApresentacao() {
  const t = (alunoIdentidade.tituloApresentacao || "").trim();
  if (t) return t;
  const cli = nomeClienteApresentacao();
  return cli ? `Proposta de alocação — ${cli}` : "Proposta de alocação";
}

function eyebrowCapa() {
  try {
    const m = PROGRAMA_CONFIG.marca;
    const partes = [];
    if (m.escola) partes.push(m.escola);
    if (m.submarca) partes.push(m.submarca);
    if (partes.length) return partes.join(" · ");
  } catch (e) {}
  return "Academia do Assessor";
}

/* ---- APRESENTACAO-02: donut por CLASSE + tabela com R$ ---- */
const CORES_CLASSE_SLIDE = [
  "#0088cc", "#a12026", "#e8862a", "#2e9e6b", "#6f5bd1",
  "#c94f9b", "#3aa8b8", "#8a8f98", "#d4b106", "#4a6fb5"
];

function agruparCarteiraPorClasse(linhas) {
  const mapa = {};
  linhas.forEach(l => {
    const c = classeAtivo(l.ticker);
    mapa[c] = (mapa[c] || 0) + (Number(l.pct) || 0);
  });
  return Object.keys(mapa)
    .map(c => ({ classe: c, pct: mapa[c] }))
    .sort((a, b) => b.pct - a.pct);
}

function renderChartCarteiraClasses(grupos) {
  const canvas = document.getElementById("slide-canvas-carteira-classe");
  if (!canvas || !grupos || grupos.length === 0) return;
  criarChartSlide(canvas, {
    type: "doughnut",
    data: {
      labels: grupos.map(g => g.classe),
      datasets: [{
        data: grupos.map(g => Number(g.pct.toFixed(2))),
        backgroundColor: grupos.map((g, i) => CORES_CLASSE_SLIDE[i % CORES_CLASSE_SLIDE.length]),
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "58%",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return ctx.label + ": " + apresNum(ctx.parsed, 1) + "%";
            }
          }
        }
      }
    }
  });
}

/* ---- APRESENTACAO-01 + 16: números do backtest nos slides ---- */
function backtestParaSlides() {
  let res = null;
  if (window.Estado && typeof window.Estado.getBacktest === "function") {
    try { res = window.Estado.getBacktest(); } catch (e) {}
  }
  if (!res) res = window._lastBacktestResult || null;
  if (!res || !res.resumo) return null;
  return res;
}

// Tempo de recuperação do pior drawdown, em meses (null se não recuperou).
function mesesRecuperacao(res) {
  try {
    const dd = res.curvas && res.curvas.drawdown;
    const datas = res.curvas && res.curvas.datas;
    if (!dd || !datas || dd.length !== datas.length || dd.length === 0) return null;
    let iMin = 0;
    for (let i = 1; i < dd.length; i++) if (dd[i] < dd[iMin]) iMin = i;
    for (let j = iMin + 1; j < dd.length; j++) {
      if (dd[j] >= -1e-9) {
        const d1 = new Date(datas[iMin]);
        const d2 = new Date(datas[j]);
        if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
        return Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30.44)));
      }
    }
    return null;
  } catch (e) {
    return null;
  }
}

function htmlTileMetrica(rotulo, valor, explicacao) {
  return `
    <div class="slide-tile">
      <div class="slide-tile-rotulo">${escapeHtml(rotulo)}</div>
      <div class="slide-tile-valor">${escapeHtml(valor)}</div>
      <div class="slide-tile-nota">${escapeHtml(explicacao)}</div>
    </div>
  `;
}

function slidesDoBacktest(aporte) {
  const res = backtestParaSlides();
  if (!res) return [];
  const r = res.resumo;
  const slides = [];

  const anos = isFinite(r.diasCorridos) && r.diasCorridos > 0 ? r.diasCorridos / 365.25 : null;
  const usaAnualizado = anos !== null && anos >= 1.5;
  const retVal = usaAnualizado ? r.retornoAnualizado : r.retornoAcumulado;
  const retRotulo = usaAnualizado ? "Retorno anualizado" : "Retorno do período";
  const retNota = usaAnualizado
    ? "É a média por ano, já com juros sobre juros — o ritmo do dinheiro."
    : "É o quanto a carteira rendeu no período todo, do começo ao fim.";

  const tiles =
    htmlTileMetrica(retRotulo, apresPct(retVal, 1), retNota) +
    htmlTileMetrica("Volatilidade", apresPct(r.volatilidade, 1),
      "O tamanho normal do balanço. Quanto maior, mais o valor oscila no caminho.") +
    htmlTileMetrica("Maior queda (drawdown)", apresPct(Math.abs(r.drawdownMaximo), 1),
      "A pior queda do topo até o fundo dentro do período analisado.") +
    htmlTileMetrica("Sharpe", apresNum(r.sharpe, 2),
      "Quanto de retorno acima do CDI cada unidade de risco entregou.");

  slides.push(montarSlide("slide-metricas", `
    <div class="slide-num">HISTÓRICO</div>
    <h2>Como esta carteira se comportou</h2>
    <div class="slide-tiles">${tiles}</div>
    <p class="slide-nota-rodape">Backtest com dados históricos dos ativos da carteira${
      isFinite(r.diasUteis) ? ` · ${apresNum(r.diasUteis, 0)} pregões` : ""
    }.</p>
  `, marcaCaseRodape()));

  // Ensaio de queda
  const ddFrac = Math.abs(r.drawdownMaximo);
  const ddReais = (aporte !== null && isFinite(ddFrac)) ? aporte * ddFrac : null;
  const meses = mesesRecuperacao(res);
  const linhaRecup = meses !== null
    ? `Nas quedas anteriores desta carteira, o valor voltou ao topo em cerca de ${apresNum(meses, 0)} meses.`
    : "No período analisado, a carteira ainda não tinha voltado ao topo anterior — recuperação sem prazo medido.";

  slides.push(montarSlide("slide-queda", `
    <div class="slide-num">ENSAIO DE QUEDA</div>
    <h2>O que fazemos quando cair</h2>
    <div class="slide-tiles slide-tiles-2">
      ${htmlTileMetrica("Pior queda observada", apresPct(ddFrac, 1),
        "Do topo ao fundo, dentro do histórico analisado.")}
      ${htmlTileMetrica("Em reais, sobre o aporte",
        ddReais === null ? "—" : apresBRL(-ddReais),
        aporte === null ? "Informe o aporte na montagem para ver este número."
                        : `Sobre um aporte de ${apresBRL(aporte)}.`)}
    </div>
    <p class="slide-recuperacao">${escapeHtml(linhaRecup)}</p>
    <ul class="slide-protocolo">
      <li>Se cair forte, eu ligo primeiro. Você não vai descobrir pelo aplicativo.</li>
      <li>Na ligação, voltamos ao plano: o objetivo e o prazo não mudaram por causa de um mês.</li>
      <li>Decisão de venda em queda espera 72 horas. Depois desse prazo, decidimos juntos, com o plano na mão.</li>
    </ul>
  `, marcaCaseRodape()));

  return slides;
}

// Data da apresentação (hoje, no fuso do navegador) — usada no slide de fechamento.
function dataDeHojeExtenso() {
  try {
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
      .format(new Date());
  } catch (e) {
    return new Date().toLocaleDateString("pt-BR");
  }
}

/* ---- APRESENTACAO-19 + NOVO-04: próximos passos ---- */
function slideProximosPassos(aporte) {
  const fw = FRAMEWORKS[frameworkAtual];
  const etapaAcao = fw ? fw.etapas[fw.etapas.length - 1] : null;
  const textoAcao = etapaAcao ? (pitchData[etapaAcao.id] || "").trim() : "";

  const passos = [];
  passos.push(aporte !== null
    ? `Confirmar o aporte de ${apresBRL(aporte)} e a distribuição por classe apresentada aqui.`
    : "Confirmar o valor do aporte e a distribuição por classe apresentada aqui.");
  passos.push("Assinar o suitability e as ordens de aplicação dos ativos da proposta.");
  if (textoAcao) {
    const primeira = textoAcao.split(/(?<=[.!?])\s/)[0].trim();
    passos.push(primeira.length > 4 ? primeira : "Agendar a primeira revisão da carteira em 90 dias.");
  } else {
    passos.push("Agendar a primeira revisão da carteira em 90 dias.");
  }

  const contatos = [];
  if ((alunoIdentidade.whatsapp || "").trim()) {
    contatos.push(`WhatsApp: ${escapeHtml(alunoIdentidade.whatsapp.trim())}`);
  }
  if ((alunoIdentidade.email || "").trim()) {
    contatos.push(`E-mail: ${escapeHtml(alunoIdentidade.email.trim())}`);
  }
  const htmlContato = contatos.length
    ? `<div class="slide-contato"><strong>${escapeHtml(alunoIdentidade.nome || "Seu assessor")}</strong><span>${contatos.join(" · ")}</span></div>`
    : `<div class="slide-contato slide-contato-vazio">Preencha WhatsApp e e-mail no formulário para publicar seu contato aqui.</div>`;

  const metas = [];
  if (aporte !== null) metas.push(`<span><strong>Valor da proposta</strong> ${escapeHtml(apresBRL(aporte))}</span>`);
  metas.push(`<span><strong>Apresentada em</strong> ${escapeHtml(dataDeHojeExtenso())}</span>`);
  if (nomeClienteApresentacao()) {
    metas.push(`<span><strong>Cliente</strong> ${escapeHtml(nomeClienteApresentacao())}</span>`);
  }

  return montarSlide("slide-proximos", `
    <div class="slide-num">PRÓXIMOS PASSOS</div>
    <h2>O que acontece a partir de agora</h2>
    <ol class="slide-passos">
      ${passos.map(p => `<li>${escapeHtml(p)}</li>`).join("")}
    </ol>
    <div class="slide-proximos-meta" style="display:flex;flex-wrap:wrap;gap:8px 22px;margin:14px 0 4px;font-size:0.95em;">${metas.join("")}</div>
    ${htmlContato}
  `, marcaCaseRodape());
}

/* ---- Render dos slides ---- */
function renderSlides() {
  const fw = FRAMEWORKS[frameworkAtual];
  const viewport = document.getElementById("slide-viewport");
  if (!fw || !viewport) return;

  destruirChartsDosSlides();
  normalizarPosicoesGraficos();

  const topETFs = montagemAtual
    .filter(l => l.ticker && l.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const aporte = aporteApresentacao();
  const grupos = agruparCarteiraPorClasse(topETFs);
  const slides = [];

  // Helper: insere os gráficos cuja posição == chave
  function inserirGraficosNaPosicao(chave) {
    graficosInseridos
      .filter(g => g.posicao === chave)
      .forEach(g => slides.push(htmlSlideGrafico(g.tipo)));
  }

  // SLIDE 1 — Capa (título do exercício não é mais o H1: quem lê é o cliente)
  const cli = nomeClienteApresentacao();
  slides.push(montarSlide("slide-capa active", `
    <div class="capa-eyebrow">${escapeHtml(eyebrowCapa())}</div>
    <h1>${escapeHtml(tituloApresentacao())}</h1>
    <div class="capa-sub">${cli ? escapeHtml(cli) + " · " : ""}Tese de investimento e alocação · Framework ${escapeHtml(fw.nome)}</div>
    ${htmlIdentidadeAluno()}
  `, marcaCaseRodape()));

  // Gráficos posicionados "no início" — logo após a capa
  inserirGraficosNaPosicao("inicio");

  // SLIDE — Cenário (só quando há texto)
  if (getCenarioAtivo().trim()) {
    slides.push(montarSlide("", `
      <div class="slide-num">CENÁRIO</div>
      <h2>O cenário que estamos enfrentando</h2>
      <p>${escapeHtml(getCenarioAtivo())}</p>
      ${cenarioFoiEditado() ? '<p class="slide-nota-rodape">Cenário atualizado pelo apresentador.</p>' : ''}
    `, marcaCaseRodape()));
  }

  // SLIDE — A carteira proposta: donut por classe + tabela com R$
  const totalPct = topETFs.reduce((acc, l) => acc + (Number(l.pct) || 0), 0);
  const totalReais = aporte !== null ? aporte * (totalPct / 100) : null;
  const linhasTabela = topETFs.map(l => {
    const classe = classeAtivo(l.ticker);
    const reais = aporte !== null ? aporte * ((Number(l.pct) || 0) / 100) : null;
    return `
      <tr>
        <td class="col-ticker">${escapeHtml(l.ticker)}</td>
        <td class="col-classe">${escapeHtml(classe)}</td>
        <td class="col-num">${apresNum(Number(l.pct) || 0, 1)}%</td>
        <td class="col-num">${reais === null ? "—" : apresBRL(reais)}</td>
      </tr>
    `;
  }).join("");

  const corpoCarteira = topETFs.length === 0
    ? `<p class="slide-vazio">Carteira não montada — volte à etapa de montagem.</p>`
    : `
      <div class="slide-carteira">
        <div class="slide-carteira-grafico">
          <canvas id="slide-canvas-carteira-classe"></canvas>
        </div>
        <div class="slide-carteira-tabela-wrap">
          <table class="slide-carteira-tabela">
            <thead>
              <tr><th>Ativo</th><th>Classe</th><th class="col-num">%</th><th class="col-num">Valor</th></tr>
            </thead>
            <tbody>${linhasTabela}</tbody>
            <tfoot>
              <tr>
                <th colspan="2">Total</th>
                <th class="col-num">${apresNum(totalPct, 1)}%</th>
                <th class="col-num">${totalReais === null ? "—" : apresBRL(totalReais)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    `;

  slides.push(montarSlide("slide-carteira-slide", `
    <div class="slide-num">PROPOSTA</div>
    <h2>A carteira recomendada</h2>
    ${corpoCarteira}
  `, marcaCaseRodape()));

  // SLIDES — As etapas do framework, com gráficos posicionados após cada etapa
  fw.etapas.forEach((et, idx) => {
    const txt = (pitchData[et.id] || "").trim();
    slides.push(montarSlide("", `
      <div class="slide-num">${escapeHtml(fw.nome)} · ETAPA ${idx + 1}</div>
      <h3>${iconeEtapa(et.icone)} ${escapeHtml(et.titulo)}</h3>
      <p class="${txt ? '' : 'vazio'}">
        ${txt ? escapeHtml(txt) : '[Etapa não preenchida — volte e estruture o pitch]'}
      </p>
    `, marcaCaseRodape()));
    // Gráficos posicionados depois desta etapa
    inserirGraficosNaPosicao(`etapa-${idx}`);
  });

  // Gráficos posicionados "no fim" — antes do encerramento
  inserirGraficosNaPosicao("fim");

  // SLIDES automáticos do backtest (só existem se a simulação rodou)
  slidesDoBacktest(aporte).forEach(sl => slides.push(sl));

  // SLIDE — Próximos passos (substitui o "Obrigado.")
  slides.push(slideProximosPassos(aporte));

  viewport.innerHTML = slides.join("");
  totalSlides = slides.length;
  slideAtual = 0;
  mostrarSlide(0);
  renderSlidesDots();

  // Charts dentro dos slides (precisa do DOM já montado)
  setTimeout(() => {
    if (grupos.length > 0) renderChartCarteiraClasses(grupos);
    if (graficosInseridos.length > 0) renderChartsNosSlides();
  }, 50);
}

function renderSlidesDots() {
  const cont = document.getElementById("slides-dots");
  let dots = "";
  for (let i = 0; i < totalSlides; i++) {
    dots += `<button class="slide-dot ${i === slideAtual ? 'active' : ''}" onclick="irParaSlide(${i})" aria-label="Slide ${i+1}"></button>`;
  }
  cont.innerHTML = dots;
}

function mostrarSlide(idx) {
  const slides = document.querySelectorAll("#slide-viewport .slide");
  slides.forEach((s, i) => s.classList.toggle("active", i === idx));
  slideAtual = idx;
  document.getElementById("slide-counter").textContent = `${idx + 1} / ${totalSlides}`;
  renderSlidesDots();
}

function slideNext() {
  if (slideAtual < totalSlides - 1) mostrarSlide(slideAtual + 1);
}
function slidePrev() {
  if (slideAtual > 0) mostrarSlide(slideAtual - 1);
}
function irParaSlide(idx) {
  mostrarSlide(idx);
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* =================================================================================
   CÓPIA DE TEXTO (APRESENTACAO-09)
   O bloqueio de cópia foi removido: aqui o fallback é real (textarea + execCommand),
   não uma mensagem mandando o aluno se virar com Ctrl+C.
   ================================================================================= */
function copiarTextoApres(texto, btn) {
  function feedback(ok) {
    if (!btn) {
      if (!ok) alert("Não foi possível copiar automaticamente neste navegador.");
      return;
    }
    const original = btn.dataset.rotuloOriginal || btn.textContent;
    btn.dataset.rotuloOriginal = original;
    btn.textContent = ok ? "Copiado" : "Falhou";
    btn.classList.toggle("copiado", ok);
    setTimeout(() => {
      btn.textContent = original;
      btn.classList.remove("copiado");
    }, 1800);
  }

  function fallback() {
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("readonly", "readonly");
      ta.className = "clipboard-offscreen";
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      feedback(!!ok);
      return !!ok;
    } catch (e) {
      feedback(false);
      return false;
    }
  }

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(() => feedback(true)).catch(fallback);
  } else {
    fallback();
  }
}

// Copia só um bloco (uma etapa do framework)
function copiarBlocoPitch(etapaId, btn) {
  if (!frameworkAtual) return;
  const fw = FRAMEWORKS[frameworkAtual];
  const et = fw.etapas.find(e => e.id === etapaId);
  if (!et) return;
  const conteudo = (pitchData[et.id] || "").trim();
  const txt = `${et.titulo.toUpperCase()}\n${conteudo || "[não preenchido]"}`;
  copiarTextoApres(txt, btn || null);
}

function textoDoPitch() {
  const fw = FRAMEWORKS[frameworkAtual];
  const linhas = montagemAtual
    .filter(l => l.ticker && l.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  const aporte = aporteApresentacao();

  const carteira = linhas.map(l => {
    const a = resolverAtivo(l.ticker);
    const classe = classeAtivo(l.ticker);
    const reais = aporte !== null ? ` = ${apresBRL(aporte * ((Number(l.pct) || 0) / 100))}` : "";
    const nome = a ? (descricaoAtivo(a.ticker) || a.nome || "") : "";
    return `- ${l.ticker} (${classe}) ${apresNum(Number(l.pct) || 0, 1)}%${reais}` + (nome ? ` — ${nome}` : "");
  }).join("\n");

  let txt = `${tituloApresentacao()}\n`;
  if (nomeClienteApresentacao()) txt += `Cliente: ${nomeClienteApresentacao()}\n`;
  txt += `Framework: ${fw.nome}\n`;
  if (aporte !== null) txt += `Aporte: ${apresBRL(aporte)}\n`;
  txt += `\nCARTEIRA\n${carteira || "- (carteira não montada)"}\n`;
  txt += `\nCENÁRIO\n${getCenarioAtivo()}\n`;
  txt += `${"-".repeat(50)}\n\n`;

  fw.etapas.forEach((et, idx) => {
    const conteudo = (pitchData[et.id] || "[não preenchido]").trim();
    txt += `[${idx + 1}] ${et.titulo.toUpperCase()}\n${conteudo}\n\n`;
  });

  const res = backtestParaSlides();
  if (res) {
    const r = res.resumo;
    txt += `${"-".repeat(50)}\nCOMO ESTA CARTEIRA SE COMPORTOU (backtest)\n`;
    txt += `Retorno acumulado: ${apresPct(r.retornoAcumulado, 1)}\n`;
    txt += `Retorno anualizado: ${apresPct(r.retornoAnualizado, 1)}\n`;
    txt += `Volatilidade: ${apresPct(r.volatilidade, 1)}\n`;
    txt += `Maior queda: ${apresPct(Math.abs(r.drawdownMaximo), 1)}`;
    if (aporte !== null && isFinite(r.drawdownMaximo)) {
      txt += ` (${apresBRL(-aporte * Math.abs(r.drawdownMaximo))} sobre o aporte)`;
    }
    txt += `\nSharpe: ${apresNum(r.sharpe, 2)}\n\n`;
  }

  if (alunoIdentidade.nome) {
    txt += `${"-".repeat(50)}\n${alunoIdentidade.nome}`;
    if (alunoIdentidade.arroba) txt += ` · ${alunoIdentidade.arroba}`;
    if (alunoIdentidade.whatsapp) txt += ` · WhatsApp ${alunoIdentidade.whatsapp}`;
    if (alunoIdentidade.email) txt += ` · ${alunoIdentidade.email}`;
    txt += `\n`;
  }

  txt += `\n${textoDisclaimer()}\n`;
  return txt;
}

function copiarPitch(btn) {
  if (!frameworkAtual) return;
  copiarTextoApres(textoDoPitch(), btn && btn.tagName ? btn : null);
}

/* =================================================================================
   TEMA + LOGOS
   ================================================================================= */
const LOGO_ACAD_CLARO = "https://vocebancario.com/wp-content/uploads/2025/02/LOGO-285X60-ACAD-ASS-FUNDO-CLARO.webp";
const LOGO_ACAD_ESCURO = "https://vocebancario.com/wp-content/uploads/2025/02/LOGO-ACADEMIA-DO-ASSESSOR-SITE.webp";

function aplicarLogo() {
  const logo = document.getElementById("logo-acad");
  if (!logo) return;
  logo.src = document.body.classList.contains("dark") ? LOGO_ACAD_ESCURO : LOGO_ACAD_CLARO;
}

async function atualizarDadosBCB() {
  const btn = document.getElementById('btn-atualizar-dados');
  if (!btn) return;
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Atualizando...';
  btn.disabled = true;

  try {
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const yyyy = hoje.getFullYear();
    const dataFim = dd + '/' + mm + '/' + yyyy;

    const toISO = (s) => { const p = s.split('/'); return p[2] + '-' + p[1] + '-' + p[0]; };
    const toYM = (s) => { const p = s.split('/'); return p[2] + '-' + p[1]; };

    // Fetch CDI
    const cdiResp = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=01/01/2020&dataFinal=' + dataFim);
    const cdiJson = await cdiResp.json();
    const cdi = cdiJson.map(item => ({
      data: toISO(item.data),
      valor: parseFloat(item.valor) / 100
    }));

    // Fetch IPCA
    const ipcaResp = await fetch('https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2020&dataFinal=' + dataFim);
    const ipcaJson = await ipcaResp.json();
    const ipca = ipcaJson.map(item => ({
      data: toYM(item.data),
      valor: parseFloat(item.valor)
    }));

    // Update in-memory data
    if (window.DADOS) {
      window.DADOS.cdi = cdi;
      window.DADOS.ipca = ipca;
    }

    const ultCDI = cdi.length > 0 ? cdi[cdi.length - 1].data : '?';
    const ultIPCA = ipca.length > 0 ? ipca[ipca.length - 1].data : '?';

    btn.innerHTML = '✅ Atualizado!';
    btn.title = 'CDI até ' + ultCDI + ' · IPCA até ' + ultIPCA;

    setTimeout(() => {
      btn.innerHTML = '🔄 Atualizar dados';
      btn.disabled = false;
    }, 3000);

  } catch (err) {
    btn.innerHTML = '❌ Erro';
    btn.title = 'Erro: ' + err.message;
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 3000);
  }
}

function toggleTheme() {
  document.body.classList.toggle("dark");
  apresStorageSet("dark", document.body.classList.contains("dark"));
  aplicarLogo();
  // Re-render gráficos com nova cor de borda
  if (chartMontagem) calcularMontagem();
  // Re-render da trilha — o logo do FEA tem variante clara/escura
  if (document.getElementById("tela1").classList.contains("ativo")) {
    renderTrilhaNiveis();
  }
}

/* =================================================================================
   MONTAR LOGOS — constrói as URLs dos logos a partir da config da marca.
   Centraliza o padrão de URL: trocar logoExt (png/webp) atualiza todos de uma vez.
   ================================================================================= */
function montarLogos() {
  const m = PROGRAMA_CONFIG.marca;
  m.logos = {};
  m.logosProdutos.forEach(prod => {
    m.logos[prod] = {
      claro:  `${m.logoBaseUrl}logo-q-prod-${prod}-f-claro.${m.logoExt}`,
      escuro: `${m.logoBaseUrl}logo-q-prod-${prod}-f-escuro.${m.logoExt}`
    };
  });
}

/* =================================================================================
   APLICAR TEXTOS DO PROGRAMA — injeta os textos do PROGRAMA_CONFIG na interface
   Centraliza tudo que é específico do programa. Trocar de programa = trocar o config.
   ================================================================================= */
function aplicarTextosPrograma() {
  const t = PROGRAMA_CONFIG.textos;
  // Título da página
  document.title = t.tituloPagina;
  // Hero
  const heroSub = document.getElementById("hero-subtitulo");
  if (heroSub) heroSub.textContent = t.heroSubtitulo;
  // Rodapé
  const footerIni = document.getElementById("footer-iniciativa");
  if (footerIni) footerIni.innerHTML = t.rodapeIniciativa;
  const footerCont = document.getElementById("footer-conteudo");
  if (footerCont) footerCont.textContent = "AIDA Allocation v4.1 · " + t.rodapeConteudo;
}

/* =================================================================================
   INIT
   ================================================================================= */
window.addEventListener("load", () => {
  // Tema
  if (apresStorageGet("dark") === "true") document.body.classList.add("dark");
  aplicarLogo();

  // Monta as URLs dos logos a partir da config (padrão de URL + extensão)
  montarLogos();

  // Textos do programa (PROGRAMA_CONFIG) — antes de tudo, define a "marca"
  aplicarTextosPrograma();

  // Modo de acesso salvo (MAP/FEA)
  // Lê no namespace atual (com fallback para a chave legada "aida_vo4_modo").
  const modoSalvo = apresStorageGet("modo");
  if (modoSalvo === "FEA" || modoSalvo === "MAP") {
    trocarModo(modoSalvo);
  } else {
    trocarModo("MAP"); // default
  }

  renderTrilhaNiveis();
  renderGrid();
  atualizarStatsHome();
});

// Navegação dos slides por teclado quando a Tela 6 está ativa
document.addEventListener("keydown", (e) => {
  const tela6Ativa = document.getElementById("tela6").classList.contains("ativo");
  if (!tela6Ativa) return;
  // Não interfere se o usuário está digitando num campo
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === " " || e.key === "PageDown") {
    e.preventDefault();
    slideNext();
  }
  if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
    e.preventDefault();
    slidePrev();
  }
});

// Re-render charts as images for print quality
window.addEventListener('beforeprint', function() {
  document.querySelectorAll('.slide canvas').forEach(function(canvas) {
    if (canvas.width > 0 && canvas.height > 0) {
      try {
        var img = document.createElement('img');
        img.src = canvas.toDataURL('image/png', 1.0);
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxHeight = canvas.style.maxHeight || '300px';
        img.className = 'print-chart-img';
        canvas.style.display = 'none';
        canvas.parentNode.insertBefore(img, canvas.nextSibling);
      } catch(e) {}
    }
  });
});

window.addEventListener('afterprint', function() {
  document.querySelectorAll('.print-chart-img').forEach(function(img) {
    var canvas = img.previousElementSibling;
    if (canvas && canvas.tagName === 'CANVAS') {
      canvas.style.display = '';
    }
    img.remove();
  });
});
