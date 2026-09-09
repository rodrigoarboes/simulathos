# Contrato do Motor de Backtest — Simulathos

> Documento canônico. Qualquer implementação do motor (o `shared/js/motor/*.js`
> atual, ou o port React/TypeScript futuro) tem que satisfazer este contrato.
> A suíte `shared/js/motor/__tests__/` é a fonte de verdade executável —
> se este documento e a suíte divergirem, a suíte vence e este documento
> está desatualizado (corrija-o).
>
> `docs/lovable-prompt-simulathos.md` aponta para este arquivo em vez de
> descrever as fórmulas — não duplique a especificação lá.

Versão do contrato: **`Metricas.MOTOR_VERSION = '2.0.0'`**

---

## 0. Convenções gerais

- **Retornos diários** são frações (`0.01` = 1%), nunca percentuais (`1`).
- **Alinhamento por data**: toda operação entre duas séries (carteira vs.
  benchmark, ativo vs. Ibov) usa o **índice posicional** das séries já
  alinhadas por data no momento da montagem dos vetores de retorno — não há
  merge implícito por data dentro das funções de `Metricas`. É
  responsabilidade de quem monta `retornosDiariosAtivos` (o `Backtest.rodar`,
  hoje) garantir que a posição `i` de cada série corresponda ao mesmo dia
  útil. Ver §5 para as regras de dado ausente aplicadas nessa montagem.
- **Dado ausente dentro de uma série já alinhada** (ex.: `retornosDiariosAtivos[ticker][i]`
  não é number) é tratado função a função — não existe uma regra global de
  "vira zero". Cada fórmula abaixo declara o que faz.
- **Mínimo de observações**: cada fórmula declara seu próprio mínimo. Abaixo
  do mínimo, a função retorna `0` ou `null` conforme especificado — nunca
  lança exceção nem inventa um valor sentinela (como `99`).
- **Anualização**: por padrão baseada em `252` dias úteis/ano; funções que
  aceitam `diasUteisPorAno` usam esse valor sempre que for um número finito
  e positivo, senão caem para `252`.

---

## 1. Retorno acumulado — `Metricas.retornoAcumulado(retornosDiarios)`

**Fórmula:**

```
retornoAcumulado = Π(1 + r_i) - 1,  i = 1..n
```

- Array vazio/ausente → `0`.
- Sem mínimo de observações (1 dia já é válido).

**Referência:** definição padrão de retorno geométrico composto (time-weighted
return), consistente com GIPS 2020 (3.A) e Morningstar Methodology
("Total Return").

**Caso de teste:**

```
entrada: retornosDiarios = [0.10, -0.05, 0.02]
saída esperada: (1.10 × 0.95 × 1.02) - 1 = 0.06590000... ≈ 0.0659
```

---

## 2. Retorno anualizado — `Metricas.retornoAnualizado(retAcumulado, numDiasUteis, diasCorridos)`

**Fórmula:**

```
se diasCorridos é number finito e > 0:
    retornoAnualizado = (1 + retAcumulado) ^ (365.2425 / diasCorridos) - 1
senão:
    se numDiasUteis é 0/ausente: retorna 0
    retornoAnualizado = (1 + retAcumulado) ^ (252 / numDiasUteis) - 1
```

`365.2425` é a constante `Metricas.DIAS_ANO_CALENDARIO` (ano trópico médio
gregoriano) — usada porque séries B3 + offshore + fundos CVM não têm o mesmo
número de pregões por ano-calendário; anualizar por dias úteis mistura
calendários diferentes.

**Regra de exibição (imposta pelo motor de backtest, não pela função pura):**
anualizar com menos de 252 dias úteis de amostra distorce o resultado
(um mês bom vira "+400% ao ano"). Por isso `Backtest.rodar` só expõe
`resumo.retornoAnualizado` quando `diasUteis >= 252`; abaixo disso o campo é
`null` e a UI mostra "retorno do período" em vez de uma taxa anualizada.
Essa é a mesma régua do GIPS 2020 **5.A.4**: "Returns for periods of less
than one year must not be annualized."

**Referência:** GIPS 2020 Standard 5.A.4 (proibição de anualizar período
< 12 meses); fórmula de composição geométrica padrão de mercado.

**Casos de teste:**

