// Teste do detector de mentira da esteira (tools/checar-dados.mjs).
//
// O caso 6 é o que importa: reproduz o bug que deixou o aluno nove dias com
// dado velho enquanto o robô terminava verde. Se esse teste voltar a passar
// "por acaso", é porque alguém tirou a trava.
//
// COMO RODAR: node tools/tests/checar-dados.test.mjs

import assert from "assert";
import { execFileSync, spawnSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(AQUI, "..", "checar-dados.mjs");

let passou = 0;
const teste = (nome, fn) => {
  try { fn(); passou++; console.log("  ok  " + nome); }
  catch (e) { console.log("FALHOU " + nome + "\n       " + e.message); process.exitCode = 1; }
};

function git(cwd, ...args) {
  return execFileSync("git", args, { cwd, encoding: "utf8" });
}

function roda(cwd, modo, env = {}) {
  const r = spawnSync(process.execPath, [SCRIPT, `--modo=${modo}`], {
    cwd, encoding: "utf8", env: { ...process.env, ...env },
  });
  return { code: r.status, saida: (r.stdout || "") + (r.stderr || "") };
}

/** Monta um repo de mentirinha com a árvore que a esteira produz. */
function repoFalso({ ultimaDataGlobal, nEtfs = 300, nOffshore = 260, comImabLongo = false }) {
  const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "checar-dados-"));
  const dados = path.join(raiz, "academia", "data");
  fs.mkdirSync(path.join(dados, "etfs"), { recursive: true });
  fs.mkdirSync(path.join(dados, "offshore"), { recursive: true });
  fs.mkdirSync(path.join(dados, "indices"), { recursive: true });

  fs.writeFileSync(path.join(dados, "dados.js"), "window.DADOS = {};\n");
  fs.writeFileSync(
    path.join(dados, "manifest.js"),
    `window.MANIFEST = ${JSON.stringify({ ultimaDataGlobal, totalSeries: 1, porTicker: {} })};\n`
  );
  for (const f of ["cdi.json", "ibov.json", "ipca.json"]) {
    fs.writeFileSync(path.join(dados, f), "[]\n");
  }
  for (const f of ["nasdaq.json", "sp500.json", "usdbrl.json"]) {
    fs.writeFileSync(path.join(dados, "indices", f), "[]\n");
  }
  for (let i = 0; i < nEtfs; i++) fs.writeFileSync(path.join(dados, "etfs", `E${i}.json`), "[]\n");
  for (let i = 0; i < nOffshore; i++) fs.writeFileSync(path.join(dados, "offshore", `O${i}.json`), "[]\n");
  if (comImabLongo) fs.writeFileSync(path.join(dados, "imab-longo.json"), "{}\n");

  git(raiz, "init", "-q", ".");
  git(raiz, "config", "user.email", "robo@teste");
  git(raiz, "config", "user.name", "robo");
  git(raiz, "add", "-A");
  git(raiz, "commit", "-qm", "dados");
  return raiz;
}

const hoje = new Date().toISOString().slice(0, 10);
const faz = (dias) => new Date(Date.now() - dias * 86400000).toISOString().slice(0, 10);

// ── modo gerados ─────────────────────────────────────────────────────
teste("gerados: árvore completa passa", () => {
  const r = roda(repoFalso({ ultimaDataGlobal: hoje }), "gerados");
  assert.strictEqual(r.code, 0, r.saida);
});

teste("gerados: falta arquivo obrigatório → falha", () => {
  const raiz = repoFalso({ ultimaDataGlobal: hoje });
  fs.rmSync(path.join(raiz, "academia/data/cdi.json"));
  const r = roda(raiz, "gerados");
  assert.strictEqual(r.code, 1, r.saida);
  assert.ok(/cdi\.json/.test(r.saida), r.saida);
});

teste("gerados: arquivo obrigatório vazio → falha", () => {
  const raiz = repoFalso({ ultimaDataGlobal: hoje });
  fs.writeFileSync(path.join(raiz, "academia/data/dados.js"), "");
  const r = roda(raiz, "gerados");
  assert.strictEqual(r.code, 1, r.saida);
  assert.ok(/vazio/.test(r.saida), r.saida);
});

teste("gerados: pasta de ETFs encolhida → falha", () => {
  const r = roda(repoFalso({ ultimaDataGlobal: hoje, nEtfs: 12 }), "gerados");
  assert.strictEqual(r.code, 1, r.saida);
  assert.ok(/encolheu/.test(r.saida), r.saida);
});

teste("gerados: imab-longo.json ausente é AVISO, não falha", () => {
  const r = roda(repoFalso({ ultimaDataGlobal: hoje }), "gerados");
  assert.strictEqual(r.code, 0, r.saida);
  assert.ok(/AVISO.*imab-longo/.test(r.saida), r.saida);
});

// ── modo commitado ───────────────────────────────────────────────────
teste("commitado: HEAD fresco e nada fora do commit passa", () => {
  const r = roda(repoFalso({ ultimaDataGlobal: hoje }), "commitado");
  assert.strictEqual(r.code, 0, r.saida);
});

teste("commitado: dado novo NO DISCO mas fora do commit → falha (o bug dos 9 dias)", () => {
  const raiz = repoFalso({ ultimaDataGlobal: faz(9) });
  // é exatamente o estado que o runner deixava: manifest novo no disco,
  // commit que não aconteceu, job verde.
  fs.writeFileSync(
    path.join(raiz, "academia/data/manifest.js"),
    `window.MANIFEST = ${JSON.stringify({ ultimaDataGlobal: hoje, totalSeries: 1, porTicker: {} })};\n`
  );
  const r = roda(raiz, "commitado");
  assert.strictEqual(r.code, 1, r.saida);
  assert.ok(/FORA do commit/.test(r.saida), r.saida);
});

teste("commitado: dado commitado defasado → falha", () => {
  const r = roda(repoFalso({ ultimaDataGlobal: faz(9) }), "commitado");
  assert.strictEqual(r.code, 1, r.saida);
  assert.ok(/parado em/.test(r.saida), r.saida);
});

teste("commitado: MAX_DIAS_DEFASAGEM afrouxa o limite", () => {
  const r = roda(repoFalso({ ultimaDataGlobal: faz(9) }), "commitado", { MAX_DIAS_DEFASAGEM: "30" });
  assert.strictEqual(r.code, 0, r.saida);
});

teste("modo desconhecido → sai 2", () => {
  const r = roda(repoFalso({ ultimaDataGlobal: hoje }), "banana");
  assert.strictEqual(r.code, 2, r.saida);
});

console.log(`\n${passou} testes ok`);
