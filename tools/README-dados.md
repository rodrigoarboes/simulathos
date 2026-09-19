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

## A esteira diária não pode mentir (`tools/checar-dados.mjs`)

O workflow `.github/workflows/dados.yml` roda o fetch todo dia e commita
o resultado na branch publicada. Entre 11/09 e 18/09/2026 ele rodou oito
vezes, terminou **verde** oito vezes e não commitou nada: o `git add`
listava `academia/data/imab-longo.json`, que nunca é gerado, e o git
aborta o `add` inteiro quando um pathspec não casa. Com o índice vazio,
o `git diff --cached --quiet` seguinte concluía "Nada mudou". O `|| true`
por cima escondeu o erro. Nove dias de preço velho no ar, sem alarme.

O que mudou:

* o commit usa `git add -A academia/data` (nada de lista de caminhos que
  pode conter arquivo inexistente) e roda com `set -euo pipefail`;
* `node tools/checar-dados.mjs --modo=gerados` roda depois do fetch e
  falha se um arquivo obrigatório não nasceu, saiu vazio, ou se uma pasta
  de séries encolheu;
* `node tools/checar-dados.mjs --modo=commitado` roda depois do commit e
  falha se sobrou arquivo gerado fora do commit, ou se o manifesto **do
  HEAD** está parado há mais de 7 dias (`MAX_DIAS_DEFASAGEM` ajusta).

A checagem de frescor antiga lia o `manifest.js` do disco, recém-escrito
pelo fetch — sempre fresco, mesmo com o commit falhando. O que importa é
o que está commitado: é isso que o GitHub Pages publica e o aluno abre.

`academia/data/imab-longo.json` está na lista de **opcionais**: a falta
dele vira AVISO no log, não falha. Ver a seção abaixo.

### IMA-B longo: fonte morta (decisão pendente)

`tools/imab-longo.mjs` tenta montar a série IMA-B × CDI × IPCA e imprime
`PULADO` todo dia. Diagnóstico do run de 18/09/2026:

* as quatro candidatas do SGS (12462, 12466, 12467, 12468) **respondem**,
  mas a série de todas termina em **22/05/2023** — o bloco ANBIMA saiu do
  SGS e migrou para `data.anbima.com.br`;
* o gabarito da validação é o ETF IMAB11 da Yahoo, e ele está **congelado
  em 79,50 de 2022-03-08 a 2026-01-07**. Não é só o IMAB11: B5P211,
  IMBB11, FIXA11 e IRFM11 congelam no mesmo intervalo (o manifesto marca
  todos com `gap_congelado`);
* sobram ~6 meses de sobreposição real entre as duas pontas, e um deles é
  um mês partido pela metade — daí `melhor corr 0.75`, longe do 0.97
  exigido.

Ou seja: entre 2022-03 e 2026-01 **não existe série honesta de IMA-B** nas
fontes deste repositório. Não é limiar mal calibrado; é buraco de quase
quatro anos no meio de um gráfico de 20 anos. Ou entra uma fonte nova
(ANBIMA) ou o gráfico sai. Decisão do dono.
