# Prompt para Lovable — Projeto Simulathos

> Cole este prompt inteiro ao criar o projeto no Lovable.
> Ele cria a fundação completa: schema, auth, componentes, motor.
> Depois o dev (Claude Code) entra no repo e refina.

---

## O que é o Simulathos

Plataforma de **simuladores financeiros as-a-service** para educação e treinamento de advisors de investimento. Serve ferramentas de simulação para plataformas clientes (ex: Advisor PRO) via iframe + webhook.

**Stack:** React + Vite + TypeScript + Tailwind CSS + Supabase (banco + auth + edge functions + cron jobs)

**Marca:** Academia do Assessor / VocêBancário
- Cores: azul `#0088cc`, laranja `#eb8105`, vermelho `#a12026`
- Fontes: Inter (body), JetBrains Mono (dados/tickers)
- Visual: dark mode por padrão, profissional, clean

---

## Schema do Supabase (criar automaticamente via migrations)

### Tabelas principais

```sql
-- Catálogo de ativos (ETFs, ações, FIIs, fundos, offshore)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL,
  name TEXT NOT NULL,
  asset_type TEXT NOT NULL CHECK (asset_type IN ('etf_br','stock_br','fii','fiagro','bdr','etf_us','etf_ucits','fund_br','index','crypto')),
  asset_class TEXT NOT NULL, -- 'RF Pós-Fixado', 'Ações BR', 'Macro', 'Crédito HG', etc.
  custody TEXT NOT NULL CHECK (custody IN ('B3','US','UCITS','CVM')),
  manager TEXT, -- 'BlackRock', 'Vanguard', 'JGP', etc.
  benchmark TEXT, -- 'S&P 500', 'CDI', 'IMA-B 5+', etc.
  expense_ratio TEXT, -- '0,25%'
  cnpj TEXT, -- para fundos CVM
  equivalents TEXT[], -- tickers equivalentes cross-market
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  first_date DATE,     -- primeira data com preço em price_series
  last_date DATE,      -- última data com preço em price_series
  points INT,          -- contagem de pontos em price_series (cache, não fonte)
  quality JSONB DEFAULT '{}', -- ex.: { gaps: number, motivos: string[] } de Backtest.validarSerie
  UNIQUE(ticker)
);

-- Frescor dos dados por fonte (CVM, BCB, etc.) — para diagnostico.dataCorteDados
-- e para a UI avisar quando os dados estão desatualizados.
CREATE TABLE data_freshness (
  source TEXT PRIMARY KEY,       -- 'cvm', 'bcb_cdi', 'bcb_ipca', 'ibov'
  last_sync_at TIMESTAMPTZ,      -- quando o cron rodou por último
  last_data_date DATE            -- data do dado mais recente efetivamente gravado
);

-- Séries de preços diários
CREATE TABLE price_series (
  id BIGSERIAL PRIMARY KEY,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  close NUMERIC(18,6) NOT NULL,
  volume BIGINT,
  UNIQUE(asset_id, date)
);
CREATE INDEX idx_price_series_asset_date ON price_series(asset_id, date);

-- Indicadores macro (CDI, IPCA, Selic)
CREATE TABLE macro_indicators (
  id BIGSERIAL PRIMARY KEY,
  indicator TEXT NOT NULL CHECK (indicator IN ('cdi','ipca','selic','igpm')),
  date DATE NOT NULL,
  value NUMERIC(18,10) NOT NULL,
  UNIQUE(indicator, date)
);

-- Registro de simuladores disponíveis
CREATE TABLE simulators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE, -- 'aida-allocation', 'proposal-generator', etc.
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT, -- emoji ou URL
  is_active BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Resultados de simulações (histórico técnico)
CREATE TABLE simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulator_slug TEXT NOT NULL REFERENCES simulators(slug),
  external_user_id TEXT, -- user_id do sistema cliente (Advisor PRO)
  enrollment_id TEXT, -- enrollment_id do sistema cliente
  input_data JSONB NOT NULL, -- { pesos, aporte, rebalanceamento, dataInicio, dataFim }
  result_data JSONB NOT NULL, -- { retornoAcumulado, sharpe, sortino, ulcer, curvas... }
  score NUMERIC(5,2), -- nota calculada (0-100)
  status TEXT DEFAULT 'completed',
  engine_version TEXT,   -- Metricas.MOTOR_VERSION que gerou result_data, ex '2.0.0'
  diagnostics JSONB,     -- resumo.diagnostico do motor (ver docs/MOTOR-CONTRATO.md §12.4)
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_simulations_enrollment ON simulations(enrollment_id);
CREATE INDEX idx_simulations_slug ON simulations(simulator_slug);

-- Casos de treinamento (missões com gabarito) para os simuladores de avaliação
CREATE TABLE cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  briefing JSONB NOT NULL,   -- enunciado, perfil do cliente, restrições
  gabarito JSONB NOT NULL,   -- [{ ticker, alvo, min, max, porque }, ...]
  missao TEXT,               -- objetivo textual da missão
  alavanca TEXT,             -- dimensão que o caso quer treinar (ex. 'renda_fixa_duration')
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Versões de rubrica de avaliação (dimensões e pesos usados para pontuar attempts)
CREATE TABLE rubrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  versao TEXT NOT NULL,
  dimensoes JSONB NOT NULL,  -- [{ nome, peso, formula }, ...]
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(versao)
);

-- Tentativas de resolução de um case por um aluno/enrollment
CREATE TABLE attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  enrollment_id TEXT NOT NULL,
  carteira JSONB NOT NULL,        -- pesos submetidos pelo aluno
  score_por_dimensao JSONB,       -- { dimensao: nota } conforme rubrics.dimensoes
  erros_nomeados JSONB,           -- [{ ticker, tipo_erro, explicacao }, ...]
  tentativa_n INT NOT NULL DEFAULT 1,
  rubric_version TEXT REFERENCES rubrics(versao),
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_attempts_case ON attempts(case_id);
CREATE INDEX idx_attempts_enrollment ON attempts(enrollment_id);

-- Estatísticas agregadas de turma por case (para comparação "você vs. a turma")
CREATE TABLE cohort_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  cohort_id TEXT NOT NULL,
  mediana NUMERIC(5,2),
  percentis JSONB,   -- { p25, p50, p75, p90, ... }
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(case_id, cohort_id)
);

-- API keys para clientes (Advisor PRO, outros)
CREATE TABLE api_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- 'Advisor PRO'
  api_key TEXT NOT NULL UNIQUE,
  hmac_secret TEXT NOT NULL, -- para assinar webhooks
  launch_token_secret TEXT NOT NULL, -- para validar JWTs de launch
  webhook_url TEXT, -- URL para enviar resultados
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log de eventos (lifecycle tracking)
CREATE TABLE events (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL, -- 'simulator_started', 'backtest_completed', 'pitch_generated', 'simulation_submitted'
  simulator_slug TEXT,
  external_user_id TEXT,
  enrollment_id TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Seeds (dados iniciais)

```sql
-- Simuladores disponíveis
INSERT INTO simulators (slug, name, icon, description) VALUES
  ('aida-allocation', 'AIDA Allocation', '📊', 'Simulador de macroalocação com ETFs, ações, FIIs, fundos e offshore. Backtest com dados reais.'),
  ('proposal-generator', 'Gerador de Propostas', '📝', 'Proposta comercial SPIN com diagnóstico personalizado e exportação PDF.'),
  ('lesson-planner', 'Planejador de Aulas', '🎯', 'Mapa mental interativo para estruturar aulas e apresentações estilo Prezi.'),
  ('retirement-planner', 'Simulador Aposentadoria', '🏖️', 'Planejamento financeiro de longo prazo para independência financeira.');

