import {parseMoney,validEntry,validDate,validState,validSettings,migrate,seriesEntries,invoice,invoiceMonth,invoiceDue,normalized,shiftMonth} from './finance.js';
import {conflict,STORE_KEY,LEGACY_BACKUP_KEY} from './store.js';
import {dataState} from './sync-merge.js';
import {today,amount,dateLabel,monthLabel,plural,accountFor,isCardPurchase,statusLabel,agendaItems,recurringGroups,filteredEntries,csvText} from './product.js';
import {$,esc,icon,action,badge,field,input,options,modal,refreshModal,confirmAction,toast,download} from './ui.js';

const clone=value=>structuredClone(value);
const fail=(message,fieldName)=>{const e=Error(message);e.field=fieldName;throw e;};
const cents=(value,name='amount',allowZero=false)=>{const n=parseMoney(value,allowZero);if(n===null)fail(allowZero?'Informe um valor válido, como 1.234,56.':'Informe um valor maior que zero, com até duas casas decimais. Ex.: 123,45.',name);return n;};
const get=(form,name)=>form.elements.namedItem(name);
const select=(name,items,value,placeholder='',attrs='')=>`<select name="${esc(name)}" ${attrs}>${options(items,value,placeholder)}</select>`;
const decimal='inputmode="decimal" autocomplete="off" required placeholder="0,00"';
const draftKey=(ctx,kind,id='new')=>`saldo.draft.${encodeURIComponent(ctx.workspace.userId)}.${kind}.${id}`;

