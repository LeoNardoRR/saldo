import {selectWorkspace} from './identity.js';
import {createStore,STORE_KEY} from './store.js';
import {createSync} from './sync.js';
import {dataState} from './sync-merge.js';
import {shiftMonth} from './finance.js';
import {today,money,monthLabel,filteredEntries} from './product.js';
import {$,esc,icon,hydrateIcons,avatar,modal,action,download} from './ui.js';
import {pages,pageMeta} from './views.js';
import * as flows from './flows.js';

hydrateIcons();
const workspace=await selectWorkspace();
let initialMonth='';
try{initialMonth=sessionStorage.getItem(workspace.monthKey)||'';}catch{}
if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(initialMonth))initialMonth=today().slice(0,7);
let preferences={};
try{preferences=JSON.parse(workspace.storage.getItem('saldo.preferences.v4')||'{}');}catch{}
const aliases={'accounts-section':'accounts',overview:'overview',transactions:'transactions',planning:'planning',accounts:'accounts',recurring:'recurring',settings:'settings'};
const filterDefaults=()=>({query:'',type:'',account:'',category:'',status:'',allPeriods:false,basis:'reference',sort:'date',direction:-1,page:1,size:25});
const ctx={workspace,state:null,month:initialMonth,page:aliases[location.hash.slice(1)]||'overview',preferences,filter:filterDefaults(),mobileFilters:false,selected:new Set(),categoryMode:'all',storageError:false,syncStatus:{kind:'busy',message:'Abrindo seu espaço…'}};
ctx.cash=c=>ctx.preferences.hidden?'<span class="financial-value" aria-label="Valor oculto">••••</span>':`<span class="financial-value">${esc(money(c))}</span>`;
ctx.setPreference=(key,value)=>{ctx.preferences[key]=value;try{workspace.storage.setItem('saldo.preferences.v4',JSON.stringify(ctx.preferences));}catch{};};
const main=$('#main-content');
let lastData='',firstCloud=true;