```
1) Com diasCorridos:
   entrada: retAcumulado = (1.0005)^252 - 1, numDiasUteis = 252, diasCorridos = 365
   saída esperada: ≈ (1.0005)^252 - 1  (tolerância 1e-3 — 365 dias corridos
   é ~1 ano, então o expoente 365.2425/365 ≈ 1.0007, quase idêntico ao
   expoente por dias úteis quando a amostra já é ~1 ano)

2) Sem diasCorridos (compatibilidade):
   entrada: retAcumulado = 0.10, numDiasUteis = 126
   saída esperada: (1.10)^(252/126) - 1 = (1.10)^2 - 1 = 0.21

3) Amostra curta (regra de exibição, testada em Backtest.rodar):
   entrada: backtest com 100 dias úteis de dados
   saída esperada: resumo.retornoAnualizado === null
```

---

## 3. Volatilidade anualizada — `Metricas.volatilidadeAnualizada(retornosDiarios, diasUteisPorAno=252)`

**Fórmula:**

```
stddev amostral (n-1 no denominador) dos retornos diários
volatilidadeAnualizada = stddev × √diasUteisPorAno
```

- `retornosDiarios.length < 2` → `0`.

**Referência:** desvio-padrão amostral anualizado pela raiz do tempo — prática
padrão (Sharpe 1994, "The Sharpe Ratio", seção sobre anualização de
volatilidade quando os retornos são i.i.d.).

**Caso de teste:**

```
entrada: retornosDiarios = [0.01, -0.01, 0.01, -0.01], diasUteisPorAno = 252
stddev amostral de [0.01,-0.01,0.01,-0.01]: média=0, Σd²=0.0004, /(4-1)=0.0001333...
stddev = 0.011547...
saída esperada: 0.011547... × √252 ≈ 0.18330
```

---

## 4. Sharpe — `Metricas.sharpe(retornosDiarios, retornosDiariosRiskFree, diasUteisPorAno=252)`

**Fórmula:**

```
excesso_i = retorno_i - rf_i   (rf_i = 0 se rf ausente nessa posição)
sharpe = (média(excesso) / stddev_amostral(excesso)) × √diasUteisPorAno
```

- `retornosDiarios.length < 2` → `0`.
- `stddev(excesso) === 0` → `0` (evita divisão por zero; não `Infinity`/`NaN`).

**Referência:** Sharpe, W. F. (1994), "The Sharpe Ratio", *Journal of
Portfolio Management*. Fórmula ex-post: média do excesso de retorno sobre a
stddev do excesso, anualizada pela raiz do número de períodos/ano.

**Caso de teste:**

```
entrada: retornosDiarios == retornosDiariosRiskFree em todos os dias
         (60 dias, valores variáveis dia a dia)
saída esperada: sharpe = 0  (excesso é sempre 0 → média 0 → sharpe 0)
```

---

## 5. Sortino — `Metricas.sortino(retornosDiarios, retornosDiariosRiskFree, diasUteisPorAno=252)`

**Fórmula (downside deviation com denominador `n`, não `n_negativos`):**

```
excesso_i = retorno_i - rf_i
downDev = √( Σ_{i: excesso_i < 0} excesso_i²  /  n )     [n = total de observações]
sortino = (média(excesso) / downDev) × √diasUteisPorAno
```

Dias em que `excesso_i >= MAR` (aqui MAR = rf) entram no somatório como
**zero**, mas contam no denominador `n` — essa é a definição de downside
deviation "population" de Sortino & van der Meer, não a variante que usa só
os dias negativos no denominador (essa segunda daria um número maior e
inconsistente com o Sortino publicado por provedores como Morningstar).

**Guardas / mínimo de observações:**

- `retornosDiarios.length < 60` → `null` (amostra curta demais para estimar
  downside deviation com confiança).
- Nenhum dia com `excesso < 0` → `null` (downside deviation indefinida/zero,
  não existe "risco de baixa" observado — não é o mesmo que Sharpe infinito).
- `downDev === 0` → `null`.
- **Nunca retorna `99`** nem qualquer outro valor sentinela — ausência de
  sinal é `null`, e a UI mostra "—".

**Referência:** Sortino, F. A. & van der Meer, R. (1991), "Downside Risk",
*Journal of Portfolio Management*; convenção de denominador populacional
replicada pela Morningstar Methodology ("Downside Deviation" em
Morningstar Risk-Adjusted Return).

**Casos de teste:**

