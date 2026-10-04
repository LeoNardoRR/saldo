# Saldo 2.0

App financeiro pessoal estático e PWA, em português. Fonte de publicação: `sites/saldo`; desenvolvimento local: raiz do projeto. `npm start` serve em `127.0.0.1:5173`. `npm run check`, `npm test`, `npm run build` validam e geram `dist/` com arquivos públicos do app. Nenhum registro pessoal é incluído no pacote.

## Uso

- Cadastre/renomeie categorias de receitas e despesas. Grafia, caixa, espaços e acentos são normalizados na comparação; renomear atualiza registros e orçamentos associados. Exclusão de categoria em uso é bloqueada.
- Contas têm saldo inicial e data de corte. O saldo disponível considera apenas movimentações realizadas até hoje, a partir dessa data. O saldo inicial é anterior às movimentações da data de corte. Nomes podem ser alterados preservando vínculos. Contas em uso não podem ser excluídas ou convertidas para outro tipo.
- Movimentações incluem referência, vencimento, status e data efetiva. Resultado mensal realizado usa o mês de referência; saldo bancário usa a data efetiva. Previsto inclui todos os compromissos do mês. Não confundir resultado mensal com dinheiro disponível hoje.
- Registro de transferência exige origem e destino diferentes. Entrada na conta de destino e saída na origem são conciliadas; não criam receita ou despesa no resultado.
- Cartões têm fechamento e vencimento. Compras após o fechamento entram na fatura seguinte; compra no dia do fechamento entra na fatura atual. Se o vencimento é posterior ao fechamento, fica no mesmo mês da fatura; caso contrário, no mês seguinte. Fechamento aceita dia 1–31; vencimento aceita 1–28.
- Parcelamento divide o valor **total** em até 60 parcelas, distribuindo centavos sem perder valor. O primeiro registro mantém o status escolhido e os próximos são previstos. Conta, categoria, fatura e datas podem ser ajustadas na edição individual.
- Pagamento de fatura é transferência da conta bancária/carteira para o cartão. A fatura mostra total, pagos e programados. Novos pagamentos não podem ultrapassar o saldo da fatura após descontar pagamentos realizados e programados. Quando uma fatura está integralmente paga, parcelas previstas associadas são confirmadas; registros antigos sem confirmação continuam exigindo confirmação explícita. Pagar fatura não cria nova despesa.
- Recorrência gera uma série mensal com quantidade explícita (2–60 meses), mantendo o dia original e ajustando meses menores. É possível excluir os próximos previstos da série e desfazer essa exclusão. Não há geração indefinida nem notificações em segundo plano.
- Agenda mostra pendências, registros sem confirmação e faturas do mês de vencimento. Confirme individualmente ou selecione registros em lote com a mesma data efetiva/status.
- Orçamento distingue limite de despesas de meta de receita. Ambos mostram realizado e previsão; salário é receita, não despesa. Metas de reserva continuam manuais e não geram lançamentos.

## Preservação e migração

O app usa um único documento `saldo.ledger.v3` no localStorage. Escritas ocorrem sob Web Locks exclusivas, relendo o documento atual; registros editados têm comparação da versão esperada e conflitos são bloqueados. Alterações em outras janelas são refletidas por eventos de armazenamento/visibilidade. Chrome, Edge ou Safari compatível com Web Locks é necessário para gravação segura.

Na primeira abertura, transações `saldo.transactions.v1` e preferências `saldo.settings.v1` são validadas e copiadas para o novo modelo. IDs, valores, datas, perfil/foto, metas e orçamentos são preservados. Registros sem status recebem **Sem confirmação**, sem presumir pagamento. Contas e categorias equivalentes por caixa/acentos/espaços se tornam canônicas. Limites antigos para a mesma categoria e mês são somados, preservando o total e a cópia original. Orçamento de categoria exclusivamente de receita passa a meta de receita. As chaves antigas não são apagadas ou sobrescritas. O conteúdo original também é guardado em `saldo.migration.v3.backup` e pode ser baixado por **Backup anterior**. Uma janela antiga que altere as chaves antigas após a migração gera aviso; feche versões antigas e recupere seus dados pelo backup da janela antiga antes de substituir o estado novo.

Backups JSON das versões 1, 2 e 3 são aceitos, após validação. Restauração substitui os dados após confirmação e bloqueia alterações ocorridas em outra janela durante a confirmação. Um snapshot anterior é guardado e pode ser baixado pelo botão **Backup anterior**. Em armazenamento corrompido, **Exportar recuperação** preserva os dados originais e restauração de backup válido permite recuperação protegida. CSV inclui datas de referência/vencimento/efetiva, status, contas e fatura; exporta todo o mês, independentemente dos filtros da tabela.

Dados continuam locais ao navegador/origem, sem sincronização entre dispositivos e sem integração bancária. Limpar o armazenamento remove registros e backups locais; mantenha cópias externas dos backups. A publicação do Site não envia registros do usuário ao servidor. O acesso do Site permanece privado no Sites.

## PWA

Manifesto, ícones e fontes locais; service worker com cache por versão. Atualização explícita pelo botão Atualizar; não recarrega enquanto há formulário aberto. Offline funciona após primeira abertura conectada. Cache limitado ao shell estático; autenticação e APIs seguem na rede. Atualização preserva o armazenamento financeiro. Instalação depende do navegador e confirmação do usuário.

## Validação

Testes automatizados cobrem formatos monetários/datas, projeção versus realizado, migração/validação de backup, orçamento por categoria normalizada, saldo inicial, transferências, parcelas e fechamento/vencimento de faturas, pagamentos programados, confirmação de fatura, concorrência entre janelas, conflitos, falha de gravação, recuperação e PWA.

QA de interface com dados fictícios em origem local separada: criação de categoria/cartão, recorrência de três meses, compra em três parcelas com centavos, meta de receita, confirmação de pagamento, programação de pagamento de fatura sem duplicidade, restauração de backup antigo e preservação de lançamento ao salvar perfil em outra janela. O evento de download de JSON não foi exposto pelo navegador integrado nessa verificação; geração por Blob/âncora não implica confirmação de gravação em disco.