function saveContext(){try{sessionStorage.setItem(workspace.monthKey,ctx.month);}catch{}}
function updateHeader(){
  const [title,subtitle]=pageMeta[ctx.page];$('#page-title').textContent=title;$('#page-subtitle').textContent=subtitle;document.title=`${title} · Saldo`;
  $('#month').value=ctx.month;$('#month-display').textContent=monthLabel(ctx.month);$('#period-control').hidden=ctx.page==='settings'||ctx.page==='recurring';
  document.querySelectorAll('[data-page]').forEach(a=>{if(a.dataset.page===ctx.page)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  const more=$('.mobile-nav [data-action=more]');if(['settings','recurring','planning'].includes(ctx.page))more.setAttribute('aria-current','page');else more.removeAttribute('aria-current');
  document.body.classList.toggle('values-hidden',Boolean(ctx.preferences.hidden));
  const privacy=$('#privacy-toggle');privacy.setAttribute('aria-label',ctx.preferences.hidden?'Mostrar valores':'Ocultar valores');privacy.title=privacy.getAttribute('aria-label');privacy.innerHTML=icon(ctx.preferences.hidden?'eye-off':'eye');
  if(ctx.state){const p=ctx.state.settings.profile;avatar($('#sidebar-avatar'),p.photo,p.name);avatar($('#header-profile'),p.photo,p.name);$('#profile-name').textContent=p.name||'Meu espaço';}
}

function captureFocus(){
  const el=document.activeElement;if(!main.contains(el))return null;
  return {id:el.id,action:el.dataset.action,entry:el.dataset.id,select:el.dataset.select,start:el.selectionStart,end:el.selectionEnd};
}
function restoreFocus(saved){
  if(!saved)return;let el;
  if(saved.id)el=document.getElementById(saved.id);
  else if(saved.action)el=main.querySelector(`[data-action="${CSS.escape(saved.action)}"]${saved.entry!==undefined?`[data-id="${CSS.escape(saved.entry)}"]`:''}`);
  else if(saved.select)el=main.querySelector(`[data-select="${CSS.escape(saved.select)}"]`);
  if(el){el.focus({preventScroll:true});if(saved.start!==null&&saved.start!==undefined)try{el.setSelectionRange(saved.start,saved.end);}catch{}}else main.focus({preventScroll:true});
}
ctx.render=()=>{
  updateHeader();if(!ctx.state&&!ctx.storageError)return;
  if(ctx.storageError){main.innerHTML=`<div class="alert danger">${icon('alert')}<div><strong>Vamos preservar seus dados</strong><p>A cópia local precisa de recuperação. Exporte o conteúdo original antes de restaurar um backup válido.</p></div></div><div class="data-actions">${action('recovery-backup','Exportar recuperação',{cls:'button primary'})}${action('restore','Restaurar backup',{cls:'button secondary'})}</div>`;return;}
  const saved=captureFocus();main.innerHTML=pages[ctx.page](ctx);main.setAttribute('aria-busy','false');restoreFocus(saved);
  if(ctx.flash){const ids=ctx.flash;ctx.flash=null;for(const id of ids)main.querySelectorAll(`[data-entry-id="${CSS.escape(id)}"],[data-select="${CSS.escape(id)}"]`).forEach(el=>(el.closest('tr,article')||el).classList.add('row-flash'));}
  if(ctx.store?.legacyChanged())main.insertAdjacentHTML('afterbegin',`<div class="alert warning"><div><strong>Uma versão antiga alterou dados neste aparelho</strong><p>Salve um backup na janela antiga antes de restaurar aqui. Feche versões antigas para evitar divergências.</p></div></div>`);
};
ctx.navigate=page=>{if(!pages[page])return;if(ctx.page!==page){ctx.page=page;ctx.selected.clear();ctx.render();$('.main-shell').scrollTo({top:0,behavior:'instant'});window.scrollTo({top:0,behavior:'instant'});}if(location.hash!==`#${page}`)location.hash=page;};
ctx.setMonth=month=>{ctx.month=month;ctx.filter.page=1;ctx.selected.clear();saveContext();ctx.render();};

ctx.store=createStore({storage:workspace.storage,onChange:state=>{
  ctx.state=state;const next=JSON.stringify(dataState(state));if(next!==lastData){lastData=next;ctx.render();document.dispatchEvent(new Event('saldo:data-change'));}
}});
ctx.change=async(change,options)=>{
  if(ctx.storageError)throw Error('Recupere os dados antes de salvar.');
  let state;try{state=await ctx.store.change(change,options);}catch(error){ctx.flash=null;throw error;}ctx.sync?.schedule();return state;
};

function showSync(status){
  if(status.kind==='account'){workspace.mask('A conta mudou. Abrindo o espaço da conta atual…',{clearActive:false});location.reload();return;}
  if(status.kind==='auth'){workspace.mask('Sua sessão terminou. Entre novamente para acessar seu espaço.');return;}
  // Quiet background verification must not repeatedly announce loading or replace focused UI.
  if(status.kind==='busy'&&ctx.syncStatus.kind==='synced')return;
  ctx.syncStatus=status;
  if(status.kind==='synced'&&firstCloud){firstCloud=false;let savedMonth='';try{savedMonth=sessionStorage.getItem(workspace.monthKey)||'';}catch{}if(!savedMonth&&ctx.state?.entries.length&&!ctx.state.entries.some(e=>e.date.startsWith(ctx.month))){const monthIndex=m=>Number(m.slice(0,4))*12+Number(m.slice(5,7)),current=monthIndex(today().slice(0,7));const chosen=[...new Set(ctx.state.entries.map(e=>e.date.slice(0,7)))].sort((a,b)=>Math.abs(monthIndex(a)-current)-Math.abs(monthIndex(b)-current)||b.localeCompare(a))[0];ctx.setMonth(chosen);}}
  $('#sync-control').dataset.kind=status.kind;
  const label=$('#sync-status');if(label.textContent!==status.message)label.textContent=status.message;
  const button=$('#sync-action');button.hidden=status.kind==='busy';button.textContent=status.kind==='conflict'?'Revisar conflitos':status.kind==='synced'?'Conferir sincronização':'Tentar novamente';
  button.onclick=()=>status.kind==='conflict'?flows.syncConflicts(ctx):ctx.sync.run();
  if(ctx.page==='settings'&&!document.querySelector('dialog[open]'))ctx.render();
}
ctx.sync=createSync({store:ctx.store,onStatus:showSync});

function refreshFilters(){ctx.filter.page=1;ctx.selected.clear();ctx.render();}
function invoke(name,button){
  const id=button?.dataset.id,e=ctx.state?.entries.find(e=>e.id===id),a=ctx.state?.accounts.find(a=>a.id===id),g=ctx.state?.settings.goals.find(g=>g.id===id);
  switch(name){
    case 'new-entry':return flows.entryForm(ctx,null,{type:button?.dataset.type||'expense'});
    case 'edit-entry':return e&&flows.entryForm(ctx,e);
    case 'duplicate-entry':return e&&flows.entryForm(ctx,e,{duplicate:true});
    case 'delete-entry':return e&&flows.deleteEntry(ctx,e);
    case 'confirm-entry':return e&&flows.confirmEntries(ctx,[e]);
    case 'agenda':return flows.agenda(ctx);
    case 'bulk-selected':return flows.confirmEntries(ctx,filteredEntries(ctx.state,ctx.filter,ctx.month).filter(e=>ctx.selected.has(e.id)));
    case 'clear-selection':ctx.selected.clear();return ctx.render();
    case 'new-account':return flows.accountForm(ctx);
    case 'edit-account':return flows.accountForm(ctx,a);
    case 'account-actions':return a&&flows.accountActions(ctx,a);
    case 'invoice':return a&&flows.openInvoice(ctx,a,button.dataset.cycle||ctx.month);
    case 'filter-account':ctx.filter=filterDefaults();ctx.filter.account=id;ctx.navigate('transactions');return ctx.render();
    case 'filter-category':ctx.filter=filterDefaults();ctx.filter.category=id;ctx.navigate('transactions');return ctx.render();
    case 'review-legacy':ctx.filter=filterDefaults();ctx.filter.status='legacy';ctx.filter.allPeriods=true;ctx.navigate('transactions');return ctx.render();
    case 'filter-type':ctx.filter.type=id||'';return refreshFilters();
    case 'filter-toggle':ctx.mobileFilters=!ctx.mobileFilters;return ctx.render();
    case 'sort-direction':ctx.filter.direction=-ctx.filter.direction;return ctx.render();
    case 'clear-filters':ctx.filter=filterDefaults();return refreshFilters();
    case 'sort':ctx.filter.direction=ctx.filter.sort===id?-ctx.filter.direction:id==='description'?1:-1;ctx.filter.sort=id;return ctx.render();
    case 'previous-page':ctx.filter.page=Math.max(1,ctx.filter.page-1);return ctx.render();
    case 'next-page':ctx.filter.page++;return ctx.render();
    case 'export-csv':return flows.exportCsv(ctx);
    case 'budget':return flows.budgetForm(ctx);
    case 'edit-budget':return flows.budgetForm(ctx,ctx.state.settings.budgets.find(b=>b.month===ctx.month&&b.category===id));
    case 'copy-budget':return flows.copyBudgets(ctx);
    case 'new-goal':return flows.goalForm(ctx);
    case 'edit-goal':return g&&flows.goalForm(ctx,g);
    case 'goal-add-value':return g&&flows.goalValue(ctx,g);
    case 'new-recurring':return flows.entryForm(ctx,null,{recurring:true});
    case 'series-details':return flows.seriesDetails(ctx,id);
    case 'edit-series':return flows.editSeries(ctx,id);
    case 'cancel-series':return flows.cancelSeries(ctx,id);
    case 'categories':return flows.categories(ctx);
    case 'profile':return flows.profileForm(ctx);
    case 'privacy':ctx.setPreference('hidden',!ctx.preferences.hidden);return ctx.render();
    case 'sync':return ctx.sync.run();
    case 'conflicts':return flows.syncConflicts(ctx);
    case 'backup':return flows.saveBackup(ctx);
    case 'previous-backup':return flows.previousBackup(ctx);
    case 'restore':return flows.restoreBackup(ctx);
    case 'recovery-backup':return download(ctx.store.downloadRaw(),`saldo-recuperacao-${today()}.json`);
    case 'install':return $('#install-app').click();
    case 'dismiss-setup':ctx.setPreference('setupDismissed',true);return ctx.render();
    case 'change-month':return ctx.setMonth(id);
    case 'more-categories':ctx.categoryExpanded=!ctx.categoryExpanded;return ctx.render();
    case 'quick':return modal({title:'Novo registro',body:`<div class="sheet-actions">${[['expense','Nova despesa','arrow-up','Saiu dinheiro ou compra no cartão'],['income','Nova receita','arrow-down','Salário, venda ou outro recebimento'],['transfer','Transferência','transfer','Entre suas contas ou pagamento de fatura']].map(([type,label,ic,help])=>`<button type="button" class="sheet-action" data-action="sheet-entry" data-id="${type}">${icon(ic)}<span><strong>${label}</strong><small>${help}</small></span></button>`).join('')}<button type="button" class="sheet-action" data-action="sheet-agenda">${icon('clock')}<span><strong>Vencimentos</strong><small>Confirmar o que já foi pago ou recebido</small></span></button></div>`,onAction:(name,b,owner)=>{owner.close(true);if(name==='sheet-entry')flows.entryForm(ctx,null,{type:b.dataset.id});if(name==='sheet-agenda')flows.agenda(ctx);}});
    case 'more':return modal({title:'Mais do seu Saldo',body:`<div class="manager-list"><a class="button secondary" href="#planning">Orçamento e metas</a><a class="button secondary" href="#recurring">Recorrências e parcelas</a><a class="button secondary" href="#settings">Configurações e backups</a>${action('profile','Editar perfil e foto',{cls:'button secondary'})}</div>`,onAction:(name,b,owner)=>{owner.close(true);if(name==='profile')flows.profileForm(ctx);}});
  }
}

document.addEventListener('click',async event=>{
  const button=event.target.closest('[data-action]');if(!button||button.closest('dialog'))return;
  const menu=button.closest('details.row-menu');if(menu)menu.open=false;
  try{await invoke(button.dataset.action,button);}catch(err){modal({title:'Não foi possível concluir',body:`<p>${esc(err.message||'Tente novamente. Seus dados foram preservados.')}</p>`});}
});
document.addEventListener('change',event=>{
  const el=event.target;if(el.closest('dialog'))return;
  if(el.dataset.select){if(el.checked)ctx.selected.add(el.dataset.select);else ctx.selected.delete(el.dataset.select);ctx.render();return;}
  if(el.id==='select-page'){
    const shown=filteredEntries(ctx.state,ctx.filter,ctx.month).slice((ctx.filter.page-1)*ctx.filter.size,ctx.filter.page*ctx.filter.size);shown.forEach(e=>el.checked?ctx.selected.add(e.id):ctx.selected.delete(e.id));ctx.render();return;
  }
  const fields={'account-filter':'account','category-filter':'category','status-filter':'status','date-basis':'basis'};
  if(fields[el.id]){ctx.filter[fields[el.id]]=el.value;refreshFilters();}
  if(el.id==='all-periods'){ctx.filter.allPeriods=el.checked;refreshFilters();}
  if(el.id==='page-size'){ctx.filter.size=Number(el.value);ctx.filter.page=1;ctx.render();}
  if(el.id==='mobile-sort'){ctx.filter.sort=el.value;ctx.filter.direction=el.value==='description'?1:-1;ctx.render();}
  if(el.id==='category-mode'){ctx.categoryMode=el.value;ctx.render();}
});
document.addEventListener('input',event=>{if(event.target.id==='search'){ctx.filter.query=event.target.value;refreshFilters();}});
document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('details.row-menu[open]').forEach(x=>x.open=false);});
document.addEventListener('keydown',event=>{if(event.key.toLowerCase()!=='n'||event.metaKey||event.ctrlKey||event.altKey||event.defaultPrevented)return;if(event.target.closest?.('input,textarea,select,[contenteditable]')||document.querySelector('dialog[open]')||!ctx.state)return;event.preventDefault();flows.entryForm(ctx);});
document.addEventListener('click',event=>{document.querySelectorAll('details.row-menu[open]').forEach(x=>{if(!x.contains(event.target))x.open=false;});});
window.addEventListener('hashchange',()=>{const page=aliases[location.hash.slice(1)]||'overview';ctx.navigate(page);document.querySelectorAll('dialog:not(#install-dialog)').forEach(d=>{if(d.querySelector('a[href^="#"]'))d.close();});});
$('#month').onchange=event=>ctx.setMonth(event.target.value);
$('#prev-month').onclick=()=>ctx.setMonth(shiftMonth(`${ctx.month}-01`,-1).slice(0,7));
$('#next-month').onclick=()=>ctx.setMonth(shiftMonth(`${ctx.month}-01`,1).slice(0,7));
$('#add').onclick=()=>flows.entryForm(ctx);
$('#profile-open').onclick=()=>flows.profileForm(ctx);
$('#header-profile').onclick=()=>flows.profileForm(ctx);
$('#privacy-toggle').onclick=()=>invoke('privacy');
$('#install-dialog').querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#install-dialog').close());
document.addEventListener('click',event=>{if(event.target.closest('#signout-account'))workspace.mask('Saindo da sua conta…');});

