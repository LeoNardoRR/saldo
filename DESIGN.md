# Saldo 5.0 — Interface e Engenharia de Design

Uso: consulta rápida de finanças no celular, frequentemente com uma mão, e revisão analítica em telas maiores. Clareza dos números e ação explícita precedem decoração.

Identidade Saldo 5.0: S geométrico, paleta Cobalt-Indigo (`#4F46E5` claro / `#818CF8` escuro), Mint Emerald (`#0D9488` / `#2DD4BF`), Coral Rose (`#E11D48` / `#FB7185`) e tipografia Manrope/DM Sans local. Tema claro com fundo alabastro neutro (`#F6F6F9`) e superfícies brancas elevadas por `--shadow-border` de 3 camadas; escuro com camadas carbono-grafite (`#0B0C10` / `#13141A`) e anel luminoso `1px oklch(1 0 0 / 0.08)`. Tokens autoritativos estão no início de `premium.css`.

Princípios de Design Engineering aplicados:
- **Raios concêntricos (`outerRadius = innerRadius + padding`)**: controles segmentados (`14px` externo = `10px` interno + `4px` padding; `12px` = `9px` + `3px`), atalhos (`18px` = `10px` + `8px`) e cartões aninhados.
- **Sombras como borda (`--shadow-border`)**: superfícies e cartões usam sombras transparentes em camadas em vez de bordas pesadas; bordas sólidas ficam restritas a divisores estruturais (`border-top`/`border-bottom`).
- **Alinhamento óptico**: botões com texto e ícone compensam `-2px` de padding no lado do ícone.
- **Tipografia e números**: `text-wrap: balance` em títulos, `text-wrap: pretty` em descrições/notas, `-webkit-font-smoothing: antialiased` na raiz e `font-variant-numeric: tabular-nums` sem truncamento (`...`) em todos os montantes.
- **Microinterações e Mobile Native**: resposta imediata no clique (`:active` com `transform: scale(0.97)` em `100ms ease-out`), estados `:hover` isolados em `@media (hover: hover) and (pointer: fine)`, cross-fade contextual no botão de tema (`scale(0.25 -> 1)` + `blur(4px -> 0)`), popovers com `transform-origin` ancorado ao gatilho e `font-size: 16px` nos campos para evitar auto-zoom no iOS.
