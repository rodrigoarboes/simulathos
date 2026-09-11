// academia/js/app-navegacao.js — extraído de index.html (linhas 5835-6646 do monólito original)
function trocarTela(idTela) {
  document.querySelectorAll(".tela").forEach(t => t.classList.remove("ativo"));
  document.getElementById(idTela).classList.add("ativo");
  window.scrollTo({ top: 0, behavior: "smooth" });

  // FAB "Consultar case": telas de trabalho (3, 4, 5, 6) — hide in Modo Livre (no case)
  const fabCase = document.getElementById("fab-case");
  const telasComFabCase = ["tela3", "tela4", "tela5", "tela6"];
  if (telasComFabCase.includes(idTela) && caseAtual && !modoLivre) {
    fabCase.classList.add("visible");
  } else {
    fabCase.classList.remove("visible");
  }

  // FAB "Ajuda Macroalocação": onde o aluno trava de verdade (Briefing + Montagem)
  const fabAjuda = document.getElementById("fab-ajuda");
  const telasComFabAjuda = ["tela2", "tela3"];
  if (telasComFabAjuda.includes(idTela)) {
    fabAjuda.classList.add("visible");
  } else {
    fabAjuda.classList.remove("visible");
  }

  // FAB "Gráficos de mercado": útil ao montar carteira e ao estruturar o pitch
  const fabGraficos = document.getElementById("fab-graficos");
  const telasComFabGraficos = ["tela2", "tela3", "tela5"];
  if (telasComFabGraficos.includes(idTela)) {
    fabGraficos.classList.add("visible");
  } else {
    fabGraficos.classList.remove("visible");
  }

  // O FAB único só aparece quando ao menos uma ferramenta está disponível
  const fabMenu = document.getElementById("fab-menu");
  if (fabMenu) {
    const algumaFerramenta = fabMenu.querySelectorAll(".fab-menu__itens button.visible").length > 0;
    fabMenu.classList.toggle("visible", algumaFerramenta);
    if (!algumaFerramenta) {
      fabMenu.classList.remove("aberto");
      const fabToggle = document.getElementById("fab-toggle");
      if (fabToggle) fabToggle.setAttribute("aria-expanded", "false");
    }
  }

  // O menu do FAB nunca sobrevive a uma troca de tela aberto
  fecharFabMenu(false);

  passosVisitados[idTela] = true;
  atualizarStepper(idTela);
}

/* =================================================================================
   STEPPER DA TOPBAR — marca o passo atual e deixa voltar aos passos já concluídos
   ================================================================================= */
var passosVisitados = { tela1: true };

// Como se volta para cada passo. Só é usado para passos JÁ concluídos.
function navegarParaPasso(idTela) {
  if (idTela === "tela1") { voltarTela1(); return; }
  if (idTela === "tela2") {
    if (!caseAtual || modoLivre) return;
    irTela2();
    return;
  }
  if (idTela === "tela3") {
    if (typeof irTela3 === "function") irTela3(); else trocarTela("tela3");
    return;
  }
  if (idTela === "tela4") { trocarTela("tela4"); return; }
  if (idTela === "tela5") {
    if (typeof irTela5 === "function") irTela5(); else trocarTela("tela5");
    return;
  }
  if (idTela === "tela6") {
    if (typeof irTela6 === "function") irTela6(); else trocarTela("tela6");
  }
}

function atualizarStepper(idTela) {
  var passos = document.querySelectorAll("#stepper li");

  // O Modo Livre não tem briefing nem gabarito: o stepper mostra só o que
  // existe (Montagem · Resultado · Apresentação) em vez de seis passos com
  // metade morta. Os rótulos também mudam — "Gabarito" vira "Resultado".
  var ROTULOS_LIVRE = { tela3: "Montagem", tela4: "Resultado", tela6: "Apresentação" };
  passos.forEach(function (li) {
    var alvo = li.dataset.tela;
    if (modoLivre) {
      var visivel = ROTULOS_LIVRE.hasOwnProperty(alvo);
      li.hidden = !visivel;
      if (visivel) li.textContent = ROTULOS_LIVRE[alvo];
    } else {
      li.hidden = false;
      if (li.dataset.rotulo) li.textContent = li.dataset.rotulo;
    }
  });
  // Renumera o que ficou visível, para o contador não pular (1, 2, 3).
  var n = 0;
  passos.forEach(function (li) { if (!li.hidden) { n++; li.dataset.passo = String(n); } });

  var indiceAtual = -1;
  passos.forEach(function (li, i) { if (li.dataset.tela === idTela) indiceAtual = i; });
  passos.forEach(function (li, i) {
    var alvo = li.dataset.tela;
    var concluido = indiceAtual > -1 && i < indiceAtual;
    var atual = indiceAtual > -1 && i === indiceAtual;
    // Só volta para trás, e só para tela que o aluno já viu nesta sessão.
    var navegavel = concluido && passosVisitados[alvo] === true &&
      !(alvo === "tela2" && (modoLivre || !caseAtual));

    li.classList.toggle("done", concluido);
    li.classList.toggle("navegavel", navegavel);
    if (atual) li.setAttribute("aria-current", "step");
    else li.removeAttribute("aria-current");

    li.setAttribute("role", "button");
    li.setAttribute("tabindex", navegavel ? "0" : "-1");
    if (navegavel) {
      li.removeAttribute("aria-disabled");
      li.title = "Voltar para " + (li.textContent || "").trim();
    } else {
      li.setAttribute("aria-disabled", "true");
      li.removeAttribute("title");
    }
  });
}

function stepperClique(ev) {
  var li = ev.target.closest ? ev.target.closest("#stepper li") : null;
  if (!li || li.getAttribute("aria-disabled") === "true") return;
  navegarParaPasso(li.dataset.tela);
}

function stepperTecla(ev) {
  if (ev.key !== "Enter" && ev.key !== " " && ev.key !== "Spacebar") return;
  var li = ev.target.closest ? ev.target.closest("#stepper li") : null;
  if (!li || li.getAttribute("aria-disabled") === "true") return;
  ev.preventDefault();
  navegarParaPasso(li.dataset.tela);
}

(function ligarStepper() {
  function ligar() {
    var ol = document.getElementById("stepper");
    if (!ol) return;
    ol.addEventListener("click", stepperClique);
    ol.addEventListener("keydown", stepperTecla);
    atualizarStepper("tela1");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar);
  else ligar();
})();
function voltarTela1() {
  modoLivre = false;
  montagemAtual = [];
  pitchData = {};
  frameworkAtual = null;

  // APRESENTACAO-05 — limpeza da sessão de apresentação do case anterior.
  // Sem isto, os gráficos escolhidos no case anterior reapareciam nos slides do
  // case novo e o cronômetro continuava correndo em segundo plano.
  graficosInseridos.length = 0;
  if (typeof destruirChartsDosSlides === "function") destruirChartsDosSlides();
  const viewport = document.getElementById("slide-viewport");
  if (viewport) viewport.innerHTML = "";
  if (typeof totalSlides !== "undefined") totalSlides = 0;
  if (typeof slideAtual !== "undefined") slideAtual = 0;
  if (typeof resetCronometro === "function") resetCronometro();
  if (typeof atualizarBotoesInseridos === "function") atualizarBotoesInseridos();
  if (typeof sairModoApresentacao === "function" && emModoApresentacao) sairModoApresentacao();

  fecharDrawer();
  fecharAjudaMacro();
  fecharGraficos();
  passosVisitados = { tela1: true };
  trocarTela("tela1");
  renderGrid();
  atualizarStatsHome();
}
function irTela2() { trocarTela("tela2"); }