```
1) Amostra curta:
   entrada: retornosDiarios com 59 elementos
   saída esperada: null

2) Sem dia negativo:
   entrada: 60 dias, todos com retorno > rf (excesso sempre positivo)
   saída esperada: null

3) Caso normal:
   entrada: 60 dias de retorno, rf = 0 constante,
            metade dos dias com r = +0.01, metade com r = -0.01 (alternados)
   n = 60, dias negativos = 30, cada excesso negativo = -0.01
   Σ excesso² (só os negativos) = 30 × 0.0001 = 0.003
   downDev = √(0.003 / 60) = √0.00005 = 0.0070710...
   média(excesso) = 0 (30 dias +0.01, 30 dias -0.01)
   saída esperada: sortino = 0 / downDev × √252 = 0
```

---

## 6. Ulcer Index — `Metricas.ulcerIndex(retornosDiarios)`

**Fórmula:**

```
equity_0 = 1; peak_0 = 1
para cada dia i: equity_i = equity_{i-1} × (1+r_i); peak_i = max(peak_i-1, equity_i)
dd_i (%) = (equity_i - peak_i) / peak_i × 100        [sempre <= 0]
ulcerIndex = √( Σ dd_i² / n )                         [n = total de dias, todos entram]
```

- `retornosDiarios.length < 2` → `0`.

**Referência:** Martin, P. G. & McCann, B. (1989), *The Investor's Guide to
Fidelity Funds* (definição original do Ulcer Index — raiz da média dos
quadrados dos drawdowns percentuais, incluindo os dias com drawdown zero).

**Caso de teste:**

```
entrada: retornosDiarios = [0.10, -0.20, 0.05]
dia1: equity=1.10, peak=1.10, dd=0%
dia2: equity=0.88, peak=1.10, dd=(0.88-1.10)/1.10×100 = -20%
dia3: equity=0.924, peak=1.10, dd=(0.924-1.10)/1.10×100 ≈ -16.0000%
saída esperada: √((0² + 20² + 16.0000...²) / 3) ≈ √((0+400+256.0)/3) ≈ √218.67 ≈ 14.787
```

---

## 7. Max Drawdown — `Metricas.drawdownMaximo(retornosDiarios)`

**Fórmula:** mesmo motor de equity/peak do Ulcer, mas retorna o pior
`dd_i` em fração (não %), sempre `<= 0`.

- Array vazio → `0`.

**Referência:** definição padrão de peak-to-trough drawdown (GIPS,
Morningstar Methodology — "Maximum Drawdown").

**Caso de teste:**

```
entrada: retornosDiarios = [0.10, -0.20, 0.05]
saída esperada: -0.20 exato (dia2: equity 1.10 → 0.88, dd = -0.20)
```

`Metricas.curvas.drawdown` (série ponto a ponto, `Metricas.serieDrawdown`)
segue a mesma fórmula, expondo `dd_i` (fração, `<= 0`) para cada data —
usada para desenhar o gráfico de underwater.

---

## 8. Beta — `Metricas.beta(retornosDiariosAtivo, retornosDiariosMercado)`

**Fórmula:**

```
Só entram no cálculo os PARES COMPLETOS: posições i onde tanto o ativo
quanto o mercado (Ibov) são number finito. Dias em que só um lado tem
dado (ex.: mercado ausente) NÃO entram — não são tratados como zero.

beta = Cov_amostral(ativo, mercado) / Var_amostral(mercado)
```

- Menos de 2 pares completos → `0`.
- `Var(mercado) === 0` → `0`.

**Referência:** definição padrão de beta CAPM (covariância sobre a série de
mercado dividida pela variância do mercado), amostral (`n-1`).

**Caso de teste:**

```
entrada: ativo = [0.02, -0.01, 0.03, 0.00]
         mercado = [0.01, -0.005, 0.015, 0.00]  (proporcional: ativo = 2×mercado)
saída esperada: beta ≈ 2.0 (covariância/variância de uma série proporcional
                dá o fator de proporcionalidade)
```

---

## 9. % do CDI — `Metricas.percentualDoCDI(retornoAcumuladoCarteira, retornoAcumuladoCDI)`

**Fórmula:**

```
se retornoCarteira não é number, ou retornoCDI não é number,
   ou algum não é finito,
   ou retornoCarteira <= 0,
   ou retornoCDI <= 0:
       retorna null
senão:
   percentualDoCDI = (retornoCarteira / retornoCDI) × 100
```

