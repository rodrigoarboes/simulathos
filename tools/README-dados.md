# Pipeline de dados de mercado

Como os dados de `academia/data/dados.js` e `alocacao/data/dados.js` são
buscados, regenerados e validados.

## Como regenerar

```bash
node tools/fetch-dados.mjs --target=academia
node tools/fetch-dados.mjs --target=alocacao
```

O `--target` é obrigatório. O script:

1. Lê a lista de tickers a buscar do **próprio `dados.js` do alvo**
   (`etfs`, `offshore`) — não há mais listas fixas no código. Rodar de
   novo atualiza exatamente o que já existe. Fundos (sem ticker líquido
   na Yahoo) não são re-buscados: continuam como estavam, só entram na
   validação de qualidade.
2. Busca cada série no Yahoo Finance (`.SA` para ativos da B3) e as
   séries de CDI/IPCA no SGS do BCB.
3. Regrava `<alvo>/etfs/*.json`, `<alvo>/offshore/*.json`,
   `<alvo>/indices/*.json`, `cdi.json`, `ibov.json`, `ipca.json` e o
   `dados.js` embutido (`window.DADOS = {...}`).
4. Só para `--target=academia`: regenera `academia/data/manifest.js`
   (`window.MANIFEST = {...}`) com a procedência e qualidade de cada
   série.

Alternativa a ler do `dados.js`: `--list=arquivo.json` aponta para uma
lista própria, no formato:

```json
[
  { "ticker": "XPML11", "universo": "etfs" },
  { "ticker": "VOO", "universo": "offshore", "symbol": "VOO" }
]
```

Precisão: os preços são gravados com 6 casas decimais (antes eram 2 —
insuficiente para cotas de fundo e ETFs de preço baixo).

Ajuste por proventos: o script sempre prefere `adjclose` (preço já
ajustado por dividendos/JCP). Quando o Yahoo não devolve `adjclose` para
um símbolo, a série cai para `close` cru — mas nunca em silêncio: ela sai
como `{ ajustadoProventos: false, pontos: [...] }` em vez do array
simples, para quem consome saber que ali não houve ajuste. Isso é uma
mudança de formato em relação ao array simples de sempre; qualquer código
que leia `dados.js` precisa aceitar as duas formas (ver
`hooks_pendentes` no relatório desta tarefa).

## O que é o manifesto (`academia/data/manifest.js`)

`window.MANIFEST` é gerado a partir do `dados.js` atual e descreve, por
ticker, de onde veio o dado e se ele parece confiável:

```js
window.MANIFEST = {
  geradoEm: "2026-09-08T12:00:00.000Z",
  ultimaDataGlobal: "2026-06-12",   // maior data entre todas as séries
  totalSeries: 669,
  porTicker: {
    XPML11: {
      primeira: "2021-06-14",
      ultima: "2026-06-12",
      pontos: 1247,
      universo: "etfs",             // 'etfs' | 'offshore' | 'fundos'
      qualidade: { ok: false, motivos: ["salto_suspeito", "gap_congelado", "serie_quebrada"] }
    }
  }
}
```

Não é uma cópia dos preços — é metadado de procedência. Quem for exibir
uma série pode consultar `MANIFEST.porTicker[ticker].qualidade` e avisar
o usuário quando `ok === false`.

## Regras de qualidade (`validarSerie`, exportada de `fetch-dados.mjs`)

Aplicadas ao histórico de closes de cada série, em ordem cronológica:

- **`salto_suspeito`** — algum retorno diário absoluto (`|close[i] -
  close[i-1]| / close[i-1]`) maior que 0,5 (50%). Ex.: XPML11 salta
  +755% em 2026-01-19 — dado corrompido.
- **`gap_congelado`** — 3 ou mais closes idênticos consecutivos (série
  parada; comum em ativos pouco líquidos ou feriado mal tratado na
  fonte).
- **`serie_quebrada`** — uma queda maior que 80% seguida de uma
  recuperação maior que 80% em até 10 pregões (padrão típico de erro de
  decimal/ajuste, como o próprio caso XPML11).
- **`nao_ajustado_proventos`** — a série veio sem `adjclose` (ver acima).
  Não é tratado como erro fatal, mas fica registrado nos motivos.

Uma série pode acumular vários motivos ao mesmo tempo. `qualidade.ok` só
é `true` quando nenhum dos três primeiros motivos se aplica.

`validarSerie(serie)` é a mesma função usada tanto para gerar o
manifesto quanto (futuramente) para qualquer outro consumidor que queira
checar uma série antes de plotá-la — importe de `tools/fetch-dados.mjs`.