try{await ctx.store.load();}catch{ctx.storageError=true;ctx.render();showSync({kind:'pending',message:'Dados locais precisam de recuperação'});}
if(!ctx.storageError)ctx.sync.start();
window.addEventListener('online',()=>ctx.sync.run());window.addEventListener('offline',()=>ctx.sync.run());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){try{ctx.store.refresh();ctx.sync.run();}catch{ctx.storageError=true;ctx.render();}}});
window.addEventListener('storage',event=>{
  if(event.key==='saldo.active-user.v1'&&event.newValue!==workspace.userId){workspace.mask('A conta mudou em outra janela. Reabrindo seu espaço…',{clearActive:false});location.reload();return;}
  if([STORE_KEY,'saldo.transactions.v1','saldo.settings.v1'].includes(workspace.logicalKey(event.key))){try{ctx.store.refresh();if(document.querySelector('dialog[open]')){const form=document.querySelector('dialog[open] .form-error');if(form){form.textContent='Outra janela atualizou os dados. Ao salvar, alterações conflitantes serão bloqueadas.';form.hidden=false;}}}catch{ctx.storageError=true;ctx.render();}}
});
window.addEventListener('saldo:before-update',()=>saveContext());
window.addEventListener('saldo:update-blocked',()=>modal({title:'Conclua o formulário antes de atualizar',body:'<p>Salve ou feche o formulário aberto. Depois aplique a atualização do Saldo.</p>'}));
window.addEventListener('pagehide',()=>ctx.sync.stop());
window.addEventListener('pageshow',event=>{if(event.persisted&&!ctx.storageError)ctx.sync.start();});