Quando `null`, a UI **não** mostra "-40% do CDI" (proporção sem significado
quando um dos dois lados é negativo) — mostra a diferença em pontos
percentuais (`retornoCarteira - retornoCDI`, em p.p.) em vez disso.

**Referência:** convenção de mercado brasileiro de "rentabilidade como %
do CDI", aplicável apenas quando ambos os retornos do período são positivos.

**Casos de teste:**

```
1) entrada: retornoCarteira = 0.12, retornoCDI = 0.10
   saída esperada: 120.0

2) entrada: retornoCarteira = -0.05, retornoCDI = 0.10
   saída esperada: null

3) entrada: retornoCarteira = 0.05, retornoCDI = -0.02
   saída esperada: null
```

---

## 10. Correlação — `Metricas.correlacao` / `Metricas.matrizCorrelacao`

**Fórmula:**

```
Só pares completos (mesma regra de Beta) entram no cálculo.
correlacao(A,B) = Cov_amostral(A,B) / (stddev_amostral(A) × stddev_amostral(B))
```

- Menos de 2 pares completos, ou alguma stddev == 0 → `0`.
- `matrizCorrelacao` monta a matriz N×N; diagonal sempre `1`.

**Referência:** coeficiente de correlação de Pearson amostral padrão.

**Caso de teste:**

```
entrada: A = [0.01, 0.02, -0.01, 0.03], B = A.slice() (idêntica)
saída esperada: correlacao(A,B) = 1.0
```

---

## 11. Come-cotas — `Metricas.comeCotas(retornosDiarios, datas, regime)`

**Regras:**

- `regime` ∈ `'rf_longo'` (alíquota 15%), `'rf_curto'` (20%),
  `'multimercado'` (15%). `'acoes'` (ou qualquer regime não mapeado) →
  `{ aplicavel: false, retornoBruto, retornoLiquido: retornoBruto, perdaPP: 0, eventos: [] }`.
- Evento ocorre no **último pregão presente em `datas`** de cada mês de maio
  e novembro (não no dia 31/30 fixo — usa o último dia útil realmente
  presente na série, o que respeita feriados/fins de semana).
- Em cada evento: `ganho = v - base` (v = valor acumulado da cota,
  base = valor após o evento anterior, ou 1 no início).
  Se `ganho > 0`: `imposto = aliquota × ganho`, é debitado de `v`.
  Se `ganho <= 0`: nenhum imposto (come-cotas não incide sobre perda).
  `base` é sempre atualizada para o `v` pós-evento, positivo ou negativo.
- Retorno: `{ aplicavel, retornoBruto, retornoLiquido, perdaPP, eventos }`
  onde `imposto` de cada evento é fração do capital (não R$),
  `perdaPP = (retornoBruto - retornoLiquido) × 100` (pontos percentuais).

**Referência:** mecânica de come-cotas semestral (maio/novembro) da
legislação de fundos de investimento brasileiros (Lei 11.033/2004 e
regulamentação da Receita Federal sobre fundos de longo e curto prazo);
alíquotas 15%/20% conforme classificação do fundo por prazo médio da
carteira.

**Caso de teste:**

```
entrada: retornosDiarios = 252 dias de +0.0004 constante (retorno ~10,6% no ano)
         datas cobrindo um ano-calendário completo (jan-dez)
         regime = 'rf_longo' (15%)
saída esperada:
  - aplicavel = true
  - eventos.length = 2 (último pregão de maio, último de novembro)
  - cada evento tem imposto > 0 (retorno positivo desde a última base)
  - retornoLiquido < retornoBruto
  - perdaPP > 0
```

---

## 12. `Backtest.rodar(config)` — orquestração

### 12.1 Rebalanceamento

`config.rebalanceamento`:

- `0`, `null`/ausente, ou `Infinity` → **NUNCA rebalancear**: usa
  `Metricas.rebalancear(retornos, pesos, Infinity)`, que simula o drift real
  dos pesos (buy & hold) via `_simularTrajetoria`.
- Qualquer outro número positivo finito → rebalanceia a cada N dias úteis
  (também via `_simularTrajetoria`, que reseta os pesos para o alvo a cada
  N dias e deixa os pesos driftarem entre rebalanceamentos).
- **`Metricas.retornoCarteira` (rebalanceamento diário implícito) não é mais
  usado pelo backtest** — existe só por compatibilidade retroativa para quem
  chamava a função diretamente.

### 12.2 Dado ausente na montagem das séries

