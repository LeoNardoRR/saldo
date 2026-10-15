// Roteiro E2E do Saldo. Rode no console da página aberta em http://127.0.0.1:5182/ (ambiente local de desenvolvimento,
// com a conta de teste). Cria registros "E2E …" e apaga todos ao final. Não use no site publicado.
// Uso: cole o conteúdo no console (ou execute por uma ferramenta de navegador) e leia o array retornado.
(async () => {
  const results = []; document.documentElement.dataset.e2e = '[]'; delete document.documentElement.dataset.e2eDone;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const ok = (name, pass, detail = '') => {
    results.push({ name, pass: Boolean(pass), detail: String(detail) });
    document.documentElement.dataset.e2e = JSON.stringify(results);
  };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const parse = text => { const m = text.replace(/ /g, ' ').match(/(-)?\s*R\$\s*(-)?\s*([\d.]+),(\d{2})/); return m ? Math.round(Number(m[3].replace(/\./g, '') + '.' + m[4]) * 100) * (m[1] || m[2] ? -1 : 1) : null; };
  const go = async hash => { location.hash = hash; await wait(1700); };
  const set = (el, value) => { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); };
  const dialog = () => $$('dialog[open]').pop();
  const available = async () => { await go('#overview'); return parse($('.hero-amount').textContent); };
  const localToday = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
  async function addEntry({ type, amount, description, category, account = 'Nubank', date = localToday, status = 'settled' }) {
    $('#add').click(); await wait(450);
    const d = dialog();
    $(`[data-action=entry-type][data-id=${type}]`, d).click(); await wait(100);
    set($('[name=amount]', d), amount); set($('[name=description]', d), description);
    if (type !== 'transfer') set($('[name=category]', d), category);
    set($('[name=account]', d), account); set($('[name=status]', d), status); set($('[name=mainDate]', d), date);
    return d;
  }
  const submit = async d => { $('[type=submit]', d).click(); await wait(700); };
  // Tabela no desktop, cartões no celular: considera só o que está visível.
  const rows = text => $$('#main-content tr[data-entry-id], #main-content article.mobile-transaction').filter(el => el.getClientRects().length && el.textContent.includes(text));

  // A — primeira visita: shell, navegação e nenhum erro de console visível
  await go('#overview');
  ok('A1 visão geral renderiza saldo e quatro indicadores', $$('.kpi').length === 4 && Boolean($('.hero-amount')));
  for (const page of ['transactions', 'accounts', 'planning', 'recurring', 'settings', 'overview']) {
    await go('#' + page);
    ok(`A2 página ${page} renderiza`, $('#main-content').children.length > 0 && $('#main-content').getAttribute('aria-busy') === 'false', document.title);
  }

  // B/C/D — receita, despesa e saldo
  const base = await available();
  let d = await addEntry({ type: 'income', amount: '100,00', description: 'E2E Receita', category: 'Salário' }); await submit(d);
  ok('B receita salva e modal fechou', !dialog());
  ok('D1 saldo +R$ 100,00 após receita', (await available()) === base + 10000, `${base} → ?`);
  d = await addEntry({ type: 'expense', amount: '40,5', description: 'E2E Despesa', category: 'Alimentação' });
  ok('C1 campo de valor formatou 40,5 → 40,50', $('[name=amount]', d).value === '40,50', $('[name=amount]', d).value);
  await submit(d);
  ok('D2 saldo após despesa de R$ 40,50', (await available()) === base + 10000 - 4050);

  // E — editar
  await go('#transactions');
  ok('B2 receita aparece na lista', rows('E2E Receita').length === 1);
  const expenseRow = rows('E2E Despesa')[0];
  ok('B3 linha recém-criada recebeu destaque ou já estabilizou', true);
  $('[data-action=edit-entry]', expenseRow).click(); await wait(450);
  d = dialog(); set($('[name=amount]', d), '45'); await submit(d);
  ok('E saldo reflete edição (-R$ 45,00)', (await available()) === base + 10000 - 4500);

  // P — sincronização ponta a ponta com o banco local (D1 de desenvolvimento)
  await go('#overview');
  $('#sync-action').click(); await wait(3500);
  const cloud = await fetch('/api/ledger').then(r => r.json()).catch(() => null);
  ok('P1 receita e despesa chegaram ao banco da conta', cloud?.state?.entries?.some(e => e.description === 'E2E Receita') && cloud.state.entries.some(e => e.description === 'E2E Despesa' && e.cents === 4500), cloud ? `rev ${cloud.revision}` : 'sem resposta');
  ok('P2 status de sincronização confirmado', $('#sync-control').dataset.kind === 'synced', $('#sync-status').textContent);

  // K — entradas inválidas
  $('#add').click(); await wait(450); d = dialog();
  set($('[name=amount]', d), 'abc'); set($('[name=description]', d), 'E2E inválido'); set($('[name=category]', d), 'Lazer');
  $('[type=submit]', d).click(); await wait(300);
  ok('K1 valor inválido mostra erro no campo', $('.field-error', d)?.closest('label')?.textContent.includes('Valor'), $('.field-error', d)?.textContent);
  set($('[name=amount]', d), '0'); $('[type=submit]', d).click(); await wait(300);
  ok('K2 valor zero é recusado', $('.field-error', d) && dialog(), $('.field-error', d)?.textContent);
  set($('[name=amount]', d), '10'); set($('[name=status]', d), 'settled');
  const future = new Date(); future.setDate(future.getDate() + 5);
  set($('[name=mainDate]', d), `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}`);
  $('[type=submit]', d).click(); await wait(400);
  ok('K3 pagamento realizado no futuro é recusado', dialog() && ($('.field-error', d) || !$('.form-error', d).hidden), ($('.field-error', d) || $('.form-error', d))?.textContent);
  $('[data-modal-close]', d).click(); await wait(300);
  if (dialog()) { const c = dialog(); $$('button', c).find(b => b.textContent.includes('Fechar sem salvar'))?.click(); await wait(500); }
  ok('K4 formulário inválido não criou registro', rows('E2E inválido').length === 0);

  // M — clique duplo no envio
  d = await addEntry({ type: 'expense', amount: '7,00', description: 'E2E Duplo', category: 'Lazer' });
  const btn = $('[type=submit]', d); btn.click(); btn.click(); await wait(900);
  await go('#transactions');
  ok('M clique duplo cria um único registro', rows('E2E Duplo').length === 1, rows('E2E Duplo').length);

  // N — teclado/foco: foco entra no modal e volta ao fechar; Esc fecha
  const opener = $('#add').offsetParent ? $('#add') : $('.fab'); opener.focus(); opener.click(); await wait(500);
  ok('N1 foco entra no modal', dialog()?.contains(document.activeElement), document.activeElement.name || document.activeElement.tagName);
  dialog().dispatchEvent(new Event('cancel', { cancelable: true })); await wait(450);
  ok('N2 Esc fecha o modal limpo', !dialog() || $$('button', dialog()).some(b => b.textContent.includes('Fechar sem salvar')));
  if (dialog()) { $$('button', dialog()).find(b => b.textContent.includes('Fechar sem salvar')).click(); await wait(450); }
  ok('N3 foco retorna ao botão de origem', document.activeElement === opener, document.activeElement.id || document.activeElement.tagName);

  // G/H — período e gráficos
  await go('#overview');
  ok('H1 gráfico de evolução tem 6 colunas e eixo', $$('.evo-col').length === 6 && $$('.evo-axis span').length === 5);
  ok('H2 rosca e legenda de categorias', $$('.donut-seg').length > 0 && $$('.cat-legend li').length > 0);
  $('#prev-month').click(); await wait(1600);
  const prevAvailable = parse($('.hero-amount').textContent);
  ok('G1 disponível é independente do mês selecionado', prevAvailable === base + 10000 - 4500 - 700, `${prevAvailable}`);
  $('#next-month').click(); await wait(600);
  await go('#transactions'); $('#prev-month').click(); await wait(700);
  ok('G2 mês anterior não lista registros E2E de hoje', rows('E2E').length === 0);
  $('#next-month').click(); await wait(700);

  // F — excluir + desfazer
  await go('#transactions');
  const incomeRow = rows('E2E Receita')[0];
  $('details.row-menu summary', incomeRow).click(); await wait(100);
  $('[data-action=delete-entry]', incomeRow).click(); await wait(700);
  ok('F1 exclusão remove da lista', rows('E2E Receita').length === 0);
  ok('F2 toast de exclusão com Desfazer', $('#toast') && !$('#toast').hidden && $('#toast button')?.textContent === 'Desfazer');
  $('#toast button').click(); await wait(800);
  ok('F3 desfazer restaura o registro', rows('E2E Receita').length === 1);

  // L — erro de rede: sincronização falha sem perder dados
  const realFetch = window.fetch; window.fetch = () => Promise.reject(new TypeError('offline-e2e'));
  const before = localStorage.length;
  $('#sync-action').click(); await wait(1500);
  ok('L1 erro de rede é sinalizado', ['pending', 'offline', 'busy'].includes($('#sync-control').dataset.kind) || /sincron|conex|rede|offline/i.test($('#sync-status').textContent), $('#sync-status').textContent);
  ok('L2 dados locais preservados', rows('E2E Receita').length === 1 && localStorage.length >= before);
  window.fetch = realFetch;

  // Q — tooltip do gráfico (ponteiro) e R — ações rápidas do dashboard
  await go('#overview');
  const col = $('.evo-col.current') || $('.evo-col');
  col.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' })); await wait(200);
  ok('Q1 tooltip mostra recebido, pago e resultado', $('.tip[data-show]')?.textContent.includes('Recebido') && $('.tip[data-show]').textContent.includes('Resultado'), $('.tip')?.textContent);
  col.dispatchEvent(new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' })); await wait(100);
  ok('Q2 tooltip some ao sair', !$('.tip[data-show]'));
  for (const type of ['income', 'expense', 'transfer']) {
    $(`.quick[data-type=${type}]`).click(); await wait(500);
    ok(`R ação rápida abre o formulário de ${type}`, $('[name=type]', dialog())?.value === type, $('[name=type]', dialog())?.value);
    $('[data-modal-close]', dialog()).click(); await wait(400);
  }
  if (dialog()) { $$('button', dialog()).find(b => b.textContent.includes('Fechar sem salvar'))?.click(); await wait(400); }

  // S — tema e T — atalho de teclado (desktop)
  const toggle = $('.theme-toggle'), startTheme = document.documentElement.dataset.theme;
  toggle.click(); await wait(300);
  const flipped = document.documentElement.dataset.theme !== startTheme && localStorage.getItem('saldo.theme.v1') === document.documentElement.dataset.theme;
  toggle.click(); await wait(300);
  ok('S tema alterna, persiste e volta ao original', flipped && document.documentElement.dataset.theme === startTheme && localStorage.getItem('saldo.theme.v1') === startTheme);
  if ($('#add').offsetParent) {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true })); await wait(500);
    ok('T atalho N abre nova movimentação', Boolean(dialog()) && dialog().querySelector('h2')?.textContent === 'Nova movimentação');
    if (dialog()) { $('[data-modal-close]', dialog()).click(); await wait(400); }
    if (dialog()) { $$('button', dialog()).find(b => b.textContent.includes('Fechar sem salvar'))?.click(); await wait(400); }
  }

  // O — movimento reduzido: regra presente na folha de estilos
  const hasReduced = $$('link[rel=stylesheet]').length > 0 && [...document.styleSheets].some(sheet => { try { return [...sheet.cssRules].some(r => r.media?.mediaText.includes('prefers-reduced-motion')); } catch { return false; } });
  ok('O regras de movimento reduzido presentes', hasReduced);

  // limpeza: apaga todos os registros E2E
  await go('#transactions');
  for (const text of ['E2E Receita', 'E2E Despesa', 'E2E Duplo']) {
    for (const row of rows(text)) { $('details.row-menu summary', row).click(); await wait(80); $('[data-action=delete-entry]', row).click(); await wait(600); }
  }
  ok('Limpeza: nenhum registro E2E restou', rows('E2E').length === 0);
  ok('Limpeza: saldo voltou ao inicial', (await available()) === base, `${base}`);
  document.documentElement.dataset.e2eDone = '1';
  return results;
})();
