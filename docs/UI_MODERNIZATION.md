# Modernização da interface — Saldo

## Auditoria anterior às alterações

- Vinext/Vite, React 19 e Tailwind 4 disponíveis, mas o produto financeiro usa `app.js`, `views.js`, `flows.js` e módulos ES com renderização de HTML. `app/route.ts` entrega esse shell.
- Componentes shadcn já instalados em `components/ui`; estavam sem uso nas telas financeiras. Recharts, Radix e Lucide já eram dependências. Não reinstalados.
- CSS histórico em três camadas (`style.css`, `theme.css`, `ios.css`) gerava raios, sombras, contraste e controles inconsistentes. Documentação antiga descrevia outra paleta. Mantida identidade violeta e logo S solicitadas anteriormente; atualização consolidada em `premium.css`.
- Fluxos críticos: contas, faturas, transferências, confirmação de pagamentos, recorrências, parcelas, orçamento, metas, filtros, CSV, backup/restauração e conflitos. Preservados módulos de cálculo e escrita.
- Autenticação ChatGPT (`identity.js`, `/api/session`), ledger por usuário (`/api/ledger`), sincronização e cache offline preservados. Nenhuma leitura ou escrita de registros de produção foi necessária.
- Problemas identificados: controles menores que 44px; estilos de modal inconsistentes; efeitos de vidro e sombras redundantes; valores contando a partir de zero; controles de análise pouco consistentes. A seleção de mês da versão anterior foi preservada.

## Reutilização real e licenças

| Projeto | Código avaliado e utilizado | Adaptação |
| --- | --- | --- |
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Componentes existentes `Card`, `Button`, `Badge`, `Table`, `TableHeader`, `TableBody`, `ChartContainer` | Importados diretamente de `components/ui`; carteira, ações, tabela e gráfico. Tokens locais; tabela mantém conteúdo e atributos do renderizador atual. MIT em `licenses/ui.txt`. |
| [Tremor](https://github.com/tremorlabs/tremor/tree/ca4d588f47820ff3d514d37fa4ee08a4222dec11/src/components/BarList) | `BarList.tsx`, fonte copiada | Imports de utilitários adaptados; cores/tamanho aplicados pelo tema local. Ordenação e normalização originais mantidas. Apache-2.0 em `licenses/tremor.txt`. Budgets mantêm a representação anterior para não perder limites e alertas. |
| [Motion Primitives](https://github.com/ibelick/motion-primitives/blob/120f64f6ca60348e251f929e9c81f11ccbe45eda/components/core/animated-background.tsx) | `AnimatedBackground` | Reutilizado nas abas; inicialização sem efeito adicional, tipagem sem `any`, movimento reduzido e camadas corrigidos. MIT em `licenses/motion-primitives.txt`. |
| [React Bits](https://github.com/DavidHDev/react-bits/tree/4dc7b5b7772e1217c8fb8d2a7aa074302180e5b4) | Código e licença de `CountUp` avaliados | Não incluído. Contagem animada mostra montantes intermediários, sem benefício nesta aplicação. A licença consultada possui restrições além de uma licença MIT simples. |
| [21st.dev magic-mcp](https://github.com/21st-dev/magic-mcp) | README, disponibilidade e licença ISC avaliados | MCP não conectado nesta sessão. Nenhum componente obtido nem API inventada. |

shadcn upstream consultado: `8a3536678a528cc012b9e62484290e79d0be410f`. Os componentes utilizados são os já presentes no checkout, sem atualização desnecessária do registro.

## Arquitetura e preservação

`components/finance/entry.tsx` monta ilhas React e as desmonta antes de trocar a página. A carteira lê `accountBalance`/`invoice`, a distribuição lê `categoryTotals` e a comparação lê `moneyFlow`. Nenhuma fórmula foi reimplementada. Eventos `data-action` continuam no controlador existente. A tabela recebe HTML previamente escapado pelo renderizador atual, incluindo seleção, ordenação e menus.

`prepare-client.mjs` gera o bundle React e utilitários CSS; seu conteúdo participa da impressão digital do service worker. Os novos arquivos entram no cache offline. Apenas `motion` foi instalado, porque `AnimatedBackground` importa `motion/react`; React, Recharts, Lucide e shadcn já existiam.

Fluxos de edição e autenticação continuam em JavaScript existente. Não foi feita uma migração total para React, nem adicionada outra biblioteca de formulários ou dashboard. Navegação e modais continuam com a implementação existente, com tokens, foco e áreas de toque padronizados; não são apresentados como componentes shadcn migrados.

## Validação e limites

- Suite financeira, armazenamento, sincronização, identidade, gráficos e PWA: 94 testes aprovados.
- `npm run check` e `npm run lint`: aprovados.
- Prévia local isolada com dados de teste: seis telas × 320/402/768/1440px; sem overflow horizontal da página. Formulários de movimentação e conta abertos sem salvar; sem exceções JavaScript nessa verificação.
- Movimento reduzido, seleção de abas, gráfico e BarList verificados no Chrome emulado. Não equivale a testar Safari em iPhone físico.
- Privacidade evita séries numéricas nas ilhas de análise e mascara valores da carteira. Os cálculos continuam nos módulos financeiros originais.
- Leitura de código e verificação visual não equivalem a homologar operações bancárias reais. Não foram feitos pagamentos, exclusões, restaurações ou alterações no ledger de produção.
- Há custo adicional de JavaScript para React, Motion e Recharts, registrado na entrega. Componentes maiores não selecionados não foram instalados.
