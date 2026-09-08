#!/usr/bin/env node
//
// fetch-dados.mjs — baixa cotações (Yahoo Finance) e séries do BCB e grava
// o pacote embutido "dados.js" usado pelo app (academia/ ou alocacao/),
// além do manifesto de procedência "manifest.js" (só para academia/).
//
// Uso:
//   node tools/fetch-dados.mjs --target=academia
//   node tools/fetch-dados.mjs --target=alocacao
//   node tools/fetch-dados.mjs --target=academia --list=caminho/lista.json
//
// Por padrão a lista de tickers a buscar é lida do PRÓPRIO dados.js do
// alvo (não há mais listas fixas no código): para cada universo (etfs,
// offshore, fundos) usamos as chaves já presentes em window.DADOS. Isso
// garante que rodar o script de novo atualiza exatamente o que já existe,
// sem esquecer nem inventar ticker. Fundos (sem ticker líquido na Yahoo)
// não são re-buscados — permanecem como estão, só entram na validação de
// qualidade do manifesto.
//
// Também é possível passar --list=arquivo.json apontando para um JSON no
// formato [{ "ticker": "XPML11", "universo": "etfs" }, ...] (campo opcional
// "symbol" para o símbolo Yahoo, quando difere do ticker) — útil para
// buscar só um subconjunto ou registrar tickers novos.

import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Alvos suportados ─────────────────────────────────────────────
const TARGETS = {
    academia: path.resolve(__dirname, "..", "academia", "data"),
    alocacao: path.resolve(__dirname, "..", "alocacao", "data")
};

// ── Índices internacionais: chave usada em DADOS.indices → símbolo Yahoo.
// Precisa ficar hardcoded porque a chave ("sp500") não recupera sozinha o
// símbolo Yahoo ("^GSPC").
const INDICE_SIMBOLO = {
    usdbrl: "USDBRL=X",
    sp500: "^GSPC",
    nasdaq: "^IXIC"
};

// ── ETFs/ativos internacionais listados fora dos EUA (sufixo Yahoo).
// A chave do dados.js ("CSPX") não guarda o sufixo de bolsa ("CSPX.L"),
// então mantemos aqui o pequeno conjunto conhecido. Qualquer offshore que
// não estiver neste mapa é buscado pelo próprio ticker, sem sufixo (caso
// dos ETFs e ações listados nos EUA, que são a maioria).
const OFFSHORE_SUFIXO = {
    CSPX: ".L",
    IWDA: ".L",
    EIMI: ".L"
};

// ── Helpers de CLI ───────────────────────────────────────────────

function parseArgs(argv) {
    const out = { target: null, list: null };
    for (const arg of argv) {
        if (arg.startsWith("--target=")) out.target = arg.slice("--target=".length);
        else if (arg.startsWith("--list=")) out.list = arg.slice("--list=".length);
    }
    return out;
}

// ── Helpers gerais ───────────────────────────────────────────────

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Carrega um dados.js existente ("window.DADOS = {...}") e devolve o
 * objeto DADOS. Usa vm com um objeto "window" que aponta pra si mesmo,
 * já que o arquivo é escrito como script de navegador (sem módulos).
 */
function carregarDadosJs(filePath) {
    if (!fs.existsSync(filePath)) return null;
    const src = fs.readFileSync(filePath, "utf8");
    const sandbox = {};
    sandbox.window = sandbox;
    vm.createContext(sandbox);
    vm.runInContext(src, sandbox, { filename: filePath });
    return sandbox.DADOS || null;
}

/**
 * Fetch a URL and return the raw body string.
 * Follows up to 5 redirects. Works with both http and https.
 */
function fetchUrl(url, redirects = 0) {
    return new Promise((resolve, reject) => {
        if (redirects > 5) {
            return reject(new Error("Too many redirects"));
        }

        const mod = url.startsWith("https") ? https : http;

        const req = mod.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (compatible; fetch-dados/1.0)"
            }
        }, (res) => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                let redirectUrl = res.headers.location;
                if (redirectUrl.startsWith("/")) {
                    const parsed = new URL(url);
                    redirectUrl = parsed.protocol + "//" + parsed.host + redirectUrl;
                }
                res.resume();
                return resolve(fetchUrl(redirectUrl, redirects + 1));
            }

            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }

            const chunks = [];
            res.on("data", (chunk) => chunks.push(chunk));
            res.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            res.on("error", reject);
        });

        req.on("error", reject);
        req.setTimeout(30000, () => {
            req.destroy();
            reject(new Error(`Timeout fetching ${url}`));
        });
    });
}