/* =================================================================================
   DRAWER — Consultar Case
   ================================================================================= */
function popularDrawer() {
  if (!caseAtual) return;

  document.getElementById("drawer-numero").textContent = `CASE ${String(caseAtual.id).padStart(2,'0')}`;
  document.getElementById("drawer-titulo").textContent = caseAtual.titulo;

  const tagsHtml = `
    <div class="case-meta" style="margin-bottom:16px;">
      <span class="tag perfil-${caseAtual.perfil.slice(0,5)}">${caseAtual.perfil}</span>
      <span class="tag">${labelCiclo(caseAtual.ciclo)}</span>
      <span class="tag">${labelPatrim(caseAtual.patrimonio)}</span>
      <span class="tag">${caseAtual.custodia === "OFFSHORE" ? "Offshore" : "Brasil"}</span>
    </div>
  `;

  const dadosHtml = Object.entries(caseAtual.dados).map(([k,v]) => 
    `<div class="dado-key"><span>${k}</span><span>${v}</span></div>`
  ).join("");

  const objetivosHtml = caseAtual.objetivos.map(o => `<li>${o}</li>`).join("");
  const restricoesHtml = caseAtual.restricoes.map(r => `<li>${r}</li>`).join("");

  document.getElementById("drawer-body").innerHTML = `
    ${tagsHtml}
    <h4><svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><circle cx='12' cy='8' r='3.5'/><path d='M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5'/></svg> Perfil do Cliente</h4>
    <p>${caseAtual.cliente}</p>

    <h4><svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><rect x='3' y='7.5' width='18' height='12' rx='2'/><path d='M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5'/><path d='M3 12.5h18'/></svg> Situação Patrimonial</h4>
    ${dadosHtml}

    <div class="macro-box">
      <h4><svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><path d='M3 17.5 9.5 11l3.5 3.5L21 6'/><path d='M15 6h6v6'/></svg> Cenário Macroeconômico</h4>
      ${cenarioFoiEditado() ? '<span class="cenario-editado-tag">Cenário atual (editado)</span><br/>' : ''}
      <p>${getCenarioAtivo()}</p>
    </div>

    <h4><svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><circle cx='12' cy='12' r='8'/><circle cx='12' cy='12' r='3.5'/><path d='M12 11.9v.2'/></svg> Objetivos</h4>
    <ul>${objetivosHtml}</ul>

    <h4><svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><path d='M12 4 2.8 20h18.4z'/><path d='M12 10v4M12 17.1v.1'/></svg> Restrições / Atenção</h4>
    <ul>${restricoesHtml}</ul>
  `;
}

/* ---------------------------------------------------------------------------
   Overlays acessíveis: role=dialog + aria-modal no markup, foco preso dentro
   do drawer enquanto aberto, Esc fecha (handler global) e o foco volta para o
   botão que abriu. Um drawer por vez.
   --------------------------------------------------------------------------- */
var _drawerAberto = null; // { drawer, overlay, gatilho }

function _focaveisDe(raiz) {
  var sel = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]),' +
            ' textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.prototype.filter.call(raiz.querySelectorAll(sel), function (el) {
    return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
  });
}

function _drawerTab(e) {
  if (!_drawerAberto || e.key !== "Tab") return;
  var lista = _focaveisDe(_drawerAberto.drawer);
  if (!lista.length) { e.preventDefault(); return; }
  var primeiro = lista[0], ultimo = lista[lista.length - 1];
  var ativo = document.activeElement;
  if (!_drawerAberto.drawer.contains(ativo)) { e.preventDefault(); primeiro.focus(); return; }
  if (e.shiftKey && ativo === primeiro) { e.preventDefault(); ultimo.focus(); }
  else if (!e.shiftKey && ativo === ultimo) { e.preventDefault(); primeiro.focus(); }
}

function abrirOverlay(idDrawer, idOverlay) {
  var drawer = document.getElementById(idDrawer);
  if (!drawer) return;
  var overlay = idOverlay ? document.getElementById(idOverlay) : null;
  if (_drawerAberto && _drawerAberto.drawer !== drawer) {
    fecharOverlay(_drawerAberto.drawer.id, _drawerAberto.overlay ? _drawerAberto.overlay.id : "");
  }
  var gatilho = document.activeElement;
  if (!gatilho || gatilho === document.body || drawer.contains(gatilho)) gatilho = null;
  // Aberto por um item do FAB? O menu recolhe, então o foco volta para o botão
  // "Ferramentas" (o item some da tela e não pode receber foco de volta).
  if (gatilho && gatilho.closest && gatilho.closest("#fab-menu")) {
    gatilho = document.getElementById("fab-toggle") || gatilho;
    fecharFabMenu(false);
  }
  drawer.classList.add("open");
  if (overlay) overlay.classList.add("open");
  drawer.removeAttribute("aria-hidden");
  document.body.style.overflow = "hidden";
  _drawerAberto = { drawer: drawer, overlay: overlay, gatilho: gatilho };
  document.addEventListener("keydown", _drawerTab, true);
  var alvo = drawer.querySelector(".drawer-close") || _focaveisDe(drawer)[0];
  if (alvo) setTimeout(function () { if (drawer.classList.contains("open")) alvo.focus(); }, 60);
}

function fecharOverlay(idDrawer, idOverlay) {
  var drawer = document.getElementById(idDrawer);
  if (!drawer) return;
  var overlay = idOverlay ? document.getElementById(idOverlay) : null;
  var estavaAberto = drawer.classList.contains("open");
  drawer.classList.remove("open");
  if (overlay) overlay.classList.remove("open");
  drawer.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".drawer.open")) document.body.style.overflow = "";
  if (!estavaAberto) return;
  var gatilho = null;
  if (_drawerAberto && _drawerAberto.drawer === drawer) {
    gatilho = _drawerAberto.gatilho;
    _drawerAberto = null;
    document.removeEventListener("keydown", _drawerTab, true);
  }
  if (gatilho && document.body.contains(gatilho)) {
    var visivel = gatilho.offsetWidth > 0 || gatilho.offsetHeight > 0;
    if (!visivel && gatilho.closest && gatilho.closest("#fab-menu")) {
      gatilho = document.getElementById("fab-toggle");
    }
    if (gatilho) gatilho.focus();
  }
}

