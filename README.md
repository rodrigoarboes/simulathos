# Simulathos

Simuladores financeiros para assessoria de investimentos.

## Estrutura

```
simulathos/
├── shared/                    # Recursos compartilhados
│   ├── css/base.css           # Layout, componentes, tipografia
│   ├── js/utils.js            # Formatação, máscaras, wizard
│   └── themes/                # Temas por marca
│       ├── zanella.css        # Zanella Wealth (consultoria)
│       ├── vocebancario.css   # @vocebancario / Advisor PRO
│       └── cliente.css        # White-label para clientes
├── aposentadoria/             # Simulador de aposentadoria
│   ├── index.html
│   ├── css/planner.css
│   └── js/planner.js
└── README.md
```

## Como usar

Abra o `index.html` de qualquer simulador no navegador, ou sirva via HTTP:

```bash
cd aposentadoria && python3 -m http.server 8080
# Acesse: http://localhost:8080
```

### Trocar tema via URL

Adicione `?tema=` na URL para alternar entre marcas:

- `?tema=zanella` — Zanella Wealth (padrão)
- `?tema=vocebancario` — @vocebancario / Advisor PRO
- `?tema=cliente` — Versão white-label para clientes

Exemplo: `http://localhost:8080/?tema=vocebancario`

### Modo cliente

Adicione `?modo=cliente` para esconder campos avançados e exibir uma versão simplificada.

Exemplo: `http://localhost:8080/?tema=cliente&modo=cliente`

## Novo simulador

1. Crie uma pasta na raiz (ex: `reserva-emergencia/`)
2. Importe `shared/css/base.css`, um tema, e `shared/js/utils.js`
3. Use as classes `zw-*` e o objeto `Simulathos` do utils.js
