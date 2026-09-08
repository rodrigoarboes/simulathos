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

    function initStepWizard(opts) {
        var onStepChange = opts && opts.onStepChange;

        var steps = document.querySelectorAll('.zw-step');
        var navLinks = document.querySelectorAll('.zw-nav-link');

        function goToStep(n) {
            steps.forEach(function (s) { s.classList.remove('active'); });
            navLinks.forEach(function (l) { l.classList.remove('active'); });

            var target = document.querySelector('.zw-step[data-step="' + n + '"]');
            var link = document.querySelector('.zw-nav-link[data-step="' + n + '"]');
            if (target) target.classList.add('active');
            if (link) link.classList.add('active');

            navLinks.forEach(function (l) {
                if (parseInt(l.dataset.step) < n) l.classList.add('completed');
            });

            window.scrollTo({ top: 0, behavior: 'smooth' });

            if (onStepChange) onStepChange(n);
        }

        document.querySelectorAll('[data-next]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                goToStep(parseInt(this.dataset.next));
            });
        });

        document.querySelectorAll('[data-prev]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                goToStep(parseInt(this.dataset.prev));
            });
        });

        navLinks.forEach(function (link) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                goToStep(parseInt(this.dataset.step));
            });
        });

        return { goToStep: goToStep };
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

    var storage = {
        prefixo: STORAGE_PREFIXO,
        chave: storageChave,
        get: storageGet,
        set: storageSet,
        remove: storageRemove,
        clearApp: storageClearApp,
    };

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