function abrirDrawer() {
  popularDrawer();
  abrirOverlay("drawer", "drawer-overlay");
}

function fecharDrawer() {
  fecharOverlay("drawer", "drawer-overlay");
}

/* ============ DRAWER AJUDA MACROALOCAÇÃO ============ */
function abrirAjudaMacro() {
  abrirOverlay("drawer-ajuda", "ajuda-overlay");
}

function fecharAjudaMacro() {
  fecharOverlay("drawer-ajuda", "ajuda-overlay");
}

/* ============ DRAWER GRÁFICOS DE MERCADO ============ */
let chartDolar = null;
let chartIndices = null;
let chartR100 = null;
let chartImab = null;
let chartImabLongo = null;
let periodoDolarAtual = "tudo";

// Gráficos que o aluno escolheu inserir nos slides do pitch
let graficosInseridos = []; // ['r100', 'dolar', 'indices']

function abrirGraficos() {
  abrirOverlay("drawer-graficos", "graficos-overlay");
  // Renderiza com leve atraso para o drawer abrir antes do Chart.js medir o canvas
  setTimeout(() => {
    renderGraficoR100();
    renderGraficoDolar(periodoDolarAtual);
    renderGraficoIndices();
    renderGraficoImab();
    montarImabLongo();
    atualizarBotoesInseridos();
  }, 320);
}

function fecharGraficos() {
  fecharOverlay("drawer-graficos", "graficos-overlay");
}

function corCSS(nome) {
  return getComputedStyle(document.body).getPropertyValue(nome).trim();
}

function mudarPeriodoDolar(periodo) {
  periodoDolarAtual = periodo;
  document.querySelectorAll(".grafico-periodo-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.periodo === periodo);
  });
  renderGraficoDolar(periodo);
}

function renderGraficoDolar(periodo) {
  const d = DADOS_MERCADO.dolar;
  let meses = d.meses, valores = d.valores;

  // Recorta o período
  if (periodo === "10a") {
    meses = meses.slice(-120); valores = valores.slice(-120);
  } else if (periodo === "5a") {
    meses = meses.slice(-60); valores = valores.slice(-60);
  }

  const ctx = document.getElementById("canvas-dolar").getContext("2d");
  if (chartDolar) chartDolar.destroy();

  chartDolar = new Chart(ctx, {
    type: "line",
    data: {
      labels: meses,
      datasets: [{
        label: "USD/BRL",
        data: valores,
        borderColor: corCSS("--brand-blue"),
        backgroundColor: "rgba(0,136,204,0.08)",
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: {
            maxTicksLimit: 8,
            font: { size: 10 },
            color: corCSS("--text-soft")
          },
          grid: { display: false }
        },
        y: {
          ticks: {
            font: { size: 10 },
            color: corCSS("--text-soft"),
            callback: v => "R$ " + v.toFixed(2)
          },
          grid: { color: corCSS("--border") }
        }
      }
    }
  });

  // Destaque
  const ini = valores[0], fim = valores[valores.length - 1];
  const variacao = (((fim - ini) / ini) * 100).toFixed(0);
  document.getElementById("destaque-dolar").innerHTML = `
    No início do período: <strong>R$ ${ini.toFixed(2)}</strong> por dólar.
    Hoje: <strong>R$ ${fim.toFixed(2)}</strong>.
    O real ${variacao >= 0 ? 'desvalorizou' : 'valorizou'}
    <strong>${Math.abs(variacao)}%</strong> frente ao dólar nesse intervalo.
  `;
}

function renderGraficoR100() {
  const d = DADOS_MERCADO.dolar;
  const ctx = document.getElementById("canvas-r100").getContext("2d");
  if (chartR100) chartR100.destroy();

  chartR100 = new Chart(ctx, {
    type: "line",
    data: {
      labels: d.meses,
      datasets: [{
        label: "Valor de R$100 em dólar",
        data: d.r100emdolar,
        borderColor: corCSS("--brand-red"),
        backgroundColor: "rgba(161,32,38,0.12)",
        borderWidth: 2,
        fill: true,
        pointRadius: 0,
        tension: 0.2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8, font: { size: 10 }, color: corCSS("--text-soft") },
          grid: { display: false }
        },
        y: {
          beginAtZero: true,
          ticks: {
            font: { size: 10 },
            color: corCSS("--text-soft"),
            callback: v => "US$ " + v
          },
          grid: { color: corCSS("--border") }
        }
      }
    }
  });

  // Destaque
  const ini = d.r100emdolar[0];
  const fim = d.r100emdolar[d.r100emdolar.length - 1];
  const perda = (((ini - fim) / ini) * 100).toFixed(0);
  document.getElementById("destaque-r100").innerHTML = `
    Em <strong>${d.meses[0]}</strong>, R$100 valiam <strong>US$ ${ini.toFixed(0)}</strong>.
    Hoje valem <strong>US$ ${fim.toFixed(2)}</strong> — uma perda de
    <strong>${perda}%</strong> do poder de compra em dólar. É por isso que dolarizar parte do patrimônio é proteção, não aposta.
  `;
}

function renderGraficoIndices() {
  const idx = DADOS_MERCADO.indices;
  const ctx = document.getElementById("canvas-indices").getContext("2d");
  if (chartIndices) chartIndices.destroy();

  chartIndices = new Chart(ctx, {
    type: "line",
    data: {
      labels: idx.meses,
      datasets: [
        {
          label: "CDI",
          data: idx.cdi,
          borderColor: corCSS("--brand-blue"),
          borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false
        },
        {
          label: "IPCA (inflação)",
          data: idx.ipca,
          borderColor: corCSS("--brand-red"),
          borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false
        },
        {
          label: "Poupança",
          data: idx.poupanca,
          borderColor: corCSS("--brand-orange"),
          borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false,
          borderDash: [5, 4]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, font: { size: 11 }, color: corCSS("--text") }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 7, font: { size: 10 }, color: corCSS("--text-soft") },
          grid: { display: false }
        },
        y: {
          ticks: {
            font: { size: 10 },
            color: corCSS("--text-soft"),
            callback: v => "R$ " + v.toFixed(0)
          },
          grid: { color: corCSS("--border") }
        }
      }
    }
  });

  // Destaque
  const cdiF = idx.cdi[idx.cdi.length - 1];
  const ipcaF = idx.ipca[idx.ipca.length - 1];
  const poupF = idx.poupanca[idx.poupanca.length - 1];
  const cdiReal = (((cdiF / ipcaF) - 1) * 100).toFixed(1);
  const poupReal = (((poupF / ipcaF) - 1) * 100).toFixed(1);
  document.getElementById("destaque-indices").innerHTML = `
    R$ 100 em ${idx.meses[0]} viraram: <strong>R$ ${cdiF.toFixed(0)} no CDI</strong>,
    <strong>R$ ${poupF.toFixed(0)} na Poupança</strong>,
    enquanto a inflação levou o "custo de vida" para <strong>R$ ${ipcaF.toFixed(0)}</strong>.
    Ganho real: CDI <strong>+${cdiReal}%</strong> · Poupança <strong>${poupReal >= 0 ? '+' : ''}${poupReal}%</strong> acima da inflação.
  `;
}

