// tools/imab-longo.mjs — monta a série longa IMA-B × CDI × IPCA no BUILD.
//
// POR QUE ISSO EXISTE. Esse gráfico era o único do app que ia buscar dados AO
// VIVO no Banco Central, do navegador do aluno, toda vez que a tela abria. Como
// o público é bancário de varejo, a rede do banco bloqueia api.bcb.gov.br e o
// aluno só via "Não consegui montar a série longa agora". Os outros gráficos
// funcionam porque leem arquivo local gerado por esta esteira.
//
// Agora a busca acontece uma vez por dia, no runner do GitHub Actions, e o
// resultado vira academia/data/imab-longo.json. O navegador só lê o arquivo.
//
// A LÓGICA É A MESMA que rodava no navegador (academia/js/app-navegacao.js):
// o SGS descontinuou o bloco ANBIMA, então nenhum código é confiável de véspera
// — testamos os candidatos e validamos cada um contra os retornos mensais REAIS
// do ETF IMAB11 (correlação, erro médio e razão de volatilidade). Sem aprovação,
// sem arquivo: melhor não ter gráfico do que ter gráfico errado.

import https from "https";
import fs from "fs";
import path from "path";

const SGS_IMAB_CANDIDATOS = [12466, 12467, 12468, 12462];

// Mínimo de meses de sobreposição com o ETF para validar uma candidata.
// Era 36. Com o IMAB11 congelado na fonte (910 pregões parados), sobraram 14
// meses REAIS — e 36 passou a ser um portão que nada atravessa. Baixar só é
// seguro porque os meses agora são limpos: retorno zero forjado de trecho
// congelado é descartado antes de chegar aqui. A verificação (correlação,
// erro médio e razão de volatilidade) continua a mesma, e o número de meses
// usados vai no JSON para aparecer na legenda do gráfico.
const MIN_MESES_GABARITO = 12;
const SGS_CDI_MENSAL = 4391;
const SGS_IPCA_MENSAL = 433;

function sgsUrl(codigo, params = {}) {
  return `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados` +
    (params.ultimos ? `/ultimos/${params.ultimos}` : "") +
    `?formato=json` +
    (params.dataInicial ? `&dataInicial=${params.dataInicial}` : "") +
    (params.dataFinal ? `&dataFinal=${params.dataFinal}` : "");
}

function pegar(url, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; fetch-dados/1.0)" } }, (res) => {
      if (res.statusCode !== 200) { res.resume(); return reject(new Error(`HTTP ${res.statusCode}`)); }
      const partes = [];
      res.on("data", (c) => partes.push(c));
      res.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(partes).toString("utf8"))); }
        catch (e) { reject(new Error("resposta não é JSON")); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error(`sem resposta em ${timeoutMs / 1000}s`)); });
  });
}

async function buscarSgs(codigo, params, timeoutMs) {
  const rows = await pegar(sgsUrl(codigo, params), timeoutMs);
  if (!Array.isArray(rows)) throw new Error(`SGS ${codigo}: resposta inesperada`);
  return rows;
}

