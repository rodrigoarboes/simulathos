// tools/checar-dados.mjs — o detector de mentira da esteira de dados.
//
// POR QUE ISSO EXISTE. De 11/09 a 18/09/2026 o robô diário rodou oito vezes,
// terminou VERDE oito vezes e não commitou nada. O aluno ficou nove dias com
// preço velho num simulador de carteira, e nenhum alarme tocou.
//
// A causa: o passo de commit fazia
//     git add <lista> academia/data/imab-longo.json 2>/dev/null || true
// e o imab-longo.json nunca é gerado (ver tools/imab-longo.mjs). O `git add`
// valida TODOS os pathspecs antes de indexar qualquer um: um caminho que não
// existe derruba o comando inteiro, e aí nada foi para o índice. O `|| true`
// engoliu o erro, o `git diff --cached --quiet` seguinte não viu nada no índice
// e concluiu "Nada mudou, sem commit." — com o disco cheio de dado novo.
//
// A checagem de frescor que já existia não pegou isso porque ela olhava o
// manifest.js do DISCO, recém-gerado pelo fetch. Claro que estava fresco. O que
// importa é o que ficou COMMITADO: é isso que o GitHub Pages publica e o aluno
// abre. Por isso o modo `commitado` abaixo lê o manifest do HEAD, não do disco.
//
// COMO RODAR:
//   node tools/checar-dados.mjs --modo=gerados    (logo depois do fetch)
//   node tools/checar-dados.mjs --modo=commitado  (depois do commit/push)
//
// Sai com código != 0 em qualquer suspeita. Nada de `|| true` por cima disso.

import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import vm from "vm";

const RAIZ = "academia/data";

// Arquivos que a esteira TEM de produzir. Faltou um, o job cai.
const ARQUIVOS_OBRIGATORIOS = [
  `${RAIZ}/dados.js`,
  `${RAIZ}/manifest.js`,
  `${RAIZ}/cdi.json`,
  `${RAIZ}/ibov.json`,
  `${RAIZ}/ipca.json`,
  `${RAIZ}/indices/nasdaq.json`,
  `${RAIZ}/indices/sp500.json`,
  `${RAIZ}/indices/usdbrl.json`,
];

// Pastas com muitos arquivos: o que importa é não ENCOLHER de repente. O piso
// é folgado de propósito (hoje são 323 e 289) — a ideia é pegar a fonte caindo,
// não brigar por um ticker que saiu do catálogo.
const PASTAS_MINIMAS = [
  { dir: `${RAIZ}/etfs`, minimo: 280 },
  { dir: `${RAIZ}/offshore`, minimo: 250 },
];

// Arquivos que a esteira TENTA produzir e hoje sabidamente não produz. Falta
// deles vira AVISO, não falha — mas fica gritado no log, com o motivo, para
// ninguém confundir "conhecido" com "resolvido".
const ARQUIVOS_OPCIONAIS = [
  {
    caminho: `${RAIZ}/imab-longo.json`,
    motivo:
      "as séries IMA-B do SGS (12462/12466/12467/12468) pararam em 22/05/2023 e o " +
      "ETF IMAB11 da Yahoo está congelado em 79,50 de 2022-03-08 a 2026-01-07 — " +
      "sem fonte viva não dá para validar candidata. Decisão pendente com o dono: " +
      "achar outra fonte ou remover o gráfico.",
  },
];

// Idade máxima tolerada para o dado mais novo JÁ COMMITADO. Sete dias cobre
// feriado prolongado sem deixar passar uma semana inteira de silêncio.
const MAX_DIAS = Number(process.env.MAX_DIAS_DEFASAGEM || 7);

const problemas = [];
const avisos = [];

function git(...args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 1024 * 1024 * 64 });
}

function bytes(caminho) {
  try {
    return fs.statSync(caminho).size;
  } catch {
    return -1;
  }
}

/** Lê MANIFEST de um manifest.js (que é um script, não JSON). */
function lerManifest(src, origem) {
  const sandbox = {};
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  try {
    vm.runInContext(src, sandbox);
  } catch (e) {
    problemas.push(`manifest.js (${origem}) não executa: ${e.message}`);
    return null;
  }
  const m = sandbox.MANIFEST;
  if (!m || !m.ultimaDataGlobal) {
    problemas.push(`manifest.js (${origem}) sem ultimaDataGlobal — o fetch não terminou.`);
    return null;
  }
  return m;
}