/**
 * Série do IMA-B derivada EM RUNTIME do ETF IMAB11 que já está em data/dados.js
 * (nada de número duplicado ou digitado à mão). Fechamento do último pregão de
 * cada mês, rebase 100 no primeiro mês, alinhado ao CDI/IPCA do DADOS_MERCADO.
 */
function dadosGraficoImab() {
  const raw = (typeof DADOS !== "undefined" && DADOS.etfs && DADOS.etfs.IMAB11) || [];
  if (raw.length < 2) return null;

  const porMes = new Map(); // "YYYY-MM" → último close do mês (raw vem ordenado)
  raw.forEach(p => porMes.set(p.data.slice(0, 7), p.close));

  const idx = DADOS_MERCADO.indices;
  const chave = m => m.slice(3) + "-" + m.slice(0, 2); // "05/2021" → "2021-05"
  const i0 = idx.meses.findIndex(m => porMes.has(chave(m)));
  if (i0 < 0) return null;

  const baseImab = porMes.get(chave(idx.meses[i0]));
  const baseCdi = idx.cdi[i0];
  const baseIpca = idx.ipca[i0];
  const out = { meses: [], imab: [], cdi: [], ipca: [] };
  for (let i = i0; i < idx.meses.length; i++) {
    const v = porMes.get(chave(idx.meses[i]));
    if (v == null) break; // fim da série do ETF — nunca "achata" a curva
    out.meses.push(idx.meses[i]);
    out.imab.push(100 * v / baseImab);
    out.cdi.push(100 * idx.cdi[i] / baseCdi);
    out.ipca.push(100 * idx.ipca[i] / baseIpca);
  }
  return out.meses.length >= 2 ? out : null;
}

function renderGraficoImab() {
  const card = document.getElementById("card-grafico-imab");
  const dados = dadosGraficoImab();
  if (!dados) { if (card) card.style.display = "none"; return; }
  if (card) card.style.display = "";

  const ctx = document.getElementById("canvas-imab").getContext("2d");
  if (chartImab) chartImab.destroy();

  chartImab = new Chart(ctx, {
    type: "line",
    data: {
      labels: dados.meses,
      datasets: [
        {
          label: "IMA-B (IMAB11)",
          data: dados.imab,
          borderColor: corCSS("--ok"),
          borderWidth: 2.5, pointRadius: 0, tension: 0.2, fill: false
        },
        {
          label: "CDI",
          data: dados.cdi,
          borderColor: corCSS("--brand-blue"),
          borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false
        },
        {
          label: "IPCA (inflação)",
          data: dados.ipca,
          borderColor: corCSS("--brand-red"),
          borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 12, font: { size: 11 }, color: corCSS("--text") }
        }
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 7, font: { size: 10 }, color: corCSS("--text-soft") },
          grid: { display: false }
        },
        y: {
          ticks: {
            font: { size: 10 },
            color: corCSS("--text-soft"),
            callback: v => "R$ " + v.toFixed(0)
          },
          grid: { color: corCSS("--border") }
        }
      }
    }
  });

  // Destaque — tudo calculado da própria série, nada digitado à mão
  const imabF = dados.imab[dados.imab.length - 1];
  const cdiF = dados.cdi[dados.cdi.length - 1];
  const ipcaF = dados.ipca[dados.ipca.length - 1];
  const imabReal = ((imabF / ipcaF - 1) * 100).toFixed(1);
  const menorVsBase = Math.min(...dados.imab.map(v => v / 100 - 1));
  const trechoVale = menorVsBase < -0.005
    ? `Mesmo chegando a ficar <strong>${(menorVsBase * 100).toFixed(1)}%</strong> abaixo do ponto
       de partida na marcação a mercado do ciclo de alta da Selic, o`
    : `O`;
  document.getElementById("destaque-imab").innerHTML = `
    R$ 100 em ${dados.meses[0]} viraram: <strong>R$ ${imabF.toFixed(0)} no IMA-B</strong>,
    <strong>R$ ${cdiF.toFixed(0)} no CDI</strong>, com a inflação em <strong>R$ ${ipcaF.toFixed(0)}</strong>.
    ${trechoVale} IMA-B entregou
    <strong>${Number(imabReal) >= 0 ? '+' : ''}${imabReal}%</strong> acima da inflação no período.
    Argumento de pitch: é o termômetro do Tesouro IPCA+ — proteção de poder de compra com juro real.
  `;
}

/* ============ IMA-B LONGO PRAZO — SGS AO VIVO COM AUTOVALIDAÇÃO ============
   A série longa do IMA-B (desde 2004) vem do SGS do Banco Central, buscada
   pelo navegador de quem abre a página. Como o número exato da série ANBIMA
   no catálogo do SGS não deve ser confiado às cegas, o código PROVA qual
   candidato é o IMA-B: compara os retornos mensais de cada um com o ETF
   IMAB11 (data/dados.js) na janela 2021→2026 e só aceita quem bate em
   correlação, erro médio E volatilidade. Sem aprovação → sem gráfico. */

/* Códigos confirmados do bloco ANBIMA no SGS: 12466 = IMA-B (diário),
   12467 = IMA-B 5, 12468 = IMA-B 5+. A validação contra o IMAB11 continua
   decidindo — os códigos só ordenam a fila. */
const SGS_IMAB_CANDIDATOS = [12466, 12467, 12468, 12462];
const SGS_CDI_MENSAL = 4391;
const SGS_IPCA_MENSAL = 433;
const IMABLONGO_CACHE_KEY = "academia.imablongo.v4";
const IMABLONGO_CACHE_DIAS = 7;

