# Dados de Mercado — Plano Gratuito (pesquisa)

> Pesquisa de fontes de dados para alimentar os simuladores do Simulathos
> (foco no AIDA Allocation). Objetivo: **custo R$ 0/mês sustentável**, com delay
> aceitável (EOD / fim do dia anterior). Documento de referência — não é
> aconselhamento jurídico.

## TL;DR — a stack gratuita

| Necessidade | Carga inicial (1×) | Feed diário (EOD) | Grátis p/ sempre? | Cartão? |
|---|---|---|---|---|
| Indexadores (CDI, Selic, IPCA, dólar) | — | Banco Central (SGS) | ✅ oficial | Não · sem chave |
| ETFs B3 (BOVA11, IVVB11…) | COTAHIST B3 / repo GitHub | Yahoo Finance `.SA` ou brapi free | ✅ | Não |
| ETFs US (VOO, GLD, TLT) | Stooq CSV (30 anos) / Yahoo | Yahoo Finance / Stooq | ✅ | Não |
| Câmbio USD/BRL | — | AwesomeAPI | ✅ | Não |
| Benchmark de fundos | — | CVM dados abertos | ✅ oficial | Não |

**Princípio-chave:** o nº de alunos NÃO afeta o custo. O robô diário puxa os
dados 1× → grava no banco/arquivo → alunos leem do cache. ~30 ETFs × 1×/dia ≈
900 chamadas/mês (irrelevante para qualquer limite).

## Fontes oficiais (grátis para sempre, uso livre, licença aberta)

### Banco Central — SGS
- `https://api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados?formato=json`
- CDI diário = **12** · Selic over = **11** · Selic meta = **432** · IPCA = **433** · Dólar PTAX venda = **1**
- Limite: 10 anos por requisição. Desde 03/2025 filtros de data obrigatórios.

### Tesouro Transparente
- CSV diário único com PU e taxas de todos os títulos (Selic/IPCA+/Prefixado). Licença ODbL.

### CVM — Informe Diário de Fundos
- `https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/inf_diario_fi_AAAAMM.zip`
- Colunas: `CNPJ_FUNDO`, `DT_COMPTC`, `VL_QUOTA`, `VL_PATRIM_LIQ`, `NR_COTST`…
- Permite reconstruir retorno diário de qualquer fundo aberto → benchmark.

## Preços de ETFs — opções gratuitas

### Yahoo Finance (`.SA`) — o que o mercado usa na prática
- Cobre ETFs B3 e offshore, histórico longo, **preço ajustado + dividendos**.
- Sem chave, sem limite oficial.
- ⚠️ Endpoint não oficial; ToS proíbe redistribuição/uso comercial (zona cinza
  para ferramenta educacional — risco baixo na prática, sem enforcement contra
  uso educacional pequeno; pode quebrar sem aviso).

### brapi.dev (free)
- 15.000 req/mês, 1 ativo/req, histórico 3 meses, **sem dividendos**, atualização 30 min.
- Token free (sem cartão). Juridicamente limpo (assume a distribuição da B3).
- Limite de 3 meses é irrelevante no modelo acumulativo (você acumula no seu banco).

### Stooq
- ✅ US ETFs (30+ anos), ❌ não cobre B3. Agora exige apikey (captcha) + limite diário.

### COTAHIST B3 (oficial) — bootstrap
- Histórico de todos os ativos B3 desde 1986 (inclui ETFs/FIIs/BDRs), **não ajustado**.
- Download com captcha → usar 1× para carga inicial. Repos GitHub já processam
  (`cvscarlos/b3-api-dados-historicos`, `ropensci/rb3`).

## Descartados
- **Google Finance / GOOGLEFINANCE**: não cobre B3 de forma confiável (`#N/A`
  desde 2018) **e** ToS proíbe armazenar/redistribuir os dados. ❌
- **B3 UP2DATA**: pago, só PJ, contratual. ❌ para uso gratuito.
- **Vortx**: APIs são B2B (só clientes). Portal público só tem PU de CRI/CRA/deb.
  via download manual. Não serve como feed. ❌

## Métricas viáveis só com EOD (+ indexadores)

Triviais: volatilidade anualizada (×√252), correlação/matriz, beta vs Ibov, % do CDI.
Fáceis: drawdown máximo, Sharpe (risk-free = CDI), retorno vs benchmark.
Com cuidado: backtest/retorno acumulado e Markowitz exigem **retorno total**
(dividendos reinvestidos / preço ajustado). Convenção BR: **252 dias úteis**.

**Pegadinha única séria:** dividendos/proventos. Preço não ajustado subestima o
backtest. Volatilidade/correlação/beta não são afetados.

## Arquitetura recomendada

```
[Cron diário pós-fechamento] → puxa EOD → grava no Postgres (Supabase) / arquivo
                                              ↓
                       [Front] lê do cache (nunca da API externa)
```
- Supabase tem cron nativo (`pg_cron` + `pg_net` → Edge Function).
- Free tier: 500 MB DB, 500k invocações/mês; pausa após 7 dias inativo (cron diário mantém vivo).
- NÃO chamar API do front: expõe chave, rate limit compartilhado, CORS.

## Quando pagar (degrau futuro ~R$ 20/mês)
- EODHD All-World EOD ($19,99/mês): B3 + US + UCITS, ajustado + dividendos, 1 fonte.
- ou brapi Pro (R$ 83/mês): B3 com 16 anos de histórico + dividendos, uso comercial.

## Disclaimer obrigatório (CVM)
> "Ferramenta de uso exclusivamente educacional. Gera relatórios ilustrativos que
> podem conter erros. Não constitui recomendação, oferta ou consultoria de
> investimento. Dados com defasagem; rentabilidade passada não garante resultados
> futuros. Fontes e datas indicadas em cada série."