-- API client para Advisor PRO
INSERT INTO api_clients (name, api_key, hmac_secret, launch_token_secret) VALUES
  ('Advisor PRO', 'sk_advisorpro_' || gen_random_uuid(), encode(gen_random_bytes(32), 'hex'), encode(gen_random_bytes(32), 'hex'));
```

---

## Edge Functions do Supabase

### 1. `launch-token-validate`
Valida o JWT (HS256) enviado pelo Advisor PRO ao abrir o iframe.
- Input: `Authorization: Bearer <launch-token>`
- Validação: HS256 com `api_clients.launch_token_secret`, TTL 5 min
- Retorna: `{ valid: true, enrollment_id, access_tier, display_name, source_content_item_id }`

### 2. `simulation-submit`
Recebe resultado de simulação e envia webhook pro cliente.
- Input: `{ simulator_slug, external_user_id, enrollment_id, input_data, result_data, score }`
- Grava em `simulations`
- Envia POST pro `api_clients.webhook_url` com body assinado (HMAC-SHA256 em `x-simulathos-signature`)
- Payload do webhook: `{ external_user_id, enrollment_id, source_content_item_id, simulator_slug, score, calculated_metrics, submission_data, finished_at }`
- `calculated_metrics.engine_version` e `calculated_metrics.diagnostics` vêm de `simulations.engine_version`/`simulations.diagnostics`, que por sua vez vêm de `resumo.diagnostico` do motor (docs/MOTOR-CONTRATO.md §12.4) — nunca inventados pela edge function.

### 3. `cvm-daily-sync` (Cron: todo dia útil às 6h BRT)
- Baixa `https://dados.cvm.gov.br/dados/FI/DOC/INF_DIARIO/DADOS/inf_diario_fi_YYYYMM.zip`
- Extrai CSV, filtra CNPJs cadastrados em `assets` (onde `asset_type = 'fund_br'`)
- Upsert em `price_series`