async function buscarSgs(codigo, params, timeoutMs) {
  const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados${params.ultimos ? `/ultimos/${params.ultimos}` : ""}?formato=json` +
    (params.dataInicial ? `&dataInicial=${params.dataInicial}` : "") +
    (params.dataFinal ? `&dataFinal=${params.dataFinal}` : "");
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs || 12000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`SGS ${codigo}: HTTP ${res.status}`);
    const rows = await res.json();
    if (!Array.isArray(rows)) throw new Error(`SGS ${codigo}: resposta inesperada`);
    return rows; // [{ data: "DD/MM/YYYY", valor: "..." }, ...]
  } catch (e) {
    if (e && e.name === "AbortError") throw new Error(`SGS ${codigo}: sem resposta em ${(timeoutMs || 12000) / 1000}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * A API do BCB limita consultas de séries diárias a ~10 anos, então busca em
 * blocos. Dois cuidados aprendidos no log de 11/09/2026, quando os quatro
 * códigos voltaram HTTP 400 até no runner do GitHub (internet limpa):
 *  - o último bloco termina HOJE, nunca em 31/12 do ano corrente: pedir data
 *    futura é uma das formas de levar 400;
 *  - bloco que falha não derruba os outros, porque série descontinuada erra
 *    justamente no bloco posterior ao último dado que ela tem.
 */
function blocosSgs(anoInicial, hoje) {
  const anoFinal = hoje.getFullYear();
  const dd = String(hoje.getDate()).padStart(2, "0");
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  const blocos = [];
  for (let a = anoInicial; a <= anoFinal; a += 9) {
    const fimAno = Math.min(a + 8, anoFinal);
    blocos.push({
      dataInicial: `01/01/${a}`,
      dataFinal: fimAno === anoFinal ? `${dd}/${mm}/${anoFinal}` : `31/12/${fimAno}`
    });
  }
  return blocos;
}

async function buscarSgsLongo(codigo, anoInicial) {
  const blocos = blocosSgs(anoInicial, new Date());
  const res = await Promise.allSettled(blocos.map(b => buscarSgs(codigo, b, 20000)));
  const falhas = [];
  const partes = [];
  res.forEach((r, i) => {
    if (r.status === "fulfilled") partes.push(r.value);
    else falhas.push(`${blocos[i].dataInicial}..${blocos[i].dataFinal}: ${(r.reason && r.reason.message) || "?"}`);
  });
  if (partes.length === 0) throw new Error(`SGS ${codigo}: nenhum bloco respondeu (${falhas.join(" · ")})`);
  const vistos = new Set();
  const rows = [];
  for (const parte of partes) {
    for (const r of parte) {
      if (!vistos.has(r.data)) { vistos.add(r.data); rows.push(r); }
    }
  }
  rows.sort((a, b) => {
    const A = String(a.data).split("/"), B = String(b.data).split("/");
    return `${A[2]}${A[1]}${A[0]}`.localeCompare(`${B[2]}${B[1]}${B[0]}`);
  });
  return rows;
}

function parseValor(r) {
  let s = String(r.valor).trim();
  // O SGS pode devolver número em formato brasileiro ("7.842,31") — ponto de
  // milhar + vírgula decimal. Detecta e normaliza antes do parseFloat.
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
  const v = parseFloat(s);
  return isFinite(v) ? v : null;
}

/** Interpretação A — valor = % do período: compõe por mês. */
function mensalizaComoVariacao(rows) {
  const porMes = new Map(); // "YYYY-MM" → fator acumulado do mês
  for (const r of rows) {
    const v = parseValor(r);
    if (v === null) continue;
    const [, mm, yyyy] = r.data.split("/");
    const chave = `${yyyy}-${mm}`;
    porMes.set(chave, (porMes.get(chave) || 1) * (1 + v / 100));
  }
  return [...porMes.entries()]
    .map(([mes, fator]) => ({ mes, retorno: fator - 1 }))
    .sort((a, b) => (a.mes < b.mes ? -1 : 1));
}

/** Interpretação B — valor = número-índice diário: retorno mensal = fim/fim anterior. */
function mensalizaComoIndice(rows) {
  const fimDeMes = new Map(); // "YYYY-MM" → último índice do mês (rows em ordem)
  for (const r of rows) {
    const v = parseValor(r);
    if (v === null || v <= 0) continue;
    const [, mm, yyyy] = r.data.split("/");
    fimDeMes.set(`${yyyy}-${mm}`, v);
  }
  const meses = [...fimDeMes.keys()].sort();
  const out = [];
  for (let i = 1; i < meses.length; i++) {
    out.push({ mes: meses[i], retorno: fimDeMes.get(meses[i]) / fimDeMes.get(meses[i - 1]) - 1 });
  }
  return out;
}

/** Retornos mensais do ETF IMAB11 a partir do dados.js (gabarito da validação). */

// Mínimo de meses de sobreposição com o ETF para validar uma candidata do SGS.
// Ver o comentário gêmeo em tools/imab-longo.mjs.
const MIN_MESES_GABARITO = 12;

function mesSeguinte(mes) {
  const p = mes.split("-").map(Number);
  return p[1] === 12 ? `${p[0] + 1}-01` : `${p[0]}-${String(p[1] + 1).padStart(2, "0")}`;
}

/**
 * Retornos mensais reais do IMAB11, usados como gabarito para validar a série
 * do SGS. Descarta trecho CONGELADO: a fonte devolve preço repetido para ETF de
 * renda fixa pouco líquido, e hoje o IMAB11 tem 910 pregões parados em 79,50
 * (2022-03-08 a 2025-10-23). Mês dentro do congelamento vira retorno zero
 * forjado e reprova qualquer candidata. Também só liga meses vizinhos no
 * calendário, para um mês faltando não virar retorno de vários meses.
 */
function retornosMensaisImab11(minRunCongelado) {
  const raw = (typeof DADOS !== "undefined" && DADOS.etfs && DADOS.etfs.IMAB11) || [];
  const minRun = minRunCongelado || 10;

  const congelado = new Array(raw.length).fill(false);
  let i = 0;
  while (i < raw.length) {
    let j = i + 1;
    while (j < raw.length && raw[j].close === raw[i].close) j++;
    if (j - i >= minRun) for (let k = i; k < j; k++) congelado[k] = true;
    i = j;
  }

  const fimDeMes = new Map();
  raw.forEach((p, idx) => { if (!congelado[idx]) fimDeMes.set(p.data.slice(0, 7), p.close); });

  const meses = [...fimDeMes.keys()].sort();
  const out = new Map();
  for (let k = 1; k < meses.length; k++) {
    if (meses[k] !== mesSeguinte(meses[k - 1])) continue;
    const prev = fimDeMes.get(meses[k - 1]);
    if (prev > 0) out.set(meses[k], fimDeMes.get(meses[k]) / prev - 1);
  }
  return out;
}

/** Prova se a série candidata é mesmo o IMA-B: correlação, erro médio e vol.
    O SGS descontinuou o bloco ANBIMA (migrou para data.anbima.com.br), então a
    sobreposição com o IMAB11 pode ser curta — o mínimo é 6 meses, e a razão de
    volatilidade é o que separa IMA-B de IMA-B 5 (vol menor) e 5+ (vol maior). */
function validaContraImab11(mensalSgs, gabarito) {
  const pares = [];
  for (const { mes, retorno } of mensalSgs) {
    if (gabarito.has(mes)) pares.push([retorno, gabarito.get(mes)]);
  }
  if (pares.length < 6) return { ok: false, motivo: `só ${pares.length} meses em comum` };

  const n = pares.length;
  const ma = pares.reduce((s, p) => s + p[0], 0) / n;
  const mb = pares.reduce((s, p) => s + p[1], 0) / n;
  let cov = 0, va = 0, vb = 0, mae = 0;
  for (const [a, b] of pares) {
    cov += (a - ma) * (b - mb);
    va += (a - ma) ** 2;
    vb += (b - mb) ** 2;
    mae += Math.abs(a - b);
  }
  const corr = va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
  mae /= n;
  const volRatio = vb > 0 ? Math.sqrt(va / vb) : 0;

  const ok = corr >= 0.97 && mae <= 0.004 && volRatio >= 0.8 && volRatio <= 1.25;
  return { ok, corr, mae, volRatio, meses: n };
}

function leCacheImabLongo() {
  try {
    const raw = localStorage.getItem(IMABLONGO_CACHE_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (!c || !c.series || !c.buscadoEm) return null;
    const idadeDias = (Date.now() - c.buscadoEm) / 86400000;
    return idadeDias <= IMABLONGO_CACHE_DIAS ? c : null;
  } catch { return null; }
}

let imabLongoBuscando = false;

/**
 * Série pronta, gerada uma vez por dia pela esteira (tools/imab-longo.mjs) e
 * versionada em data/imab-longo.json.
 *
 * ESTE É O CAMINHO NORMAL. A busca ao vivo no BCB, abaixo, virou plano B: a rede
 * do banco (que é onde o aluno está) bloqueia api.bcb.gov.br, e o gráfico morria
 * com "não consegui montar a série longa agora". Nenhum outro gráfico do app
 * depende de rede externa — este era o único.
 */
async function leArquivoImabLongo() {
  try {
    const res = await fetch("data/imab-longo.json", { cache: "no-cache" });
    if (!res.ok) return null;
    const j = await res.json();
    if (!j || !j.series || !Array.isArray(j.series.meses) || j.series.meses.length < 120) return null;
    // O render mostra a data com new Date(buscadoEm); a esteira grava geradoEm
    // em ISO. Sem esta ponte, o rodapé do gráfico dizia "NaN/NaN/NaN".
    const quando = Date.parse(j.geradoEm);
    return { ...j, buscadoEm: isFinite(quando) ? quando : Date.now() };
  } catch { return null; }
}

async function montarImabLongo(forcar) {
  const status = document.getElementById("status-imablongo");
  const card = document.getElementById("card-grafico-imablongo");
  if (!status || !card) return;

  const cache = forcar ? null : leCacheImabLongo();
  if (cache) { renderImabLongo(cache); return; }
  if (imabLongoBuscando) return;
  imabLongoBuscando = true;
  status.style.display = "";

  // Caminho normal: arquivo local. Instantâneo, funciona atrás de firewall.
  const pronto = await leArquivoImabLongo();
  if (pronto) {
    imabLongoBuscando = false;
    renderImabLongo(pronto);
    return;
  }

  try {
    const gabarito = retornosMensaisImab11();
    if (gabarito.size < MIN_MESES_GABARITO) throw new Error(
      `o ETF IMAB11 do dados.js só tem ${gabarito.size} meses aproveitáveis (mínimo ${MIN_MESES_GABARITO}): ` +
      "a série está congelada na fonte, então não existe referência para validar a série do Banco Central");

    // Fase 0: ping rápido — se o BCB não responde, avisa já com o motivo
    status.innerHTML = "<svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><circle cx='12' cy='12' r='8.5'/><path d='M12 7.5V12l3 2'/></svg> Conectando ao Banco Central (SGS)…";
    await buscarSgs(SGS_CDI_MENSAL, { ultimos: 1 }, 8000);

    // Fase 1: descobrir QUAL série é o IMA-B. Pede o FIM de cada candidata
    // (/ultimos/900 — onde quer que a série termine) e testa as duas
    // interpretações possíveis (número-índice e variação %): a validação
    // contra o IMAB11 decide. Se nada passar, o erro lista o que veio de
    // cada candidata — diagnóstico completo na tela.
    status.innerHTML = "<svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><circle cx='12' cy='12' r='8.5'/><path d='M12 7.5V12l3 2'/></svg> Identificando a série do IMA-B (validando contra o IMAB11)…";
    // A sondagem pede POR INTERVALO DE DATA, não por /ultimos/N. Em 11/09/2026
    // os quatro códigos voltaram HTTP 400 com /ultimos/900, no navegador e no
    // runner do GitHub — enquanto o robô diário conversa com o mesmo SGS sem
    // falhar, sempre por intervalo (fetch-dados.mjs, séries 12 e 433). Usamos
    // a forma que tem histórico de funcionar.
    const mesesGab = [...gabarito.keys()].sort();
    const hojeD = new Date();
    const janela = {
      dataInicial: `01/01/${mesesGab.length ? Number(mesesGab[0].slice(0, 4)) - 1 : hojeD.getFullYear() - 5}`,
      dataFinal: `${String(hojeD.getDate()).padStart(2, "0")}/${String(hojeD.getMonth() + 1).padStart(2, "0")}/${hojeD.getFullYear()}`
    };
    const amostras = await Promise.allSettled(
      SGS_IMAB_CANDIDATOS.map(c => buscarSgs(c, janela, 15000)),
    );
    let escolhido = null;
    const diag = [];
    for (let i = 0; i < SGS_IMAB_CANDIDATOS.length && !escolhido; i++) {
      const codigo = SGS_IMAB_CANDIDATOS[i];
      if (amostras[i].status !== "fulfilled") {
        diag.push(`${codigo}: falha na busca (${(amostras[i].reason && amostras[i].reason.message) || "?"})`);
        continue;
      }
      const rows = amostras[i].value;
      if (rows.length === 0) { diag.push(`${codigo}: veio vazia`); continue; }
      let melhor = null;
      for (const modo of ["indice", "variacao"]) {
        const mensal = modo === "indice" ? mensalizaComoIndice(rows) : mensalizaComoVariacao(rows);
        const v = validaContraImab11(mensal, gabarito);
        if (v.ok) { escolhido = { codigo, modo, verif: v }; break; }
        if (!melhor || (v.corr || 0) > (melhor.corr || 0)) melhor = v;
      }
      if (!escolhido) {
        const resumoV = melhor && melhor.corr !== undefined
          ? `melhor corr ${melhor.corr.toFixed(2)} em ${melhor.meses || 0}m (volRatio ${melhor.volRatio ? melhor.volRatio.toFixed(2) : "?"})`
          : (melhor && melhor.motivo) || "sem janela de validação";
        diag.push(`${codigo}: ${rows.length} pts, ${rows[0].data}→${rows[rows.length - 1].data}, últ. valor "${rows[rows.length - 1].valor}", ${resumoV}`);
      }
    }
    if (!escolhido) {
      throw new Error(`nenhuma candidata validou contra o IMAB11. Diagnóstico — ${diag.join(" · ")}`);
    }

    // Fase 2: histórico completo do aprovado + CDI e IPCA mensais (em blocos)
    status.innerHTML = "<svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><circle cx='12' cy='12' r='8.5'/><path d='M12 7.5V12l3 2'/></svg> Baixando o histórico completo (desde 2004)…";
    const [imabFull, cdiFull, ipcaFull] = await Promise.all([
      buscarSgsLongo(escolhido.codigo, 2003),
      buscarSgsLongo(SGS_CDI_MENSAL, 2003),
      buscarSgsLongo(SGS_IPCA_MENSAL, 2003),
    ]);
    let imabM = escolhido.modo === "indice" ? mensalizaComoIndice(imabFull) : mensalizaComoVariacao(imabFull);
    const cdiM = new Map(mensalizaComoVariacao(cdiFull).map(r => [r.mes, r.retorno]));
    const ipcaM = new Map(mensalizaComoVariacao(ipcaFull).map(r => [r.mes, r.retorno]));

    // EMENDA declarada: o SGS descontinuou o bloco ANBIMA, então a série para
    // no passado. Daí em diante entram os retornos mensais REAIS do IMAB11
    // (dados.js) — a costura fica escrita no status e na fonte do card.
    // O último mês do SGS pode estar incompleto: se o ETF cobre esse mês,
    // descartamos o parcial e deixamos o ETF assumir.
    let emendaDesde = null;
    if (imabM.length > 0) {
      while (imabM.length > 0 && gabarito.has(imabM[imabM.length - 1].mes)) {
        imabM = imabM.slice(0, -1);
      }
      const ultimoSgs = imabM.length > 0 ? imabM[imabM.length - 1].mes : "";
      const mesesEtf = [...gabarito.keys()].sort();
      for (const mes of mesesEtf) {
        if (mes > ultimoSgs) {
          imabM.push({ mes, retorno: gabarito.get(mes) });
          if (!emendaDesde) emendaDesde = mes;
        }
      }
    }

    const meses = [], sImab = [], sCdi = [], sIpca = [];
    let fImab = 1, fCdi = 1, fIpca = 1;
    for (const { mes, retorno } of imabM) {
      if (!cdiM.has(mes) || !ipcaM.has(mes)) continue;
      fImab *= 1 + retorno;
      fCdi *= 1 + cdiM.get(mes);
      fIpca *= 1 + ipcaM.get(mes);
      meses.push(mes);
      sImab.push(100 * fImab);
      sCdi.push(100 * fCdi);
      sIpca.push(100 * fIpca);
    }
    if (meses.length < 120) throw new Error("histórico do SGS veio curto demais");

    const payload = {
      buscadoEm: Date.now(),
      codigo: escolhido.codigo,
      modo: escolhido.modo,
      verif: escolhido.verif,
      emendaDesde,
      series: { meses, imab: sImab, cdi: sCdi, ipca: sIpca },
    };
    try { localStorage.setItem(IMABLONGO_CACHE_KEY, JSON.stringify(payload)); } catch { /* storage cheio — segue sem cache */ }
    renderImabLongo(payload);
  } catch (e) {
    let motivo = (e && e.message) || "falha de rede";
    if (/Failed to fetch|NetworkError|Load failed/i.test(motivo)) {
      motivo = "o navegador não conseguiu falar com api.bcb.gov.br — bloqueio de rede/CORS ou BCB fora do ar";
    }
    status.innerHTML = `<svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><path d='M12 4 2.8 20h18.4z'/><path d='M12 10v4M12 17.1v.1'/></svg> Não consegui montar a série longa agora (${motivo}).
      <button class="grafico-periodo-btn" onclick="montarImabLongo(true)">Tentar de novo</button>`;
  } finally {
    imabLongoBuscando = false;
  }
}

function mesLabel(m) { return m.slice(5) + "/" + m.slice(0, 4); }

let imabLongoUltimo = null;

function renderImabLongo(payload) {
  imabLongoUltimo = payload;
  const { series, codigo, verif, buscadoEm } = payload;
  const status = document.getElementById("status-imablongo");
  document.getElementById("wrap-imablongo").style.display = "";
  document.getElementById("destaque-imablongo").style.display = "";
  document.getElementById("acao-imablongo").style.display = "";

  const ctx = document.getElementById("canvas-imablongo").getContext("2d");
  if (chartImabLongo) chartImabLongo.destroy();
  chartImabLongo = new Chart(ctx, {
    type: "line",
    data: {
      labels: series.meses.map(mesLabel),
      datasets: [
        { label: "IMA-B", data: series.imab, borderColor: corCSS("--ok"), borderWidth: 2.5, pointRadius: 0, tension: 0.2, fill: false },
        { label: "CDI", data: series.cdi, borderColor: corCSS("--brand-blue"), borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false },
        { label: "IPCA (inflação)", data: series.ipca, borderColor: corCSS("--brand-red"), borderWidth: 2, pointRadius: 0, tension: 0.2, fill: false }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 }, color: corCSS("--text") } } },
      scales: {
        x: { ticks: { maxTicksLimit: 8, font: { size: 10 }, color: corCSS("--text-soft") }, grid: { display: false } },
        y: { ticks: { font: { size: 10 }, color: corCSS("--text-soft"), callback: v => "R$ " + Number(v).toFixed(0) }, grid: { color: corCSS("--border") } }
      }
    }
  });

  const n = series.meses.length;
  const imabF = series.imab[n - 1], cdiF = series.cdi[n - 1], ipcaF = series.ipca[n - 1];
  const aMais = ((imabF / cdiF - 1) * 100).toFixed(0);
  const imabReal = ((imabF / ipcaF - 1) * 100).toFixed(0);
  const cdiReal = ((cdiF / ipcaF - 1) * 100).toFixed(0);
  document.getElementById("destaque-imablongo").innerHTML = `
    R$ 100 em ${mesLabel(series.meses[0])} viraram:
    <strong>R$ ${imabF.toFixed(0)} no IMA-B</strong> vs <strong>R$ ${cdiF.toFixed(0)} no CDI</strong>
    (inflação: R$ ${ipcaF.toFixed(0)}). No acumulado, o IMA-B entregou <strong>${aMais}% a mais</strong>
    que o CDI — juro real de <strong>+${imabReal}%</strong> contra <strong>+${cdiReal}%</strong>.
    O tranco de curto prazo é o pedágio; o longo prazo é a cobrança.
  `;
  if (status) {
    const data = new Date(buscadoEm);
    const dd = String(data.getDate()).padStart(2, "0");
    const mm = String(data.getMonth() + 1).padStart(2, "0");
    const emenda = payload.emendaDesde
      ? ` · índice ANBIMA (SGS) até a descontinuação; de ${mesLabel(payload.emendaDesde)} em diante, ETF IMAB11`
      : "";
    status.innerHTML = `<svg class='ico' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true' style='vertical-align:-2px'><path d='m5 12.5 5 5 9-10.5'/></svg> SGS série ${codigo}, validada contra o IMAB11 (correlação ${verif.corr.toFixed(3)}
      em ${verif.meses} meses)${emenda} · buscado em ${dd}/${mm}/${data.getFullYear()}
      <button class="grafico-periodo-btn" onclick="montarImabLongo(true)">Atualizar</button>`;
  }
}

