// Teste da montagem da série longa do IMA-B, com um SGS simulado.
// COMO RODAR: node tools/tests/imab-longo.test.mjs
import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import {
  parseValor, mensalizaComoIndice, mensalizaComoVariacao,
  retornosMensaisImab11, validaContraImab11, escolherSerie, montarSeries, gerarImabLongo,
} from "../imab-longo.mjs";

let passou = 0;
const teste = (nome, fn) => { try { fn(); passou++; console.log("  ok  " + nome); } catch (e) { console.log("FALHOU " + nome + "\n       " + e.message); process.exitCode = 1; } };
const testeAsync = async (nome, fn) => { try { await fn(); passou++; console.log("  ok  " + nome); } catch (e) { console.log("FALHOU " + nome + "\n       " + e.message); process.exitCode = 1; } };

// ── dados sintéticos: um "IMA-B" e um IMAB11 que o segue de perto ──
const MESES = [];
for (let a = 2004; a <= 2026; a++) for (let m = 1; m <= 12; m++) {
  if (a === 2026 && m > 6) break;
  MESES.push(`${a}-${String(m).padStart(2, "0")}`);
}
// retorno mensal pseudo-aleatório determinístico
const ret = (i) => 0.008 + 0.02 * Math.sin(i * 1.7) * Math.cos(i * 0.31);
const diasDoMes = (mes) => { const [y, m] = mes.split("-").map(Number); return new Date(y, m, 0).getDate(); };

function sgsIndiceDiario(meses, retornos) {
  const rows = []; let idx = 1000;
  meses.forEach((mes, i) => {
    const [y, m] = mes.split("-");
    const alvo = idx * (1 + retornos[i]);
    const d = diasDoMes(mes);
    for (let dia = 1; dia <= d; dia += 7) {
      const p = idx + (alvo - idx) * (dia / d);
      rows.push({ data: `${String(dia).padStart(2, "0")}/${m}/${y}`, valor: p.toFixed(6) });
    }
    rows.push({ data: `${String(d).padStart(2, "0")}/${m}/${y}`, valor: alvo.toFixed(6) });
    idx = alvo;
  });
  return rows;
}
function sgsVariacaoMensal(meses, retornos) {
  return meses.map((mes, i) => {
    const [y, m] = mes.split("-");
    return { data: `01/${m}/${y}`, valor: (retornos[i] * 100).toFixed(6) };
  });
}

const retImab = MESES.map((_, i) => ret(i));
const retCdi = MESES.map((_, i) => 0.008 + 0.001 * Math.sin(i));
const retIpca = MESES.map((_, i) => 0.004 + 0.002 * Math.cos(i));

// IMAB11 (ETF) existe só a partir de 2019 e segue o índice com ruído pequeno
const MESES_ETF = MESES.filter((m) => m >= "2019-01");
const serieImab11 = [];
{
  let preco = 80;
  MESES_ETF.forEach((mes) => {
    const i = MESES.indexOf(mes);
    preco *= 1 + retImab[i] + (i % 5 === 0 ? 0.0002 : -0.0001); // ruído mínimo
    serieImab11.push({ data: `${mes}-28`, close: Number(preco.toFixed(4)) });
  });
}

teste("parseValor entende formato brasileiro e ponto decimal", () => {
  assert.strictEqual(parseValor({ valor: "7.842,31" }), 7842.31);
  assert.strictEqual(parseValor({ valor: "0,0412" }), 0.0412);
  assert.strictEqual(parseValor({ valor: "1234.56" }), 1234.56);
  assert.strictEqual(parseValor({ valor: "n/d" }), null);
});

teste("mensalizaComoIndice deriva o retorno do fim de mês", () => {
  const rows = sgsIndiceDiario(MESES.slice(0, 6), retImab.slice(0, 6));
  const m = mensalizaComoIndice(rows);
  assert.strictEqual(m.length, 5, "5 retornos para 6 meses");
  assert.ok(Math.abs(m[0].retorno - retImab[1]) < 1e-6, "retorno bate com o sintético");
});

teste("mensalizaComoVariacao compõe o percentual do período", () => {
  const m = mensalizaComoVariacao(sgsVariacaoMensal(MESES.slice(0, 4), retImab.slice(0, 4)));
  assert.strictEqual(m.length, 4);
  assert.ok(Math.abs(m[2].retorno - retImab[2]) < 1e-7, 'o SGS simulado grava 6 casas; a tolerância acompanha');
});

teste("validaContraImab11 APROVA a série certa", () => {
  const gab = retornosMensaisImab11(serieImab11);
  const mensal = mensalizaComoIndice(sgsIndiceDiario(MESES, retImab));
  const v = validaContraImab11(mensal, gab);
  assert.ok(v.ok, `deveria aprovar; corr=${v.corr?.toFixed(3)} mae=${v.mae?.toFixed(5)} vol=${v.volRatio?.toFixed(3)}`);
});

teste("validaContraImab11 REPROVA um IMA-B 5 (volatilidade menor)", () => {
  const gab = retornosMensaisImab11(serieImab11);
  const curto = retImab.map((r) => r * 0.45); // metade da vol
  const v = validaContraImab11(mensalizaComoIndice(sgsIndiceDiario(MESES, curto)), gab);
  assert.ok(!v.ok, "não pode aprovar série de volatilidade diferente");
});

