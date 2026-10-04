# Design System ativo — Saldo 4.0

Informação financeira primeiro. Verde profundo identifica a marca e ações principais. Cores semânticas acompanham texto ou ícone. Implementação ativa: `ui.js`, `views.js`, `flows.js`, `index.html`, `style.css`.

## Fundamentos

| Papel | Token / valor |
|---|---|
| Canvas / superfície / secundária | `--canvas #f5f6f3`, `--surface #fff`, `--surface-soft #edf2ec` |
| Texto / secundário / contextual | `--ink #20352d`, `--secondary #52645b`, `--muted #617169` |
| Marca / hover | `--brand #244d40`, `--brand-hover #173c30` |
| Realizado / previsto | Marca sólida / `--sage #6f875b` com listras |
| Receita / sucesso | `--success #236442`, `--success-bg #eaf4ed` |
| Erro / negativo | `--danger #a13730`, `--danger-bg #fbeeea` |
| Atenção | `--warning #785211`, `--warning-bg #fcf3df` |
| Informação / sem confirmação | `--info #315a7a`, `--info-bg #edf3f8` |
| Borda / campo | `--line #dfe5df`, `--input-line #849389` (3,22:1 em branco) |
| Gráfico sem confirmação | `--unconfirmed #897448` com pontos e legenda textual |
| Raio | 6 px controles, 10 px blocos, 14 px superfícies maiores |
| Sombra | Apenas sobreposições: `--shadow-overlay` |
| Espaçamento | 4/8/12/16/20/24/32/40/48/64 px; `--space-*` |

DM Sans em conteúdo/dados; Manrope em títulos/marca; fontes locais. Tokens tipográficos 12/13/14 para contexto/conteúdo, 16/18 para subtítulo, 20/22/24 para seções, 28 para página, 32/34/40 para números principais. Dinheiro usa algarismos tabulares; nenhuma abreviação ou reticência monetária. Pode quebrar linha mantendo o valor integral.

## Layout

- >=960 px: menu lateral de 232 px, conteúdo limitado/centralizado, filtros em linha e tabela.
- 640–959 px: navegação inferior rotulada, saldo principal em linha própria, módulos reorganizados.
- <=639 px: lista financeira própria, filtros recolhíveis, ordenação explícita, CTA com nome acessível, formulário em uma coluna e modal na borda inferior.
- <=359 px: seletor de tipo em duas colunas, preservando rótulos completos.
- Safe area em navegação/modal. Alvos principais de 44 px. Critério de QA: leitura, prioridade e operação, além de overflow.

## Componentes e contratos

| Componente | Contrato ativo |
|---|---|
| Button / icon button | `action`, `.button`, `.icon-button`; primary/secondary/danger/text. Ícone sozinho exige `aria-label`. Salvamento indica texto, disabled e `aria-busy`. |
| Input / textarea | `field`/`input`; label, ajuda próxima, required. Dinheiro `inputmode=decimal`, validado em centavos. Erro no modal, campo com `aria-invalid`/`aria-describedby` e foco. |
| Select / date picker | Nativos com label; categoria explícita; data rotulada pela finalidade; campos de cartão condicionais. |
| Card / panel | `.metric`, `.panel`, `.account-card`; agrupamento decisório. Caixa realizado em faixa com divisores; listas por linhas, sem card por texto. |
| Table / mobile list | `.transaction-table`/`.transaction-mobile`; `scope`, caption, `aria-sort`, sinais, dinheiro alinhado à direita; páginas 25/50. Busca mantém foco e cursor. |
| Dropdown | `details.row-menu`/`summary` rotulado; Escape/clique externo fecham; ações com texto e alvo de toque. |
| Badge | `badge`; neutral/success/warning/danger/info. Estado escrito: Pago, Recebido, A pagar, A receber, Atrasado, Compra registrada, Sem confirmação. |
| Alert | `.alert`: ícone, título, contexto e ação. Rede/sessão distintas de erro financeiro. |
| Modal / drawer | `modal`: dialog nativo, nome/descrição, foco útil, contenção nativa, Escape, proteção de alterações e retorno de foco. No celular recebe apresentação de drawer; mesmo motor. |
| Tooltip | `title` apenas suplementar; label/nome acessível independem de hover. Não esconder regra financeira essencial. |
| Skeleton | `.page-skeleton` no primeiro carregamento; autenticação com progresso/mensagem; `aria-busy`. |
| Empty state | `empty`; título específico, motivo/próximo passo. Diferencia período vazio, filtro sem resultado, primeiro histórico e valores ocultos. |
| Toast / undo | `toast`; 6 s informativo, 20 s com desfazer. Erro de formulário fica dentro dele. |
| Money / privacy | `ctx.cash`; BRL integral e tabular. Ocultar substitui conteúdo e retira gráficos com números. |
| Chart | Histórico com tabela textual; categorias com critério explícito, sólido/listras/pontos e investigação por clique. Percentuais pequenos usam “<1%”. |

## Estados e interação

Foco visível de 3 px. Ícones decorativos `aria-hidden`. Navegação `aria-current`, seletores `aria-pressed`, gráficos com equivalente textual. Managers de agenda/fatura refletem alterações feitas nos formulários filhos. Restauração descreve seu alcance em todos os dispositivos.

Transições de 150 ms apenas para feedback de controles. `prefers-reduced-motion` remove animações/transições. Sync periódico não redesenha a página sem mudança dos dados. Corrigir estilos no token/componente compartilhado, evitando um padrão diferente para a mesma função.

Não se afirma certificação de acessibilidade. Teclado, nomes, contraste e equivalentes textuais foram tratados; VoiceOver/TalkBack e aparelhos físicos exigem homologação complementar.