/* ============ INSERIR GRÁFICO NOS SLIDES DO PITCH ============ */
const GRAFICOS_META = {
  r100:    { titulo: "Quanto vale R$100 em dólar", fonte: "Banco Central do Brasil (SGS série 1)" },
  dolar:   { titulo: "Dólar (USD/BRL) ao longo do tempo", fonte: "Banco Central do Brasil (SGS série 1)" },
  indices: { titulo: "CDI vs IPCA vs Poupança", fonte: "Banco Central do Brasil (SGS séries 4391, 433, 196)" },
  imab:    { titulo: "IMA-B vs CDI vs IPCA — títulos IPCA+ na prática", fonte: "IMA-B via ETF IMAB11 (iShares, B3); CDI/IPCA: Banco Central do Brasil (SGS 4391, 433)", congelado: "29/05/2026" },
  imablongo: { titulo: "IMA-B vs CDI — o longo prazo (desde 2004)", fonte: "IMA-B: índice ANBIMA via BCB/SGS, emendado com o ETF IMAB11 até hoje; CDI/IPCA: SGS 4391, 433 — validação automática entre as fontes", congelado: "busca ao vivo no SGS" }
};

// graficosInseridos: array de { tipo, posicao }
// posicao: "inicio" | "fim" | "etapa-0".."etapa-3" (depois da etapa N do framework)