export function entryForm(ctx,entry=null,{duplicate=false,recurring=false,type='expense'}={}) {
  const expected=entry&&!duplicate?clone(entry):null,state=ctx.state;
  const baseDate=ctx.month===today().slice(0,7)?today():`${ctx.month}-01`;
  const status=entry?.status|| (baseDate>today()?'planned':'settled');
  const account=entry?.account||ctx.preferences.lastAccount||state.accounts.find(a=>a.type!=='credit')?.name||state.accounts[0]?.name;
  const e={description:entry?.description||'',cents:entry?.cents||0,type:entry?.type||type,category:entry?.category||'',account,toAccount:entry?.toAccount||'',date:entry?.date||baseDate,dueDate:entry?.dueDate||baseDate,status,settledDate:entry?.settledDate||today(),invoiceMonth:entry?.invoiceMonth||'',notes:entry?.notes||''};
  const title=expected?'Editar movimentação':duplicate?'Duplicar movimentação':'Nova movimentação';
  const categoryOptions=state.categories.filter(c=>c.type===e.type||c.type==='both').map(c=>c.name);
  const body=`<div class="form-kind" role="group" aria-label="Tipo de movimentação">${[['expense','Despesa'],['income','Receita'],['transfer','Transferência']].map(([v,label])=>action('entry-type',label,{id:v,cls:'',extra:`aria-pressed="${e.type===v}"`})).join('')}</div><input name="type" type="hidden" value="${e.type}"><label class="field value-field"><span>Valor (R$)</span>${input('amount',e.cents?amount(e.cents):'',decimal)}</label>${field('Descrição',input('description',e.description,'required maxlength="160" placeholder="Ex.: Mercado da semana" autocomplete="off"'))}<div class="form-grid">${field('Categoria',select('category',categoryOptions,e.category,'Escolha uma categoria','required'),{wide:true})}${field('Conta de origem',select('account',state.accounts.map(a=>a.name),e.account,'','required'))}${field('Status',select('status',[['settled','Pago / recebido'],['planned','A pagar / receber'],...(e.status==='legacy'?[['legacy','Sem confirmação']]:[])],e.status))}${field('Data',input('mainDate',e.status==='settled'?e.settledDate:e.dueDate,'type="date" required'))}<div id="entry-destination" class="full" hidden>${field('Conta de destino',select('toAccount',state.accounts.map(a=>a.name),e.toAccount,'Escolha o destino'))}</div></div><div class="quick-links">${action('quick-category','Nova categoria',{cls:'text-button'})}${action('quick-account','Nova conta',{cls:'text-button'})}</div><p id="entry-status-help" class="helper"></p><details class="form-details" ${recurring?'open':''}><summary>Referência, repetição e outros detalhes</summary><div class="form-grid">${field('Data de referência',input('referenceDate',e.date,'type="date" required'),{help:'Organiza despesas e orçamento. Pode ser diferente da data do pagamento.'})}${field('Vencimento',input('dueDate',e.dueDate,'type="date" required'))}<div class="full" id="entry-invoice" hidden>${field('Fatura de referência',input('invoiceMonth',e.invoiceMonth,'type="month"'),{help:'Ciclo da fatura; seu vencimento é calculado pelas datas do cartão.'})}</div>${field('Repetição e parcelas',select('seriesMode',[['none','Somente este registro'],['monthly','Repetir mensalmente'],['installments','Parcelar compra no cartão']],recurring?'monthly':'none','',expected?'disabled':''))}${field('Quantidade de meses / parcelas',input('seriesCount','2','type="number" min="2" max="60"'))}${field('Observação (opcional)',`<textarea name="notes" maxlength="300" placeholder="Algo que ajude você a lembrar">${esc(e.notes)}</textarea>`,{wide:true})}</div><p class="helper" id="series-help">Repetir replica o valor mensal. Parcelar divide o valor total. As próximas ocorrências são previstas e a série tem fim definido.</p></details>${expected?.seriesId?`<div class="form-details">${action('series-details','Ver os registros desta série',{id:expected.seriesId,cls:'text-button'})}</div>`:''}`;
  let api;
  const updateFields=(preserve=true)=>{
    const f=api.form,t=get(f,'type').value;
    const previousAccount=get(f,'account').value,previousCategory=get(f,'category').value;
    const eligible=ctx.state.accounts.filter(a=>t==='expense'||a.type!=='credit');
    get(f,'account').innerHTML=options(eligible.map(a=>a.name),eligible.some(a=>a.name===previousAccount)?previousAccount:eligible[0]?.name);
    get(f,'category').innerHTML=options(ctx.state.categories.filter(c=>c.type===t||c.type==='both').map(c=>c.name),preserve?previousCategory:e.category,'Escolha uma categoria');
    get(f,'category').closest('label').hidden=t==='transfer';get(f,'category').required=t!=='transfer';
    $('#entry-destination',f).hidden=t!=='transfer';get(f,'toAccount').required=t==='transfer';
    get(f,'toAccount').innerHTML=options(ctx.state.accounts.filter(a=>a.name!==get(f,'account').value).map(a=>a.name),get(f,'toAccount').value,'Escolha o destino');
    const origin=accountFor(ctx.state,get(f,'account').value),target=accountFor(ctx.state,get(f,'toAccount').value);
    const cardPurchase=t==='expense'&&origin?.type==='credit',cardPayment=t==='transfer'&&target?.type==='credit';
    const statusValue=get(f,'status').value;
    get(f,'status').innerHTML=options([['settled',cardPurchase?'Compra realizada':t==='income'?'Recebido':'Pago'],['planned',cardPurchase?'Compra prevista':t==='income'?'A receber':'A pagar'],...(expected?.status==='legacy'?[['legacy','Sem confirmação']]:[])],statusValue);
    const label=get(f,'mainDate').closest('label').querySelector('span');label.textContent=cardPurchase?'Data da compra':get(f,'status').value==='settled'?(t==='income'?'Data do recebimento':'Data do pagamento'):'Vencimento previsto';
    get(f,'mainDate').max=get(f,'status').value==='settled'?today():'';
    $('#entry-invoice',f).hidden=!(cardPurchase||cardPayment);get(f,'invoiceMonth').required=cardPayment;
    if(cardPurchase&&!get(f,'invoiceMonth').value)get(f,'invoiceMonth').value=invoiceMonth(get(f,'referenceDate').value,origin.closingDay);
    const modes=get(f,'seriesMode');modes.querySelector('[value=installments]').disabled=!cardPurchase;
    if(!cardPurchase&&modes.value==='installments')modes.value='none';
    if(t==='transfer'){modes.value='none';modes.disabled=true;}else modes.disabled=Boolean(expected);
    get(f,'seriesCount').closest('label').hidden=modes.value==='none';get(f,'seriesCount').required=modes.value!=='none';
    $('#entry-status-help',f).textContent=cardPurchase?'Registrar uma compra não paga a fatura. O dinheiro sai da conta quando você registra o pagamento da fatura.':cardPayment?'Pagamento de fatura é uma transferência. O ciclo informado evita duplicar a despesa.':get(f,'status').value==='settled'?'O valor atualiza o saldo da conta pela data efetiva.':'O valor fica nos compromissos e só atualiza o saldo quando você confirmar o pagamento ou recebimento.';
    api.dialog.querySelectorAll('[data-action=entry-type]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.id===t)));
    const quick=$('[data-action=quick-category]',f);quick.hidden=t==='transfer';
  };
  api=modal({title,body,submit:expected?'Salvar alterações':'Salvar registro',draftKey:draftKey(ctx,'entry',expected?.id||'new'),onAction:(name,b)=>{
    if(name==='entry-type'){get(api.form,'type').value=b.dataset.id;updateFields();api.setDirty();}
    if(name==='quick-category')categoryForm(ctx,null,c=>{get(api.form,'category').innerHTML=options(ctx.state.categories.filter(x=>x.type===get(api.form,'type').value||x.type==='both').map(c=>c.name),c.name,'Escolha uma categoria');api.setDirty();});
    if(name==='quick-account')accountForm(ctx,null,a=>{get(api.form,'account').innerHTML=options(ctx.state.accounts.map(x=>x.name),a.name);updateFields();api.setDirty();});
    if(name==='series-details')seriesDetails(ctx,b.dataset.id);
  },onSubmit:async f=>{
    const type=get(f,'type').value,origin=accountFor(ctx.state,get(f,'account').value),destination=accountFor(ctx.state,get(f,'toAccount').value),status=get(f,'status').value;
    const value=cents(get(f,'amount').value),description=get(f,'description').value.trim(),mainDate=get(f,'mainDate').value;
    if(!origin)fail('Escolha uma conta válida.','account');
    if(!description)fail('Dê uma descrição ao registro.','description');
    if(status==='settled'&&mainDate>today())fail('Um pagamento ou recebimento realizado deve ter data até hoje. Use previsto para uma data futura.','mainDate');
    if(type==='transfer'&&(!destination||origin.name===destination.name||origin.type==='credit'))fail('Escolha contas diferentes; a origem deve ser banco ou carteira.','toAccount');
    if(type==='income'&&origin.type==='credit')fail('Receitas devem entrar em um banco ou carteira.','account');
    const next={...(expected||{}),id:expected?.id||crypto.randomUUID(),description,type,cents:value,category:type==='transfer'?'Transferência':get(f,'category').value,account:origin.name,toAccount:type==='transfer'?destination.name:'',date:get(f,'referenceDate').value,dueDate:status==='settled'?get(f,'dueDate').value:mainDate,status,settledDate:status==='settled'?mainDate:'',notes:get(f,'notes').value.trim()};
    if(type==='expense'&&origin.type==='credit'){next.invoiceMonth=get(f,'invoiceMonth').value||invoiceMonth(next.date,origin.closingDay);next.dueDate=invoiceDue(next.invoiceMonth,origin);}
    else if(type==='transfer'&&destination.type==='credit')next.invoiceMonth=get(f,'invoiceMonth').value;
    else delete next.invoiceMonth;
    if(!validEntry(next))fail('Revise as datas, a categoria e a descrição.','category');
    const mode=get(f,'seriesMode').value,count=expected||mode==='none'?1:Number(get(f,'seriesCount').value);
    let batch=expected?[next]:seriesEntries(next,{count,installments:mode==='installments',closingDay:origin.closingDay});
    if(origin.type==='credit'&&type==='expense')batch=batch.map(x=>({...x,invoiceMonth:x.invoiceMonth||invoiceMonth(x.date,origin.closingDay),dueDate:invoiceDue(x.invoiceMonth||invoiceMonth(x.date,origin.closingDay),origin)}));
    ctx.flash=batch.map(x=>x.id);
    await ctx.change(s=>{
      if(type==='transfer'&&destination.type==='credit'){const bill=invoice(s.entries.filter(x=>x.id!==expected?.id),destination,next.invoiceMonth);if(value>bill.unallocated)fail('O valor supera a fatura depois dos pagamentos já realizados e programados. Revise a fatura.','amount');}
      if(expected){const index=s.entries.findIndex(x=>x.id===expected.id);conflict(s.entries[index],expected);s.entries[index]=next;}else s.entries.push(...batch);
    });
    ctx.setPreference('lastAccount',origin.name);toast(batch.length>1?`${plural(batch.length,'registro')} criados. Próximas ocorrências previstas.`:'Movimentação salva neste aparelho.');
  }});
  // Restore selects after the draft has been loaded, without inventing a category.
  if(!get(api.form,'category').value&&e.category)get(api.form,'category').innerHTML=options(ctx.state.categories.filter(c=>c.type===e.type||c.type==='both').map(c=>c.name),e.category,'Escolha uma categoria');
  updateFields();
  if(api.draftRecovered){api.form.dataset.referenceEdited='true';api.form.dataset.dueEdited='true';}
  api.form.addEventListener('change',ev=>{
    if(['account','toAccount','status','seriesMode'].includes(ev.target.name))updateFields();
    if(ev.target.name==='mainDate'&&!expected){if(!api.form.dataset.referenceEdited)get(api.form,'referenceDate').value=ev.target.value;if(get(api.form,'status').value!=='settled'&&!api.form.dataset.dueEdited)get(api.form,'dueDate').value=ev.target.value;}
    if(ev.target.name==='referenceDate')api.form.dataset.referenceEdited='true';
    if(ev.target.name==='dueDate')api.form.dataset.dueEdited='true';
    api.setDirty();
  });
  return api;
}

export function confirmEntries(ctx,entries,{agenda=false}={}) {
  const expected=entries.map(clone);
  if(!expected.length){modal({title:'Nenhum registro selecionado',body:'<p>Selecione os registros da lista ou abra um compromisso na agenda.</p>'});return;}
  const allCard=expected.every(e=>isCardPurchase(ctx.state,e));
  const body=`<p class="helper">${agenda?'Os registros abaixo correspondem aos compromissos da agenda, incluindo atrasos anteriores.':'A referência será preservada. A data efetiva altera o caixa, não o mês de referência.'} ${allCard?'Confirmar a compra não paga a fatura.':''}</p><div class="form-grid">${field('Novo status',select('status',[['settled',allCard?'Compra realizada':'Pago / recebido'],['planned',allCard?'Compra prevista':'A pagar / receber']], 'settled'))}${field(allCard?'Data de realização':'Data efetiva',input('date',today(),'type="date" max="'+today()+'" required'))}</div><div class="bulk-list">${expected.map(e=>`<label class="bulk-item"><input name="selected" type="checkbox" value="${esc(e.id)}" checked><div><strong>${esc(e.description)}</strong><p>Referência ${dateLabel(e.date)} · vencimento ${dateLabel(e.dueDate)}</p><p>${esc(e.account)} · ${esc(statusLabel(ctx.state,e))}</p></div><strong>${ctx.cash(e.cents)}</strong></label>`).join('')}</div>`;
  const api=modal({title:expected.length===1?'Confirmar movimentação':'Confirmar registros selecionados',body,submit:expected.length===1?'Confirmar status':`Atualizar ${expected.length} registros`,wide:expected.length>1,onSubmit:async f=>{
    const ids=Array.from(f.querySelectorAll('[name=selected]:checked')).map(x=>x.value),status=get(f,'status').value,date=get(f,'date').value;
    if(!ids.length)fail('Selecione ao menos um registro.');
    if(status==='settled'&&(!validDate(date)||date>today()))fail('Use uma data efetiva até hoje.','date');
    ctx.flash=ids;
    await ctx.change(s=>{for(const id of ids){const index=s.entries.findIndex(e=>e.id===id),previous=expected.find(e=>e.id===id);conflict(s.entries[index],previous);if(status==='settled'&&s.entries[index].type==='transfer'&&!s.entries[index].toAccount)fail('Uma transferência precisa de destino. Edite esse registro antes de confirmar.');s.entries[index]={...s.entries[index],status,settledDate:status==='settled'?date:''};}});
    ctx.selected.clear();toast(`${plural(ids.length,'registro')} atualizados.`);
  }});
  get(api.form,'status').onchange=()=>{const performed=get(api.form,'status').value==='settled';get(api.form,'date').closest('label').hidden=!performed;get(api.form,'date').required=performed;};
  api.form.addEventListener('change',ev=>{if(ev.target.name==='selected'){const count=api.form.querySelectorAll('[name=selected]:checked').length,button=api.form.querySelector('[type=submit]');button.disabled=count===0;button.textContent=count?`Atualizar ${plural(count,'registro')}`:'Selecione um registro';}});
}

export function agenda(ctx) {
  let items=agendaItems(ctx.state,ctx.month),entries=items.filter(i=>i.kind==='entry').map(i=>i.entry);const limit=25;
  let page=1,api;
  const content=()=>`<p class="helper">Vencimentos de ${esc(monthLabel(ctx.month))} e atrasados de qualquer mês. Registros sem confirmação são mostrados separadamente dos pagamentos.</p><div class="bulk-list">${items.slice((page-1)*limit,page*limit).map(i=>`<div class="invoice-item"><div><strong>${esc(i.label)}</strong><p>${dateLabel(i.date)} · ${i.status==='legacy'?'Sem confirmação':i.overdue?'Atrasado':'Previsto'}</p>${i.kind==='entry'?`<p>Referência ${dateLabel(i.entry.date)}</p>`:''}${action(i.kind==='invoice'?'invoice':'confirm-entry',i.kind==='invoice'?'Ver fatura':'Confirmar status',{id:i.kind==='invoice'?i.account.id:i.id,cls:'text-button',extra:i.kind==='invoice'?`data-cycle="${esc(i.cycle)}"`:''})}</div><span>${ctx.cash(i.cents)}</span></div>`).join('')||'<p class="helper">Nenhuma pendência neste recorte.</p>'}</div>${items.length>limit?`<div class="pagination"><span>Página ${page}/${Math.ceil(items.length/limit)}</span><div class="toolbar-right">${action('agenda-prev','Anterior',{cls:'button secondary small',extra:page===1?'disabled':''})}${action('agenda-next','Próxima',{cls:'button secondary small',extra:page*limit>=items.length?'disabled':''})}</div></div>`:''}<div class="data-actions">${entries.length?action('agenda-bulk','Confirmar os registros da agenda',{cls:'button primary small'}):''}</div><p class="helper">Faturas têm pagamento próprio e não entram no lote de registros.</p>`;
  const fresh=()=>{items=agendaItems(ctx.state,ctx.month);entries=items.filter(i=>i.kind==='entry').map(i=>i.entry);page=Math.min(page,Math.max(1,Math.ceil(items.length/limit)));return content();};
  api=modal({title:'Vencimentos e confirmações',body:content(),wide:true,onAction:(name,b)=>{
    if(name==='agenda-prev'||name==='agenda-next'){page+=name==='agenda-next'?1:-1;api.dialog.querySelector('.modal-body').innerHTML=content();}
    else if(name==='agenda-bulk')confirmEntries(ctx,entries,{agenda:true});
    else if(name==='invoice')openInvoice(ctx,ctx.state.accounts.find(a=>a.id===b.dataset.id),b.dataset.cycle);
    else if(name==='confirm-entry')confirmEntries(ctx,[ctx.state.entries.find(e=>e.id===b.dataset.id)]);
  }});
  refreshModal(api,fresh);
}

export function accountForm(ctx,account=null,onSaved) {
  const expected=account?clone(account):null,a=account||{name:'',type:'bank',opening:0,openingDate:today(),closingDay:25,dueDay:5};
  const body=`${field('Nome da conta',input('name',a.name,'required maxlength="60" placeholder="Ex.: Conta principal"'))}<div class="form-grid">${field('Tipo',select('type',[['bank','Conta bancária'],['cash','Dinheiro / carteira'],['credit','Cartão de crédito']],a.type))}${field(a.type==='credit'?'Dívida inicial (R$)':'Saldo inicial (R$)',input('opening',(a.opening<0?'-':'')+amount(a.opening),'required inputmode="decimal" placeholder="0,00"'),{help:'Use sinal negativo para dívida.'})}${field('Data do saldo inicial',input('openingDate',a.openingDate==='1900-01-01'?today():a.openingDate,'type="date" max="'+today()+'" required'),{help:'Valor antes das movimentações desta data.'})}<div id="card-fields" class="full" ${a.type!=='credit'?'hidden':''}><div class="form-grid">${field('Fechamento (dia)',input('closingDay',a.closingDay,'type="number" min="1" max="31"'))}${field('Vencimento (dia)',input('dueDay',a.dueDay,'type="number" min="1" max="28"'))}</div></div></div><p class="helper">Se ainda não sabe o saldo, você pode começar com zero e revisar depois. O saldo inicial não cria receita. Para cartão, as datas definem novas faturas; registros existentes mantêm o ciclo já atribuído.</p>`;
  const api=modal({title:expected?'Editar conta':'Nova conta',body,submit:expected?'Salvar conta':'Criar conta',draftKey:draftKey(ctx,'account',expected?.id||'new'),onSubmit:async f=>{
    const raw=get(f,'opening').value.trim(),absolute=cents(raw.replace(/^-/,'').trim(),'opening',true),opening=raw.startsWith('-')?-absolute:absolute;
    const next={id:expected?.id||crypto.randomUUID(),name:get(f,'name').value.trim(),type:get(f,'type').value,opening,openingDate:get(f,'openingDate').value,closingDay:Number(get(f,'closingDay').value)||25,dueDay:Number(get(f,'dueDay').value)||5};
    if(!next.name)fail('Informe o nome da conta.','name');
    if(next.openingDate>today())fail('O saldo inicial deve estar vigente hoje. Use uma data até hoje.','openingDate');
    await ctx.change(s=>{
      if(s.accounts.some(x=>x.id!==next.id&&normalized(x.name)===normalized(next.name)))fail('Já existe uma conta com esse nome.','name');
      if(expected){const index=s.accounts.findIndex(x=>x.id===expected.id);conflict(s.accounts[index],expected);if(next.type!==expected.type&&s.entries.some(e=>e.account===expected.name||e.toAccount===expected.name))fail('Esta conta possui registros. Crie uma conta do novo tipo para preservar o histórico.','type');s.accounts[index]=next;s.entries.forEach(e=>{if(e.account===expected.name)e.account=next.name;if(e.toAccount===expected.name)e.toAccount=next.name;});}
      else s.accounts.push(next);
    });toast('Conta salva.');onSaved?.(next);
  }});
  const update=()=>{const card=get(api.form,'type').value==='credit';$('#card-fields',api.form).hidden=!card;get(api.form,'closingDay').required=card;get(api.form,'dueDay').required=card;get(api.form,'opening').closest('label').querySelector('span').textContent=card?'Saldo inicial do cartão (R$)':'Saldo inicial (R$)';};
  get(api.form,'type').onchange=update;update();return api;
}

export function accountActions(ctx,a) {
  modal({title:a.name,body:`<p class="helper">${a.type==='credit'?'Cartão de crédito':'Conta financeira'}</p><div class="manager-list">${action('edit-account','Editar conta',{id:a.id,cls:'button secondary',iconName:'edit'})}${action('delete-account','Excluir conta',{id:a.id,cls:'button danger',iconName:'trash'})}</div>`,onAction:(name,b,api)=>{if(name==='edit-account')accountForm(ctx,a);if(name==='delete-account')confirmAction({title:'Excluir conta?',message:'A conta só pode ser excluída se não possuir registros e houver outra conta disponível.',label:'Excluir conta',danger:true,onConfirm:async()=>{await ctx.change(s=>{const current=s.accounts.find(x=>x.id===a.id);conflict(current,a);if(s.accounts.length===1||s.entries.some(e=>e.account===a.name||e.toAccount===a.name))fail('A conta possui registros ou é a única conta disponível. Seus dados foram preservados.');s.accounts=s.accounts.filter(x=>x.id!==a.id);});api.close(true);toast('Conta excluída.',()=>ctx.change(s=>{if(s.accounts.some(x=>x.id===a.id||normalized(x.name)===normalized(a.name)))throw Error('Uma conta equivalente já existe.');s.accounts.push(a);}));}});}});
}

export function categoryForm(ctx,category=null,onSaved) {
  const expected=category?clone(category):null;
  return modal({title:category?'Editar categoria':'Nova categoria',body:`${field('Nome',input('name',category?.name||'','required maxlength="60" placeholder="Ex.: Casa"'))}${field('Usar em',select('type',[['expense','Despesas'],['income','Receitas'],['both','Receitas e despesas']],category?.type||'expense'))}<p class="helper">Renomear atualiza os registros e orçamentos vinculados. Uma categoria em uso precisa ser reclassificada antes de excluir.</p>`,submit:category?'Salvar categoria':'Criar categoria',onSubmit:async f=>{
    const next={id:expected?.id||crypto.randomUUID(),name:get(f,'name').value.trim(),type:get(f,'type').value};
    if(!next.name)fail('Informe o nome da categoria.','name');
    await ctx.change(s=>{
      if(s.categories.some(x=>x.id!==next.id&&normalized(x.name)===normalized(next.name)))fail('Já existe uma categoria com esse nome.','name');
      if(expected){const index=s.categories.findIndex(x=>x.id===expected.id);conflict(s.categories[index],expected);if(next.type!=='both'&&(s.entries.some(e=>e.category===expected.name&&e.type!==next.type)||s.settings.budgets.some(b=>b.category===expected.name&&b.kind!==next.type)))fail('O tipo escolhido não corresponde aos registros existentes. Use receitas e despesas.','type');s.categories[index]=next;s.entries.forEach(e=>{if(e.category===expected.name)e.category=next.name;});s.settings.budgets.forEach(b=>{if(b.category===expected.name)b.category=next.name;});}else s.categories.push(next);
    });toast('Categoria salva.');onSaved?.(next);
  }});
}

export function categories(ctx) {
  let api;
  const body=()=>`<div class="page-toolbar">${action('new-category','Nova categoria',{cls:'button primary',iconName:'plus'})}<span class="helper">${plural(ctx.state.categories.length,'categoria')}</span></div><div class="manager-list">${ctx.state.categories.map(c=>`<div class="manager-item"><div><strong>${esc(c.name)}</strong><p>${{expense:'Despesas',income:'Receitas',both:'Receitas e despesas'}[c.type]}</p></div><div class="manager-actions">${action('edit-category','',{id:c.id,cls:'icon-button',iconName:'edit',extra:`aria-label="Editar ${esc(c.name)}"`})}${action('delete-category','',{id:c.id,cls:'icon-button danger-text',iconName:'trash',extra:`aria-label="Excluir ${esc(c.name)}"`})}</div></div>`).join('')}</div>`;
  const redraw=()=>{api.dialog.querySelector('.modal-body').innerHTML=body()+`<p class="form-error" role="alert" hidden></p>`;};
  api=modal({title:'Suas categorias',body:body(),wide:true,onAction:(name,b)=>{
    const c=ctx.state.categories.find(c=>c.id===b.dataset.id);
    if(name==='new-category')categoryForm(ctx,null,redraw);
    if(name==='edit-category')categoryForm(ctx,c,redraw);
    if(name==='delete-category')confirmAction({title:'Excluir categoria?',message:`Excluir ${c.name}? Categorias vinculadas a registros ou orçamentos não podem ser removidas.`,label:'Excluir categoria',danger:true,onConfirm:async()=>{await ctx.change(s=>{conflict(s.categories.find(x=>x.id===c.id),c);if(s.entries.some(e=>e.category===c.name)||s.settings.budgets.some(b=>b.category===c.name))fail('Categoria em uso. Renomeie ou reclassifique os registros antes de excluir.');s.categories=s.categories.filter(x=>x.id!==c.id);});redraw();toast('Categoria excluída.',()=>ctx.change(s=>{if(s.categories.some(x=>normalized(x.name)===normalized(c.name)))throw Error('Uma categoria equivalente já existe.');s.categories.push(c);}));}});
  }});
}

export function openInvoice(ctx,a,cycle=ctx.month) {
  if(!a)return;let page=1,api;
  let inv=invoice(ctx.state.entries,a,cycle),purchases=[...inv.purchases].sort((x,y)=>x.date.localeCompare(y.date));const limit=25;
  const body=()=>`<div class="page-toolbar">${action('invoice-prev','Ciclo anterior',{cls:'text-button'})}<strong>${esc(monthLabel(cycle))}</strong>${action('invoice-next','Próximo ciclo',{cls:'text-button'})}</div><p class="helper">Vencimento ${dateLabel(inv.dueDate)} · fechamento no dia ${a.closingDay}</p><div class="invoice-summary"><div><span>Total de compras</span><strong>${ctx.cash(inv.total)}</strong></div><div><span>A pagar</span><strong>${ctx.cash(Math.max(0,inv.remaining))}</strong></div><div><span>Pago</span><strong>${ctx.cash(inv.paid)}</strong></div><div><span>Programado</span><strong>${ctx.cash(inv.scheduled)}</strong></div></div>${inv.unallocated>0?action('invoice-payment','Registrar pagamento',{cls:'button primary',iconName:'check'}):inv.remaining>0?`<p class="inline-note">Todo o saldo restante tem pagamento programado. Confira a data e confirme o pagamento na lista de movimentações quando ele acontecer.</p>`:`<p class="inline-note">${inv.total?'Fatura integralmente paga.':'Ainda sem compras neste ciclo.'}</p>`}<p class="helper">Programado não significa pago. Registrar pagamento transfere dinheiro da conta de origem para o cartão.</p>${ctx.state.entries.filter(e=>e.type==='transfer'&&e.toAccount===a.name&&e.invoiceMonth===cycle).length?`<h3 class="list-subtitle">Pagamentos desta fatura</h3><div class="bulk-list">${ctx.state.entries.filter(e=>e.type==='transfer'&&e.toAccount===a.name&&e.invoiceMonth===cycle).map(e=>`<div class="invoice-item"><div><strong>${esc(statusLabel(ctx.state,e))}</strong><p>${esc(e.account)} · ${dateLabel(e.settledDate||e.dueDate)}</p>${e.status!=='settled'?action('confirm-payment','Confirmar pagamento',{id:e.id,cls:'text-button'}):''}</div><span>${ctx.cash(e.cents)}</span></div>`).join('')}</div>`:''}<h3 class="list-subtitle">Compras do ciclo</h3><div class="bulk-list">${purchases.slice((page-1)*limit,page*limit).map(e=>`<div class="invoice-item"><div><strong>${esc(e.description)}${e.installment?` (${e.installment}/${e.installments})`:''}</strong><p>${dateLabel(e.date)} · ${esc(e.category)} · ${esc(statusLabel(ctx.state,e))}</p></div><span>${ctx.cash(e.cents)}</span></div>`).join('')}</div>${purchases.length>limit?`<div class="pagination"><span>${page}/${Math.ceil(purchases.length/limit)}</span>${action('purchases-prev','Anterior',{cls:'button secondary small',extra:page===1?'disabled':''})}${action('purchases-next','Próxima',{cls:'button secondary small',extra:page*limit>=purchases.length?'disabled':''})}</div>`:''}`;
  api=modal({title:`Fatura · ${a.name}`,body:body(),wide:true,onAction:(name,b)=>{
    if(name==='invoice-prev'||name==='invoice-next'){api.close(true);openInvoice(ctx,a,shiftMonth(`${cycle}-01`,name==='invoice-next'?1:-1).slice(0,7));}
    if(name==='purchases-prev'||name==='purchases-next'){page+=name==='purchases-next'?1:-1;api.dialog.querySelector('.modal-body').innerHTML=body();}
    if(name==='invoice-payment')invoicePayment(ctx,a,cycle);
    if(name==='confirm-payment')confirmEntries(ctx,[ctx.state.entries.find(e=>e.id===b.dataset.id)]);
  }});
  refreshModal(api,()=>{inv=invoice(ctx.state.entries,a,cycle);purchases=[...inv.purchases].sort((x,y)=>x.date.localeCompare(y.date));page=Math.min(page,Math.max(1,Math.ceil(purchases.length/limit)));return body();});
}

export function invoicePayment(ctx,a,cycle,onSaved) {
  const bill=invoice(ctx.state.entries,a,cycle),bankAccounts=ctx.state.accounts.filter(x=>x.type!=='credit');
  const api=modal({title:'Registrar pagamento da fatura',description:`${a.name} · ${monthLabel(cycle)} · vence ${dateLabel(bill.dueDate)}`,body:`${field('Conta de origem',select('account',bankAccounts.map(x=>x.name),bankAccounts[0]?.name,'Escolha a conta','required'))}${field('Valor do pagamento (R$)',input('amount',amount(bill.unallocated),decimal),{help:'Você pode registrar pagamento parcial.'})}<div class="form-grid">${field('Status',select('status',[['settled','Já paguei'],['planned','Programar pagamento']],'settled'))}${field('Data do pagamento',input('date',today(),'type="date" max="'+today()+'" required'))}</div><p class="helper">Disponível para novo pagamento: ${ctx.cash(bill.unallocated)}. Compras não serão lançadas outra vez como despesas.</p>`,submit:'Registrar pagamento',onSubmit:async f=>{
    const value=cents(get(f,'amount').value),date=get(f,'date').value,status=get(f,'status').value,account=get(f,'account').value;
    if(status==='settled'&&date>today())fail('Use uma data até hoje ou programe o pagamento.','date');
    await ctx.change(s=>{const current=invoice(s.entries,a,cycle);if(value>current.unallocated)fail('O valor supera o saldo disponível da fatura depois dos pagamentos realizados e programados.','amount');if(!s.accounts.some(x=>x.name===account&&x.type!=='credit'))fail('Escolha uma conta bancária ou carteira.','account');s.entries.push({id:crypto.randomUUID(),description:`Pagamento de fatura · ${a.name}`,category:'Transferência',account,toAccount:a.name,type:'transfer',cents:value,date,dueDate:date,status,settledDate:status==='settled'?date:'',invoiceMonth:cycle,notes:''});});
    toast(status==='settled'?'Pagamento registrado.':'Pagamento programado; confirme quando acontecer.');onSaved?.();
  }});
  get(api.form,'status').onchange=()=>{const done=get(api.form,'status').value==='settled';get(api.form,'date').max=done?today():'';if(!done)get(api.form,'date').value=bill.dueDate;get(api.form,'date').closest('label').querySelector('span').textContent=done?'Data do pagamento':'Data prevista';};
}

export function budgetForm(ctx,budget=null) {
  const expected=budget?clone(budget):null;
  const api=modal({title:budget?'Editar orçamento':'Novo orçamento',description:`Planejamento para ${monthLabel(ctx.month)}`,body:`${field('Objetivo',select('kind',[['expense','Limite de despesa'],['income','Meta de receita']],budget?.kind||'expense'))}${field('Categoria',select('category',ctx.state.categories.filter(c=>c.type===(budget?.kind||'expense')||c.type==='both').map(c=>c.name),budget?.category,'Escolha uma categoria','required'))}${field('Valor mensal (R$)',input('limit',budget?amount(budget.limit):'',decimal))}${budget?action('delete-budget','Excluir orçamento',{cls:'text-button danger-text'}):''}`,submit:'Salvar orçamento',onAction:(name,b,owner)=>{
    if(name==='delete-budget')confirmAction({title:'Excluir orçamento?',message:`Remover o planejamento de ${budget.category} neste mês? Os registros financeiros serão mantidos.`,label:'Excluir orçamento',danger:true,onConfirm:async()=>{await ctx.change(s=>{conflict(s.settings.budgets.find(x=>x.month===expected.month&&x.category===expected.category),expected);s.settings.budgets=s.settings.budgets.filter(x=>!(x.month===expected.month&&x.category===expected.category));});owner.close(true);toast('Orçamento excluído.',()=>ctx.change(s=>{if(s.settings.budgets.some(x=>x.month===expected.month&&x.category===expected.category))throw Error('Um orçamento para essa categoria já existe.');s.settings.budgets.push(expected);}));}});
  },onSubmit:async f=>{
    const next={month:ctx.month,category:get(f,'category').value,kind:get(f,'kind').value,limit:cents(get(f,'limit').value,'limit')};
    const prior=clone(ctx.state.settings.budgets.find(x=>x.month===next.month&&x.category===next.category)||null);
    await ctx.change(s=>{if(expected){conflict(s.settings.budgets.find(x=>x.month===expected.month&&x.category===expected.category),expected);if(next.category!==expected.category&&s.settings.budgets.some(x=>x.month===next.month&&x.category===next.category))fail('Já existe um orçamento para essa categoria neste mês.','category');s.settings.budgets=s.settings.budgets.filter(x=>!(x.month===expected.month&&x.category===expected.category));}else if(prior)fail('Já existe orçamento para esta categoria. Abra Editar para alterar.','category');s.settings.budgets.push(next);});toast('Orçamento salvo.');
  }});
  get(api.form,'kind').onchange=()=>{get(api.form,'category').innerHTML=options(ctx.state.categories.filter(c=>c.type===get(api.form,'kind').value||c.type==='both').map(c=>c.name),'','Escolha uma categoria');};
}

export function copyBudgets(ctx) {
  const previous=shiftMonth(`${ctx.month}-01`,-1).slice(0,7),source=ctx.state.settings.budgets.filter(b=>b.month===previous),missing=source.filter(b=>!ctx.state.settings.budgets.some(x=>x.month===ctx.month&&x.category===b.category));
  confirmAction({title:'Copiar orçamento anterior',message:source.length?`${plural(missing.length,'categoria')} de ${monthLabel(previous)} serão copiadas. Categorias já planejadas neste mês serão preservadas.`:'Não existe orçamento no mês anterior. Crie seu primeiro planejamento.',label:source.length?'Copiar orçamento':'Entendi',onConfirm:async()=>{if(!missing.length)return;await ctx.change(s=>{for(const b of missing)if(!s.settings.budgets.some(x=>x.month===ctx.month&&x.category===b.category))s.settings.budgets.push({...b,month:ctx.month});});toast('Orçamento copiado.');}});
}

export function goalForm(ctx,goal=null) {
  const expected=goal?clone(goal):null;
  modal({title:goal?'Editar meta':'Nova meta',body:`${field('Nome da meta',input('name',goal?.name||'','required maxlength="80" placeholder="Ex.: Reserva de emergência"'))}<div class="form-grid">${field('Objetivo (R$)',input('target',goal?amount(goal.target):'',decimal))}${field('Já guardado (R$)',input('saved',goal?amount(goal.saved):'0,00',decimal))}${field('Data do objetivo (opcional)',input('targetDate',goal?.targetDate||'','type="date"'),{wide:true})}</div><p class="inline-note">Acompanhamento manual. A meta não separa dinheiro da conta nem cria movimentações. Atualize apenas o que você já guardou.</p>${goal?action('delete-goal','Excluir meta',{cls:'text-button danger-text'}):''}`,submit:'Salvar meta',draftKey:draftKey(ctx,'goal',goal?.id||'new'),onAction:(name,b,api)=>{
    if(name==='delete-goal')confirmAction({title:'Excluir meta?',message:`Excluir ${goal.name}? Nenhuma movimentação de conta será removida.`,label:'Excluir meta',danger:true,onConfirm:async()=>{await ctx.change(s=>{conflict(s.settings.goals.find(x=>x.id===expected.id),expected);s.settings.goals=s.settings.goals.filter(x=>x.id!==expected.id);});api.close(true);toast('Meta excluída.',()=>ctx.change(s=>{if(s.settings.goals.some(x=>x.id===expected.id))throw Error('Essa meta já existe.');s.settings.goals.push(expected);}));}});
  },onSubmit:async f=>{
    const next={...(expected||{}),id:expected?.id||crypto.randomUUID(),name:get(f,'name').value.trim(),target:cents(get(f,'target').value,'target'),saved:cents(get(f,'saved').value,'saved',true)},targetDate=get(f,'targetDate').value;
    if(!next.name)fail('Dê um nome à sua meta.','name');if(targetDate){if(!validDate(targetDate))fail('Informe uma data válida.','targetDate');next.targetDate=targetDate;}else delete next.targetDate;
    await ctx.change(s=>{if(expected){const index=s.settings.goals.findIndex(x=>x.id===expected.id);conflict(s.settings.goals[index],expected);s.settings.goals[index]=next;}else s.settings.goals.push(next);});toast('Meta salva.');
  }});
}

export function goalValue(ctx,g) {
  modal({title:'Atualizar valor guardado',description:g.name,body:`${field('Total já guardado (R$)',input('saved',amount(g.saved),decimal))}<p class="helper">Informe o total atual, não apenas o último aporte. Essa atualização manual não movimenta uma conta.</p>`,submit:'Atualizar valor',onSubmit:async f=>{const saved=cents(get(f,'saved').value,'saved',true);await ctx.change(s=>{const index=s.settings.goals.findIndex(x=>x.id===g.id);conflict(s.settings.goals[index],g);s.settings.goals[index].saved=saved;});toast('Valor guardado atualizado.');}});
}

export function seriesDetails(ctx,id) {
  const group=recurringGroups(ctx.state).find(g=>g.id===id);if(!group)return;
  modal({title:group.name,description:`${plural(group.entries.length,'ocorrência')} · fim em ${dateLabel(group.end)}`,body:`<div class="bulk-list">${group.entries.map(e=>`<div class="invoice-item"><div>${action('edit-entry',`${e.description}${e.installment?` (${e.installment}/${e.installments})`:''}`,{id:e.id,cls:'text-button'})}<p>Referência ${dateLabel(e.date)} · vence ${dateLabel(e.dueDate)}</p>${badge(statusLabel(ctx.state,e),e.status==='settled'?'success':'warning')}</div><span>${ctx.cash(e.cents)}</span></div>`).join('')}</div>${group.pending.length?`<div class="data-actions">${action('edit-series','Editar próximos previstos',{id,cls:'button secondary'})}${action('cancel-series','Excluir próximos previstos',{id,cls:'button danger'})}</div>`:''}<p class="helper">Registros realizados e antigos sem confirmação não são excluídos ao cancelar previstos.</p>`,wide:true,onAction:(name,b)=>{
    if(name==='edit-entry')entryForm(ctx,ctx.state.entries.find(e=>e.id===b.dataset.id));
    if(name==='edit-series')editSeries(ctx,id);
    if(name==='cancel-series')cancelSeries(ctx,id);
  }});
}

export function editSeries(ctx,id) {
  const group=recurringGroups(ctx.state).find(g=>g.id===id);if(!group?.pending.length)return;
  const expected=group.pending.map(clone),first=expected[0];
  modal({title:'Editar próximos previstos',description:`${plural(expected.length,'registro')} a partir de ${dateLabel(first.date)}. Realizados serão preservados.`,body:`${field('Descrição',input('description',first.description,'required maxlength="160"'))}${field('Categoria',select('category',ctx.state.categories.filter(c=>c.type===first.type||c.type==='both').map(c=>c.name),first.category,'Escolha a categoria','required'))}${!group.installments?field('Valor mensal (R$)',input('amount',amount(first.cents),decimal)):'<p class="inline-note">Valores de parcelas são preservados. Ajuste o valor de uma parcela pelo registro individual.</p>'}<p class="helper">Datas, contas, quantidade e ciclo da série serão mantidos. Para mudar um registro isolado, use sua edição individual.</p>`,submit:`Atualizar ${expected.length} previstos`,onSubmit:async f=>{const description=get(f,'description').value.trim(),category=get(f,'category').value,value=group.installments?null:cents(get(f,'amount').value);await ctx.change(s=>{for(const e of expected){const index=s.entries.findIndex(x=>x.id===e.id);conflict(s.entries[index],e);s.entries[index]={...s.entries[index],description,category,...(value!==null?{cents:value}:{})};}});toast('Próximos previstos atualizados.');}});
}

export function cancelSeries(ctx,id) {
  const group=recurringGroups(ctx.state).find(g=>g.id===id),expected=group?.pending.map(clone)||[];
  if(!expected.length)return;
  confirmAction({title:'Excluir próximos previstos?',message:`Excluir ${plural(expected.length,'registro previsto','registros previstos')} de ${group.name}, a partir de ${dateLabel(expected[0].date)}? Registros realizados e sem confirmação serão mantidos. Você poderá desfazer.`,label:`Excluir ${expected.length} previstos`,danger:true,onConfirm:async()=>{await ctx.change(s=>{expected.forEach(e=>conflict(s.entries.find(x=>x.id===e.id),e));s.entries=s.entries.filter(e=>!expected.some(x=>x.id===e.id));});toast('Próximos previstos excluídos.',()=>ctx.change(s=>{if(expected.some(e=>s.entries.some(x=>x.id===e.id)))throw Error('Parte dessa série já foi recuperada.');s.entries.push(...expected);}));}});
}

export async function deleteEntry(ctx,e) {
  await ctx.change(s=>{conflict(s.entries.find(x=>x.id===e.id),e);s.entries=s.entries.filter(x=>x.id!==e.id);});
  ctx.selected.delete(e.id);toast('Movimentação excluída.',()=>ctx.change(s=>{if(s.entries.some(x=>x.id===e.id))throw Error('Esse registro já existe.');s.entries.push(e);}));
}

export function profileForm(ctx) {
  const expected=clone(ctx.state.settings.profile);let photo=expected.photo,request=0,loading=false;
  const body=`<div class="photo-editor"><div class="avatar" id="photo-preview"></div><div class="photo-actions"><button type="button" data-action="choose-photo" class="button secondary small">${icon('camera')}Alterar foto</button>${action('remove-photo','Remover foto',{cls:'text-button'})}<label class="photo-zoom" hidden><span class="sr-only">Ampliar foto</span><input type="range" id="photo-zoom" min="1" max="3" step="0.01" value="1"></label><small class="photo-hint" hidden>Arraste a foto para enquadrar ou use as setas do teclado.</small><small>JPG, PNG ou WebP · até 8 MB</small><input name="photo" type="file" accept="image/png,image/jpeg,image/webp" hidden></div></div>${field('Como podemos chamar você?',input('name',expected.name,'maxlength="60" placeholder="Seu nome"'))}<p class="helper">Seu nome e sua foto são sincronizados somente nos dispositivos da sua conta.</p><p class="helper">Conta conectada: ${esc(ctx.workspace.email||'ChatGPT')}</p>`;
  const paint=()=>{const avatar=$('#photo-preview',api.form);avatar.replaceChildren();if(photo){const img=document.createElement('img');img.src=photo;img.alt='Prévia da foto';avatar.append(img);}else avatar.textContent=(get(api.form,'name').value.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('')||'EU').toUpperCase();};
  const api=modal({title:'Seu perfil',body,submit:'Salvar perfil',onAction:(name)=>{if(name==='choose-photo')get(api.form,'photo').click();if(name==='remove-photo'){request++;drop();photo='';loading=false;paint();api.setDirty();api.form.querySelector('[type=submit]').disabled=false;}},onSubmit:async f=>{if(loading)fail('Aguarde o processamento da foto.');const profile={name:get(f,'name').value.trim(),photo};await ctx.change(s=>{conflict(s.settings.profile,expected);s.settings.profile=profile;});toast('Perfil atualizado.');}});
  paint();get(api.form,'name').oninput=paint;
  const N=320,editor=api.form.querySelector('.photo-editor'),preview=$('#photo-preview',api.form),zoomRow=$('.photo-zoom',api.form),zoom=$('#photo-zoom',api.form),hint=$('.photo-hint',api.form);
  let frame=null,drag=null;
  const side=()=>Math.min(frame.bitmap.width,frame.bitmap.height)/frame.zoom;
  function drop(){frame?.bitmap.close();frame=null;drag=null;zoomRow.hidden=hint.hidden=true;editor.classList.remove('framing');preview.removeAttribute('tabindex');preview.removeAttribute('role');preview.removeAttribute('aria-label');}
  function render(){const s=side(),{width,height}=frame.bitmap;frame.x=Math.min(width-s/2,Math.max(s/2,frame.x));frame.y=Math.min(height-s/2,Math.max(s/2,frame.y));const canvas=document.createElement('canvas');canvas.width=canvas.height=N;const context=canvas.getContext('2d');context.fillStyle='#edf2ec';context.fillRect(0,0,N,N);context.drawImage(frame.bitmap,frame.x-s/2,frame.y-s/2,s,s,0,0,N,N);photo=canvas.toDataURL('image/jpeg',.85);paint();api.setDirty();}
  preview.addEventListener('pointerdown',e=>{if(!frame)return;drag={x:e.clientX,y:e.clientY};preview.setPointerCapture(e.pointerId);});
  preview.addEventListener('pointermove',e=>{if(!drag||!frame)return;const k=side()/preview.clientWidth;frame.x-=(e.clientX-drag.x)*k;frame.y-=(e.clientY-drag.y)*k;drag={x:e.clientX,y:e.clientY};render();});
  for(const type of ['pointerup','pointercancel'])preview.addEventListener(type,()=>{drag=null;});
  preview.addEventListener('keydown',e=>{const move={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!frame||!move)return;e.preventDefault();frame.x+=move[0]*side()*.05;frame.y+=move[1]*side()*.05;render();});
  zoom.addEventListener('input',()=>{if(frame){frame.zoom=Number(zoom.value);render();}});
  get(api.form,'photo').onchange=async ev=>{const file=ev.target.files[0];if(!file)return;const current=++request,button=api.form.querySelector('[type=submit]');try{if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024)fail('Escolha JPG, PNG ou WebP até 8 MB.');loading=true;button.disabled=true;const bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>50000000){bitmap.close();fail('A imagem é muito grande. Escolha uma foto menor.');}if(current!==request||!api.dialog.open){bitmap.close();return;}drop();const base=Math.min(bitmap.width,bitmap.height);frame={bitmap,zoom:1,x:bitmap.width/2,y:base/2+(bitmap.height-base)*.25};zoom.value=1;zoomRow.hidden=hint.hidden=false;editor.classList.add('framing');preview.tabIndex=0;preview.setAttribute('role','group');preview.setAttribute('aria-label','Enquadramento da foto: arraste ou use as setas');render();}catch(err){api.showError(err.field?err.message:err.message.startsWith('Escolha')||err.message.startsWith('A imagem')?err.message:'Não foi possível abrir a imagem. Escolha outra foto.');}finally{if(current===request){loading=false;button.disabled=false;}ev.target.value='';}};
  api.dialog.addEventListener('close',()=>{request++;drop();});return api;
}