### 4. `bcb-daily-sync` (Cron: todo dia útil às 6h BRT)
- CDI: `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=DD/MM/YYYY&dataFinal=DD/MM/YYYY`
- IPCA: série 433
- Upsert em `macro_indicators`

---

## Estrutura de Componentes React

```
src/
├── components/
│   ├── layout/
│   │   ├── Header.tsx          -- logo, nav, dark mode toggle
│   │   ├── SimulatorShell.tsx  -- wrapper que valida launch-token e renderiza o simulador
│   │   └── Footer.tsx
│   │
│   ├── allocation/             -- AIDA Allocation (simulador principal)
│   │   ├── PortfolioBuilder.tsx  -- autocomplete + pills de categoria + linhas de alocação
│   │   ├── AssetAutocomplete.tsx -- input com busca, agrupamento por classe, fichas ℹ️
│   │   ├── CategoryPills.tsx     -- Renda Fixa, Ações BR, FIIs, Dividendos, Internacional, BDRs, Cripto, Offshore, UCITS, Fundos
│   │   ├── BacktestResults.tsx   -- métricas (Sharpe, Sortino, Ulcer, %CDI, Beta, DD), gráfico, come-cotas, IPCA toggle
│   │   ├── AssetInfoCard.tsx     -- modal com gestora, taxa, benchmark, equivalentes, bandeira
│   │   ├── BrowseList.tsx        -- modal com todos os ativos organizados
│   │   └── PitchGenerator.tsx    -- gerador de pitch AIDA/PASA
│   │
│   ├── proposal/               -- Gerador de Propostas
│   │   ├── SpinWizard.tsx        -- wizard 5 etapas (prospect, SPIN, produto, personalização, preview)
│   │   ├── ProposalPreview.tsx   -- preview da proposta (tema claro/escuro)
│   │   └── SlidePresentation.tsx -- modo apresentação fullscreen
│   │
│   ├── shared/
│   │   ├── Chart.tsx             -- wrapper Chart.js/Recharts
│   │   └── MetricCard.tsx        -- card de métrica reutilizável
│   │
│   └── ui/                     -- shadcn/ui components
│
├── lib/
│   ├── engine/
│   │   ├── backtest.ts         -- motor de backtest (implementa docs/MOTOR-CONTRATO.md, não "a lógica do protótipo")
│   │   ├── metrics.ts          -- Sharpe, Sortino, Ulcer, Beta, correlação, etc. — fórmulas em docs/MOTOR-CONTRATO.md
│   │   └── comecotas.ts        -- cálculo de come-cotas (docs/MOTOR-CONTRATO.md §11)
│   │
│   ├── auth/
│   │   └── launchToken.ts      -- validação de launch-token JWT
│   │
│   ├── api/
│   │   ├── assets.ts           -- queries Supabase para assets + price_series
│   │   ├── simulations.ts      -- CRUD de simulations
│   │   └── webhook.ts          -- envio de resultado pro cliente
│   │
│   └── utils/
│       ├── formatters.ts       -- formatBRL, formatPercent, etc.
│       └── synonyms.ts         -- mapa de sinônimos para busca (EUA→S&P, ouro→GLD, etc.)
│
├── hooks/
│   ├── useAssetSearch.ts       -- busca com debounce + sinônimos + categoria
│   ├── useBacktest.ts          -- roda backtest e retorna resultado
│   └── useLaunchToken.ts       -- decodifica e valida token do iframe
│
├── pages/
│   ├── Index.tsx               -- landing com cards dos simuladores
│   ├── Allocation.tsx          -- AIDA Allocation (standalone ou iframe)
│   ├── Proposal.tsx            -- Gerador de Propostas
│   ├── LessonPlanner.tsx       -- Planejador de Aulas
│   └── Retirement.tsx          -- Simulador Aposentadoria
│
└── data/
    └── etf-info.ts             -- metadados dos ~100 ETFs com ficha (gestora, taxa, benchmark)
```