/* =================================================================================
   FAB ÚNICO DE FERRAMENTAS — teclado, foco e fechamento previsível
   O botão "Ferramentas" abre uma lista de atalhos da tela. Enquanto fechada, os
   itens saem da ordem de tabulação (senão o Tab cai em botões invisíveis).
   ================================================================================= */
function _fabEls() {
  return {
    menu: document.getElementById("fab-menu"),
    toggle: document.getElementById("fab-toggle"),
    itens: Array.prototype.slice.call(document.querySelectorAll("#fab-menu .fab-item"))
  };
}

function fabMenuAberto() {
  var m = document.getElementById("fab-menu");
  return !!m && m.classList.contains("aberto");
}

function _sincronizarTabIndexFab(aberto) {
  var e = _fabEls();
  e.itens.forEach(function (b) {
    var disponivel = aberto && b.classList.contains("visible");
    b.setAttribute("tabindex", disponivel ? "0" : "-1");
    b.setAttribute("aria-hidden", disponivel ? "false" : "true");
  });
}

function abrirFabMenu() {
  var e = _fabEls();
  if (!e.menu || !e.toggle) return;
  e.menu.classList.add("aberto");
  e.toggle.setAttribute("aria-expanded", "true");
  _sincronizarTabIndexFab(true);
  var primeiro = e.itens.filter(function (b) { return b.classList.contains("visible"); })[0];
  if (primeiro) setTimeout(function () { if (fabMenuAberto()) primeiro.focus(); }, 40);
}

