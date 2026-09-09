# Testes do motor (shared/js/motor)

Suíte de testes do motor único de cálculo (`metricas.js` + `backtest.js`),
usado tanto pela Academia quanto pela Alocação. Escrita contra o
**test runner nativo do Node** (`node:test` + `node:assert`) — **sem
package.json e sem dependências**.

## Como rodar

Da raiz do repositório:

```
node --test shared/js/motor/__tests__/*.test.js
```

ou, para deixar o Node descobrir os testes recursivamente pelo padrão de
nome `*.test.js` (funciona a partir de qualquer diretório ancestral):

```
node --test 'shared/js/motor/**/*.test.js'
```

> **Atenção:** `node --test shared/js/motor/` (passando o diretório direto,
> sem glob/wildcard) **não funciona** nesta versão do Node instalada no
> ambiente (v22.22.2) — falha com `Cannot find module .../shared/js/motor`
> em vez de recursar no diretório. Use sempre uma das duas formas acima
> (glob explícito com `*.test.js`, ou `node --test` sem argumento nenhum
> rodando da raiz do repo, que também funciona por descoberta automática).

Para rodar só um arquivo:

```
node --test shared/js/motor/__tests__/metricas.test.js
node --test shared/js/motor/__tests__/backtest.test.js
```

Para rodar só os testes cujo nome bate com um padrão:

```
node --test --test-name-pattern="sortino" shared/js/motor/__tests__/*.test.js
```

Não precisa `npm install` nem `package.json` — os arquivos usam só
`node:test`, `node:assert/strict`, `fs`, `path` e `vm`, todos nativos do
Node (>= 18; testado em v22.22.2).

## Estrutura

- `_carrega.js` — helper interno (não é um arquivo de teste). Lê
  `metricas.js` e `backtest.js` do disco e os executa dentro de um
  `vm.context` isolado, na mesma ordem que o HTML real carrega via
  `<script>` (metricas.js primeiro, já que `backtest.js` depende do global
  `Metricas` já existir). Cada chamada a `carregarMotor()` devolve uma
  instância nova e isolada — testes não vazam estado um pro outro.

  **Pegadinha de "realm" do `vm`:** arrays/objetos devolvidos por
  `Metricas`/`Backtest` pertencem ao realm do `vm.context`, não ao realm do
  arquivo de teste. `Array.isArray(...)` funciona normalmente, mas
  `assert.deepStrictEqual(arrayDoMotor, arrayLocal)` **falha** mesmo com
  conteúdo idêntico, porque os `Array.prototype` de cada realm são objetos
  diferentes. Nos testes, compare por `JSON.stringify(...)` ou elemento a
  elemento quando o valor comparado atravessa essa fronteira.

- `_fixtures.js` — geradores de dados sintéticos (não é um arquivo de
  teste): `gerarDiasUteis`, `gerarPrecos`, `gerarSerieTaxa`.

- `metricas.test.js` — testes de `Metricas.*` (funções puras de cálculo).

- `backtest.test.js` — testes de `Backtest.rodar(config)` (pipeline
  completo: alinhamento de datas, validação de dados, cálculo de retornos,
  diagnóstico, composição final).

## O que cada teste protege

### metricas.test.js

- **`MOTOR_VERSION === '2.0.0'`** — trava a versão do motor no contrato
  atual; sobe junto com qualquer mudança de contrato futura.
- **`retornoAnualizado` com `diasCorridos`** — garante que passar
  `diasCorridos` usa o expoente `365.2425/diasCorridos` (anualização por
  calendário) e que omitir `diasCorridos` preserva o comportamento antigo
  (`252/numDiasUteis`), para não quebrar quem ainda chama com 2 argumentos.
- **`drawdownMaximo`** — série fabricada com queda exata de −20% a partir de
  um pico conhecido; pega qualquer erro de sinal ou de fórmula de pico/vale.
