# Saldo 4.0

Controle financeiro pessoal em português, com PWA, contas individuais e sincronização. A fonte atual é este diretório `sites/saldo`; os arquivos antigos da raiz do workspace não são a versão atual.

## Execução local

Node >=22.13.0, Vinext/Vite, rotas compatíveis com Next e D1. A interface é HTML/CSS e JavaScript modular, servida por `app/route.ts`.

```sh
npm run install:ci
npm run dev -- --port 5182 --hostname 127.0.0.1
```

Abra `http://127.0.0.1:5182/`. O runtime local usa identidade de teste e banco local, sem gravar no site publicado. `localhost` e `127.0.0.1` têm armazenamento de navegador separado e compartilham o banco local.

```sh
npm run check
npm test
npm run lint
npm run build
```

`predev`/`prebuild` preparam assets e o fingerprint da PWA. Durante uma sessão já aberta, execute `node scripts/prepare-client.mjs` após editar módulos e aplique a atualização oferecida no app. `public/`, `dist/`, `.wrangler/` e dados pessoais não são versionados. Publicação é um fluxo separado; esta revisão foi feita somente localmente.

## Experiência e regras

- Visão geral: disponível hoje em bancos/carteiras; contas a pagar/receber do período e atrasos anteriores; caixa por data efetiva; comparação com o mesmo corte do mês anterior; despesas por referência e histórico de seis meses. Saldo inicial não conferido e registros sem confirmação recebem aviso.
- Movimentações: pesquisa sem distinção de acentos, filtros combinados, todos os períodos, referência ou pagamento/vencimento, ordenação assinada, páginas de 25/50, seleção e confirmação em lote. Celular tem lista própria com valor e status. CSV corresponde aos resultados filtrados, com centavos, sinal das despesas e proteção contra fórmulas em texto.
- Registro rápido: valor, descrição, categoria, conta, status e data; referência, repetição e observações ficam nos detalhes. Categoria exige escolha explícita. Alterar data não altera status nem sobrescreve referência editada. Rascunhos de lançamentos/contas ficam separados por usuário e aparelho; fechar formulário alterado exige confirmação.
- Contas: disponível usa realizados pela data efetiva desde a data do saldo inicial. Saldo inicial futuro não entra antes de vigorar. Renomear preserva vínculos; contas em uso não podem ser excluídas ou convertidas para outro tipo.
- Cartão: compra integra despesa/orçamento por referência. Pagamento de fatura é transferência, afeta caixa e não cria outra despesa. Fatura distingue compras, pago, programado e restante; pagamento próprio aceita valor parcial e confirmação de programado. Fechamento 1–31 e vencimento 1–28; compra após fechamento entra no ciclo seguinte.
- Recorrências/parcelas: séries finitas de 2–60 ocorrências; repetir replica valor mensal, parcelar divide o total com centavos exatos. Permite conferir série, editar próximos previstos e excluí-los com desfazer. Não há cobrança bancária nem geração indefinida automática.
- Planejamento: limite de despesa ou meta de receita, realizado/previsão, cópia do mês anterior sem substituir categorias já planejadas. Metas com prazo opcional são manuais: não reservam dinheiro nem alteram saldo; excedente fica visível.
- Configurações: perfil/foto, privacidade, sync, instalação, categorias, backups e recuperação. JPG/PNG/WebP até 8 MB é recortado/reduzido localmente; erro de foto preserva a anterior.

Formulários não aceitam pagamento/recebimento realizado no futuro. Importações preservam datas e status antigos; revisão exige decisão explícita, sem inventar pagamentos.

## Dados e sincronização

O formato permanece **v3**, compatível com backups existentes; 4.0 é a versão de produto/interface. `selectWorkspace` confirma sessão antes de mostrar dados online e separa armazenamento, backups, preferências e contexto por usuário. Offline usa a última identidade confirmada no dispositivo.

D1 do próprio Site isola documentos pela identidade autenticada do ChatGPT. Cliente mantém cópia local, salva offline e sincroniza ao reconectar, voltar à janela e a cada 15 segundos enquanto aberto. Web Locks/revisões condicionais protegem escritas. Alterações independentes são combinadas; conflito exige escolha e mostra campos diferentes. Troca de conta não envia dados ao novo usuário.

Migração v1/v2 preserva conteúdo; ausência de status vira **Sem confirmação**. Chaves antigas não são apagadas. Backups 1/2/3 são validados antes de restaurar. Restauração substitui o espaço da conta e sincroniza para todos os dispositivos, com prévia e cópia anterior automática. Conteúdo corrompido pode ser exportado para recuperação.

API limitada a 1 MB/documento. Sem integração bancária, reserva automática ou push. Use dispositivo/perfil de navegador próprio para dados pessoais.

## PWA e arquitetura

Shell, fontes e ícones locais usam cache por fingerprint de HTML/módulos/CSS/assets. Autenticação/API seguem na rede. Atualização explícita, bloqueada com formulário aberto, conserva mês na chave do usuário.

`app.js`: coordenação/navegação; `views.js`: páginas; `flows.js`: formulários/operações; `ui.js`: controles/modal/erros/toast; `product.js`: cálculos de apresentação testáveis. Regras e contratos ficam em `finance.js`, `store.js`, `sync.js`, `sync-merge.js`. Padrões ativos: [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md). Componentes React do starter Sites permanecem como infraestrutura inativa da interface financeira, sem segundo conjunto usado pelas telas.

`npm test` inclui `charts.test.js` (eixo, rosca, linha e barras dos gráficos) e `audit.test.js` (consistência financeira com dados pseudoaleatórios de semente fixa: saldo × caixa × gráficos, parcelas, fatura, CSV). `e2e/scenarios.js` é um roteiro de ponta a ponta para o console do app **local** (conta de teste): cria registros "E2E", valida receita, despesa, saldo, edição, exclusão com desfazer, período, entradas inválidas, clique duplo, teclado, erro de rede e limpa tudo; os resultados ficam em `document.documentElement.dataset.e2e`. Rode-o em 1280 px e em 375 px.

Testes cobrem cálculos, migração, recuperação, parcelas, faturas, concorrência, identidade, conflitos, rede, CSV e PWA. QA visual usa dados fictícios, 1.000 registros, nomes longos, valores altos e diferentes larguras. Evidências estão no relatório de implementação fora do pacote. Emulação não equivale à homologação em aparelhos físicos/leitores de tela reais.
