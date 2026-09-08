// academia/js/app-score.js — extraído de index.html (linhas 5602-5834 do monólito original)
function calcularScore() {
  // 4 dimensões:
  // 1. Aderência ao perfil (30%) — % em RV vs faixa esperada
  // 2. Coerência macro (25%) — distância do gabarito por classe
  // 3. Liquidez (20%) — % em LFTS/curto vs necessidade
  // 4. Diversificação (25%) — número de classes + concentração

  const sua = agruparPorClasse(montagemAtual);
  const gab = agruparPorClasse(
    Object.entries(caseAtual.gabarito).map(([t, p]) => ({ ticker: t, pct: p }))
  );

  // Dim 1 — Perfil
  const rvSua = (sua["Ações BR"] || 0) + (sua["Ações Internacionais"] || 0) + 
                (sua["Setorial"] || 0) + (sua["Alternativos"] || 0);
  const rvGab = (gab["Ações BR"] || 0) + (gab["Ações Internacionais"] || 0) + 
                (gab["Setorial"] || 0) + (gab["Alternativos"] || 0);
  const diffRV = Math.abs(rvSua - rvGab);
  const scorePerfil = Math.max(0, 100 - diffRV * 3); // -3 pontos por pp de diferença

  // Dim 2 — Macro (coerência por classe)
  const classes = new Set([...Object.keys(sua), ...Object.keys(gab)]);
  let somaDiff = 0;
  classes.forEach(c => {
    somaDiff += Math.abs((sua[c] || 0) - (gab[c] || 0));
  });
  const scoreMacro = Math.max(0, 100 - somaDiff * 1.2);

  // Dim 3 — Liquidez
  const liqSua = (sua["RF Pós-Fixado"] || 0);
  const liqGab = (gab["RF Pós-Fixado"] || 0);
  const diffLiq = Math.abs(liqSua - liqGab);
  const scoreLiq = Math.max(0, 100 - diffLiq * 4);

  // Dim 4 — Diversificação
  const numClassesSua = Object.values(sua).filter(v => v >= 5).length;
  const maxConcentSua = Math.max(...Object.values(sua), 0);
  let scoreDiv = 100;
  if (numClassesSua < 3) scoreDiv -= (3 - numClassesSua) * 20;
  if (maxConcentSua > 50) scoreDiv -= (maxConcentSua - 50) * 1.5;

  // Soma — checa se =100%
  const somaTotal = montagemAtual.reduce((acc, l) => acc + l.pct, 0);
  const penalSoma = Math.abs(somaTotal - 100) * 0.5;

  const total = Math.max(0, Math.round(
    scorePerfil * 0.30 + scoreMacro * 0.25 + scoreLiq * 0.20 + scoreDiv * 0.25 - penalSoma
  ));

  return {
    total,
    perfil: Math.round(scorePerfil),
    macro: Math.round(scoreMacro),
    liquidez: Math.round(scoreLiq),
    diversificacao: Math.round(scoreDiv),
    sua, gab, rvSua, rvGab
  };
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
    framework_pitch: frameworkAtual || null,
    // Carteira montada
    carteira: montagemAtual
      .filter(l => l.ticker && l.pct > 0)
      .map(l => ({ ticker: l.ticker, pct: l.pct })),
    cenario_usado: cenarioFoiEditado() ? "atual_editado" : "case_original",
    // Score — funciona como rubrica parcial do nível Beta
    score: {
      total: score.total,
      aderencia_perfil: score.perfil,
      coerencia_macro: score.macro,
      liquidez: score.liquidez,
      diversificacao: score.diversificacao
    },
    graficos_inseridos: graficosInseridos.map(g => g.tipo),
    timestamp: new Date().toISOString()
  };
}

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
  const numEl = document.getElementById("score-numero");
  numEl.innerHTML = `${score.total}<small>/100</small>`;
  numEl.classList.remove("ok", "warn", "bad");
  let msg = "";
  if (score.total >= 80) { numEl.classList.add("ok"); msg = "Excelente proposta. Aderente ao gabarito."; }
  else if (score.total >= 60) { numEl.classList.add("warn"); msg = "Proposta razoável, com pontos a ajustar."; }
  else { numEl.classList.add("bad"); msg = "Proposta com desvios importantes do gabarito. Revise o briefing."; }
  document.getElementById("score-mensagem").textContent = msg;

  // 4 dimensões
  const dims = [
    { label: "Aderência ao perfil", val: score.perfil, peso: 30, tip: "Mede se o nível de risco da sua carteira (% em renda variável) bate com o perfil do cliente. Conservador com muita ação derruba esta nota." },
    { label: "Coerência macro", val: score.macro, peso: 25, tip: "Compara sua alocação por classe com a do gabarito. Mede se você leu corretamente o cenário e alocou de acordo." },
    { label: "Liquidez", val: score.liquidez, peso: 20, tip: "Avalia se você reservou pós-fixado de alta liquidez compatível com a necessidade do cliente (reserva, emergência, prazo curto)." },
    { label: "Diversificação", val: score.diversificacao, peso: 25, tip: "Penaliza concentração excessiva (mais de 50% num único ETF) e carteiras com menos de 3 classes de ativos." }
  ];
  document.getElementById("score-dimensoes").innerHTML = dims.map(d => {
    let cor = d.val >= 80 ? "var(--ok)" : d.val >= 60 ? "var(--warn)" : "var(--bad)";
    return `
      <div class="dim-card">
        <h5>${d.label} (${d.peso}%)<span class="info-tip tip-down" data-tip="${d.tip}"></span></h5>
        <div class="dim-valor" style="color:${cor};">${d.val}</div>
        <div class="dim-barra"><div class="dim-barra-fill" style="width:${d.val}%; background:${cor};"></div></div>
      </div>
    `;
  }).join("");

  // Pizzas comparativas
  renderPizza("grafico-sua", score.sua, chartSua, (c) => chartSua = c);
  renderPizza("grafico-gabarito", score.gab, chartGabarito, (c) => chartGabarito = c);

  // Perfil de risco do gabarito (sugestão do Rodrigo na call: deixar o perfil visível)
  document.getElementById("gabarito-perfil-tag").innerHTML = `
    <span class="tag perfil-${caseAtual.perfil.slice(0,5)}" style="font-size:12px;">
      Perfil-alvo: ${caseAtual.perfil}
    </span>
    <span class="tag" style="font-size:12px;">${labelCiclo(caseAtual.ciclo)}</span>
  `;

  // Feedback pedagógico
  const feedback = gerarFeedback(score);
  document.getElementById("feedback-lista").innerHTML = feedback.map(f => `
    <li class="${f.tipo}">
      <span>${f.tipo === "ok" ? "✅" : f.tipo === "warn" ? "⚠️" : "❌"}</span>
      <div><strong>${f.titulo}</strong>${f.detalhe}</div>
    </li>
  `).join("");

  document.getElementById("gabarito-justificativa").textContent = caseAtual.justificativa;

  if (window.AIDASim) AIDASim.render(montagemAtual, caseAtual);
}