export function exportCsv(ctx) {
  const rows=filteredEntries(ctx.state,ctx.filter,ctx.month);
  download(csvText(ctx.state,rows),`saldo-resultados-${ctx.month}.csv`,'text/csv;charset=utf-8');toast(`${plural(rows.length,'resultado')} ${rows.length===1?'exportado':'exportados'}.`);
}

export function saveBackup(ctx) {ctx.store.refresh();download(JSON.stringify(dataState(ctx.store.state),null,2),`saldo-backup-${today()}.json`);toast('Backup completo preparado.');}
export function previousBackup(ctx) {
  const storage=ctx.workspace.storage,previous=storage.getItem('saldo.before-sync-conflict.v3')||storage.getItem('saldo.before-restore.v3')||storage.getItem('saldo.before-sync.v3');
  if(previous){download(previous,`saldo-backup-anterior-${today()}.json`);return;}
  const migrated=JSON.parse(storage.getItem(LEGACY_BACKUP_KEY)||'null');
  if(migrated){download(JSON.stringify({version:2,entries:JSON.parse(migrated.entriesRaw||'[]'),settings:JSON.parse(migrated.settingsRaw||'null')||{profile:{name:'',photo:''},goals:[],budgets:[]}},null,2),`saldo-antes-migracao-${today()}.json`);return;}
  modal({title:'Sem backup anterior',body:'<p>Não há uma cópia anterior neste aparelho. Use Salvar backup para guardar seu espaço atual.</p>'});
}