function diasDesde(dataISO) {
  const quando = Date.parse(`${dataISO}T00:00:00Z`);
  if (!isFinite(quando)) {
    problemas.push(`ultimaDataGlobal inválida: ${dataISO}`);
    return null;
  }
  return (Date.now() - quando) / 86400000;
}

// ── modo `gerados`: o fetch produziu tudo que devia? ──────────────────
function checarGerados() {
  for (const arquivo of ARQUIVOS_OBRIGATORIOS) {
    const tam = bytes(arquivo);
    if (tam < 0) problemas.push(`obrigatório não foi gerado: ${arquivo}`);
    else if (tam === 0) problemas.push(`obrigatório saiu vazio: ${arquivo}`);
    else console.log(`  ok   ${arquivo} (${tam} bytes)`);
  }

  for (const { dir, minimo } of PASTAS_MINIMAS) {
    let n = 0;
    try {
      n = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).length;
    } catch {
      problemas.push(`pasta obrigatória não existe: ${dir}`);
      continue;
    }
    if (n < minimo) problemas.push(`${dir}: só ${n} arquivos (mínimo ${minimo}) — a fonte encolheu.`);
    else console.log(`  ok   ${dir} (${n} arquivos)`);
  }

  for (const { caminho, motivo } of ARQUIVOS_OPCIONAIS) {
    if (bytes(caminho) > 0) console.log(`  ok   ${caminho} (opcional, e veio)`);
    else avisos.push(`${caminho} não foi gerado — ${motivo}`);
  }
}

// ── modo `commitado`: o que está no HEAD é novo mesmo? ────────────────
function checarCommitado() {
  // 1. Nada gerado pode ter ficado de fora do commit. Este é exatamente o
  //    buraco por onde os nove dias passaram.
  const sobrou = git("status", "--porcelain", "--", RAIZ).trim();
  if (sobrou) {
    problemas.push(
      `sobrou arquivo gerado FORA do commit em ${RAIZ} — o commit não pegou tudo:\n${sobrou}`
    );
  } else {
    console.log(`  ok   nada de ${RAIZ} ficou fora do commit`);
  }

  // 2. O manifest que está no HEAD (o que o Pages publica) precisa estar
  //    fresco. Ler o do disco não prova nada: ele é reescrito todo dia mesmo
  //    quando o commit falha.
  let src;
  try {
    src = git("show", `HEAD:${RAIZ}/manifest.js`);
  } catch (e) {
    problemas.push(`não consegui ler ${RAIZ}/manifest.js do HEAD: ${e.message}`);
    return;
  }
  const manifest = lerManifest(src, "HEAD");
  if (!manifest) return;

  const dias = diasDesde(manifest.ultimaDataGlobal);
  if (dias === null) return;
  console.log(`  ..   última data global no HEAD: ${manifest.ultimaDataGlobal} (${dias.toFixed(1)} dias atrás)`);
  if (dias > MAX_DIAS) {
    problemas.push(
      `o dado COMMITADO está parado em ${manifest.ultimaDataGlobal}, ${dias.toFixed(1)} dias atrás ` +
      `(máximo ${MAX_DIAS}). É isso que o aluno está vendo.`
    );
  } else {
    console.log(`  ok   dado commitado dentro do limite de ${MAX_DIAS} dias`);
  }
}

const modo = (process.argv.find((a) => a.startsWith("--modo=")) || "").split("=")[1];
if (modo !== "gerados" && modo !== "commitado") {
  console.error("uso: node tools/checar-dados.mjs --modo=gerados|commitado");
  process.exit(2);
}

console.log(`Checando dados (modo: ${modo})`);
if (modo === "gerados") checarGerados();
else checarCommitado();

for (const a of avisos) console.log(`  AVISO  ${a}`);

if (problemas.length) {
  console.error(`\n${problemas.length} problema(s) — falhando o job de propósito:`);
  for (const p of problemas) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log("\nTudo certo.");
