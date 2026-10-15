import {accountBalance,invoice,invoiceMonth,normalized,shiftMonth,summary} from './finance.js';

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};
export const money = cents => (cents / 100).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
export const amount = cents => (Math.abs(cents) / 100).toFixed(2).replace('.', ',');
export const dateLabel = date => date ? date.split('-').reverse().join('/') : '—';
export const monthLabel = month => new Date(`${month}-02T12:00:00`).toLocaleDateString('pt-BR', {month:'long',year:'numeric'});
export const plural = (n, one, many = `${one}s`) => `${n} ${n===1?one:many}`;
export const daysIn = month => new Date(Number(month.slice(0,4)),Number(month.slice(5,7)),0).getDate();
export const inMonth = (date, month) => Boolean(date?.startsWith(month));
// Monthly income minus expenses, including plans. Opening balances and transfers
// are not earnings or spending; card purchases count once, without the bill payment.
export function monthPlan(state, month) {
  const rows=state.entries.filter(e=>inMonth(e.date,month)&&e.type!=='transfer');
  const known=rows.filter(e=>e.status==='planned'||e.status==='settled');
  const totals=summary(known,month,{planned:true});
  return {income:totals.income,expense:totals.expense,balance:totals.balance,count:known.length,unconfirmed:rows.filter(e=>e.status==='legacy').length};
}
export const accountFor = (state, name) => state.accounts.find(a => a.name === name);
export const isCardPayment = (state, e) => e.type === 'transfer' && accountFor(state, e.toAccount)?.type === 'credit';
export const isCardPurchase = (state, e) => e.type === 'expense' && accountFor(state, e.account)?.type === 'credit';

export function statusLabel(state, e) {
  if(e.status==='legacy') return 'Sem confirmação';
  if(e.status==='settled') return isCardPurchase(state,e) ? 'Compra registrada' : e.type==='income' ? 'Recebido' : 'Pago';
  if((e.dueDate||e.date)<today() && !isCardPurchase(state,e)) return 'Atrasado';
  return isCardPurchase(state,e) ? 'Compra prevista' : e.type==='income' ? 'A receber' : 'A pagar';
}

// Cash uses the payment date. Internal transfers and card purchases are not cash expenses.
export function cashEffect(state, e) {
  if(e.status!=='settled' || (e.settledDate||e.date)>today()) return 0;
  if(isCardPurchase(state,e)) return 0;
  if(e.type==='income') return e.cents;
  if(e.type==='expense' || isCardPayment(state,e)) return -e.cents;
  return 0;
}

export function cashSummary(state, month, maxDay=daysIn(month)) {
  let income=0,expense=0;
  for(const e of state.entries) {
    const date=e.settledDate||e.date;
    if(!inMonth(date,month) || Number(date.slice(-2))>maxDay) continue;
    const effect=cashEffect(state,e);
    if(effect>0) income+=effect;
    if(effect<0) expense-=effect;
  }
  return {income,expense,balance:income-expense};
}

export function available(state, asOf=today()) {
  return state.accounts.filter(a=>a.type!=='credit').reduce((sum,a)=>sum+accountBalance(state.entries,a,asOf),0);
}

// The agenda and its bulk action share this exact set. Prior overdue obligations remain visible.
export function agendaItems(state, month, asOf=today()) {
  const eligible = date => inMonth(date,month) || date<asOf;
  const items=state.entries.filter(e=>e.status!=='settled' && !isCardPurchase(state,e) && !isCardPayment(state,e) && eligible(e.dueDate||e.date)).map(e=>({
    id:e.id,kind:'entry',entry:e,date:e.dueDate||e.date,label:e.description,cents:e.cents,
    type:e.type,status:e.status,overdue:(e.dueDate||e.date)<asOf,
  }));
  for(const account of state.accounts.filter(a=>a.type==='credit')) {
    const months=[...new Set(state.entries.filter(e=>isCardPurchase(state,e)&&e.account===account.name).map(e=>e.invoiceMonth||invoiceMonth(e.date,account.closingDay)))];
    for(const cycle of months) {
      const bill=invoice(state.entries,account,cycle);
      if(bill.remaining<=0 || !eligible(bill.dueDate)) continue;
      items.push({id:`invoice:${account.id}:${cycle}`,kind:'invoice',account,cycle,bill,date:bill.dueDate,label:`Fatura · ${account.name}`,cents:bill.remaining,type:'expense',status:'planned',overdue:bill.dueDate<asOf});
    }
  }
  return items.sort((a,b)=>a.date.localeCompare(b.date)||a.label.localeCompare(b.label,'pt-BR'));
}

export function pendingTotals(state, month) {
  const items=agendaItems(state,month),totals={pay:0,receive:0,unconfirmed:0,overdue:0,items};
  for(const item of items) {
    if(item.status==='legacy') {totals.unconfirmed+=item.cents;continue;}
    if(item.type==='transfer') continue;
    if(item.type==='income') totals.receive+=item.cents;
    else totals.pay+=item.cents;
    if(item.overdue && item.type!=='income') totals.overdue+=item.cents;
  }
  return totals;
}