- **CDI ausente numa data**: *carry-forward* da última taxa conhecida
  (nunca vira `0`) — uma taxa zerada faria o CDI "sumir" artificialmente do
  cálculo de excesso de retorno.
- **Ibov ausente numa data**: o dia **não entra** no cálculo de beta (regra
  de pares completos, §8); `curvas.ibov` recebe `null` nessa data — a linha
  do gráfico **para de ser desenhada** ali (gap visual), em vez de congelar
  no último valor conhecido (que mascararia a ausência de dado).

### 12.3 Validação de dado suspeito — `Backtest.validarSerie(serie)`

Ativa por padrão (`config.validarDados` default `true`). Antes de calcular,
cada série de preços é checada:

```
{ ok: boolean, motivos: string[] }
```

Regras (sobre a série de closes/retornos diários):

| Motivo | Condição | Bloqueante? |
|---|---|---|
| `salto_suspeito` | \|retorno diário\| > 0,5 (50%) | sim |
| `gap_congelado` | 3+ closes idênticos consecutivos | não (só sinaliza) |
| `serie_quebrada` | queda > 80% seguida de recuperação > 80% em ≤ 10 pregões | sim |

Série reprovada em motivo bloqueante lança:
`Error('dado_suspeito:' + ticker + ':' + motivos.join(','))`.

### 12.4 Resultado de `Backtest.rodar(config)`

Todos os campos do formato antigo continuam existindo (compatibilidade); os
campos abaixo são a extensão do contrato v2.0.0:

```
resumo: {
  ...campos antigos...,
  retornoAnualizado: null quando diasUteis < 252 (UI mostra "retorno do
                     período" em vez de uma taxa anualizada — ver §2);
                     quando diasUteis >= 252, anualizado por calendário
                     usando diasCorridos (§2, ramo com diasCorridos),
  diasUteis: number,
  diasCorridos: number,
  observacoesPorAno: diasUteis / (diasCorridos / 365.2425),
  valorInicial: number,
  valorFinal: number,
  totalAportado: number,
  diagnostico: {
    diasUteis, diasCorridos, observacoesPorAno,
    cdiFaltante: boolean,       // houve carry-forward de CDI nessa rodada
    ibovFaltante: boolean,      // houve data sem Ibov nessa rodada
    ativoLimitante: string,     // ticker com a série mais curta
    primeiraData: string,
    ultimaData: string,
    primeiraDataPorAtivo: { ticker: string /* data */ },
    pesoInformado: number,      // soma dos pesos de entrada (composicaoAlvo)
    pesoUtilizado: number,      // soma dos pesos na composição final simulada
    motorVersion: '2.0.0',
    dataCorteDados: string      // menor "última data" entre as séries usadas
                                 // (ativos, CDI, Ibov) — define até onde o
                                 // backtest é realmente confiável
  }
},
composicao: { labels, pesos }        // pesos do ÚLTIMO dia da trajetória
                                       // efetivamente simulada (rebalanceada
                                       // ou drift — Metricas.pesosFinais)
composicaoAlvo: { labels, pesos }    // pesos de ENTRADA (config.pesos)
retornosCarteira: number[]
retornosPorAtivo: { ticker: number[] }
curvas: {
  ...,
  drawdown: number[]  // fração por data, <= 0 (Metricas.serieDrawdown)
  ibov: (number|null)[]  // null nas datas sem Ibov — linha não desenhada
}
```

**Caso de teste (integração):**

```
entrada: config com 2 ativos, 100 dias úteis de dados, rebalanceamento = null
saída esperada:
  - resumo.retornoAnualizado === null (diasUteis=100 < 252)
  - resumo.diagnostico.motorVersion === '2.0.0'
  - retornosCarteira construído via Metricas.rebalancear(..., Infinity),
    NÃO via Metricas.retornoCarteira
```

---

## 13. Fonte executável do contrato

`shared/js/motor/__tests__/metricas.test.js` e
`shared/js/motor/__tests__/backtest.test.js` codificam cada regra acima como
teste. O port React/TypeScript deve ter uma suíte equivalente (mesmos casos,
mesmas tolerâncias) rodando contra `lib/engine/metrics.ts` e
`lib/engine/backtest.ts` antes de qualquer PR de motor ser aceito como
"pronto". Nenhuma fórmula fora deste documento deve ser assumida — se o
port precisar de um comportamento não coberto aqui, ele deve ser adicionado
primeiro a este contrato (com fórmula, referência e caso de teste), depois
implementado.
