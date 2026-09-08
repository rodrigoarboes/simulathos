// academia/js/app-apresentacao.js — extraído de index.html (linhas 6647-7672 do monólito original)
function inserirGraficoNoSlide(tipo) {
  const i = graficosInseridos.findIndex(g => g.tipo === tipo);
  if (i === -1) {
    // Insere com posição padrão "fim" — o aluno ajusta no select
    graficosInseridos.push({ tipo: tipo, posicao: "fim" });
  } else {
    graficosInseridos.splice(i, 1); // toggle: clicar de novo remove
  }
  atualizarBotoesInseridos();
  if (frameworkAtual && document.getElementById("slide-viewport").children.length > 0) {
    renderSlides();
  }
}

function mudarPosicaoGrafico(tipo, posicao) {
  const g = graficosInseridos.find(g => g.tipo === tipo);
  if (g) {
    g.posicao = posicao;
    if (frameworkAtual && document.getElementById("slide-viewport").children.length > 0) {
      renderSlides();
    }
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
      btn.textContent = inserido ? "✓ Inserido (clique p/ remover)" : "➕ Inserir nos slides do pitch";
    }
  });

  // Aviso + seletores de posição
  const aviso = document.getElementById("graficos-inseridos-aviso");
  if (graficosInseridos.length > 0) {
    const ops = opcoesDePosicao();
    const linhas = graficosInseridos.map(g => {
      const meta = GRAFICOS_META[g.tipo];
      const selectOps = ops.map(o =>
        `<option value="${o.val}" ${o.val === g.posicao ? 'selected' : ''}>${o.label}</option>`
      ).join("");
      return `
        <div class="grafico-pos-linha">
          <span class="grafico-pos-nome">📊 ${meta.titulo}</span>
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
    const ctx = canvas.getContext("2d");
    const d = DADOS_MERCADO;

    if (tipo === "r100") {
      new Chart(ctx, {
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
      new Chart(ctx, {
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
      new Chart(ctx, {
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
      new Chart(ctx, {
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
      new Chart(ctx, {
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
  return `
    <div class="slide">
      <div class="slide-num">DADO DE MERCADO</div>
      <h3>${meta.titulo}</h3>
      <div class="slide-grafico-wrap">
        <div class="slide-grafico-canvas">
          <canvas id="slide-canvas-${tipo}"></canvas>
        </div>
        <div class="slide-grafico-fonte">Fonte: ${meta.fonte} · dados congelados em ${meta.congelado || DADOS_MERCADO._atualizado}</div>
      </div>
    </div>
  `;
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
      { id: "A", icone: "👁️", titulo: "Atenção", desc: "Como você quebra o piloto automático do cliente? O que o faz parar e ouvir? Use um número que dói, uma comparação inesperada, uma pergunta provocadora." },
      { id: "I", icone: "🔍", titulo: "Interesse", desc: "Por que isso é relevante para ELE especificamente? Conecte com a vida, dores, objetivos. Mostre que você entendeu o caso." },
      { id: "D", icone: "🔥", titulo: "Desejo", desc: "Por que AGORA é o momento? O que muda com sua proposta? Pinte o cenário do 'depois' — concreto, mensurável." },
      { id: "Ação", icone: "✅", titulo: "Ação", desc: "Próximo passo claro, simples, com prazo. NÃO use 'pensar' ou 'considerar'. Use: 'assinar', 'transferir', 'agendar para sexta'." }
    ]
  },
  PASA: {
    nome: "PASA",
    etapas: [
      { id: "P", icone: "⚠️", titulo: "Problema", desc: "Nomeie a dor real que o cliente está vivendo (mesmo que ele ainda não tenha verbalizado). Use os dados do caso para tornar tangível." },
      { id: "A1", icone: "📊", titulo: "Argumentos / Ampliação", desc: "Mostre o tamanho do problema com números. Não basta dizer 'você está perdendo'. Quantifique. Compare. Mostre o custo de não agir." },
      { id: "S", icone: "💡", titulo: "Solução", desc: "Apresente sua carteira como a resposta direta ao problema. Cada ETF deve ter uma justificativa ligada à dor levantada." },
      { id: "A2", icone: "✅", titulo: "Ação", desc: "Conduza ao próximo passo. Quanto, quando, como. Remova fricção. Antecipe objeção e responda antes que apareça." }
    ]
  },
  GBGA: {
    nome: "GBGA",
    etapas: [
      { id: "G1", icone: "💎", titulo: "Ganância", desc: "Acione o desejo de ganho. Mostre o que outros (com o perfil dele) já estão construindo. Estimule ambição, não medo." },
      { id: "B", icone: "🎁", titulo: "Benefícios", desc: "Liste as vantagens estruturais da sua proposta: diversificação, custo, tributação, retorno esperado. Use os ETFs alocados como prova." },
      { id: "G2", icone: "📈", titulo: "Ganhos", desc: "Projete o resultado em 5, 10, 20 anos. Use cenários (conservador/base/otimista). Mostre o efeito composto. Faça o cliente VER o patrimônio futuro." },
      { id: "A", icone: "✅", titulo: "Ação", desc: "Próximo passo concreto, agressivo, com senso de janela curta (sem ser ansioso). Aproveite o momentum criado." }
    ]
  }
};

let frameworkAtual = null;
let pitchData = {}; // { etapaId: "texto..." }

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

  // Se já tinha framework selecionado, mantém. Senão, aplica o sugerido
  if (!frameworkAtual) {
    frameworkAtual = sugerido;
  }
  selecionarFramework(frameworkAtual, true);

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
    renderEtapasPitch();
  }
}

function renderEtapasPitch() {
  if (!frameworkAtual) return;
  const fw = FRAMEWORKS[frameworkAtual];
  const cont = document.getElementById("etapas-pitch");

  cont.innerHTML = fw.etapas.map((et, idx) => {
    const conectores = gerarConectores(idx, et);
    const textoSalvo = pitchData[et.id] || "";
    const preenchidoClass = textoSalvo.trim().length > 30 ? "preenchido" : "";

    return `
      <div class="etapa-pitch" data-etapa="${idx + 1}">
        <div class="etapa-header">
          <div class="etapa-titulo">
            <span class="etapa-icone">${et.icone}</span>
            ${et.titulo}
          </div>
          <span class="etapa-numero">ETAPA ${idx + 1}/4</span>
        </div>
        <div class="etapa-descricao">${et.desc}</div>

        ${conectores ? `
          <div class="conectores">
            <h6>💡 Conexões sugeridas para este case</h6>
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
      const etf = ETFs.find(e => e.ticker === topETFs[0].ticker);
      if (etf) conectores.push({ tag: "ETF principal", txt: `${etf.ticker} (${topETFs[0].pct.toFixed(0)}%) — ${etf.desc}` });
    }
  }
  else if (idx === 2) {
    // Desejo / Solução / Ganhos — projeção
    if (topETFs[0] && topETFs[1]) {
      const e1 = ETFs.find(e => e.ticker === topETFs[0].ticker);
      const e2 = ETFs.find(e => e.ticker === topETFs[1].ticker);
      if (e1 && e2) {
        conectores.push({ tag: "Composição", txt: `${e1.ticker} + ${e2.ticker} = ${(topETFs[0].pct + topETFs[1].pct).toFixed(0)}% da carteira` });
      }
    }
    conectores.push({ tag: "Justificativa", txt: caseAtual.justificativa.split('.')[0] + "." });
    if (caseAtual.objetivos[2]) conectores.push({ tag: "Resultado-alvo", txt: caseAtual.objetivos[2] });
  }
  else if (idx === 3) {
    // Ação
    conectores.push({ tag: "Aporte sugerido", txt: `R$ ${(caseAtual.aporte_sugerido || 0).toLocaleString('pt-BR')}` });
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

function atualizarPitch(etapaId, valor) {
  pitchData[etapaId] = valor;
  const contador = document.getElementById(`contador-${etapaId}`);
  if (contador) contador.textContent = `${valor.length} caracteres`;
  const ta = document.getElementById(`textarea-${etapaId}`);
  if (ta) ta.classList.toggle("preenchido", valor.trim().length > 30);
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
  if (!cronoRodando) {
    // Iniciar
    cronoRodando = true;
    btn.textContent = "⏸ Parar leitura";
    btn.classList.remove("primary");
    document.getElementById("crono-resultado").classList.remove("show");
    cronoInterval = setInterval(() => {
      cronoSegundos++;
      atualizarDisplayCrono();
    }, 1000);
  } else {
    // Parar e avaliar
    cronoRodando = false;
    btn.textContent = "▶ Iniciar leitura";
    btn.classList.add("primary");
    clearInterval(cronoInterval);
    avaliarTempoLeitura();
  }
}

function resetCronometro() {
  cronoRodando = false;
  clearInterval(cronoInterval);
  cronoSegundos = 0;
  atualizarDisplayCrono();
  const btn = document.getElementById("crono-btn");
  btn.textContent = "▶ Iniciar leitura";
  btn.classList.add("primary");
  document.getElementById("crono-resultado").classList.remove("show");
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
  const salvo = localStorage.getItem("aida_vo4_tema_apres");
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
  localStorage.setItem("aida_vo4_tema_apres", tema);
  aplicarTemaApresentacao();
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
  const salvo = localStorage.getItem("aida_vo4_identidade");
  if (salvo) {
    try { alunoIdentidade = { ...alunoIdentidade, ...JSON.parse(salvo) }; } catch(e) {}
  }
  document.getElementById("id-nome").value = alunoIdentidade.nome || "";
  document.getElementById("id-arroba").value = alunoIdentidade.arroba || "";
  document.getElementById("id-programa").value = alunoIdentidade.programa || (modoAcesso === "MAP" ? PROGRAMA_CONFIG.textos.programaPadraoMAP : PROGRAMA_CONFIG.textos.programaPadraoFEA);
  document.getElementById("id-foto").value = alunoIdentidade.fotoUrl || "";
  document.getElementById("tg-foto").checked = alunoIdentidade.mostrarFoto;
  document.getElementById("tg-arroba").checked = alunoIdentidade.mostrarArroba;
  document.getElementById("tg-programa").checked = alunoIdentidade.mostrarPrograma;
}

function atualizarIdentidade() {
  alunoIdentidade.nome = document.getElementById("id-nome").value;
  alunoIdentidade.arroba = document.getElementById("id-arroba").value;
  alunoIdentidade.programa = document.getElementById("id-programa").value;
  alunoIdentidade.fotoUrl = document.getElementById("id-foto").value;
  alunoIdentidade.mostrarFoto = document.getElementById("tg-foto").checked;
  alunoIdentidade.mostrarArroba = document.getElementById("tg-arroba").checked;
  alunoIdentidade.mostrarPrograma = document.getElementById("tg-programa").checked;
  localStorage.setItem("aida_vo4_identidade", JSON.stringify(alunoIdentidade));
  renderSlides(); // re-renderiza para refletir na capa/encerramento
}

function atualizarObrigatoriedade() {
  const el = document.getElementById("identidade-obrigatorio");
  if (modoAcesso === "MAP") {
    el.textContent = "⚠️ No Modo MAP, a apresentação em slides é entrega obrigatória — faz parte da avaliação do MBA.";
  } else {
    el.textContent = "";
  }
}

/* ---- Geração de HTML da identidade (usado em capa e encerramento) ---- */
function htmlIdentidadeAluno() {
  const id = alunoIdentidade;
  if (!id.nome && !id.arroba) {
    return `<div class="aluno-identidade" style="color:var(--text-soft); font-size:13px;">
      Preencha sua identificação no formulário acima ↑
    </div>`;
  }
  let fotoHtml = "";
  if (id.mostrarFoto) {
    fotoHtml = id.fotoUrl
      ? `<img src="${escapeHtml(id.fotoUrl)}" class="aluno-foto" alt="Foto" onerror="this.outerHTML='<div class=\\'aluno-foto-placeholder\\'>👤</div>'"/>`
      : `<div class="aluno-foto-placeholder">👤</div>`;
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

/* ---- Render dos slides ---- */
function renderSlides() {
  const fw = FRAMEWORKS[frameworkAtual];
  const viewport = document.getElementById("slide-viewport");

  const topETFs = montagemAtual
    .filter(l => l.ticker && l.pct > 0)
    .sort((a, b) => b.pct - a.pct);

  const slides = [];

  // Helper: insere os gráficos cuja posição == chave
  function inserirGraficosNaPosicao(chave) {
    graficosInseridos
      .filter(g => g.posicao === chave)
      .forEach(g => slides.push(htmlSlideGrafico(g.tipo)));
  }

  // SLIDE 1 — Capa (Modo Livre: sem número de case, é carteira própria)
  slides.push(`
    <div class="slide slide-capa active">
      <div class="capa-eyebrow">AIDA Allocation${caseAtual ? ` · Case ${String(caseAtual.id).padStart(2,'0')}` : ' · Modo Livre'}</div>
      <h1>${caseParaPitch().titulo}</h1>
      <div class="capa-sub">Proposta de alocação e tese de investimento · Framework ${fw.nome}</div>
      ${htmlIdentidadeAluno()}
    </div>
  `);

  // Gráficos posicionados "no início" — logo após a capa
  inserirGraficosNaPosicao("inicio");

  // SLIDE — Cenário (só quando há texto: no Modo Livre sem cenário editado,
  // um slide em branco só atrapalharia a apresentação)
  if (getCenarioAtivo().trim()) {
    slides.push(`
      <div class="slide">
        <div class="slide-num">CENÁRIO</div>
        <h2>O cenário que estamos enfrentando</h2>
        <p>${escapeHtml(getCenarioAtivo())}</p>
        ${cenarioFoiEditado() ? '<p style="font-size:12px; color:var(--text-soft); margin-top:auto;">Cenário atualizado pelo apresentador.</p>' : ''}
      </div>
    `);
  }

  // SLIDE — A carteira proposta
  const linhasCarteira = topETFs.map(l => {
    const etf = ETFs.find(e => e.ticker === l.ticker);
    return `<li><strong>${l.ticker}</strong> — ${l.pct.toFixed(1)}% · ${etf ? etf.desc : ''}</li>`;
  }).join("");
  slides.push(`
    <div class="slide">
      <div class="slide-num">PROPOSTA</div>
      <h2>A carteira recomendada</h2>
      <ul>${linhasCarteira || '<li style="color:var(--text-soft)">Carteira não montada</li>'}</ul>
    </div>
  `);

  // SLIDES — As etapas do framework, com gráficos posicionados após cada etapa
  fw.etapas.forEach((et, idx) => {
    const txt = (pitchData[et.id] || "").trim();
    slides.push(`
      <div class="slide">
        <div class="slide-num">${fw.nome} · ETAPA ${idx + 1}</div>
        <h3>${et.icone} ${et.titulo}</h3>
        <p class="${txt ? '' : 'vazio'}" style="${txt ? '' : 'color:var(--text-soft); font-style:italic;'}">
          ${txt ? escapeHtml(txt) : '[Etapa não preenchida — volte e estruture o pitch]'}
        </p>
      </div>
    `);
    // Gráficos posicionados depois desta etapa
    inserirGraficosNaPosicao(`etapa-${idx}`);
  });

  // Gráficos posicionados "no fim" — antes do encerramento
  inserirGraficosNaPosicao("fim");

  // SLIDE FINAL — Encerramento
  slides.push(`
    <div class="slide slide-capa">
      <div class="capa-eyebrow">Vamos dar o próximo passo</div>
      <h1 style="font-size:32px;">Obrigado.</h1>
      <div class="capa-sub">${escapeHtml(caseParaPitch().titulo)}</div>
      ${htmlIdentidadeAluno()}
    </div>
  `);

  viewport.innerHTML = slides.join("");
  totalSlides = slides.length;
  slideAtual = 0;
  mostrarSlide(0);
  renderSlidesDots();

  // Renderiza os gráficos Chart.js dentro dos slides (precisa do DOM já montado)
  if (graficosInseridos.length > 0) {
    setTimeout(renderChartsNosSlides, 50);
  }
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

function copiarPitch() {
  if (!frameworkAtual) return;
  const fw = FRAMEWORKS[frameworkAtual];
  const topETFs = montagemAtual
    .filter(l => l.ticker && l.pct > 0)
    .sort((a, b) => b.pct - a.pct);
  const carteira = topETFs.map(l => `${l.ticker} (${l.pct.toFixed(1)}%)`).join(", ");

  let txt = `PITCH — ${caseParaPitch().titulo}\n`;
  txt += `Framework: ${fw.nome}\n`;
  txt += `Carteira: ${carteira}\n`;
  txt += `Cenário: ${getCenarioAtivo()}\n`;
  txt += `${'─'.repeat(50)}\n\n`;

  fw.etapas.forEach((et, idx) => {
    const conteudo = (pitchData[et.id] || "[não preenchido]").trim();
    txt += `[${idx + 1}] ${et.titulo.toUpperCase()}\n${conteudo}\n\n`;
  });

  if (alunoIdentidade.nome) {
    txt += `${'─'.repeat(50)}\n${alunoIdentidade.nome}`;
    if (alunoIdentidade.arroba) txt += ` · ${alunoIdentidade.arroba}`;
    txt += `\n`;
  }

  navigator.clipboard.writeText(txt).then(() => {
    alert("Pitch copiado para a área de transferência!");
  }).catch(() => {
    alert("Não foi possível copiar. Use Ctrl+C no texto manualmente.");
  });
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
  localStorage.setItem("aida_vo4_dark", document.body.classList.contains("dark"));
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
  if (localStorage.getItem("aida_vo4_dark") === "true") document.body.classList.add("dark");
  aplicarLogo();

  // Monta as URLs dos logos a partir da config (padrão de URL + extensão)
  montarLogos();

  // Textos do programa (PROGRAMA_CONFIG) — antes de tudo, define a "marca"
  aplicarTextosPrograma();

  // Modo de acesso salvo (MAP/FEA)
  const modoSalvo = localStorage.getItem("aida_vo4_modo");
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