---

## Motor de Backtest (especificação)

O motor **não** deve replicar "a lógica" de um arquivo de protótipo — deve
replicar as **fórmulas** de **`docs/MOTOR-CONTRATO.md`**. Esse documento é o
contrato canônico: para cada métrica ele define a fórmula completa (com
denominador, alinhamento por data, tratamento de dado ausente e mínimo de
observações), a referência bibliográfica (Sharpe 1994; Sortino & van der Meer
1991; Martin & McCann para o Ulcer Index; Morningstar Methodology; GIPS 2020
5.A.4 para a proibição de anualizar períodos < 12 meses) e um caso de teste
com entrada e saída esperada.

A suíte `shared/js/motor/__tests__/` (`metricas.test.js` e `backtest.test.js`)
é o contrato **executável** — cada regra do MOTOR-CONTRATO.md vira um teste
lá. O port TypeScript (`src/lib/engine/metrics.ts` e `src/lib/engine/backtest.ts`)
precisa de uma suíte equivalente, com os mesmos casos e tolerâncias, rodando
verde antes de qualquer PR do motor ser aceito como pronto. **Não deduza
fórmula nenhuma a partir do protótipo HTML ou por analogia com "o que a
maioria dos backtests faz"** — se um comportamento não está no
MOTOR-CONTRATO.md, ele precisa ser adicionado lá primeiro (fórmula +
referência + caso de teste) antes de ser implementado.

Pontos do contrato que mais frequentemente saem errados num port ingênuo
(ver MOTOR-CONTRATO.md para o detalhe completo de cada um):

- **Sortino nunca retorna `99`** como sentinela de "não calculável" — retorna
  `null` (amostra < 60 dias, ou nenhum dia abaixo do MAR), e a UI mostra "—".
- **Retorno anualizado é `null`** quando a amostra tem menos de 252 dias
  úteis (GIPS 5.A.4) — a UI mostra "retorno do período", não uma taxa
  anualizada inventada por extrapolação de poucos dias.
- **Rebalanceamento**: `config.rebalanceamento` igual a `0`/`null`/`Infinity`
  significa **nunca rebalancear** (drift real de buy & hold via
  `Metricas.rebalancear(retornos, pesos, Infinity)`), não "rebalanceamento
  diário implícito" (`Metricas.retornoCarteira`, que o backtest não usa mais).
- **CDI ausente** numa data → carry-forward da última taxa conhecida (nunca
  vira `0`). **Ibov ausente** → o dia não entra no cálculo de beta (só pares
  completos) e `curvas.ibov` recebe `null` nessa data (a linha do gráfico
  para, não congela).
- **Validação de dado suspeito** (`config.validarDados`, default `true`):
  salto diário > 50%, 3+ closes idênticos consecutivos, ou queda/recuperação
  > 80% em ≤ 10 pregões — série reprovada em motivo bloqueante lança erro em
  vez de entrar silenciosamente no cálculo.
- **`resumo.diagnostico`** (motorVersion, diasUteis, diasCorridos,
  observacoesPorAno, cdiFaltante, ibovFaltante, ativoLimitante,
  dataCorteDados, pesoInformado vs. pesoUtilizado) precisa ser propagado até
  a UI e até `calculated_metrics` do webhook — é o que permite ao advisor
  (ou ao instrutor revisando uma tentativa) saber se o número que está vendo
  é confiável.