// ── Yahoo Finance ────────────────────────────────────────────────

function yahooUrl(ticker) {
    return `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=5y&interval=1d`;
}

/**
 * Interpreta a resposta do Yahoo. Preferimos sempre o adjclose (preço
 * ajustado por proventos). Se o Yahoo não devolver adjclose para aquele
 * símbolo, caímos para o close "cru" — mas NUNCA silenciosamente: a série
 * volta marcada com { ajustadoProventos: false, pontos: [...] } em vez do
 * array simples, para quem consome saber que ali não houve ajuste.
 */
function parseYahooResponse(raw) {
    const json = JSON.parse(raw);
    const result = json.chart && json.chart.result && json.chart.result[0];
    if (!result) throw new Error("No chart result");

    const timestamps = result.timestamp || [];
    const adjcloseArr =
        result.indicators &&
        result.indicators.adjclose &&
        result.indicators.adjclose[0] &&
        result.indicators.adjclose[0].adjclose;
    const closeArr =
        result.indicators &&
        result.indicators.quote &&
        result.indicators.quote[0] &&
        result.indicators.quote[0].close;

    const ajustado = !!adjcloseArr;
    const fonte = adjcloseArr || closeArr;
    if (!fonte) throw new Error("No price data (nem adjclose nem close)");

    const pontos = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (fonte[i] == null) continue;
        const d = new Date(timestamps[i] * 1000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        pontos.push({
            data: `${yyyy}-${mm}-${dd}`,
            // 6 casas decimais — precisão suficiente pra cotas de fundo e
            // ETFs de preço baixo, sem arredondar demais como o antigo
            // Math.round(x*100)/100.
            close: Math.round(fonte[i] * 1e6) / 1e6
        });
    }

    if (ajustado) return pontos;
    return { ajustadoProventos: false, pontos };
}

async function fetchETF(ticker) {
    const suffix = ticker.startsWith("^") ? "" : ".SA";
    const url = yahooUrl(ticker + suffix);
    const raw = await fetchUrl(url);
    return parseYahooResponse(raw);
}

/**
 * Fetch an arbitrary Yahoo symbol exactly as given (no .SA logic).
 * Use for international indices and offshore ETFs.
 */
async function fetchYahooSymbol(symbol) {
    const url = yahooUrl(symbol);
    const raw = await fetchUrl(url);
    return parseYahooResponse(raw);
}

// ── BCB SGS ──────────────────────────────────────────────────────

function bcbUrl(series, dataInicial, dataFinal) {
    return (
        `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${series}/dados` +
        `?formato=json&dataInicial=${dataInicial}&dataFinal=${dataFinal}`
    );
}

function bcbDateToISO(dateStr) {
    const [dd, mm, yyyy] = dateStr.split("/");
    return `${yyyy}-${mm}-${dd}`;
}

function bcbDateToYearMonth(dateStr) {
    const [, mm, yyyy] = dateStr.split("/");
    return `${yyyy}-${mm}`;
}