export function restoreBackup(ctx) {
  const chooser=document.createElement('input');chooser.type='file';chooser.accept='application/json';chooser.hidden=true;document.body.append(chooser);
  chooser.onchange=async()=>{const file=chooser.files[0];chooser.remove();if(!file)return;
    try{
      if(file.size>20*1024*1024)throw Error('O backup excede 20 MB. Escolha um arquivo menor.');
      let data;try{data=JSON.parse(await file.text());}catch{throw Error('O arquivo não contém JSON válido. Escolha um backup exportado pelo Saldo.');}
      let imported;
      if(data.version===3){if(!validState(data))throw Error('Backup inválido: faltam dados obrigatórios ou existem referências incompatíveis. Seus dados foram preservados.');imported=data;}
      else if([1,2].includes(data.version)){if(!Array.isArray(data.entries)||!data.entries.every(validEntry)||data.version===2&&!validSettings(data.settings))throw Error('Backup antigo inválido. Seus dados foram preservados.');imported=migrate(data.entries,data.version===2?data.settings:undefined);}
      else throw Error('Versão de backup não reconhecida. Use um backup do Saldo nas versões 1, 2 ou 3.');
      const revision=ctx.state?.revision,expectedRaw=ctx.workspace.storage.getItem(STORE_KEY),dates=imported.entries.map(e=>e.date).sort();
      modal({title:'Substituir seu espaço pelo backup?',body:`<div class="alert warning"><div><strong>Todos os dispositivos da sua conta serão atualizados</strong><p>A restauração substitui registros, contas, categorias, perfil, orçamento e metas. A alteração será sincronizada quando houver conexão.</p></div></div><p><strong>${esc(file.name)}</strong></p><p class="helper">${plural(imported.entries.length,'registro')} · ${plural(imported.accounts.length,'conta')} · ${plural(imported.categories.length,'categoria')}</p><p class="helper">${dates.length?`Período de ${dateLabel(dates[0])} a ${dateLabel(dates.at(-1))}`:'Arquivo sem lançamentos'}</p><p class="helper">Será guardado um backup local automático do espaço atual. Para manter uma cópia externa, salve um backup antes de confirmar.</p>`,submit:'Substituir e sincronizar',onSubmit:async()=>{
        if(ctx.storageError){await ctx.store.recover(imported,expectedRaw);ctx.storageError=false;ctx.sync.schedule();ctx.render();}
        else await ctx.change(s=>{ctx.workspace.storage.setItem('saldo.before-restore.v3',JSON.stringify(s));s.entries=imported.entries;s.settings=imported.settings;s.accounts=imported.accounts;s.categories=imported.categories;},{revision});
        toast('Backup restaurado neste aparelho. A sincronização atualizará sua conta.');
      }});
    }catch(err){modal({title:'Não foi possível restaurar',body:`<p>${esc(err.message)}</p><p class="helper">Nenhum registro atual foi substituído.</p>`});}
  };
  chooser.addEventListener('cancel',()=>chooser.remove());chooser.click();
}

