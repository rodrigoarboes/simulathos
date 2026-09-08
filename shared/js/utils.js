/* ==========================================================================
   Simulathos — Shared Utilities
   ========================================================================== */

var Simulathos = (function () {
    'use strict';

    // -----------------------------------------------------------------------
    // Currency helpers
    // -----------------------------------------------------------------------

    function parseCurrency(str) {
        if (!str) return 0;
        return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }

    function formatCurrency(value) {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
        });
    }

    function formatCurrencyShort(value) {
        if (Math.abs(value) >= 1_000_000) {
            return 'R$ ' + (value / 1_000_000).toFixed(1).replace('.', ',') + 'M';
        }
        if (Math.abs(value) >= 1_000) {
            return 'R$ ' + (value / 1_000).toFixed(0) + 'mil';
        }
        return formatCurrency(value);
    }

    // -----------------------------------------------------------------------
    // Currency input mask
    // -----------------------------------------------------------------------

    function applyCurrencyMask(input) {
        input.addEventListener('input', function () {
            var v = this.value.replace(/\D/g, '');
            if (!v) { this.value = ''; return; }
            v = (parseInt(v, 10) / 100).toFixed(2);
            v = v.replace('.', ',');
            v = v.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            this.value = v;
        });
    }

    function initCurrencyMasks(container) {
        var root = container || document;
        root.querySelectorAll('[data-currency]').forEach(applyCurrencyMask);
    }

    // -----------------------------------------------------------------------
    // Step wizard navigation
    // -----------------------------------------------------------------------

    // AIDA-02 — goToStep precisa ser TOTALMENTE inerte quando o destino nao existe.
    // Antes ela apagava a classe 'active' de todos os .zw-step ANTES de procurar o
    // destino: um goToStep(NaN) (vindo de um botao que teve o data-next removido
    // depois que o wizard ja tinha ligado o listener) deixava os quatro passos com
    // display:none — a tela do wizard inteira sumia, em silencio.
    // Agora: resolve o destino primeiro; sem destino valido, nao mexe em nada.
    function initStepWizard(opts) {
        var onStepChange = opts && opts.onStepChange;

        var steps = document.querySelectorAll('.zw-step');
        var navLinks = document.querySelectorAll('.zw-nav-link');

        // Retorna o numero do passo ou null quando o valor nao aponta para um
        // passo que exista no DOM.
        function passoValido(n) {
            var num = parseInt(n, 10);
            if (!isFinite(num)) return null;
            return document.querySelector('.zw-step[data-step="' + num + '"]') ? num : null;
        }

        function goToStep(n) {
            var num = passoValido(n);
            if (num === null) return false;   // destino inexistente: nao apaga a tela

            var target = document.querySelector('.zw-step[data-step="' + num + '"]');
            var link = document.querySelector('.zw-nav-link[data-step="' + num + '"]');

            steps.forEach(function (s) { s.classList.remove('active'); });
            navLinks.forEach(function (l) { l.classList.remove('active'); });

            target.classList.add('active');
            if (link) link.classList.add('active');

            navLinks.forEach(function (l) {
                if (parseInt(l.dataset.step, 10) < num) l.classList.add('completed');
            });

            try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { /* jsdom/sandbox */ }

            if (onStepChange) onStepChange(num);
            return true;
        }

        // O atributo e lido NO CLIQUE (nao na hora de ligar o listener): quem
        // remover data-next/data-prev depois — para assumir a navegacao com
        // validacao propria — desliga este listener na pratica, sem sobra.
        document.querySelectorAll('[data-next]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var alvo = this.getAttribute('data-next');
                if (alvo === null || alvo === '') return;
                goToStep(alvo);
            });
        });

        document.querySelectorAll('[data-prev]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var alvo = this.getAttribute('data-prev');
                if (alvo === null || alvo === '') return;
                goToStep(alvo);
            });
        });

        navLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                goToStep(this.getAttribute('data-step'));
            });
        });

        return { goToStep: goToStep, passoValido: passoValido };
    }

    // -----------------------------------------------------------------------
    // DOM helpers
    // -----------------------------------------------------------------------

    function setText(id, text) {
        var el = document.getElementById(id);
        if (el) el.textContent = text;
    }

    function sumFields(ids) {
        return ids.reduce(function (acc, id) {
            var el = document.getElementById(id);
            return acc + (el ? parseCurrency(el.value) : 0);
        }, 0);
    }

    // -----------------------------------------------------------------------
    // Storage com namespace 'simulathos:<app>:'
    //
    // Antes cada tela gravava chaves soltas no localStorage ('aida_vo4_modo',
    // 'vb-dark', ...). Sem namespace, um 'localStorage.clear()' de outra tela
    // apaga o histórico da academia. Aqui tudo passa a viver sob
    // 'simulathos:<app>:<chave>'. As chaves antigas continuam sendo LIDAS
    // (migração transparente) e NUNCA são apagadas por este helper.
    // -----------------------------------------------------------------------

    var STORAGE_PREFIXO = 'simulathos:';
    var STORAGE_LEGADO_PREFIXO = 'aida_vo4_';

    function storageDisponivel() {
        try {
            return typeof localStorage !== 'undefined' && localStorage !== null;
        } catch (e) {
            return false;
        }
    }

    function storageChave(app, chave) {
        return STORAGE_PREFIXO + String(app || '') + ':' + String(chave || '');
    }

    // Lê a chave namespaced; se ela não existir, cai na chave legada
    // 'aida_vo4_<chave>' (somente leitura). Retorna null quando nada existe.
    function storageGet(app, chave) {
        if (!storageDisponivel()) return null;
        try {
            var valor = localStorage.getItem(storageChave(app, chave));
            if (valor !== null) return valor;
            if (String(app) === 'academia') {
                var legado = localStorage.getItem(STORAGE_LEGADO_PREFIXO + String(chave || ''));
                if (legado !== null) return legado;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    function storageSet(app, chave, valor) {
        if (!storageDisponivel()) return false;
        try {
            localStorage.setItem(storageChave(app, chave), String(valor));
            return true;
        } catch (e) {
            return false; // storage cheio ou bloqueado — segue sem persistir
        }
    }

    function storageRemove(app, chave) {
        if (!storageDisponivel()) return false;
        try {
            localStorage.removeItem(storageChave(app, chave));
            return true;
        } catch (e) {
            return false;
        }
    }

    // Apaga apenas as chaves do app informado. Nunca toca em outros apps
    // nem nas chaves legadas.
    function storageClearApp(app) {
        if (!storageDisponivel()) return 0;
        var prefixo = STORAGE_PREFIXO + String(app || '') + ':';
        var alvos = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(prefixo) === 0) alvos.push(k);
            }
            alvos.forEach(function (k) { localStorage.removeItem(k); });
            return alvos.length;
        } catch (e) {
            return 0;
        }
    }

    // CARTEIRA-06 — migração das chaves legadas 'aida_vo4_*'.
    // Copia cada chave solta para 'simulathos:<app>:<chave>' (sem sobrescrever o
    // que já existe no namespace) e apaga a legada. Idempotente: rodar duas vezes
    // não faz nada na segunda. Retorna a lista de chaves migradas.
    function storageMigrarLegado(app) {
        if (!storageDisponivel()) return [];
        var alvo = String(app || 'academia');
        var legadas = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(STORAGE_LEGADO_PREFIXO) === 0) legadas.push(k);
            }
        } catch (e) {
            return [];
        }
        var migradas = [];
        legadas.forEach(function (k) {
            var curta = k.slice(STORAGE_LEGADO_PREFIXO.length);
            try {
                var valor = localStorage.getItem(k);
                var destino = storageChave(alvo, curta);
                if (valor !== null && localStorage.getItem(destino) === null) {
                    localStorage.setItem(destino, valor);
                }
                localStorage.removeItem(k);
                migradas.push(curta);
            } catch (e) { /* storage cheio/bloqueado: a legada fica, sem quebrar nada */ }
        });
        return migradas;
    }

    // Lista as chaves soltas (fora do namespace) que ainda restam — diagnóstico.
    function storageLegadasRestantes() {
        if (!storageDisponivel()) return [];
        var out = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(STORAGE_LEGADO_PREFIXO) === 0) out.push(k);
            }
        } catch (e) { return []; }
        return out;
    }

    var storage = {
        prefixo: STORAGE_PREFIXO,
        prefixoLegado: STORAGE_LEGADO_PREFIXO,
        chave: storageChave,
        get: storageGet,
        set: storageSet,
        remove: storageRemove,
        clearApp: storageClearApp,
        migrarLegado: storageMigrarLegado,
        legadasRestantes: storageLegadasRestantes,
    };

    // Migração roda no carregamento do utils.js (antes de qualquer tela ler o
    // storage), então ninguém precisa lembrar de chamá-la.
    try { storageMigrarLegado('academia'); } catch (e) { /* nunca bloqueia o boot */ }

    // -----------------------------------------------------------------------
    // Theme loader
    // -----------------------------------------------------------------------

    function getThemeFromURL() {
        var params = new URLSearchParams(window.location.search);
        return params.get('tema') || params.get('theme') || null;
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    return {
        parseCurrency: parseCurrency,
        formatCurrency: formatCurrency,
        formatCurrencyShort: formatCurrencyShort,
        initCurrencyMasks: initCurrencyMasks,
        initStepWizard: initStepWizard,
        setText: setText,
        sumFields: sumFields,
        getThemeFromURL: getThemeFromURL,
        storage: storage,
    };

})();
