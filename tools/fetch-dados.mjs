#!/usr/bin/env node

import https from "https";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "..", "alocacao", "data");

// ── ETF catalog (mirrors catalogo.js) ────────────────────────────
const ETF_TICKERS = [
    "BOVA11", "BOVV11", "SMAL11", "DIVO11",
    "IVVB11", "NASD11", "ACWI11", "HASH11",
    "IMAB11", "B5P211", "IB5M11", "IRFM11",
    "FIXA11", "LFTS11", "XFIX11",
    "MATB11", "EURP11"
];

// ── Índices internacionais (símbolos Yahoo completos, sem .SA) ────
const INDICES = [
    { key: "usdbrl", label: "USDBRL", symbol: "USDBRL=X" },
    { key: "sp500", label: "S&P 500", symbol: "^GSPC" },
    { key: "nasdaq", label: "Nasdaq", symbol: "^IXIC" }
];

// ── ETFs offshore (chave → símbolo Yahoo) ────────────────────────
const OFFSHORE = {
    VOO: "VOO", VTI: "VTI", VWO: "VWO",
    CSPX: "CSPX.L", IWDA: "IWDA.L", EIMI: "EIMI.L",
    BND: "BND", AGG: "AGG", IEF: "IEF", TLT: "TLT", TIP: "TIP",
    GLD: "GLD", VNQ: "VNQ"
};

// ── Helpers ──────────────────────────────────────────────────────

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
}

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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

function parseYahooResponse(raw) {
    const json = JSON.parse(raw);
    const result = json.chart && json.chart.result && json.chart.result[0];
    if (!result) throw new Error("No chart result");

    const timestamps = result.timestamp || [];
    const adjclose =
        result.indicators &&
        result.indicators.adjclose &&
        result.indicators.adjclose[0] &&
        result.indicators.adjclose[0].adjclose;

    if (!adjclose) throw new Error("No adjclose data");

    const data = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (adjclose[i] == null) continue;
        const d = new Date(timestamps[i] * 1000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        data.push({
            data: `${yyyy}-${mm}-${dd}`,
            close: Math.round(adjclose[i] * 100) / 100
        });
    }
    return data;
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

/**
 * Convert BCB date "dd/MM/yyyy" → "yyyy-MM-dd"
 */
function bcbDateToISO(dateStr) {
    const [dd, mm, yyyy] = dateStr.split("/");
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convert BCB date "dd/MM/yyyy" → "yyyy-MM" (for monthly series like IPCA)
 */
function bcbDateToYearMonth(dateStr) {
    const [, mm, yyyy] = dateStr.split("/");
    return `${yyyy}-${mm}`;
}

/** Today as "dd/MM/yyyy" for BCB queries (so series always reach the present). */
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
        valor: parseFloat(item.valor) / 100 // daily rate as decimal
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

// ── Save ─────────────────────────────────────────────────────────

function saveJSON(filePath, data) {
    ensureDir(path.dirname(filePath));
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
    console.log("Fetching market data... This may take a few minutes.\n");

    ensureDir(path.join(ROOT, "etfs"));

    // ── ETFs ─────────────────────────────────────────────────────
    for (const ticker of ETF_TICKERS) {
        try {
            process.stdout.write(`  ETF ${ticker}... `);
            const data = await fetchETF(ticker);
            saveJSON(path.join(ROOT, "etfs", `${ticker}.json`), data);
            console.log(`OK (${data.length} pontos)`);
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
        console.log(`OK (${ibov.length} pontos)`);
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

    // ── Índices internacionais (USD/BRL, S&P 500, Nasdaq) ───────
    ensureDir(path.join(ROOT, "indices"));
    for (const { key, label, symbol } of INDICES) {
        await sleep(2000);
        try {
            process.stdout.write(`  Índice ${label} (${symbol})... `);
            const data = await fetchYahooSymbol(symbol);
            saveJSON(path.join(ROOT, "indices", `${key}.json`), data);
            console.log(`OK (${data.length} pontos)`);
        } catch (err) {
            console.log(`FALHOU — ${err.message}`);
        }
    }

    // ── ETFs offshore (US-listed e UCITS .L) ────────────────────
    ensureDir(path.join(ROOT, "offshore"));
    for (const [key, symbol] of Object.entries(OFFSHORE)) {
        await sleep(2000);
        try {
            process.stdout.write(`  Offshore ${key} (${symbol})... `);
            const data = await fetchYahooSymbol(symbol);
            saveJSON(path.join(ROOT, "offshore", `${key}.json`), data);
            console.log(`OK (${data.length} pontos)`);
        } catch (err) {
            console.log(`FALHOU — ${err.message}`);
        }
    }

    // ── Combined embedded JS (works via double-click / file://) ─────
    try {
        process.stdout.write("  Gerando dados.js embutido... ");
        const dados = { etfs: {}, cdi: [], ibov: [], ipca: [], offshore: {}, indices: {} };
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
        console.log(`OK (${Object.keys(dados.etfs).length} ETFs)`);
    } catch (err) {
        console.log(`FALHOU — ${err.message}`);
    }

    console.log("\nDone.");
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
