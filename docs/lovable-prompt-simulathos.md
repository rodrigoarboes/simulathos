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
  UNIQUE(ticker)
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
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_simulations_enrollment ON simulations(enrollment_id);
CREATE INDEX idx_simulations_slug ON simulations(simulator_slug);

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
│   │   ├── backtest.ts         -- motor de backtest (porta do JS atual)
│   │   ├── metrics.ts          -- Sharpe, Sortino, Ulcer, Beta, correlação, etc.
│   │   └── comecotas.ts        -- cálculo de come-cotas
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

O motor deve replicar exatamente a lógica do arquivo `academia/js/motor/backtest.js` do protótipo HTML. Métricas calculadas:

| Métrica | Fórmula |
|---------|---------|
| Retorno acumulado | Produto dos (1+r) - 1 |
| Retorno anualizado | (1+retAcum)^(252/dias) - 1 |
| Volatilidade | StdDev diária × √252 |
| Sharpe | (média excess return / stddev excess) × √252 |
| Sortino | (média excess / downside dev) × √252 |
| Ulcer Index | √(média dos DD² em %) |
| Max Drawdown | Maior queda peak-to-trough |
| Beta | Cov(carteira, ibov) / Var(ibov) |
| % do CDI | retorno carteira / retorno CDI |
| Correlação | Matriz N×N dos ativos |

Benchmarks no gráfico: CDI, Ibovespa, IPCA+5%.
Rebalanceamento: trimestral (63 dias úteis) por padrão.

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
    retorno_anualizado: number;
    sharpe: number;
    sortino: number;
    volatilidade: number;
    max_drawdown: number;
    pct_cdi: number;
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
4. **Motor de backtest** (TypeScript, port do JS)
5. **BacktestResults** (métricas + gráfico)
6. **Página Allocation** (junta tudo)
7. **Script de seed** (popular banco com dados do protótipo)
8. **Edge Functions** (launch-token, webhook, CVM/BCB sync)
9. **Demais simuladores** (propostas, aulas, aposentadoria)