/** Hoje como "dd/MM/yyyy" para consultas ao BCB. */
function hojeBCB() {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

async function fetchCDI() {
    const url = bcbUrl(12, "01/01/2020", hojeBCB());
    const raw = await fetchUrl(url);
    const json = JSON.parse(raw);

    return json.map((item) => ({
        data: bcbDateToISO(item.data),
        valor: parseFloat(item.valor) / 100
    }));
}

async function fetchIPCA() {
    const url = bcbUrl(433, "01/01/2020", hojeBCB());
    const raw = await fetchUrl(url);
    const json = JSON.parse(raw);

    return json.map((item) => ({
        data: bcbDateToYearMonth(item.data),
        valor: parseFloat(item.valor)
    }));
}

// ── Validação de qualidade (usada aqui e pelo gerador do manifesto) ──
//
// validarSerie(serie) recebe um array de pontos { data, close } (ordem
// cronológica) e devolve { ok, motivos }. Regras:
//   - "salto_suspeito": |retorno diário| > 0,5 em algum ponto
//   - "gap_congelado": 3+ closes idênticos consecutivos
//   - "serie_quebrada": queda > 80% seguida de recuperação > 80% em
//     até 10 pregões (padrão de dado corrompido tipo XPML11)
// serie pode vir no formato "cru" (array) ou envelopada
// { ajustadoProventos:false, pontos:[...] } — nesse caso valida os pontos
// e adiciona o motivo "nao_ajustado_proventos" sem contar como erro fatal.
export function validarSerie(serie) {
    const motivos = [];
    let pontos = serie;
    let ajustadoProventos = true;

    if (serie && !Array.isArray(serie) && Array.isArray(serie.pontos)) {
        pontos = serie.pontos;
        ajustadoProventos = serie.ajustadoProventos !== false;
    }

    if (!Array.isArray(pontos) || pontos.length === 0) {
        return { ok: false, motivos: ["serie_vazia"] };
    }

    if (!ajustadoProventos) {
        motivos.push("nao_ajustado_proventos");
    }

    let saltoSuspeito = false;
    let gapCongelado = false;
    let serieQuebrada = false;

    let congeladoSeguidos = 1;
    for (let i = 1; i < pontos.length; i++) {
        const anterior = pontos[i - 1].close;
        const atual = pontos[i].close;

        // salto_suspeito
        if (typeof anterior === "number" && anterior !== 0 && typeof atual === "number") {
            const retorno = Math.abs(atual - anterior) / Math.abs(anterior);
            if (retorno > 0.5) saltoSuspeito = true;
        }

        // gap_congelado: 3+ closes idênticos consecutivos
        if (atual === anterior) {
            congeladoSeguidos++;
            if (congeladoSeguidos >= 3) gapCongelado = true;
        } else {
            congeladoSeguidos = 1;
        }
    }

    // serie_quebrada: queda > 80% seguida de recuperação > 80% em <= 10 pregões
    for (let i = 1; i < pontos.length; i++) {
        const base = pontos[i - 1].close;
        const fundo = pontos[i].close;
        if (typeof base !== "number" || base <= 0 || typeof fundo !== "number") continue;
        const queda = (base - fundo) / base;
        if (queda <= 0.8) continue;

        const limite = Math.min(pontos.length - 1, i + 10);
        for (let j = i + 1; j <= limite; j++) {
            const topo = pontos[j].close;
            if (typeof topo !== "number" || fundo <= 0) continue;
            const recuperacao = (topo - fundo) / fundo;
            if (recuperacao > 0.8) {
                serieQuebrada = true;
                break;
            }
        }
        if (serieQuebrada) break;
    }

    if (saltoSuspeito) motivos.push("salto_suspeito");
    if (gapCongelado) motivos.push("gap_congelado");
    if (serieQuebrada) motivos.push("serie_quebrada");

    const ok = !saltoSuspeito && !gapCongelado && !serieQuebrada;
    return { ok, motivos };
}

/**
 * Monta o objeto window.MANIFEST a partir de um DADOS já carregado
 * (mesmo formato de window.DADOS: { etfs, offshore, fundos, ibov, ... }).
 */
export function gerarManifest(dados, agora) {
    const porTicker = {};
    let ultimaDataGlobal = null;
    let totalSeries = 0;

    const universos = [
        ["etfs", dados.etfs],
        ["offshore", dados.offshore],
        ["fundos", dados.fundos]
    ];

    for (const [universo, bucket] of universos) {
        if (!bucket) continue;
        for (const [ticker, serieBruta] of Object.entries(bucket)) {
            totalSeries++;
            const pontos = Array.isArray(serieBruta) ? serieBruta : (serieBruta && serieBruta.pontos) || [];
            const primeira = pontos.length ? pontos[0].data : null;
            const ultima = pontos.length ? pontos[pontos.length - 1].data : null;
            const qualidade = validarSerie(serieBruta);

            porTicker[ticker] = {
                primeira,
                ultima,
                pontos: pontos.length,
                universo,
                qualidade
            };

            if (ultima && (!ultimaDataGlobal || ultima > ultimaDataGlobal)) {
                ultimaDataGlobal = ultima;
            }
        }
    }

    return {
        geradoEm: (agora || new Date()).toISOString(),
        ultimaDataGlobal,
        totalSeries,
        porTicker
    };
}

export function manifestParaJs(manifest) {
    return "// academia/data/manifest.js — gerado por tools/fetch-dados.mjs\n" +
        "// Procedência e qualidade das séries de academia/data/dados.js.\n" +
        "// Ver tools/README-dados.md para as regras de qualidade.\n" +
        "window.MANIFEST = " + JSON.stringify(manifest, null, 2) + ";\n";
}

// ── Save ─────────────────────────────────────────────────────────

function saveJSON(filePath, data) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ── Descoberta de tickers ────────────────────────────────────────

/**
 * Descobre o que buscar a partir do dados.js já existente no alvo (ou de
 * um arquivo de lista, se --list foi passado). Devolve:
 *   { etfs: [tickers], offshore: [{ticker,symbol}], indices: [{key,symbol}] }
 * Fundos não entram aqui — não são re-buscados (sem ticker líquido Yahoo).
 */
function descobrirAlvo(root, listPath) {
    if (listPath) {
        const raw = fs.readFileSync(listPath, "utf8");
        const lista = JSON.parse(raw);
        const etfs = [];
        const offshore = [];
        for (const item of lista) {
            if (!item || !item.ticker) continue;
            const universo = item.universo || "etfs";
            if (universo === "offshore") {
                offshore.push({ ticker: item.ticker, symbol: item.symbol || item.ticker });
            } else {
                etfs.push(item.ticker);
            }
        }
        const indices = Object.entries(INDICE_SIMBOLO).map(([key, symbol]) => ({ key, symbol }));
        return { etfs, offshore, indices };
    }

    const dadosPath = path.join(root, "dados.js");
    const dados = carregarDadosJs(dadosPath);
    const etfs = dados && dados.etfs ? Object.keys(dados.etfs) : [];
    const offshore = dados && dados.offshore
        ? Object.keys(dados.offshore).map((ticker) => ({
            ticker,
            symbol: ticker + (OFFSHORE_SUFIXO[ticker] || "")
        }))
        : [];
    const indices = dados && dados.indices
        ? Object.keys(dados.indices)
            .filter((key) => INDICE_SIMBOLO[key])
            .map((key) => ({ key, symbol: INDICE_SIMBOLO[key] }))
        : Object.entries(INDICE_SIMBOLO).map(([key, symbol]) => ({ key, symbol }));

    return { etfs, offshore, indices };
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    const { target, list } = parseArgs(process.argv.slice(2));

    if (!target || !TARGETS[target]) {
        console.error(`Uso: node tools/fetch-dados.mjs --target=academia|alocacao [--list=arquivo.json]`);
        process.exit(1);
    }

    const ROOT = TARGETS[target];
    console.log(`Alvo: ${target} (${ROOT})`);
    console.log("Fetching market data... This may take a few minutes.\n");

    ensureDir(path.join(ROOT, "etfs"));

    const { etfs: ETF_TICKERS, offshore: OFFSHORE, indices: INDICES } = descobrirAlvo(ROOT, list);
    console.log(`  Descobertos: ${ETF_TICKERS.length} ETFs, ${OFFSHORE.length} offshore, ${INDICES.length} índices\n`);

    // ── ETFs ─────────────────────────────────────────────────────
    for (const ticker of ETF_TICKERS) {
        try {
            process.stdout.write(`  ETF ${ticker}... `);
            const data = await fetchETF(ticker);
            saveJSON(path.join(ROOT, "etfs", `${ticker}.json`), data);
            const n = Array.isArray(data) ? data.length : data.pontos.length;
            console.log(`OK (${n} pontos)${Array.isArray(data) ? "" : " — SEM ajuste de proventos"}`);
        } catch (err) {
            console.log(`FALHOU — ${err.message}`);
        }
        await sleep(2000);
    }

    // ── Ibovespa (^BVSP) ────────────────────────────────────────
    try {
        process.stdout.write("  Ibovespa (^BVSP)... ");
        const ibov = await fetchETF("^BVSP");
        saveJSON(path.join(ROOT, "ibov.json"), ibov);
        const n = Array.isArray(ibov) ? ibov.length : ibov.pontos.length;
        console.log(`OK (${n} pontos)`);
    } catch (err) {
        console.log(`FALHOU — ${err.message}`);
    }

    await sleep(2000);

    // ── CDI (BCB SGS série 12) ──────────────────────────────────
    try {
        process.stdout.write("  CDI (BCB)... ");
        const cdi = await fetchCDI();
        saveJSON(path.join(ROOT, "cdi.json"), cdi);
        console.log(`OK (${cdi.length} pontos)`);
    } catch (err) {
        console.log(`FALHOU — ${err.message}`);
    }

    // ── IPCA (BCB SGS série 433) ────────────────────────────────
    try {
        process.stdout.write("  IPCA (BCB)... ");
        const ipca = await fetchIPCA();
        saveJSON(path.join(ROOT, "ipca.json"), ipca);
        console.log(`OK (${ipca.length} pontos)`);
    } catch (err) {
        console.log(`FALHOU — ${err.message}`);
    }

    // ── Índices internacionais ───────────────────────────────────
    ensureDir(path.join(ROOT, "indices"));
    for (const { key, symbol } of INDICES) {
        await sleep(2000);
        try {
            process.stdout.write(`  Índice ${key} (${symbol})... `);
            const data = await fetchYahooSymbol(symbol);
            saveJSON(path.join(ROOT, "indices", `${key}.json`), data);
            const n = Array.isArray(data) ? data.length : data.pontos.length;
            console.log(`OK (${n} pontos)`);
        } catch (err) {
            console.log(`FALHOU — ${err.message}`);
        }
    }

    // ── ETFs/ações offshore ──────────────────────────────────────
    ensureDir(path.join(ROOT, "offshore"));
    for (const { ticker, symbol } of OFFSHORE) {
        await sleep(2000);
        try {
            process.stdout.write(`  Offshore ${ticker} (${symbol})... `);
            const data = await fetchYahooSymbol(symbol);
            saveJSON(path.join(ROOT, "offshore", `${ticker}.json`), data);
            const n = Array.isArray(data) ? data.length : data.pontos.length;
            console.log(`OK (${n} pontos)${Array.isArray(data) ? "" : " — SEM ajuste de proventos"}`);
        } catch (err) {
            console.log(`FALHOU — ${err.message}`);
        }
    }

    // ── Combined embedded JS (works via double-click / file://) ─────
    let dadosFinal = null;
    try {
        process.stdout.write("  Gerando dados.js embutido... ");
        const dados = { etfs: {}, cdi: [], ibov: [], ipca: [], offshore: {}, indices: {}, fundos: {} };

        // fundos: preserva o que já existir no dados.js atual (não são
        // re-buscados aqui — sem ticker líquido na Yahoo).
        const anterior = carregarDadosJs(path.join(ROOT, "dados.js"));
        if (anterior && anterior.fundos) dados.fundos = anterior.fundos;

        const etfsDir = path.join(ROOT, "etfs");
        if (fs.existsSync(etfsDir)) {
            for (const f of fs.readdirSync(etfsDir)) {
                if (!f.endsWith(".json")) continue;
                const ticker = f.replace(".json", "");
                dados.etfs[ticker] = JSON.parse(fs.readFileSync(path.join(etfsDir, f), "utf8"));
            }
        }
        for (const [key, file] of [["cdi", "cdi.json"], ["ibov", "ibov.json"], ["ipca", "ipca.json"]]) {
            const p = path.join(ROOT, file);
            if (fs.existsSync(p)) dados[key] = JSON.parse(fs.readFileSync(p, "utf8"));
        }
        for (const [bucket, dir] of [["offshore", "offshore"], ["indices", "indices"]]) {
            const dirPath = path.join(ROOT, dir);
            if (!fs.existsSync(dirPath)) continue;
            for (const f of fs.readdirSync(dirPath)) {
                if (!f.endsWith(".json")) continue;
                const key = f.replace(".json", "");
                dados[bucket][key] = JSON.parse(fs.readFileSync(path.join(dirPath, f), "utf8"));
            }
        }
        const js = "// dados.js — dados de mercado embutidos (gerado por tools/fetch-dados.mjs)\n" +
            "window.DADOS = " + JSON.stringify(dados) + ";\n";
        fs.writeFileSync(path.join(ROOT, "dados.js"), js);
        dadosFinal = dados;
        console.log(`OK (${Object.keys(dados.etfs).length} ETFs)`);
    } catch (err) {
        console.log(`FALHOU — ${err.message}`);
    }

    // ── Manifesto (procedência e qualidade) ──────────────────────
    // Só faz sentido para o alvo "academia": alocacao/data não tem
    // manifest.js (não é meu arquivo lá) e não deve ganhar um.
    if (target === "academia" && dadosFinal) {
        try {
            process.stdout.write("  Gerando manifest.js... ");
            const manifest = gerarManifest(dadosFinal, new Date());
            fs.writeFileSync(path.join(ROOT, "manifest.js"), manifestParaJs(manifest));
            const semOk = Object.values(manifest.porTicker).filter((t) => !t.qualidade.ok).length;
            console.log(`OK (${manifest.totalSeries} séries, ${semOk} com alerta de qualidade)`);
        } catch (err) {
            console.log(`FALHOU — ${err.message}`);
        }
    }

    console.log("\nDone.");
}

// Só roda main() quando executado diretamente (permite importar
// validarSerie/gerarManifest de outro script sem disparar o fetch).
const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (isMain) {
    main().catch((err) => {
        console.error("Fatal error:", err);
        process.exit(1);
    });
}