export function syncConflicts(ctx) {
  const conflicts=ctx.state._sync?.conflicts||[];if(!conflicts.length){toast('Nenhum conflito para revisar.');return;}
  const labels={description:'Descrição',cents:'Valor',category:'Categoria',account:'Origem',toAccount:'Destino',date:'Referência',dueDate:'Vencimento',settledDate:'Data efetiva',status:'Status',invoiceMonth:'Fatura',notes:'Observação',name:'Nome',type:'Tipo',opening:'Saldo inicial',openingDate:'Data inicial',closingDay:'Fechamento',dueDay:'Vencimento (dia)',target:'Objetivo',saved:'Guardado',targetDate:'Prazo',limit:'Limite',kind:'Objetivo',month:'Mês',photo:'Foto'};
  let api;
  const fmt=(key,value)=>value===undefined?'Removido':['cents','opening','target','saved','limit'].includes(key)?ctx.cash(value):key==='photo'?(value?'Com foto':'Sem foto'):esc(typeof value==='object'?JSON.stringify(value):String(value));
  const body=()=>conflicts.map((c,index)=>{const local=c.local||{},remote=c.remote||{},keys=c.structural?[]:[...new Set([...Object.keys(local),...Object.keys(remote)])].filter(k=>!['id','seriesId'].includes(k)&&JSON.stringify(local[k])!==JSON.stringify(remote[k]));return `<section class="section"><h3>${esc(c.structural?'Contas e categorias incompatíveis':local.description||remote.description||local.name||remote.name||'Planejamento / perfil')}</h3>${c.structural?`<p class="helper">A combinação depende de contas ou categorias que foram alteradas. Escolha o espaço completo que deseja manter.</p><p>Neste aparelho: ${plural(local.entries?.length||0,'registro')} · ${plural(local.accounts?.length||0,'conta')}</p><p>Na conta: ${plural(remote.entries?.length||0,'registro')} · ${plural(remote.accounts?.length||0,'conta')}</p>`:`<table class="conflict-table"><thead><tr><th scope="col">Campo</th><th scope="col">Neste aparelho</th><th scope="col">Na sua conta</th></tr></thead><tbody>${keys.map(key=>`<tr class="changed"><th scope="row">${esc(labels[key]||key)}</th><td>${fmt(key,c.local?.[key])}</td><td>${fmt(key,c.remote?.[key])}</td></tr>`).join('')||'<tr><td>Registro</td><td>Presente</td><td>Removido</td></tr>'}</tbody></table>`}<div class="data-actions">${action('resolve-local','Manter deste aparelho',{id:String(index),cls:'button secondary'})}${action('resolve-remote','Usar versão da conta',{id:String(index),cls:'button primary'})}</div></section>`;}).join('');
  api=modal({title:'Revisar alterações entre dispositivos',description:'Somente os campos diferentes são mostrados. Uma cópia anterior é preservada neste aparelho.',body:body(),wide:true,onAction:async(name,b)=>{if(!name.startsWith('resolve-'))return;b.disabled=true;try{await ctx.sync.resolve(conflicts[Number(b.dataset.id)],name==='resolve-local'?'local':'remote');api.close(true);if(ctx.state._sync?.conflicts?.length)syncConflicts(ctx);else toast('Conflitos resolvidos.');}catch(err){api.showError(err.message);b.disabled=false;}}});
}