function fecharFabMenu(devolverFoco) {
  var e = _fabEls();
  if (!e.menu) return;
  var estava = e.menu.classList.contains("aberto");
  e.menu.classList.remove("aberto");
  if (e.toggle) e.toggle.setAttribute("aria-expanded", "false");
  _sincronizarTabIndexFab(false);
  if (estava && devolverFoco && e.toggle) e.toggle.focus();
}

function toggleFabMenu() {
  if (fabMenuAberto()) fecharFabMenu(true); else abrirFabMenu();
}

function fabMenuTeclado(ev) {
  var e = _fabEls();
  if (!e.menu) return;
  var dentro = e.menu.contains(ev.target);
  if (ev.key === "Escape" && fabMenuAberto() && dentro) {
    ev.stopPropagation();
    fecharFabMenu(true);
    return;
  }
  if (!fabMenuAberto() || !dentro) return;
  var lista = e.itens.filter(function (b) { return b.classList.contains("visible"); });
  if (!lista.length) return;
  var i = lista.indexOf(document.activeElement);
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
    ev.preventDefault();
    var passo = ev.key === "ArrowDown" ? 1 : -1;
    var prox = i < 0 ? (passo > 0 ? 0 : lista.length - 1) : (i + passo + lista.length) % lista.length;
    lista[prox].focus();
  } else if (ev.key === "Home") { ev.preventDefault(); lista[0].focus(); }
  else if (ev.key === "End") { ev.preventDefault(); lista[lista.length - 1].focus(); }
  else if (ev.key === "Tab") {
    // Tab sai do menu: fecha sem prender o foco (o menu é um atalho, não um diálogo)
    setTimeout(function () {
      var m = document.getElementById("fab-menu");
      if (m && !m.contains(document.activeElement)) fecharFabMenu(false);
    }, 0);
  }
}

/* =================================================================================
   MENU DE UTILIDADES DA TOPBAR (<details class="menu">) — Esc fecha e devolve o
   foco ao gatilho; clique fora fecha; setas percorrem os itens.
   ================================================================================= */
function fecharMenuTopbar(devolverFoco) {
  var d = document.getElementById("menu-topbar");
  if (!d || !d.open) return;
  d.open = false;
  if (devolverFoco) {
    var sum = d.querySelector("summary");
    if (sum) sum.focus();
  }
}

function menuTopbarTeclado(ev) {
  var d = document.getElementById("menu-topbar");
  if (!d || !d.open || !d.contains(ev.target)) return;
  if (ev.key === "Escape") { ev.stopPropagation(); fecharMenuTopbar(true); return; }
  var itens = Array.prototype.slice.call(d.querySelectorAll(".menu__painel button"));
  if (!itens.length) return;
  if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
    ev.preventDefault();
    var i = itens.indexOf(document.activeElement);
    var passo = ev.key === "ArrowDown" ? 1 : -1;
    var prox = i < 0 ? (passo > 0 ? 0 : itens.length - 1) : (i + passo + itens.length) % itens.length;
    itens[prox].focus();
  }
}

(function ligarMenusDeFerramentas() {
  function ligar() {
    var toggle = document.getElementById("fab-toggle");
    if (toggle) toggle.addEventListener("click", function (ev) { ev.preventDefault(); toggleFabMenu(); });
    _sincronizarTabIndexFab(fabMenuAberto());

    document.addEventListener("keydown", function (ev) {
      fabMenuTeclado(ev);
      menuTopbarTeclado(ev);
    });

    document.addEventListener("click", function (ev) {
      var menu = document.getElementById("fab-menu");
      if (menu && fabMenuAberto() && !menu.contains(ev.target)) fecharFabMenu(false);
      var d = document.getElementById("menu-topbar");
      if (d && d.open && !d.contains(ev.target)) d.open = false;
    });

    var d = document.getElementById("menu-topbar");
    if (d) {
      d.addEventListener("toggle", function () {
        if (!d.open) return;
        var primeiro = d.querySelector(".menu__painel button");
        if (primeiro) setTimeout(function () { if (d.open) primeiro.focus(); }, 40);
      });
      // Clicar num item do menu executa a ação e fecha o painel
      d.addEventListener("click", function (ev) {
        if (ev.target.closest && ev.target.closest(".menu__painel button")) {
          setTimeout(function () { fecharMenuTopbar(false); }, 0);
        }
      });
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ligar);
  else ligar();
})();
