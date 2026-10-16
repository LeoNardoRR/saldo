# Design system — Saldo 5

Informação financeira primeiro. Papel quente, **pinho profundo** como marca, **argila** como contraponto para saídas de dinheiro. Superfícies planas com borda fina de 1 px e elevação discreta; números grandes e tabulares; movimento curto e funcional.

Implementação: `style.css` (estrutura e responsividade herdadas), `theme.css` (tokens e componentes atuais, carregado depois), `charts.js` (gráficos), `fx.js` (movimento, tema, tooltip), `views.js`/`flows.js`/`ui.js` (marcação).

## Marca

Símbolo aprovado: **S geométrico**, com duas formas opostas, terminais horizontais e respiro central. `assets/logo.svg` é a marca vetorial; a interface usa sua silhueta com a cor de marca do tema. O nome continua em Manrope.

`assets/icons/app-icon.svg` é a matriz de 512 px para os PNGs de 192/512 px, a versão maskable de 512 px e o apple-touch-icon de 180 px. Fundo pinho `#103e33`, símbolo menta `#a9ebc9`, sem cantos arredondados no arquivo: o sistema operacional aplica o recorte. A marca fica centralizada dentro da área segura do ícone.

## Tokens

| Grupo | Claro | Escuro |
|---|---|---|
| Canvas / superfície / suave | `#f4f2ed` / `#fff` / `#efede6` | `#0b100f` / `#121918` / `#1c2724` (camadas, sem preto absoluto) |
| Texto / secundário / discreto | `#11181a` / `#4a5358` / `#5f6a6f` | `#e8eeeb` / `#a8b4af` / `#8a9a94` |
| Marca | pinho `#0f3b31`, tinta `#e3eee8` | menta `#8be0bc`, tinta `#16322a` |
| Entrada / saída | pinho `#0f3b31` / argila `#d4693f` | menta `#6fd5ae` / coral `#ec8b63` |
| Séries de gráfico `--c1…--c6` | pinho, jade, âmbar, argila, ameixa, pedra | versões claras equivalentes |
| Borda / borda forte / campo | `#e8e4db` / `#d3cec1` / `#8f8a7f` (3,3 : 1) | `#243030` / `#35443f` / `#6f7f79` |
| Semântica | sucesso `#1d6a44`, erro `#a5352e`, aviso `#76500f`, info `#2f5879` (fundos translúcidos) | tons claros equivalentes |
| Raios | `--r-sm 8`, `--r-md 12`, `--r-lg 16`, `--r-xl 24` | — |
| Elevação | `--elev-1` (cartões), `--elev-2` (hover/sobrepostos leves), `--shadow-overlay` (modais) | sombra mais profunda |
| Movimento | `--dur-1 150ms`, `--dur-2 220ms`, `--dur-3 300ms`, `--ease cubic-bezier(.2,.8,.2,1)` | — |

Tipografia: Manrope em títulos, marca e números; DM Sans em conteúdo (fontes locais). Valores principais 40–60 px (`.hero-amount`), indicadores 21–28 px, títulos de seção 18 px, corpo 14 px, apoio 12–13 px. Dinheiro com algarismos tabulares. O padrão é não quebrar, com exceções responsivas para valores longos em espaços estreitos.

Alvos de contraste: texto de corpo 4,5 : 1; texto grande, marcas gráficas e bordas de campo 3 : 1. A inspeção visual e os dispositivos de teste devem acompanhar a validação dos tokens.

## Layout

- **≥ 1280 px**: sidebar de 256 px, conteúdo até 1640 px; **≥ 1980 px** o conteúdo é centralizado ao lado do menu.
- **960–1279 px**: sidebar de 232 px.
- **Dashboard** (`.dash`): em ≥ 1100 px, grade de 12 colunas: saldo (7) + indicadores 2×2 (5); ações rápidas (12); evolução (7) + categorias (5); atenção (6) + últimos registros (6). Abaixo disso, uma coluna.
- **≤ 959 px**: sem sidebar; barra inferior até a borda da tela com botão central de ação (`.fab`) que abre a folha "Novo registro"; "Mais" agrupa Orçamento e metas, Recorrências, Configurações e perfil.
- **≤ 639 px**: modais viram **folhas** ancoradas embaixo (alça, raio superior de 26 px, área segura); ações rápidas em duas colunas com ícone ao lado do texto; rosca empilhada.
- **≤ 359 px**: indicadores mantêm duas colunas; formulários e resumos de fatura se empilham quando necessário.
- Alvos de toque de 44 px em telas pequenas ou de toque; mínimo de 24 px em qualquer caso.

