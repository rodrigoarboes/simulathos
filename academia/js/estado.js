// academia/js/estado.js — estado e carteira serializável (dono: estado). Expõe window.Estado
//
// Antes deste arquivo, a carteira do aluno existia apenas na variável solta
// `montagemAtual`: um F5, um fechar de aba ou um link enviado ao colega perdiam
// tudo. Aqui a carteira vira um OBJETO com schema versionado, que sabe:
//   - se salvar sozinho (autosave com debounce de 300 ms);
//   - se espelhar na URL (#c=base64url) para virar link compartilhável;
//   - virar JSON exportável e voltar de um JSON importado;
//   - e guardar o pitch de cada case, além do último backtest calculado.
//
// Todas as chaves de localStorage vivem sob 'simulathos:academia:' — nada de
// chave solta que outra tela apague com um localStorage.clear().
//
// Script clássico, sem dependências. Usa Simulathos.storage (shared/js/utils.js)
// quando ele estiver carregado; senão fala com localStorage direto, com o mesmo
// prefixo, para que o resultado no disco seja idêntico nos dois caminhos.

(function (global) {
  "use strict";

  /* =================================================================================
     1. CONSTANTES
     ================================================================================= */

  var APP = "academia";
  var PREFIXO = "simulathos:" + APP + ":";
  var CHAVE_CARTEIRA = "carteira:draft";
  var CHAVE_PITCH = "pitch:";           // + caseId
  var VERSAO_SCHEMA = 1;
  var DEBOUNCE_MS = 300;
  var PARAM_HASH = "c";                  // #c=<base64url do JSON>
  var FEEDBACK_MS = 2600;

  /* =================================================================================
     2. STORAGE (Simulathos.storage quando existir; senão localStorage cru)
     ================================================================================= */

  function temHelper() {
    return !!(global.Simulathos && global.Simulathos.storage &&
      typeof global.Simulathos.storage.get === "function");
  }

  function lsDisponivel() {
    try {
      return typeof global.localStorage !== "undefined" && global.localStorage !== null;
    } catch (e) {
      return false;
    }
  }

  function storageGet(chave) {
    if (temHelper()) {
      try { return global.Simulathos.storage.get(APP, chave); } catch (e) { /* cai no cru */ }
    }
    if (!lsDisponivel()) return null;
    try { return global.localStorage.getItem(PREFIXO + chave); } catch (e) { return null; }
  }

  function storageSet(chave, valor) {
    if (temHelper()) {
      try { return !!global.Simulathos.storage.set(APP, chave, valor); } catch (e) { /* cai no cru */ }
    }
    if (!lsDisponivel()) return false;
    try { global.localStorage.setItem(PREFIXO + chave, String(valor)); return true; }
    catch (e) { return false; } // storage cheio ou bloqueado: o app segue funcionando
  }

  function storageRemove(chave) {
    if (temHelper()) {
      try { return !!global.Simulathos.storage.remove(APP, chave); } catch (e) { /* cai no cru */ }
    }
    if (!lsDisponivel()) return false;
    try { global.localStorage.removeItem(PREFIXO + chave); return true; } catch (e) { return false; }
  }

  /* =================================================================================
     3. BASE64URL SEGURO PARA UTF-8
     Um ticker com acento ('Ações Globais') quebra btoa() puro. Passamos sempre
     por bytes UTF-8 (TextEncoder quando disponível) antes de codificar.
     ================================================================================= */

  function textoParaBytes(texto) {
    if (typeof global.TextEncoder === "function") {
      return new global.TextEncoder().encode(texto);
    }
    // Fallback: encodeURIComponent produz os mesmos bytes UTF-8 em %XX.
    var escapado = encodeURIComponent(texto);
    var out = [];
    for (var i = 0; i < escapado.length; i++) {
      if (escapado.charAt(i) === "%") {
        out.push(parseInt(escapado.substr(i + 1, 2), 16));
        i += 2;
      } else {
        out.push(escapado.charCodeAt(i));
      }
    }
    return out;
  }

  function bytesParaTexto(bytes) {
    if (typeof global.TextDecoder === "function") {
      var arr = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
      return new global.TextDecoder("utf-8").decode(arr);
    }
    var pct = "";
    for (var i = 0; i < bytes.length; i++) {
      pct += "%" + ("0" + Number(bytes[i]).toString(16)).slice(-2);
    }
    return decodeURIComponent(pct);
  }

  function btoaSeguro(bin) {
    if (typeof global.btoa === "function") return global.btoa(bin);
    throw new Error("btoa indisponível");
  }

  function atobSeguro(b64) {
    if (typeof global.atob === "function") return global.atob(b64);
    throw new Error("atob indisponível");
  }

  function base64urlEncode(texto) {
    var bytes = textoParaBytes(texto);
    var bin = "";
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoaSeguro(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  function base64urlDecode(b64url) {
    var b64 = String(b64url).replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4 !== 0) b64 += "=";
    var bin = atobSeguro(b64);
    var bytes = new Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytesParaTexto(bytes);
  }

  /* =================================================================================
     4. SCHEMA — normalização e validação
     Schema v1: { v:1, nome:string, aporte:number|null, linhas:[{ticker,pct}],
                  caseId:string|null, salvoEm:ISO }
     Nada de inventar número: aporte ausente vira null, não zero.
     ================================================================================= */

  function ehObjeto(x) {
    return !!x && typeof x === "object" && !Array.isArray(x);
  }

  function numeroOuNull(v) {
    if (v === null || v === undefined || v === "") return null;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  // Valida a forma bruta vinda de fora (JSON, URL, localStorage).
  // Retorna { ok:true } ou { ok:false, erro:'motivo em pt-BR' }.
  function validarBruto(bruto) {
    if (!ehObjeto(bruto)) return { ok: false, erro: "O conteúdo não é um objeto de carteira." };
    if (!Array.isArray(bruto.linhas)) return { ok: false, erro: "A carteira não tem a lista de linhas." };
    for (var i = 0; i < bruto.linhas.length; i++) {
      var l = bruto.linhas[i];
      if (!ehObjeto(l)) return { ok: false, erro: "Linha " + (i + 1) + " inválida." };
      if (typeof l.ticker !== "string") {
        return { ok: false, erro: "Linha " + (i + 1) + ": o ticker precisa ser texto." };
      }
      var pct = Number(l.pct);
      if (l.pct === null || l.pct === undefined || l.pct === "" || !isFinite(pct)) {
        return { ok: false, erro: "Linha " + (i + 1) + ": o percentual precisa ser número." };
      }
    }
    if (bruto.v !== undefined && bruto.v !== null && Number(bruto.v) > VERSAO_SCHEMA) {
      return { ok: false, erro: "Carteira salva por uma versão mais nova do simulador." };
    }
    return { ok: true };
  }

  // Converte a forma bruta no objeto canônico do schema.
  function normalizar(bruto) {
    var linhas = (bruto.linhas || []).map(function (l) {
      return {
        ticker: String(l.ticker === undefined || l.ticker === null ? "" : l.ticker).trim(),
        pct: Number(l.pct) || 0
      };
    });
    return {
      v: VERSAO_SCHEMA,
      nome: (bruto.nome === undefined || bruto.nome === null) ? "" : String(bruto.nome),
      aporte: numeroOuNull(bruto.aporte),
      linhas: linhas,
      caseId: (bruto.caseId === undefined || bruto.caseId === null) ? null : String(bruto.caseId),
      salvoEm: (typeof bruto.salvoEm === "string" && bruto.salvoEm) ? bruto.salvoEm : new Date().toISOString()
    };
  }

  /* =================================================================================
     5. HASH DA URL (#c=...)
     ================================================================================= */

  function temLocation() {
    try { return !!(global.location && typeof global.location.hash === "string"); }
    catch (e) { return false; }
  }

  function lerHashBruto() {
    if (!temLocation()) return null;
    var h = String(global.location.hash || "").replace(/^#/, "");
    if (!h) return null;
    var partes = h.split("&");
    for (var i = 0; i < partes.length; i++) {
      if (partes[i].indexOf(PARAM_HASH + "=") === 0) {
        return partes[i].slice(PARAM_HASH.length + 1);
      }
    }
    return null;
  }

  function carteiraDoHash() {
    var b64 = lerHashBruto();
    if (!b64) return null;
    try {
      var bruto = JSON.parse(base64urlDecode(b64));
      var v = validarBruto(bruto);
      if (!v.ok) return null;
      return normalizar(bruto);
    } catch (e) {
      return null; // hash corrompido: ignora em silêncio, o rascunho local assume
    }
  }

  function montarHash(carteira) {
    return "#" + PARAM_HASH + "=" + base64urlEncode(JSON.stringify(carteira));
  }

  function escreverHash(carteira) {
    if (!temLocation()) return;
    try {
      var hash = montarHash(carteira);
      if (global.history && typeof global.history.replaceState === "function") {
        var base = String(global.location.pathname || "") + String(global.location.search || "");
        global.history.replaceState(null, "", base + hash);
      } else {
        global.location.hash = hash;
      }
    } catch (e) { /* URL longa demais ou contexto sem history: só o localStorage guarda */ }
  }

  function limparHash() {
    if (!temLocation()) return;
    try {
      if (global.history && typeof global.history.replaceState === "function") {
        var base = String(global.location.pathname || "") + String(global.location.search || "");
        global.history.replaceState(null, "", base);
      } else {
        global.location.hash = "";
      }
    } catch (e) { /* silencioso */ }
  }

  /* =================================================================================
     6. CARTEIRA — salvar / restaurar / limpar
     ================================================================================= */

  var _timerAutosave = null;
  var _ultimaCarteira = null;

  function gravarCarteira(carteira) {
    _ultimaCarteira = carteira;
    storageSet(CHAVE_CARTEIRA, JSON.stringify(carteira));
    escreverHash(carteira);
  }

  // Autosave com debounce de 300 ms: a montagem chama isto a cada tecla.
  function salvarCarteira(obj) {
    var v = validarBruto(obj);
    if (!v.ok) return null;
    var carteira = normalizar(obj);
    _ultimaCarteira = carteira;
    if (typeof global.clearTimeout === "function") global.clearTimeout(_timerAutosave);
    if (typeof global.setTimeout === "function") {
      _timerAutosave = global.setTimeout(function () { gravarCarteira(carteira); }, DEBOUNCE_MS);
    } else {
      gravarCarteira(carteira);
    }
    return carteira;
  }

  // Grava agora, sem esperar o debounce (usado por importação e por quem precisa
  // do link imediatamente).
  function salvarCarteiraAgora(obj) {
    var v = validarBruto(obj);
    if (!v.ok) return null;
    var carteira = normalizar(obj);
    if (typeof global.clearTimeout === "function") global.clearTimeout(_timerAutosave);
    gravarCarteira(carteira);
    return carteira;
  }

  // Prioridade: hash da URL > localStorage. Um link recebido de um colega manda
  // no que aparece na tela.
  function restaurarCarteira() {
    var daUrl = carteiraDoHash();
    if (daUrl) return daUrl;
    var bruto = storageGet(CHAVE_CARTEIRA);
    if (!bruto) return null;
    try {
      var obj = JSON.parse(bruto);
      var v = validarBruto(obj);
      if (!v.ok) return null;
      return normalizar(obj);
    } catch (e) {
      return null;
    }
  }

  function limparCarteira() {
    if (typeof global.clearTimeout === "function") global.clearTimeout(_timerAutosave);
    _ultimaCarteira = null;
    storageRemove(CHAVE_CARTEIRA);
    limparHash();
  }

  function carteiraAtual() {
    return _ultimaCarteira || restaurarCarteira();
  }

  /* =================================================================================
     7. JSON e link compartilhável
     ================================================================================= */

  function exportarJSON() {
    var c = carteiraAtual();
    if (!c) return null;
    return JSON.stringify(c, null, 2);
  }

  // Retorna o objeto normalizado (já gravado) ou null quando o texto é inválido.
  // Nunca lança: quem chama mostra a mensagem de Estado.ultimoErroImportacao.
  var _ultimoErroImportacao = null;

  function importarJSON(texto) {
    _ultimoErroImportacao = null;
    var bruto;
    try {
      bruto = JSON.parse(String(texto));
    } catch (e) {
      _ultimoErroImportacao = "Arquivo não é um JSON válido.";
      return null;
    }
    var v = validarBruto(bruto);
    if (!v.ok) {
      _ultimoErroImportacao = v.erro;
      return null;
    }
    return salvarCarteiraAgora(bruto);
  }

  function linkCompartilhavel() {
    var c = carteiraAtual();
    if (!c) return null;
    var hash = montarHash(c);
    if (!temLocation()) return hash;
    var origem = String(global.location.origin || "");
    var caminho = String(global.location.pathname || "");
    var busca = String(global.location.search || "");
    return origem + caminho + busca + hash;
  }

  /* =================================================================================
     8. PITCH POR CASE
     ================================================================================= */

  function chavePitch(caseId) {
    return CHAVE_PITCH + String(caseId === undefined || caseId === null ? "livre" : caseId);
  }

  function salvarPitch(caseId, obj) {
    if (!ehObjeto(obj)) return false;
    try {
      return storageSet(chavePitch(caseId), JSON.stringify(obj));
    } catch (e) {
      return false;
    }
  }

  function restaurarPitch(caseId) {
    var bruto = storageGet(chavePitch(caseId));
    if (!bruto) return null;
    try {
      var obj = JSON.parse(bruto);
      return ehObjeto(obj) ? obj : null;
    } catch (e) {
      return null;
    }
  }

  function limparPitch(caseId) {
    return storageRemove(chavePitch(caseId));
  }

  /* =================================================================================
     9. BACKTEST (substitui window._lastBacktestResult)
     ================================================================================= */

  var _backtest = null;

  function setBacktest(res) {
    _backtest = res || null;
    try { global._lastBacktestResult = res; } catch (e) { /* compatibilidade */ }
    return _backtest;
  }

  function getBacktest() {
    if (_backtest) return _backtest;
    try { return global._lastBacktestResult || null; } catch (e) { return null; }
  }

  /* =================================================================================
     10. UI — botões de ação da carteira
     ================================================================================= */

  function criarBotao(rotulo, aoClicar) {
    var b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn--ghost";
    b.textContent = rotulo;
    b.addEventListener("click", aoClicar);
    return b;
  }

  function copiarTexto(texto) {
    // Promise para uniformizar os dois caminhos (Clipboard API e fallback visível).
    return new Promise(function (resolve, reject) {
      try {
        if (global.navigator && global.navigator.clipboard &&
          typeof global.navigator.clipboard.writeText === "function") {
          global.navigator.clipboard.writeText(texto).then(resolve, reject);
          return;
        }
      } catch (e) { /* cai no reject */ }
      reject(new Error("Área de transferência indisponível"));
    });
  }

  function renderAcoesCarteira(containerEl) {
    var cont = containerEl ||
      (typeof document !== "undefined" ? document.getElementById("carteira-acoes") : null);
    if (!cont || typeof document === "undefined") return null;

    cont.textContent = "";
    cont.classList.add("carteira-acoes");

    var feedback = document.createElement("p");
    feedback.className = "carteira-acoes__feedback";
    feedback.setAttribute("role", "status");
    feedback.setAttribute("aria-live", "polite");

    var _timerFeedback = null;
    function avisar(msg) {
      feedback.textContent = msg;
      if (typeof global.clearTimeout === "function") global.clearTimeout(_timerFeedback);
      if (typeof global.setTimeout === "function") {
        _timerFeedback = global.setTimeout(function () { feedback.textContent = ""; }, FEEDBACK_MS);
      }
    }

    // Fallback de cópia: mostra o link num campo selecionável, sem alert().
    function mostrarLinkParaCopiar(url) {
      feedback.textContent = "Copie o link abaixo:";
      var campo = document.createElement("input");
      campo.type = "text";
      campo.readOnly = true;
      campo.className = "carteira-acoes__link";
      campo.value = url;
      feedback.appendChild(campo);
      try { campo.select(); } catch (e) { /* sem seleção, o texto segue visível */ }
    }

    var input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.hidden = true;
    input.addEventListener("change", function () {
      var arq = this.files && this.files[0];
      if (!arq) return;
      var leitor = new FileReader();
      leitor.onload = function () {
        var obj = importarJSON(String(leitor.result || ""));
        if (!obj) {
          avisar(_ultimoErroImportacao || "Não consegui ler esse arquivo.");
          return;
        }
        avisar("Carteira importada");
        aplicarNaTela(obj);
      };
      leitor.onerror = function () { avisar("Não consegui ler esse arquivo."); };
      leitor.readAsText(arq);
      this.value = "";
    });

    var btnLink = criarBotao("Copiar link", function () {
      var url = linkCompartilhavel();
      if (!url) { avisar("Monte a carteira antes de gerar o link."); return; }
      copiarTexto(url).then(
        function () { avisar("Link copiado"); },
        function () { mostrarLinkParaCopiar(url); }
      );
    });

    var btnExportar = criarBotao("Exportar JSON", function () {
      var json = exportarJSON();
      if (!json) { avisar("Nada para exportar ainda."); return; }
      try {
        var blob = new Blob([json], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "carteira-simulathos.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        if (typeof global.setTimeout === "function") {
          global.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
        }
        avisar("Arquivo gerado");
      } catch (e) {
        avisar("Não consegui gerar o arquivo aqui.");
      }
    });

    var btnImportar = criarBotao("Importar JSON", function () { input.click(); });

    var btnLimpar = criarBotao("Limpar", function () {
      limparCarteira();
      avisar("Carteira limpa");
      try {
        if (typeof global.limparMontagem === "function") global.limparMontagem();
      } catch (e) { /* a tela pode não estar montada */ }
      dispararEvento("estado:carteira-limpa", null);
    });

    cont.appendChild(btnLink);
    cont.appendChild(btnExportar);
    cont.appendChild(btnImportar);
    cont.appendChild(btnLimpar);
    cont.appendChild(input);
    cont.appendChild(feedback);

    return cont;
  }

  function dispararEvento(nome, detalhe) {
    try {
      if (typeof document === "undefined" || typeof global.CustomEvent !== "function") return;
      document.dispatchEvent(new global.CustomEvent(nome, { detail: detalhe }));
    } catch (e) { /* silencioso */ }
  }

  // Depois de importar, tenta refletir a carteira na tela 3. irTela3() relê o
  // rascunho via restaurarCarteira(), então basta chamá-la quando ela existir.
  function aplicarNaTela(carteira) {
    dispararEvento("estado:carteira-importada", carteira);
    try {
      var tela3 = (typeof document !== "undefined") ? document.getElementById("tela3") : null;
      var visivel = tela3 && (tela3.classList.contains("ativa") || tela3.classList.contains("active"));
      if (visivel && typeof global.irTela3 === "function") global.irTela3();
    } catch (e) { /* nunca quebra a importação */ }
  }

  /* =================================================================================
     11. BOOT
     ================================================================================= */

  var carteiraDaURL = carteiraDoHash();

  var Estado = {
    VERSAO_SCHEMA: VERSAO_SCHEMA,
    PREFIXO: PREFIXO,
    carteiraDaURL: carteiraDaURL,

    salvarCarteira: salvarCarteira,
    salvarCarteiraAgora: salvarCarteiraAgora,
    restaurarCarteira: restaurarCarteira,
    limparCarteira: limparCarteira,

    exportarJSON: exportarJSON,
    importarJSON: importarJSON,
    linkCompartilhavel: linkCompartilhavel,

    salvarPitch: salvarPitch,
    restaurarPitch: restaurarPitch,
    limparPitch: limparPitch,

    setBacktest: setBacktest,
    getBacktest: getBacktest,

    renderAcoesCarteira: renderAcoesCarteira,

    get ultimoErroImportacao() { return _ultimoErroImportacao; },

    // Expostos para teste e para quem precisar montar/ler um link fora da tela.
    _base64urlEncode: base64urlEncode,
    _base64urlDecode: base64urlDecode,
    _normalizar: normalizar,
    _validar: validarBruto
  };

  global.Estado = Estado;

  // Se o redesign já colocou o container na tela, os botões aparecem sozinhos.
  if (typeof document !== "undefined" && typeof global.addEventListener === "function") {
    global.addEventListener("load", function () {
      var alvo = document.getElementById("carteira-acoes");
      if (alvo && !alvo.firstChild) {
        try { renderAcoesCarteira(alvo); } catch (e) { /* silencioso */ }
      }
    });
  }

})(typeof window !== "undefined" ? window : this);
