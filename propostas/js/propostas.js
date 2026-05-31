/**
 * Propostas Comerciais — VocêBancário / Academia do Assessor
 * Gerador de propostas personalizadas para prospects
 */
(function() {
  'use strict';

  var MESES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  var ABOUT_TEXT_DEFAULT = 'desde 2017, ajudo bancários a fazerem a transição para o mercado de assessoria de investimentos. Já foram mais de 400 profissionais que passaram pela Academia do Assessor — a maioria vindo do varejo bancário, exatamente como você. Minha missão é encurtar o caminho entre onde você está e onde quer chegar: com método, clareza e acompanhamento real.';

  var STORAGE_KEY = 'propostas_form_state';

  /* ===== UTILIDADES ===== */

  function formatarData(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.split('-');
    var d = parseInt(parts[2], 10);
    var m = parseInt(parts[1], 10) - 1;
    var y = parseInt(parts[0], 10);
    return d + ' de ' + MESES[m] + ' de ' + y;
  }

  function proximaQuarta(date) {
    var d = date ? new Date(date) : new Date();
    var dia = d.getDay(); // 0=dom, 3=qua
    var diff = (3 - dia + 7) % 7;
    if (diff === 0) diff = 7; // next wednesday, not today
    d.setDate(d.getDate() + diff);
    return d.toISOString().split('T')[0];
  }

  function hoje() {
    return new Date().toISOString().split('T')[0];
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function gradeColor(grade) {
    if (grade === 'A') return '#2d8c5c';
    if (grade === 'B') return '#d4951a';
    if (grade === 'C') return '#a12026';
    return '#888';
  }

  /* ===== LEITURA DO FORMULÁRIO ===== */

  function lerFormulario() {
    var dados = {};

    dados.prospectName = document.getElementById('inp-nome').value.trim();
    dados.dataEnvio = document.getElementById('inp-data-envio').value;
    dados.dataInicio = document.getElementById('inp-data-inicio').value;
    dados.aboutText = document.getElementById('inp-about').value.trim() || ABOUT_TEXT_DEFAULT;

    // Metas
    dados.goals = [];
    var metaInputs = document.querySelectorAll('.meta-input');
    for (var i = 0; i < metaInputs.length; i++) {
      var v = metaInputs[i].value.trim();
      if (v) dados.goals.push(v);
    }

    // Feedback
    dados.feedbackText = document.getElementById('inp-feedback').value.trim();

    // Pilares
    dados.evaluation = [
      {
        pilar: 'Ambiência / Comercial',
        nota: document.getElementById('sel-pilar-1').value,
        comentario: document.getElementById('txt-pilar-1').value.trim()
      },
      {
        pilar: 'Conhecimento Técnico / Macro',
        nota: document.getElementById('sel-pilar-2').value,
        comentario: document.getElementById('txt-pilar-2').value.trim()
      },
      {
        pilar: 'Produtos / Recomendação',
        nota: document.getElementById('sel-pilar-3').value,
        comentario: document.getElementById('txt-pilar-3').value.trim()
      }
    ];

    // Pontos fortes lista
    dados.strengthsList = [];
    var sfInputs = document.querySelectorAll('.strength-input');
    for (var j = 0; j < sfInputs.length; j++) {
      var sv = sfInputs[j].value.trim();
      if (sv) dados.strengthsList.push(sv);
    }

    // Pontos fortes tabela
    dados.strengthsTable = [];
    var stRows = document.querySelectorAll('.strength-row');
    for (var k = 0; k < stRows.length; k++) {
      var pilar = stRows[k].querySelector('.st-pilar').value.trim();
      var comentario = stRows[k].querySelector('.st-comentario').value.trim();
      if (pilar || comentario) {
        dados.strengthsTable.push({ pilar: pilar, comentario: comentario });
      }
    }

    // Depoimentos
    dados.testimonials = [];
    var tRows = document.querySelectorAll('.testimonial-row');
    for (var t = 0; t < tRows.length; t++) {
      var row = tRows[t];
      dados.testimonials.push({
        nome: row.querySelector('.dep-nome').value.trim(),
        cargo: row.querySelector('.dep-cargo').value.trim(),
        empresa: row.querySelector('.dep-empresa').value.trim(),
        depoimento: row.querySelector('.dep-texto').value.trim(),
        foto: row.querySelector('.dep-foto').value.trim()
      });
    }

    return dados;
  }

  /* ===== PREENCHER FORMULÁRIO ===== */

  function preencherFormulario(dados) {
    if (!dados) return;

    if (dados.prospectName) document.getElementById('inp-nome').value = dados.prospectName;
    if (dados.dataEnvio) document.getElementById('inp-data-envio').value = dados.dataEnvio;
    if (dados.dataInicio) document.getElementById('inp-data-inicio').value = dados.dataInicio;
    if (dados.aboutText) document.getElementById('inp-about').value = dados.aboutText;
    if (dados.feedbackText) document.getElementById('inp-feedback').value = dados.feedbackText;

    // Metas
    if (dados.goals && dados.goals.length) {
      var container = document.getElementById('metas-container');
      container.innerHTML = '';
      for (var i = 0; i < dados.goals.length; i++) {
        adicionarMeta(container, dados.goals[i]);
      }
    }

    // Pilares
    if (dados.evaluation && dados.evaluation.length >= 3) {
      for (var p = 0; p < 3; p++) {
        var sel = document.getElementById('sel-pilar-' + (p + 1));
        var txt = document.getElementById('txt-pilar-' + (p + 1));
        if (dados.evaluation[p].nota) sel.value = dados.evaluation[p].nota;
        if (dados.evaluation[p].comentario) txt.value = dados.evaluation[p].comentario;
        atualizarBordaPilar(p + 1);
      }
    }

    // Pontos fortes lista
    if (dados.strengthsList && dados.strengthsList.length) {
      var slContainer = document.getElementById('strengths-list-container');
      slContainer.innerHTML = '';
      for (var s = 0; s < dados.strengthsList.length; s++) {
        adicionarStrength(slContainer, dados.strengthsList[s]);
      }
    }

    // Pontos fortes tabela
    if (dados.strengthsTable && dados.strengthsTable.length) {
      var stContainer = document.getElementById('strengths-table-container');
      stContainer.innerHTML = '';
      for (var st = 0; st < dados.strengthsTable.length; st++) {
        adicionarStrengthRow(stContainer, dados.strengthsTable[st].pilar, dados.strengthsTable[st].comentario);
      }
    }

    // Depoimentos
    if (dados.testimonials && dados.testimonials.length) {
      var depContainer = document.getElementById('testimonials-container');
      depContainer.innerHTML = '';
      for (var d = 0; d < dados.testimonials.length; d++) {
        adicionarDepoimento(depContainer, dados.testimonials[d]);
      }
    }
  }

  /* ===== DYNAMIC FIELD HELPERS ===== */

  function adicionarMeta(container, valor) {
    var div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = '<input type="text" class="meta-input form-input" value="' + escapeHtml(valor || '') + '" placeholder="Ex: Sair do varejo bancário"/>' +
      '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(div);
  }

  function adicionarStrength(container, valor) {
    var div = document.createElement('div');
    div.className = 'dynamic-row';
    div.innerHTML = '<input type="text" class="strength-input form-input" value="' + escapeHtml(valor || '') + '" placeholder="Ex: Boa comunicação"/>' +
      '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(div);
  }

  function adicionarStrengthRow(container, pilar, comentario) {
    var div = document.createElement('div');
    div.className = 'strength-row dynamic-row-wide';
    div.innerHTML = '<input type="text" class="st-pilar form-input" value="' + escapeHtml(pilar || '') + '" placeholder="Pilar (ex: Comercial)"/>' +
      '<textarea class="st-comentario form-textarea-sm" placeholder="Comentário detalhado">' + escapeHtml(comentario || '') + '</textarea>' +
      '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(div);
  }

  function adicionarDepoimento(container, dados) {
    dados = dados || {};
    var div = document.createElement('div');
    div.className = 'testimonial-row card-mini';
    div.innerHTML = '<div class="dep-grid">' +
      '<input type="text" class="dep-nome form-input" value="' + escapeHtml(dados.nome || '') + '" placeholder="Nome"/>' +
      '<input type="text" class="dep-cargo form-input" value="' + escapeHtml(dados.cargo || '') + '" placeholder="Cargo"/>' +
      '<input type="text" class="dep-empresa form-input" value="' + escapeHtml(dados.empresa || '') + '" placeholder="Empresa"/>' +
      '<input type="text" class="dep-foto form-input" value="' + escapeHtml(dados.foto || '') + '" placeholder="URL da foto (opcional)"/>' +
      '</div>' +
      '<textarea class="dep-texto form-textarea-sm" placeholder="Depoimento">' + escapeHtml(dados.depoimento || '') + '</textarea>' +
      '<button type="button" class="btn-remove" onclick="this.parentElement.remove()">&times;</button>';
    container.appendChild(div);
  }

  function atualizarBordaPilar(n) {
    var sel = document.getElementById('sel-pilar-' + n);
    var bloco = sel.closest('.pilar-block');
    if (bloco) {
      bloco.style.borderLeftColor = gradeColor(sel.value);
    }
  }

  /* ===== GERAR SLIDES ===== */

  function gerarProposta(dados) {
    if (!dados) dados = lerFormulario();
    var slides = [];

    // SLIDE 1 — CAPA
    slides.push(
      '<div class="slide slide-capa active">' +
        '<div class="capa-content">' +
          '<div class="capa-eyebrow">PROPOSTA PERSONALIZADA</div>' +
          '<div class="capa-line"></div>' +
          '<h1>' + escapeHtml(dados.prospectName || 'Prospect') + '</h1>' +
          '<p class="capa-date">' + formatarData(dados.dataEnvio) + '</p>' +
          '<div class="capa-author">' +
            '<p>Rodrigo Arboés, CEA, MAP&reg;</p>' +
            '<p class="capa-social">@vocebancario &middot; Academia do Assessor</p>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    // SLIDE 2 — QUEM SOU EU
    slides.push(
      '<div class="slide slide-quote">' +
        '<div class="slide-num">02 / 10</div>' +
        '<div class="quote-block">' +
          '<span class="quote-mark">&ldquo;</span>' +
          '<p class="quote-text">' + escapeHtml(dados.aboutText || ABOUT_TEXT_DEFAULT) + '</p>' +
          '<p class="quote-author">&mdash; Rodrigo Arboés, CEA, MAP&reg;</p>' +
        '</div>' +
      '</div>'
    );

    // SLIDE 3 — METAS
    var metasHtml = '';
    var goals = dados.goals || [];
    for (var i = 0; i < goals.length; i++) {
      metasHtml += '<div class="goal-row"><span class="goal-check">&#10003;</span><span>' + escapeHtml(goals[i]) + '</span></div>';
    }
    slides.push(
      '<div class="slide">' +
        '<div class="slide-num">03 / 10</div>' +
        '<h2>SUAS METAS, NOSSAS METAS</h2>' +
        '<div class="slide-divider"></div>' +
        '<div class="goals-list">' + metasHtml + '</div>' +
      '</div>'
    );

    // SLIDE 4 — O QUE EU VI EM VOCÊ
    slides.push(
      '<div class="slide slide-feedback">' +
        '<div class="slide-num">04 / 10</div>' +
        '<h2>O QUE EU VI EM VOC&Ecirc;</h2>' +
        '<div class="slide-divider"></div>' +
        '<div class="feedback-block">' +
          '<p>' + escapeHtml(dados.feedbackText || '') + '</p>' +
        '</div>' +
      '</div>'
    );

    // SLIDE 5 — AVALIAÇÃO POR PILARES
    var pilaresHtml = '';
    var evaluation = dados.evaluation || [];
    for (var p = 0; p < evaluation.length; p++) {
      var ev = evaluation[p];
      pilaresHtml += '<div class="pilar-card">' +
        '<h3>' + escapeHtml(ev.pilar) + '</h3>' +
        '<div class="pilar-grade" style="color:' + gradeColor(ev.nota) + '">' + escapeHtml(ev.nota || '—') + '</div>' +
        '<p>' + escapeHtml(ev.comentario) + '</p>' +
      '</div>';
    }
    slides.push(
      '<div class="slide">' +
        '<div class="slide-num">05 / 10</div>' +
        '<h2>SEU DIAGN&Oacute;STICO</h2>' +
        '<div class="slide-divider"></div>' +
        '<div class="pilares-grid">' + pilaresHtml + '</div>' +
      '</div>'
    );

    // SLIDE 6 — PONTOS FORTES
    var chipsHtml = '';
    var sl = dados.strengthsList || [];
    for (var s = 0; s < sl.length; s++) {
      chipsHtml += '<span class="strength-chip">' + escapeHtml(sl[s]) + '</span>';
    }
    var stHtml = '';
    var st = dados.strengthsTable || [];
    for (var x = 0; x < st.length; x++) {
      stHtml += '<div class="strength-detail-card">' +
        '<strong>' + escapeHtml(st[x].pilar) + '</strong>' +
        '<p>' + escapeHtml(st[x].comentario) + '</p>' +
      '</div>';
    }
    slides.push(
      '<div class="slide">' +
        '<div class="slide-num">06 / 10</div>' +
        '<h2>SEUS PONTOS FORTES</h2>' +
        '<div class="slide-divider"></div>' +
        '<div class="strengths-chips">' + chipsHtml + '</div>' +
        '<div class="strengths-details">' + stHtml + '</div>' +
      '</div>'
    );

    // SLIDE 7 — O CAMINHO
    slides.push(
      '<div class="slide">' +
        '<div class="slide-num">07 / 10</div>' +
        '<h2>O CAMINHO</h2>' +
        '<div class="slide-divider"></div>' +
        '<p class="caminho-intro">A Academia do Assessor foi criada para profissionais como voc&ecirc;.</p>' +
        '<ul class="caminho-lista">' +
          '<li>M&eacute;todo pr&aacute;tico, n&atilde;o teoria de livro</li>' +
          '<li>Acompanhamento individual com mentor</li>' +
          '<li>Comunidade de banc&aacute;rios em transi&ccedil;&atilde;o</li>' +
          '<li>Prepara&ccedil;&atilde;o real para a certifica&ccedil;&atilde;o e o mercado</li>' +
        '</ul>' +
        '<div class="caminho-turma">In&iacute;cio da pr&oacute;xima turma: <strong>' + formatarData(dados.dataInicio) + '</strong></div>' +
      '</div>'
    );

    // SLIDE 8 — DEPOIMENTOS
    var depHtml = '';
    var deps = dados.testimonials || [];
    for (var d = 0; d < deps.length; d++) {
      var dep = deps[d];
      var fotoHtml = dep.foto
        ? '<img src="' + escapeHtml(dep.foto) + '" class="dep-avatar" alt="' + escapeHtml(dep.nome) + '"/>'
        : '<div class="dep-avatar-placeholder">' + escapeHtml((dep.nome || '?').charAt(0)) + '</div>';
      depHtml += '<div class="testimonial-card">' +
        '<div class="dep-header">' +
          fotoHtml +
          '<div class="dep-info">' +
            '<strong>' + escapeHtml(dep.nome) + '</strong>' +
            '<span>' + escapeHtml(dep.cargo) + (dep.empresa ? ' &middot; ' + escapeHtml(dep.empresa) : '') + '</span>' +
          '</div>' +
        '</div>' +
        '<p class="dep-quote">&ldquo;' + escapeHtml(dep.depoimento) + '&rdquo;</p>' +
      '</div>';
    }
    slides.push(
      '<div class="slide">' +
        '<div class="slide-num">08 / 10</div>' +
        '<h2>QUEM J&Aacute; PASSOU POR AQUI</h2>' +
        '<div class="slide-divider"></div>' +
        '<div class="testimonials-grid">' + depHtml + '</div>' +
      '</div>'
    );

    // SLIDE 9 — PRÓXIMOS PASSOS
    slides.push(
      '<div class="slide">' +
        '<div class="slide-num">09 / 10</div>' +
        '<h2>PR&Oacute;XIMOS PASSOS</h2>' +
        '<div class="slide-divider"></div>' +
        '<div class="passos-lista">' +
          '<div class="passo"><span class="passo-num">1</span><span>Confirme sua participa&ccedil;&atilde;o</span></div>' +
          '<div class="passo"><span class="passo-num">2</span><span>Receba o acesso &agrave; plataforma</span></div>' +
          '<div class="passo"><span class="passo-num">3</span><span>Participe da aula inaugural em ' + formatarData(dados.dataInicio) + '</span></div>' +
        '</div>' +
        '<div class="passos-cta">' +
          '<p>&ldquo;Se isso fez sentido pra voc&ecirc;, o pr&oacute;ximo passo &eacute; simples.&rdquo;</p>' +
        '</div>' +
      '</div>'
    );

    // SLIDE 10 — ENCERRAMENTO
    slides.push(
      '<div class="slide slide-final">' +
        '<div class="final-content">' +
          '<p class="final-quote">&ldquo;Voc&ecirc; e eu, de m&atilde;os dadas, somos o fim do sofrimento<br/>e o in&iacute;cio de uma nova era na sua carreira.&rdquo;</p>' +
          '<p class="final-author">&mdash; Rodrigo Arbo&eacute;s</p>' +
          '<div class="final-social">' +
            '<p>@vocebancario</p>' +
            '<p>vocebancario.com</p>' +
          '</div>' +
        '</div>' +
      '</div>'
    );

    return slides;
  }

  /* ===== RENDERIZAR APRESENTAÇÃO ===== */

  function renderizarSlides(dados) {
    var slides = gerarProposta(dados);
    var viewport = document.getElementById('slide-viewport');
    var dotsContainer = document.getElementById('slides-dots');
    var counter = document.getElementById('slide-counter');

    viewport.innerHTML = slides.join('');

    // Dots
    dotsContainer.innerHTML = '';
    for (var i = 0; i < slides.length; i++) {
      var dot = document.createElement('button');
      dot.className = 'slide-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('data-idx', i);
      dot.onclick = function() { irParaSlide(parseInt(this.getAttribute('data-idx'), 10)); };
      dotsContainer.appendChild(dot);
    }

    counter.textContent = '1 / ' + slides.length;
    window._slideAtual = 0;
    window._totalSlides = slides.length;

    // Activate first
    var allSlides = viewport.querySelectorAll('.slide');
    for (var j = 0; j < allSlides.length; j++) {
      allSlides[j].classList.remove('active');
    }
    if (allSlides[0]) allSlides[0].classList.add('active');
  }

  function irParaSlide(idx) {
    var viewport = document.getElementById('slide-viewport');
    var allSlides = viewport.querySelectorAll('.slide');
    var dots = document.querySelectorAll('#slides-dots .slide-dot');
    var counter = document.getElementById('slide-counter');

    if (idx < 0 || idx >= allSlides.length) return;

    for (var i = 0; i < allSlides.length; i++) {
      allSlides[i].classList.remove('active');
      if (dots[i]) dots[i].classList.remove('active');
    }
    allSlides[idx].classList.add('active');
    if (dots[idx]) dots[idx].classList.add('active');

    window._slideAtual = idx;
    counter.textContent = (idx + 1) + ' / ' + allSlides.length;
  }

  function slideAnterior() {
    irParaSlide((window._slideAtual || 0) - 1);
  }

  function slideProximo() {
    irParaSlide((window._slideAtual || 0) + 1);
  }

  /* ===== IMPORT/EXPORT JSON ===== */

  function importarJSON(jsonString) {
    try {
      var dados = JSON.parse(jsonString);
      preencherFormulario(dados);
      return true;
    } catch (e) {
      alert('JSON inválido: ' + e.message);
      return false;
    }
  }

  function exportarJSON() {
    var dados = lerFormulario();
    return JSON.stringify(dados, null, 2);
  }

  /* ===== LOCALSTORAGE ===== */

  function salvarEstado() {
    try {
      var dados = lerFormulario();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dados));
    } catch (e) { /* silent */ }
  }

  function carregarEstado() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        var dados = JSON.parse(raw);
        preencherFormulario(dados);
      }
    } catch (e) { /* silent */ }
  }

  /* ===== EXPOSIÇÃO GLOBAL ===== */

  window.Propostas = {
    gerarProposta: gerarProposta,
    renderizarSlides: renderizarSlides,
    irParaSlide: irParaSlide,
    slideAnterior: slideAnterior,
    slideProximo: slideProximo,
    importarJSON: importarJSON,
    exportarJSON: exportarJSON,
    proximaQuarta: proximaQuarta,
    lerFormulario: lerFormulario,
    preencherFormulario: preencherFormulario,
    salvarEstado: salvarEstado,
    carregarEstado: carregarEstado,
    adicionarMeta: adicionarMeta,
    adicionarStrength: adicionarStrength,
    adicionarStrengthRow: adicionarStrengthRow,
    adicionarDepoimento: adicionarDepoimento,
    atualizarBordaPilar: atualizarBordaPilar,
    formatarData: formatarData,
    ABOUT_TEXT_DEFAULT: ABOUT_TEXT_DEFAULT
  };

})();