function gerarFeedback(score) {
  const fb = [];
  const sua = score.sua;
  const gab = score.gab;

  // Aderência ao perfil
  const diffRV = score.rvSua - score.rvGab;
  if (Math.abs(diffRV) <= 5) {
    fb.push({ tipo: "ok", titulo: "Exposição a renda variável adequada", detalhe: `Você alocou ${score.rvSua.toFixed(0)}% em RV vs ${score.rvGab.toFixed(0)}% do gabarito.` });
  } else if (diffRV > 5) {
    fb.push({ tipo: "bad", titulo: `Exposição a RV ${diffRV.toFixed(0)}pp acima do recomendado`, detalhe: ` Perfil ${caseAtual.perfil} não comporta esse nível de variável para este caso. Risco de o cliente romper na primeira queda.` });
  } else {
    fb.push({ tipo: "warn", titulo: `Exposição a RV ${Math.abs(diffRV).toFixed(0)}pp abaixo do gabarito`, detalhe: ` Conservadorismo excessivo para o perfil e horizonte do cliente. Custo de oportunidade significativo.` });
  }

  // Liquidez
  const liqSua = sua["RF Pós-Fixado"] || 0;
  const liqGab = gab["RF Pós-Fixado"] || 0;
  if (Math.abs(liqSua - liqGab) <= 5) {
    fb.push({ tipo: "ok", titulo: "Liquidez adequada", detalhe: ` Você alocou ${liqSua.toFixed(0)}% em pós-fixado de alta liquidez.` });
  } else if (liqSua < liqGab - 5) {
    fb.push({ tipo: "warn", titulo: "Liquidez abaixo do recomendado", detalhe: ` Cliente pode precisar de recursos e ficar exposto a marcação a mercado adversa.` });
  } else {
    fb.push({ tipo: "warn", titulo: "Liquidez acima do necessário", detalhe: ` Custo de oportunidade alto — capital parado em pós-fixado quando o horizonte permite outras alocações.` });
  }

  // Concentração
  const tickers = montagemAtual.filter(l => l.ticker && l.pct > 0);
  const maxPct = Math.max(...tickers.map(l => l.pct), 0);
  if (maxPct > 50) {
    fb.push({ tipo: "bad", titulo: `Concentração excessiva em um único ETF (${maxPct.toFixed(0)}%)`, detalhe: ` Diversificação é mandatória mesmo dentro de ETFs.` });
  } else if (maxPct > 35) {
    fb.push({ tipo: "warn", titulo: `Concentração elevada (${maxPct.toFixed(0)}% em um ETF)`, detalhe: ` Considere distribuir melhor.` });
  } else {
    fb.push({ tipo: "ok", titulo: "Distribuição equilibrada entre ETFs", detalhe: ` Maior posição em ${maxPct.toFixed(0)}%.` });
  }

  // Coerência com custódia do case
  const offshoreSua = montagemAtual.filter(l => {
    const e = ETFs.find(et => et.ticker === l.ticker);
    return e && e.custodia === "OFFSHORE";
  }).reduce((acc, l) => acc + l.pct, 0);

  if (caseAtual.custodia === "OFFSHORE" && offshoreSua < 60) {
    fb.push({ tipo: "bad", titulo: "Case offshore com pouca alocação offshore", detalhe: ` Cliente tem estrutura/preferência offshore mas você alocou só ${offshoreSua.toFixed(0)}% em ETFs UCITS/US.` });
  } else if (caseAtual.custodia === "BR" && offshoreSua > 20) {
    fb.push({ tipo: "warn", titulo: "Exposição offshore alta para case BR", detalhe: ` Cliente sem estrutura offshore — você alocou ${offshoreSua.toFixed(0)}% em ETFs US-listed. Verifique se a custódia foi prevista.` });
  } else {
    fb.push({ tipo: "ok", titulo: "Custódia coerente com o case", detalhe: "" });
  }

  // Total alocado
  const somaTotal = montagemAtual.reduce((acc, l) => acc + l.pct, 0);
  if (Math.abs(somaTotal - 100) > 2) {
    fb.push({ tipo: "bad", titulo: `Soma alocada = ${somaTotal.toFixed(1)}% (deveria ser 100%)`, detalhe: ` Carteira incompleta ou sobrealocada.` });
  }

  return fb;
}

/* =================================================================================
   NAVEGAÇÃO
   ================================================================================= */
