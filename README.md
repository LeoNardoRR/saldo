# Saldo — finanças com intenção

App de controle financeiro pessoal em HTML, CSS e JavaScript, sem dependências de execução além do Python para servir os arquivos.

## Executar

```sh
npm start
```

Abra http://localhost:5173. Use sempre o mesmo endereço e navegador para acessar seus dados.

## Recursos

- Identidade própria com monograma SVG, favicon e interface responsiva.
- Registro, edição, duplicação, exclusão e desfazer exclusão de movimentações.
- Resumo mensal, fluxo acumulado diário e distribuição de gastos por categoria.
- Busca, filtro por conta e tipo, ordenação por data, descrição ou valor.
- Orçamentos por categoria e por mês, com indicação de limite excedido.
- Metas com objetivo e valor já guardado, atualizados manualmente e sem alterar os lançamentos.
- Perfil com nome, prévia, substituição e remoção de foto. JPG, PNG e WebP até 8 MB. A imagem é recortada ao centro e reduzida a 240 × 240 no próprio navegador.
- CSV de todos os lançamentos do mês selecionado, com separador ponto e vírgula e valores em reais.
- Backup JSON versão 2 com registros, foto, perfil, metas e orçamentos. Backups da versão 1 continuam aceitos e preservam o planejamento atual. A restauração só ocorre após confirmação e validação do conteúdo.

## Dados e significado dos valores

Os registros antigos continuam usando `saldo.transactions.v1`; as novas preferências usam `saldo.settings.v1` em localStorage. Não há login, sincronização entre dispositivos, criptografia de armazenamento ou integração bancária. Limpar os dados do navegador remove o conteúdo. Salve backups regularmente. Os arquivos de backup incluem sua foto e seus registros.

O saldo e o gráfico representam **entradas menos saídas do período**, sem saldo inicial de contas. Transferências não afetam esse fluxo e não fazem conciliação de contas. Os valores das metas são informados manualmente; saldo positivo não é considerado automaticamente dinheiro reservado.

## Validação

```sh
npm run check
npm test
```

Os testes verificam centavos, formatos monetários inválidos, datas impossíveis, exclusão de transferências dos totais, isolamento por mês e categoria, limites excedidos e validação de perfil/metas/orçamentos em backups. A interface foi revisada em desktop e em viewport de 390 × 844, com testes de criação de orçamento/meta, foto e persistência, duplicação, filtros e restauração em origem local separada. O evento de download não foi observado pelo navegador integrado; a gravação efetiva do CSV/JSON no dispositivo não foi confirmada nessa revisão.

## PWA e Sites

O app inclui manifesto, ícones PNG de 192/512 pixels, ícone maskable, ícone para a tela inicial do iOS, fontes locais e service worker. Depois do primeiro carregamento conectado, o shell e os registros locais podem ser usados offline. O cache armazena apenas os arquivos estáticos do Saldo e rejeita páginas de login ou respostas redirecionadas. Atualizações ficam disponíveis pelo botão Atualizar, após concluir formulários abertos.

Use **Instalar Saldo** no app. O botão abre o prompt nativo quando o navegador disponibiliza `beforeinstallprompt`; nos demais casos, mostra as instruções. No iPhone/iPad, use Safari → Compartilhar → Adicionar à Tela de Início. No Safari do Mac, use Arquivo → Adicionar ao Dock. A primeira abertura do site privado exige autenticação do proprietário no Sites. A instalação no sistema operacional não é feita automaticamente pelo app.

**Migração do localhost:** os dados pertencem ao endereço do navegador. No app local, clique Salvar backup. Abra a versão publicada, clique Restaurar backup e selecione o arquivo. A restauração exige confirmação. A instalação não adiciona sincronização nem migra automaticamente os registros entre origens ou dispositivos; alguns navegadores também isolam o armazenamento do app instalado.

A fonte de publicação e a identidade do Sites estão em `sites/saldo/.openai/hosting.json`. `npm run build` gera apenas os arquivos do app em `dist/`, sem arquivos de teste ou registros financeiros. A cópia do app na raiz continua disponível para desenvolvimento local. Para próximas publicações, atualize a fonte em `sites/saldo` e use o workflow oficial do plugin Sites para commit/push e empacotamento.

Validação PWA: nove testes automatizados passaram, incluindo manifesto/ícones reais, rejeição de páginas de autenticação no cache e preservação de caches de outras aplicações. No navegador integrado, o service worker ficou ativo; o teste com rede desativada abriu o app, salvou uma saída de R$ 12,34 e a manteve após recarregar. A instalação nativa no sistema operacional ainda depende de o usuário confirmar no navegador do dispositivo.