export function categoryTotals(state, month, mode='all') {
  const values=new Map();
  for(const e of state.entries) {
    if(e.type!=='expense'||!inMonth(e.date,month)||mode==='settled'&&e.status!=='settled') continue;
    const key=normalized(e.category),v=values.get(key)||{name:e.category,realized:0,planned:0,legacy:0,total:0};
    v.total+=e.cents;
    v[e.status==='settled'?'realized':e.status==='legacy'?'legacy':'planned']+=e.cents;
    values.set(key,v);
  }
  return [...values.values()].sort((a,b)=>b.total-a.total);
}

export function filteredEntries(state, filter, month) {
  const query=normalized(filter.query||'');
  return state.entries.filter(e=>{
    const date=filter.basis==='payment' ? e.settledDate||e.dueDate||e.date : e.date;
    return (filter.allPeriods||inMonth(date,month)) && (!filter.type||e.type===filter.type) &&
      (!filter.account||e.account===filter.account||e.toAccount===filter.account) &&
      (!filter.category||e.category===filter.category) &&
      (!filter.status||e.status===filter.status||filter.status==='overdue'&&e.status==='planned'&&(e.dueDate||e.date)<today()) &&
      (!query||normalized([e.description,e.category,e.account,e.toAccount,e.notes].filter(Boolean).join(' ')).includes(query));
  }).sort((a,b)=> {
    const get = e => filter.sort==='value' ? (e.type==='expense'?-e.cents:e.type==='income'?e.cents:0) : filter.sort==='description' ? e.description : filter.basis==='payment' ? e.settledDate||e.dueDate||e.date : e.date;
    const x=get(a),y=get(b);
    return (filter.direction||-1)*(typeof x==='number'?x-y:x.localeCompare(y,'pt-BR'))||a.id.localeCompare(b.id);
  });
}

export function recurringGroups(state) {
  const groups=new Map();
  for(const e of state.entries.filter(e=>e.seriesId)) {
    const group=groups.get(e.seriesId)||{id:e.seriesId,name:e.description,entries:[],installments:Boolean(e.installments)};
    group.entries.push(e);groups.set(e.seriesId,group);
  }
  return [...groups.values()].map(g=>{
    g.entries.sort((a,b)=>a.date.localeCompare(b.date));
    g.pending=g.entries.filter(e=>e.status==='planned').sort((a,b)=>(a.dueDate||a.date).localeCompare(b.dueDate||b.date));
    g.next=g.pending[0];g.total=g.pending.reduce((n,e)=>n+e.cents,0);
    g.end=g.entries.map(e=>e.dueDate||e.date).sort().at(-1);
    return g;
  }).sort((a,b)=>(a.next?.dueDate||'9999').localeCompare(b.next?.dueDate||'9999'));
}

export function compareCash(state, month) {
  const currentMonth=today().slice(0,7),future=month>currentMonth;
  const cut=month===currentMonth?Number(today().slice(-2)):daysIn(month);
  const previous=shiftMonth(`${month}-01`,-1).slice(0,7);
  const current=cashSummary(state,month,cut),before=cashSummary(state,previous,Math.min(cut,daysIn(previous)));
  return {current,before,previous,cut,future,delta:future?null:current.expense-before.expense,percent:!future&&before.expense?Math.round((current.expense-before.expense)/before.expense*100):null};
}

export function cashHistory(state, month) {
  return Array.from({length:6},(_,i)=>{
    const m=shiftMonth(`${month}-01`,i-5).slice(0,7);
    return {month:m,...cashSummary(state,m,m===today().slice(0,7)?Number(today().slice(-2)):daysIn(m))};
  });
}

export function dailyCash(state, month) {
  const limit=month===today().slice(0,7)?Number(today().slice(-2)):daysIn(month);
  const values=Array(limit).fill(0);
  for(const e of state.entries) {
    const d=e.settledDate||e.date,index=Number(d?.slice(-2))-1;
    if(inMonth(d,month)&&index<limit) values[index]+=cashEffect(state,e);
  }
  let sum=0;
  return values.map((value,index)=>({day:index+1,value,sum:sum+=value}));
}

export function csvText(state,rows) {
  const cell=(value,numeric=false)=>'"'+String(value??'').replace(numeric?/$^/:/^[\s]*[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"';
  const headers=['Referência','Vencimento','Data efetiva','Descrição','Categoria','Conta origem','Conta destino','Tipo','Status','Valor','Fatura','Observação'];
  const data=rows.map(e=>[e.date,e.dueDate,e.settledDate,e.description,e.category,e.account,e.toAccount,{income:'Receita',expense:'Despesa',transfer:'Transferência'}[e.type],statusLabel(state,e),(e.type==='expense'?'-':'')+amount(e.cents),e.invoiceMonth||'',e.notes||'']);
  return '\ufeff'+[headers,...data].map((r,index)=>r.map((value,column)=>cell(value,index>0&&column===9)).join(';')).join('\r\n');
}
