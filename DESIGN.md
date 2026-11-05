# Saldo — interface de operação

Uso: consulta rápida de finanças no celular, frequentemente com uma mão, e revisão de registros em telas maiores. Clareza dos números e ação explícita precedem decoração.

Identidade preservada: S geométrico, violeta, carvão e tipografia Manrope/DM Sans local. Tema claro com fundo neutro e superfícies brancas; escuro com camadas carvão. Tokens autoritativos estão no início de `premium.css`, carregado após os estilos herdados.

Superfícies: resumo compacto com carteira horizontal; análises separadas; atividade para pendências. Desktop mostra as áreas em grade; celular usa abas. Navegação inferior respeita safe area. Formulários mantêm labels, ajuda e botões fixos de ação no modal.

Padrões: escala de espaços 4/8/12/16/20/24/32; raios 8 nos controles e 14 nas superfícies; áreas de toque 44px; valores tabulares e sem quebra. Bordas simples, sem vidro decorativo. Violeta para seleção, verde para entrada/sucesso, coral para saída/aviso conforme contexto. Cor acompanha texto, nunca é o único sinal.

Movimento: indicador de seleção nas abas com Motion Primitives; respeitar movimento reduzido. Dinheiro não conta a partir de zero. Gráficos não animam valores. Nenhuma animação bloqueia operações.

Referências e licenças: `docs/UI_MODERNIZATION.md`. Componentes financeiros React em `components/finance`; backend, armazenamento e regras financeiras permanecem separados.