## Componentes

| Componente | Contrato |
|---|---|
| Navegação | Grupos "Visão" e "Planejamento", ícone + rótulo, ativo com fundo de tinta e marcador à esquerda, `aria-current`. Atalho **N** abre nova movimentação. |
| Saldo (`.hero`) | Bloco de marca com saldo disponível, contas (chips que filtram), e evolução do saldo dia a dia no mês (série real de `available()`). |
| Indicador (`.kpi`) | Ícone, rótulo, valor, nota e variação (`.delta`) contra o mesmo corte do mês anterior, só quando há base de comparação; texto alternativo completo para leitores de tela. |
| Ação rápida (`.quick`) | `data-action="new-entry" data-type=…` ou agenda. |
| Gráfico de evolução | Barras recebido × pago em HTML/CSS, eixo em reais inteiros, grade, tooltip (ponteiro e foco), colunas são botões que abrem o mês, tabela textual equivalente. |
| Rosca | SVG com `pathLength=100`; até cinco categorias + "Outras"; legenda clicável que filtra a lista; total no centro. |
| Botão | `primary` (marca), `secondary`, `danger`, `text-button`, `icon-button`; hover, active (`scale .97`), foco de 2 px, desabilitado e `aria-busy` ao salvar. |
| Campo | 46 px, borda de 3 : 1, foco com anel, select próprio com seta, erro **junto do campo** (`.field-error`, `aria-describedby`), moeda normalizada ao sair. |
| Modal / folha | `dialog` nativo, foco no primeiro campo, Escape, retorno de foco, entrada 300 ms e saída 150 ms; folha no celular. |
| Toast | `toast(msg, desfazer?, tipo)`; sucesso, aviso e erro; saída animada. |
| Tooltip | `data-tip-title` + `data-tip="Rótulo::Valor||…"`; criado por `fx.js`, decorativo (`aria-hidden`), o nome acessível está no `aria-label` do alvo. |
| Tabela / lista | Cabeçalho em caixa-alta pequena, linhas de 60 px, destaque (`.row-flash`) no registro salvo. |
| Esqueleto | Mesma geometria do dashboard (saldo, quatro indicadores, dois painéis) com brilho de 1,3 s. |
| Estado vazio | Ícone em disco, título específico e ação. |

## Movimento

- Entrada ao trocar de página: cascata de 12 px / 300 ms em saldo, indicadores, ações, painéis; barras e rosca crescem; a linha do saldo é desenhada.
- Valores: contagem a partir de zero **só ao entrar na página**. Ao trocar de mês ou salvar, só o que mudou anima, do valor anterior ao novo, e sempre termina no texto exato. Aba oculta não anima.
- Sempre `transform` e `opacity`; `prefers-reduced-motion` desliga tudo.

## Acessibilidade

Foco visível de 2 px, `aria-current` na navegação, `aria-pressed` em seletores, gráficos com equivalente textual, erros ligados ao campo por `aria-describedby`, `role=alert` em erros. Não se afirma certificação; VoiceOver/TalkBack e aparelhos físicos exigem homologação.


## Revisão mobile de 15/10/2026
- Navegação inferior ocupa toda a largura e encosta na borda inferior. A área segura é preenchimento interno, sem margem externa. O conteúdo e a barra são regiões separadas do layout flexível; a barra nunca cobre a área rolável.
- Botão central de 46 px alinhado aos demais itens, sem deslocamento vertical ou halo.
- Celular: KPIs e atalhos em duas colunas. Valores longos podem quebrar para preservar o conteúdo. Filtros abertos usam toda a largura.
- Diálogos: cabeçalho e rodapé fora da área de rolagem. O corpo rola entre eles; rodapé respeita a área segura.
- Mais e Novo registro compartilham linhas com ícone, título e descrição, separadas por divisórias.
- Campos com fonte mínima de 16 px no celular; botões, campos e ações de lista com área de toque de pelo menos 44 px (botão do aviso compacto: 40 px).
- Previsão mensal mantém valores visíveis e explicação em um detalhe expansível. Valores, datas e fórmulas não são alterados pela revisão visual.