Benchmarks no gráfico: CDI, Ibovespa, IPCA+5%.
Rebalanceamento: sem valor informado, o padrão é **nunca rebalancear**
(drift/buy & hold) — ver MOTOR-CONTRATO.md §12.1. Se o produto quiser um
padrão trimestral (63 dias úteis) na UI, isso é uma escolha de
`config.rebalanceamento` passada explicitamente pelo componente, não um
comportamento embutido no motor.

---

## Dados iniciais para popular

O protótipo HTML atual (`academia/data/dados.js`, 23MB) contém:
- 326 ativos BR (ETFs, ações, FIIs, FIAgros, BDRs, cripto)
- 318 ativos offshore (US + UCITS)
- 25 fundos abertos (CVM)
- CDI diário (2020-2026)
- IPCA mensal (2020-2026)
- IBOV diário (2021-2026)

Criar um script de seed (`scripts/seed-assets.ts`) que:
1. Lê o `dados.js` do protótipo
2. Insere cada ativo em `assets`
3. Insere cada data point em `price_series`
4. Insere CDI/IPCA em `macro_indicators`

---

## Contrato de integração com Advisor PRO

### Launch Token (entrada)
```typescript
interface LaunchTokenPayload {
  external_user_id: string;     // user_id do Advisor PRO
  enrollment_id: string;        // matrícula do aluno
  access_tier: 'fea' | 'ibankers' | 'map';
  program_label: string;        // 'MAP® Advisor PRO'
  cohort_id?: string;
  display_name: string;         // nome do aluno
  source_content_item_id?: string; // missão/exercício de origem
  iat: number;
  exp: number;                  // max 5 min
}
```

### Webhook de resultado (saída)
```typescript
interface SimulationWebhook {
  external_user_id: string;
  enrollment_id: string;
  source_content_item_id?: string;
  simulator_slug: string;
  score: number;                // 0-100
  calculated_metrics: {
    retorno_acumulado: number;
    retorno_anualizado: number | null;   // null quando diasUteis < 252 — ver docs/MOTOR-CONTRATO.md §2
    sharpe: number;
    sortino: number | null;              // null, nunca 99 — ver docs/MOTOR-CONTRATO.md §5
    volatilidade: number;
    max_drawdown: number;
    pct_cdi: number | null;              // null quando carteira ou CDI <= 0 — ver §9
    engine_version: string;              // Metricas.MOTOR_VERSION, ex '2.0.0'
    diagnostics: object;                 // resumo.diagnostico do motor — ver §12.4
  };
  submission_data: object;      // input completo (pesos, datas, etc.)
  media_url?: string;           // screenshot/PDF da simulação
  status: 'completed' | 'partial';
  finished_at: string;          // ISO 8601
  submission_uuid: string;      // chave idempotente
}
```

Headers do webhook:
- `x-simulathos-signature`: HMAC-SHA256 do body com `api_clients.hmac_secret`
- `x-api-key`: `api_clients.api_key`
- `Content-Type`: `application/json`

### iframe postMessage
```javascript
// Simulathos → Advisor PRO (apenas sinalização, sem dados sensíveis)
window.parent.postMessage({ type: 'simulathos:done', simulator_slug: 'aida-allocation' }, '*');
window.parent.postMessage({ type: 'simulathos:started', simulator_slug: 'aida-allocation' }, '*');
```

---

## Referência visual

O protótipo HTML atual está em:
`https://rodrigoarboes.github.io/simulathos/academia/index.html`

Usar como referência para:
- Layout do autocomplete com categorias
- Estilo dos cards de métricas
- Gráfico de evolução patrimonial
- Cards de info do ETF (gestora, taxa, benchmark, equivalentes)
- Dark mode como padrão

---

## Prioridades de implementação

1. **Schema do Supabase** (tabelas, indexes, seeds)
2. **Componente AssetAutocomplete** (busca no banco com debounce)
3. **PortfolioBuilder** (montar carteira com %)
4. **Motor de backtest** (TypeScript, implementa docs/MOTOR-CONTRATO.md, com suíte de testes equivalente à `shared/js/motor/__tests__/`)
5. **BacktestResults** (métricas + gráfico)
6. **Página Allocation** (junta tudo)
7. **Script de seed** (popular banco com dados do protótipo)
8. **Edge Functions** (launch-token, webhook, CVM/BCB sync)
9. **Demais simuladores** (propostas, aulas, aposentadoria)