/** Data de hoje no formato que o SGS espera (DD/MM/AAAA). */
function hojeSgs(hoje) {
  const dd = String(hoje.getDate()).padStart(2, "0");
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${hoje.getFullYear()}`;
}

/**
 * Divide o período em blocos aceitos pelo SGS (limite de ~10 anos por consulta
 * em série diária). O último bloco termina HOJE, nunca em 31/12 do ano corrente:
 * pedir data futura é uma das formas de levar HTTP 400 do Banco Central.
 */
export function blocosSgs(anoInicial, hoje = new Date()) {
  const anoFinal = hoje.getFullYear();
  const blocos = [];
  for (let a = anoInicial; a <= anoFinal; a += 9) {
    const fimAno = Math.min(a + 8, anoFinal);
    blocos.push({
      dataInicial: `01/01/${a}`,
      dataFinal: fimAno === anoFinal ? hojeSgs(hoje) : `31/12/${fimAno}`,
    });
  }
  return blocos;
}

/**
 * Busca a série inteira em blocos e junta. Um bloco que falha NÃO derruba os
 * outros: séries descontinuadas respondem erro justamente no bloco que cai
 * depois do último dado que elas têm, e o histórico anterior continua válido.
 * Só desiste se nenhum bloco vier, e aí diz exatamente qual bloco deu o quê.
 */
export async function buscarSgsLongo(codigo, anoInicial, buscar = buscarSgs, hoje = new Date()) {
  const blocos = blocosSgs(anoInicial, hoje);
  const partes = [];
  const falhas = [];
  for (const b of blocos) {
    try {
      partes.push(await buscar(codigo, b, 30000));
    } catch (e) {
      falhas.push(`${b.dataInicial}..${b.dataFinal}: ${e.message}`);
    }
  }
  if (partes.length === 0) {
    throw new Error(`SGS ${codigo}: nenhum bloco respondeu (${falhas.join(" · ")})`);
  }
  const vistos = new Set();
  const rows = [];
  for (const parte of partes) {
    for (const r of parte) if (!vistos.has(r.data)) { vistos.add(r.data); rows.push(r); }
  }
  rows.sort((a, b) => {
    const [da, ma, ya] = String(a.data).split("/");
    const [db, mb, yb] = String(b.data).split("/");
    return `${ya}${ma}${da}`.localeCompare(`${yb}${mb}${db}`);
  });
  Object.defineProperty(rows, "falhasDeBloco", { value: falhas, enumerable: false });
  return rows;
}

export function parseValor(r) {
  let s = String(r.valor).trim();
  // O SGS pode devolver número em formato brasileiro ("7.842,31").
  if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.indexOf(",") >= 0) s = s.replace(",", ".");
  const v = parseFloat(s);
  return isFinite(v) ? v : null;
}

/** Interpretação A — valor = % do período: compõe por mês. */
export function mensalizaComoVariacao(rows) {
  const porMes = new Map();
  for (const r of rows) {
    const v = parseValor(r);
    if (v === null) continue;
    const [, mm, yyyy] = r.data.split("/");
    const chave = `${yyyy}-${mm}`;
    porMes.set(chave, (porMes.get(chave) || 1) * (1 + v / 100));
  }
  return [...porMes.entries()]
    .map(([mes, fator]) => ({ mes, retorno: fator - 1 }))
    .sort((a, b) => (a.mes < b.mes ? -1 : 1));
}

/** Interpretação B — valor = número-índice diário: retorno = fim/fim anterior. */
export function mensalizaComoIndice(rows) {
  const fimDeMes = new Map();
  for (const r of rows) {
    const v = parseValor(r);
    if (v === null || v <= 0) continue;
    const [, mm, yyyy] = r.data.split("/");
    fimDeMes.set(`${yyyy}-${mm}`, v);
  }
  const meses = [...fimDeMes.keys()].sort();
  const out = [];
  for (let i = 1; i < meses.length; i++) {
    out.push({ mes: meses[i], retorno: fimDeMes.get(meses[i]) / fimDeMes.get(meses[i - 1]) - 1 });
  }
  return out;
}

/** Retornos mensais reais do ETF IMAB11 — o gabarito da validação. */
/** "2024-03" -> "2024-04" */
function mesSeguinte(mes) {
  const [y, m] = mes.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/**
 * Retornos mensais REAIS do ETF IMAB11, usados como gabarito.
 *
 * Dois cuidados que a versão anterior não tinha:
 *
 * 1. TRECHO CONGELADO. A Yahoo devolve preço repetido para ETF de renda fixa
 *    pouco líquido — o IMAB11 ficou 910 pregões parado em 79,50 (2022-03-08 a
 *    2025-10-23, 73% da série). Mês dentro de trecho congelado vira retorno
 *    zero forjado, que destrói qualquer correlação e faz TODA candidata ser
 *    reprovada. Esses meses saem do gabarito.
 * 2. MÊS PULADO. O retorno só é calculado entre meses vizinhos no calendário.
 *    Antes, se um mês faltasse, o código comparava um salto de vários meses
 *    contra o retorno de um mês só do SGS.
 */
export function retornosMensaisImab11(serieImab11, minRunCongelado = 10) {
  const serie = (serieImab11 || []).slice();

  // marca os pontos que estão dentro de um trecho de preço repetido
  const congelado = new Array(serie.length).fill(false);
  let i = 0;
  while (i < serie.length) {
    let j = i + 1;
    while (j < serie.length && serie[j].close === serie[i].close) j++;
    if (j - i >= minRunCongelado) for (let k = i; k < j; k++) congelado[k] = true;
    i = j;
  }

  const fimDeMes = new Map();
  serie.forEach((p, idx) => {
    if (congelado[idx]) return;
    fimDeMes.set(String(p.data).slice(0, 7), p.close);
  });

  const meses = [...fimDeMes.keys()].sort();
  const out = new Map();
  for (let k = 1; k < meses.length; k++) {
    if (meses[k] !== mesSeguinte(meses[k - 1])) continue;
    const prev = fimDeMes.get(meses[k - 1]);
    if (prev > 0) out.set(meses[k], fimDeMes.get(meses[k]) / prev - 1);
  }
  return out;
}

/** Prova se a candidata é mesmo o IMA-B: correlação, erro médio e volatilidade.
    A razão de volatilidade é o que separa IMA-B de IMA-B 5 (menor) e 5+ (maior). */
export function validaContraImab11(mensalSgs, gabarito) {
  const pares = [];
  for (const { mes, retorno } of mensalSgs) {
    if (gabarito.has(mes)) pares.push([retorno, gabarito.get(mes)]);
  }
  if (pares.length < 6) return { ok: false, motivo: `só ${pares.length} meses em comum` };

  const n = pares.length;
  const ma = pares.reduce((s, p) => s + p[0], 0) / n;
  const mb = pares.reduce((s, p) => s + p[1], 0) / n;
  let cov = 0, va = 0, vb = 0, mae = 0;
  for (const [a, b] of pares) {
    cov += (a - ma) * (b - mb);
    va += (a - ma) ** 2;
    vb += (b - mb) ** 2;
    mae += Math.abs(a - b);
  }
  const corr = va > 0 && vb > 0 ? cov / Math.sqrt(va * vb) : 0;
  mae /= n;
  const volRatio = vb > 0 ? Math.sqrt(va / vb) : 0;
  const ok = corr >= 0.97 && mae <= 0.004 && volRatio >= 0.8 && volRatio <= 1.25;
  return { ok, corr, mae, volRatio, meses: n };
}

/** Descobre qual código do SGS é o IMA-B, testando as duas interpretações. */
/**
 * Janela de sondagem das candidatas.
 *
 * ANTES ERA `/ultimos/900`, e os quatro códigos voltaram HTTP 400 — no
 * navegador do dono E no runner do GitHub, em 11/09/2026. Só que o mesmo
 * Banco Central responde todo dia para o robô diário, que pede POR INTERVALO
 * DE DATA (fetch-dados.mjs:245 e :256, séries 12 e 433, de 01/01/2020 até
 * hoje). Ou seja: o SGS está de pé e a forma por intervalo tem histórico de
 * funcionar; quem nunca teve track record é o `/ultimos/N` com N grande.
 * A sondagem passa a usar a forma comprovada. Se ainda assim vier erro, aí
 * sim a conclusão é que as séries do bloco ANBIMA saíram do ar, e o
 * diagnóstico por candidata diz isso com todas as letras.
 */
export function janelaDeSondagem(gabarito, hoje = new Date()) {
  const meses = [...gabarito.keys()].sort();
  const anoIni = meses.length ? Number(meses[0].slice(0, 4)) - 1 : hoje.getFullYear() - 5;
  const dd = String(hoje.getDate()).padStart(2, "0");
  const mm = String(hoje.getMonth() + 1).padStart(2, "0");
  return { dataInicial: `01/01/${anoIni}`, dataFinal: `${dd}/${mm}/${hoje.getFullYear()}` };
}

export async function escolherSerie(gabarito, buscar = buscarSgs, hoje = new Date()) {
  const diag = [];
  const janela = janelaDeSondagem(gabarito, hoje);
  for (const codigo of SGS_IMAB_CANDIDATOS) {
    let rows;
    try {
      rows = await buscar(codigo, janela, 20000);
    } catch (e) {
      diag.push(`${codigo}: falha na busca (${e.message})`);
      continue;
    }
    if (!rows.length) { diag.push(`${codigo}: veio vazia`); continue; }
    let melhor = null;
    for (const modo of ["indice", "variacao"]) {
      const mensal = modo === "indice" ? mensalizaComoIndice(rows) : mensalizaComoVariacao(rows);
      const v = validaContraImab11(mensal, gabarito);
      if (v.ok) return { escolhido: { codigo, modo, verif: v }, diag };
      if (!melhor || (v.corr || 0) > (melhor.corr || 0)) melhor = v;
    }
    const resumo = melhor && melhor.corr !== undefined
      ? `melhor corr ${melhor.corr.toFixed(2)} em ${melhor.meses || 0}m (volRatio ${melhor.volRatio ? melhor.volRatio.toFixed(2) : "?"})`
      : (melhor && melhor.motivo) || "sem janela de validação";
    diag.push(`${codigo}: ${rows.length} pts, ${rows[0].data}→${rows[rows.length - 1].data}, ${resumo}`);
  }
  return { escolhido: null, diag };
}

/**
 * Costura a série: SGS até onde ele vai, e daí em diante os retornos REAIS do
 * IMAB11. O último mês do SGS pode estar incompleto — se o ETF cobre esse mês,
 * o parcial é descartado e o ETF assume. A emenda fica declarada no arquivo.
 */
export function montarSeries({ imabM, cdiM, ipcaM, gabarito }) {
  let serie = imabM.slice();
  let emendaDesde = null;
  if (serie.length > 0) {
    while (serie.length > 0 && gabarito.has(serie[serie.length - 1].mes)) serie = serie.slice(0, -1);
    const ultimoSgs = serie.length > 0 ? serie[serie.length - 1].mes : "";
    for (const mes of [...gabarito.keys()].sort()) {
      if (mes > ultimoSgs) {
        serie.push({ mes, retorno: gabarito.get(mes) });
        if (!emendaDesde) emendaDesde = mes;
      }
    }
  }

  const meses = [], imab = [], cdi = [], ipca = [];
  let fImab = 1, fCdi = 1, fIpca = 1;
  for (const { mes, retorno } of serie) {
    if (!cdiM.has(mes) || !ipcaM.has(mes)) continue;
    fImab *= 1 + retorno;
    fCdi *= 1 + cdiM.get(mes);
    fIpca *= 1 + ipcaM.get(mes);
    meses.push(mes);
    imab.push(100 * fImab);
    cdi.push(100 * fCdi);
    ipca.push(100 * fIpca);
  }
  return { emendaDesde, series: { meses, imab, cdi, ipca } };
}

/**
 * Gera academia/data/imab-longo.json. Não lança: devolve o que aconteceu, para
 * a esteira seguir mesmo se o BCB estiver fora do ar (o arquivo do dia anterior
 * continua valendo).
 */
export async function gerarImabLongo(ROOT, serieImab11, buscar = buscarSgs, hoje = new Date()) {
  const gabarito = retornosMensaisImab11(serieImab11);
  if (gabarito.size < MIN_MESES_GABARITO) {
    return {
      ok: false,
      motivo: `gabarito IMAB11 curto (${gabarito.size} meses utilizáveis, mínimo ${MIN_MESES_GABARITO}) — a série do ETF ` +
        `provavelmente está congelada na fonte; sem referência boa não dá para validar candidata`,
    };
  }

  const { escolhido, diag } = await escolherSerie(gabarito, buscar, hoje);
  if (!escolhido) return { ok: false, motivo: `nenhuma candidata validou contra o IMAB11 — ${diag.join(" · ")}` };

  const [imabFull, cdiFull, ipcaFull] = [
    await buscarSgsLongo(escolhido.codigo, 2003, buscar, hoje),
    await buscarSgsLongo(SGS_CDI_MENSAL, 2003, buscar, hoje),
    await buscarSgsLongo(SGS_IPCA_MENSAL, 2003, buscar, hoje),
  ];

  const imabM = escolhido.modo === "indice" ? mensalizaComoIndice(imabFull) : mensalizaComoVariacao(imabFull);
  const cdiM = new Map(mensalizaComoVariacao(cdiFull).map((r) => [r.mes, r.retorno]));
  const ipcaM = new Map(mensalizaComoVariacao(ipcaFull).map((r) => [r.mes, r.retorno]));

  const { emendaDesde, series } = montarSeries({ imabM, cdiM, ipcaM, gabarito });
  if (series.meses.length < 120) return { ok: false, motivo: `histórico curto demais (${series.meses.length} meses)` };

  const payload = {
    geradoEm: new Date().toISOString(),
    codigo: escolhido.codigo,
    modo: escolhido.modo,
    verif: escolhido.verif,
    emendaDesde,
    series,
  };
  fs.writeFileSync(path.join(ROOT, "imab-longo.json"), JSON.stringify(payload));
  return { ok: true, meses: series.meses.length, codigo: escolhido.codigo, emendaDesde };
}