teste("validaContraImab11 REPROVA sobreposição curta demais", () => {
  const gab = retornosMensaisImab11(serieImab11.slice(-4));
  const v = validaContraImab11(mensalizaComoIndice(sgsIndiceDiario(MESES, retImab)), gab);
  assert.ok(!v.ok && /meses em comum/.test(v.motivo || ""), "deve recusar por janela curta");
});

teste("montarSeries deixa o ETF mandar onde ele existe, e usa o SGS só no passado", () => {
  const gab = retornosMensaisImab11(serieImab11);
  const ateOntem = MESES.filter((m) => m <= "2024-06");
  const imabM = ateOntem.map((mes) => ({ mes, retorno: retImab[MESES.indexOf(mes)] }));
  const cdiM = new Map(MESES.map((m, i) => [m, retCdi[i]]));
  const ipcaM = new Map(MESES.map((m, i) => [m, retIpca[i]]));
  const { emendaDesde, series } = montarSeries({ imabM, cdiM, ipcaM, gabarito: gab });
  // Onde o ETF existe (2019 em diante), ele substitui o SGS: é o dado do papel que
  // o aluno compra de verdade. O SGS fica com o trecho anterior ao ETF.
  const primeiroMesDoEtf = [...gab.keys()].sort()[0];
  assert.strictEqual(emendaDesde, primeiroMesDoEtf, "a emenda começa onde o ETF começa");
  assert.ok(series.meses[0] < primeiroMesDoEtf, "o trecho antigo vem do SGS");
  assert.strictEqual(new Set(series.meses).size, series.meses.length, "sem mês repetido");
  assert.deepStrictEqual([...series.meses].sort(), series.meses, "meses em ordem");
  assert.ok(series.meses[series.meses.length - 1] >= "2026-06", "chega até o fim do ETF");
  assert.strictEqual(series.imab.length, series.meses.length);
  assert.ok(series.imab[0] > 100 && series.imab.every((v) => v > 0), "índice base 100 crescente e positivo");
});

await testeAsync("escolherSerie acha o candidato certo entre os quatro", async () => {
  const gab = retornosMensaisImab11(serieImab11);
  const falso = { 12466: retImab.map((r) => r * 0.4), 12467: retImab.map((r) => r * 1.6), 12468: retImab.map((r) => r * 0.2) };
  const buscarFake = async (codigo) => {
    if (codigo === 12462) return sgsIndiceDiario(MESES, retImab);          // o certo
    if (falso[codigo]) return sgsIndiceDiario(MESES, falso[codigo]);
    throw new Error("série fora do ar");
  };
  const { escolhido, diag } = await escolherSerie(gab, buscarFake);
  assert.ok(escolhido, `devia escolher alguém; diag: ${diag.join(" | ")}`);
  assert.strictEqual(escolhido.codigo, 12462, "tem de escolher o que valida, não o primeiro da fila");
});

await testeAsync("gerarImabLongo grava o JSON e declara a emenda", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "imab-"));
  const buscarFake = async (codigo, params) => {
    if (codigo === 12466) return sgsIndiceDiario(MESES.filter((m) => m <= "2024-06"), retImab);
    if (codigo === 4391) return sgsVariacaoMensal(MESES, retCdi);
    if (codigo === 433) return sgsVariacaoMensal(MESES, retIpca);
    throw new Error("não existe");
  };
  const r = await gerarImabLongo(dir, serieImab11, buscarFake);
  assert.ok(r.ok, `devia gerar; motivo: ${r.motivo}`);
  const j = JSON.parse(fs.readFileSync(path.join(dir, "imab-longo.json"), "utf8"));
  assert.strictEqual(j.codigo, 12466);
  assert.ok(j.series.meses.length >= 120, "histórico longo");
  assert.ok(j.emendaDesde, "a emenda com o ETF fica declarada");
  assert.ok(j.verif.ok && j.verif.corr > 0.97, "guarda a prova da validação");
  fs.rmSync(dir, { recursive: true, force: true });
});

await testeAsync("BCB fora do ar NÃO quebra a esteira: devolve motivo, não exceção", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "imab-"));
  const r = await gerarImabLongo(dir, serieImab11, async () => { throw new Error("ECONNREFUSED"); });
  assert.strictEqual(r.ok, false);
  assert.ok(/nenhuma candidata/.test(r.motivo), r.motivo);
  assert.ok(!fs.existsSync(path.join(dir, "imab-longo.json")), "não escreve arquivo ruim");
  fs.rmSync(dir, { recursive: true, force: true });
});

await testeAsync("a esteira diária COMMITA o arquivo que o gerador escreve", async () => {
  // O gerador escreve academia/data/imab-longo.json, mas o job do Actions dá
  // `git add` numa lista explícita de caminhos. Quando o arquivo ficou fora da
  // lista, o robô gerava e jogava fora — o gráfico nunca aparecia. Este teste
  // amarra os dois lados para não acontecer de novo.
  const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
  const yml = fs.readFileSync(path.join(raiz, ".github/workflows/dados.yml"), "utf8");
  const linha = yml.split("\n").find((l) => l.includes("git add academia/data"));
  assert.ok(linha, "o job precisa ter a linha de git add");
  assert.ok(linha.includes("academia/data/imab-longo.json"),
    "imab-longo.json precisa estar no git add, senão o robô gera e descarta");
});

console.log(`\n${passou} testes passaram.`);