- **`sharpe` com carteira == risk-free`** — excesso sempre zero, sharpe tem
  que dar exatamente 0 (não `NaN`, não `Infinity`).
- **`volatilidadeAnualizada`/`sharpe` com `diasUteisPorAno` customizado** —
  garante que o parâmetro realmente entra na raiz de anualização (não fica
  hard-coded em 252).
- **`rebalancear` com frequência `Infinity` (buy&hold)** — bate contra a
  fórmula analítica fechada `0,5·1,002^252 + 0,5·0,999^252 − 1`; é o teste
  mais importante para não deixar regredir o cálculo de "nunca rebalancear".
- **`rebalancear` 63 dias vs `Infinity`** — garante que a frequência de
  rebalanceamento realmente muda o resultado (detecta um `rebalancear` que
  ignora o parâmetro de frequência).
- **`sortino` com valor de referência conhecido** (52 dias negativos de
  −0,5%, 200 positivos de +0,1%, rf=0) — trava o denominador da downside
  deviation em `n` (todos os dias, não só os negativos) contra o valor
  −1,6641; é o teste que pega a regressão do "denominador errado" mencionada
  no contrato.
- **`sortino` sem dias negativos → `null`** e **`sortino` com <60
  observações → `null`** — travam os dois casos de borda do contrato; o
  mais crítico é nunca mais devolver o sentinela `99`.
- **`percentualDoCDI` com carteira/CDI não-positivos → `null`** — a UI trata
  esse caso mostrando diferença em p.p.; o motor não pode devolver um
  percentual sem sentido quando a base é ≤ 0.
- **`comeCotas` regime `'acoes'` → `aplicavel:false`** — ações não têm
  come-cotas; motor não pode inventar imposto para esse regime.
- **`comeCotas` regime `'rf_longo'`, 504 pregões (~2 anos) de retorno
  constante** — trava: (a) exatamente 4 eventos, um por último pregão de
  maio/novembro de cada ano presente nas datas; (b) `perdaPP` positivo; (c)
  `perdaPP` **menor** que uma referência calculada no próprio teste com a
  fórmula antiga "sem reset de base" (`valor -= (valor-1)*0,15` aplicada
  sempre sobre o ganho acumulado desde o início, não desde o último
  evento) — é o teste que garante que a base de cálculo do imposto é
  resetada a cada evento, como manda o contrato.
- **`comeCotas` com retornos negativos** — nenhum evento pode gerar imposto
  positivo quando a carteira está no prejuízo (só cobra quando `V > base`).

### backtest.test.js

- **CDI faltante em 5 datas** — verifica `resumo.diagnostico.cdiFaltante ===
  5` e, olhando a curva `curvas.cdi` dia a dia, que nenhuma das datas
  faltantes ficou com retorno zero (a curva não "achata"): a taxa usada foi
  a do carry-forward (última taxa conhecida), nunca 0.
- **Ativo começando 100 pregões depois** — verifica que
  `resumo.diagnostico.ativoLimitante` aponta o ativo certo, e que, com a
  janela reduzida (<252 dias úteis), `resumo.retornoAnualizado` vem `null`
  em vez de um número artificialmente inflado/errado.
- **Série com salto de +2000%** — `Backtest.rodar` tem que lançar
  `Error` cuja mensagem começa com `'dado_suspeito:'` (motivo
  `salto_suspeito`) em vez de silenciosamente aceitar um dado quebrado.
- **`config.validarDados: false`** — a mesma série suspeita acima NÃO deve
  lançar quando a validação é explicitamente desligada (a flag realmente
  desliga a checagem, não é cosmética).
- **300 pregões sem rebalanceamento → composição diverge do alvo** —
  com um ativo ganhador e um perdedor, o peso final (`composicao`) tem que
  se afastar do peso de entrada (`composicaoAlvo`), e na direção certa (o
  ativo ganhador pesando mais). Pega tanto um `Backtest` que "esquece" de
  aplicar o drift quanto um que reseta a composição para o alvo por engano.
- **Campos `retornosCarteira`, `retornosPorAtivo`, `curvas.drawdown`** —
  existência e forma básica (arrays do tamanho certo, drawdown sempre ≤ 0) e
  presença do `diagnostico.motorVersion`/`dataCorteDados`.
- **≥252 dias úteis → `retornoAnualizado` não é `null`** — contraponto do
  teste de janela curta: com dados suficientes, o motor tem que devolver um
  número anualizado por calendário, não `null`.

## Sobre o contrato

Estes testes foram escritos contra o **contrato** do motor v2.0.0 (definido
na tarefa que originou esta suíte), não contra o comportamento do código em
um commit específico. Isso é proposital: o motor pode estar em correção
enquanto esta suíte já existe, e o objetivo é que `node --test` vire o
critério objetivo de "terminou" — quando os 23 testes passarem, o motor
cumpre o contrato. Se um teste aqui parecer errado (valor numérico
implausível, campo com nome diferente do esperado), o primeiro passo é
conferir contra o contrato antes de mudar o teste para acomodar o código.

Onde o contrato não define a **forma exata** de um campo composto (ex.:
`composicao`/`composicaoAlvo` podem ser `{ticker: peso}` ou
`{labels:[], pesos:[]}`), o teste correspondente aceita ambas as formas em
vez de travar em uma — para não quebrar por uma escolha de formato que o
contrato não especificou.
