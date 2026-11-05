import test from 'node:test';
import assert from 'node:assert/strict';
import {accountBalance,validSettings,shiftMonth} from './finance.js';
import {available,cashSummary,agendaItems,pendingTotals,categoryTotals,filteredEntries,recurringGroups,compareCash,csvText,today} from './product.js';

const bank={id:'bank',name:'Banco',type:'bank',opening:100000,openingDate:'2020-01-01',closingDay:25,dueDay:5};
const card={id:'card',name:'Cartão',type:'credit',opening:0,openingDate:'2020-01-01',closingDay:25,dueDay:5};
const entry=(id,type,cents,extra={})=>({id,type,cents,description:id,category:type==='income'?'Salário':'Alimentação',account:'Banco',date:'2025-05-10',dueDate:'2025-05-10',status:'settled',settledDate:'2025-05-10',...extra});
const state=entries=>({entries,accounts:[bank,card],settings:{profile:{name:'',photo:''},goals:[],budgets:[]}});

test('Saldo inicial futuro fica fora do disponível até a data de abertura',()=>{
  const future={...bank,opening:70000,openingDate:'2027-01-01'};
  assert.equal(accountBalance([],future,'2026-12-31'),0);
  assert.equal(accountBalance([],future,'2027-01-01'),70000);
  assert.equal(available({accounts:[future,card],entries:[]},'2026-12-31'),0);
});
test('Caixa usa a data efetiva; previsão e referência não contam como pagamento',()=>{
  const s=state([entry('receita','income',300000),entry('abril','expense',50000,{date:'2025-04-01',settledDate:'2025-05-12'}),entry('junho','expense',20000,{settledDate:'2025-06-01'}),entry('previsto','expense',90000,{status:'planned',settledDate:''}),entry('legado','expense',10000,{status:'legacy',settledDate:''})]);
  assert.deepEqual(cashSummary(s,'2025-05'),{income:300000,expense:50000,balance:250000});
});
test('Compra de cartão e transferência interna não duplicam saída de caixa',()=>{
  const s=state([entry('compra','expense',30000,{account:'Cartão',invoiceMonth:'2025-05'}),entry('fatura','transfer',15000,{toAccount:'Cartão',invoiceMonth:'2025-05'}),entry('carteira','transfer',10000,{toAccount:'Carteira'})]);
  s.accounts.push({...bank,id:'cash',name:'Carteira',type:'cash',opening:0});
  assert.deepEqual(cashSummary(s,'2025-05'),{income:0,expense:15000,balance:-15000});
  assert.equal(available(s,'2025-05-31'),85000);
  assert.deepEqual(categoryTotals(s,'2025-05').map(x=>[x.name,x.total]),[['Alimentação',30000]]);
});
test('Agenda inclui atrasos anteriores, exclui pagos e mantém exatamente o conjunto acionável',()=>{
  const s=state([entry('atrasado','expense',10000,{date:'2025-04-01',dueDate:'2025-04-20',status:'planned',settledDate:''}),entry('mensal','expense',20000,{status:'planned',settledDate:''}),entry('pago','expense',30000),entry('futuro','expense',50000,{date:'2025-06-10',dueDate:'2025-06-10',status:'planned',settledDate:''})]);
  const items=agendaItems(s,'2025-05','2025-05-15');
  assert.deepEqual(items.map(x=>x.id),['atrasado','mensal']);
  assert.ok(items.every(x=>x.overdue));
});
test('Pendências separam receita, despesa e legado sem chamar transferência de gasto',()=>{
  const month=today().slice(0,7),date=`${month}-01`;
  const s=state([entry('despesa','expense',10000,{date,dueDate:date,status:'planned',settledDate:''}),entry('receita','income',20000,{date,dueDate:date,status:'planned',settledDate:''}),entry('legado','expense',30000,{date,dueDate:date,status:'legacy',settledDate:''}),entry('interna','transfer',90000,{date,dueDate:date,status:'planned',settledDate:'',toAccount:'Carteira'})]);
  const totals=pendingTotals(s,month);
  assert.equal(totals.pay,10000);assert.equal(totals.receive,20000);assert.equal(totals.unconfirmed,30000);
});
test('Fatura pendente aparece uma vez e desconta pagamento parcial',()=>{
  const s=state([entry('compra','expense',40000,{account:'Cartão',invoiceMonth:'2025-05'}),entry('pago','transfer',15000,{toAccount:'Cartão',invoiceMonth:'2025-05'}),entry('agendado','transfer',25000,{toAccount:'Cartão',invoiceMonth:'2025-05',status:'planned',settledDate:''})]);
  const items=agendaItems(s,'2025-06','2025-06-02');
  assert.equal(items.length,1);assert.equal(items[0].kind,'invoice');assert.equal(items[0].cents,25000);assert.equal(items[0].date,'2025-06-05');
});
test('Categoria distingue realizado, previsto e sem confirmação',()=>{
  const s=state([entry('pago','expense',10000),entry('previsto','expense',20000,{status:'planned'}),entry('antigo','expense',30000,{status:'legacy'})]);
  assert.deepEqual(categoryTotals(s,'2025-05'),[{name:'Alimentação',realized:10000,planned:20000,legacy:30000,total:60000}]);
  assert.equal(categoryTotals(s,'2025-05','settled')[0].total,10000);
});
test('Busca ignora acentos e encontra observações, conta de destino e todos os períodos',()=>{
  const s=state([entry('um','expense',10000,{description:'Café da manhã',notes:'Reunião'}),entry('dois','transfer',20000,{toAccount:'Poupança',date:'2025-04-01'})]);
  assert.equal(filteredEntries(s,{query:'CAFE'},'2025-05').length,1);
  assert.equal(filteredEntries(s,{query:'reuniao'},'2025-05').length,1);
  assert.equal(filteredEntries(s,{query:'poupanca',allPeriods:true},'2025-05').length,1);
  assert.equal(filteredEntries(s,{query:'poupanca'},'2025-05').length,0);
});
test('Ordenação monetária é assinada e critério de pagamento respeita data efetiva',()=>{
  const s=state([entry('pequena','expense',10000),entry('grande','expense',50000),entry('receita','income',20000),entry('interna','transfer',70000),entry('abril','expense',15000,{date:'2025-04-01',settledDate:'2025-05-12'})]);
  assert.deepEqual(filteredEntries(s,{sort:'value',direction:1},'2025-05').map(e=>e.id),['grande','pequena','interna','receita']);
  assert.equal(filteredEntries(s,{basis:'payment'},'2025-05').length,5);
});
test('Comparação usa o mesmo corte do mês atual e não o mês anterior inteiro',()=>{
  const month=today().slice(0,7),prior=shiftMonth(`${month}-01`,-1).slice(0,7),day=Number(today().slice(-2));
  const s=state([entry('atual','expense',20000,{date:`${month}-01`,settledDate:`${month}-01`}),entry('anterior','expense',10000,{date:`${prior}-01`,settledDate:`${prior}-01`})]);
  if(day<28)s.entries.push(entry('fora-do-corte','expense',90000,{date:`${prior}-28`,settledDate:`${prior}-28`}));
  const c=compareCash(s,month);assert.equal(c.before.expense,10000);assert.equal(c.delta,10000);assert.equal(c.percent,100);assert.equal(c.cut,day);
});
test('Mês futuro não sugere economia antes de começar',()=>{
  const current=today().slice(0,7),future=shiftMonth(`${current}-01`,1).slice(0,7);
  const s=state([entry('pago','expense',20000,{date:`${current}-01`,settledDate:`${current}-01`})]);
  const c=compareCash(s,future);assert.equal(c.future,true);assert.equal(c.delta,null);assert.equal(c.percent,null);
});
test('Recorrência mostra somente previstos como próximos e preserva limite da série',()=>{
  const s=state([entry('um','expense',10000,{seriesId:'s'}),entry('dois','expense',10000,{seriesId:'s',status:'planned',date:'2025-06-10',dueDate:'2025-06-15'}),entry('tres','expense',10000,{seriesId:'s',status:'planned',date:'2025-07-10',dueDate:'2025-07-15'})]);
  const group=recurringGroups(s)[0];assert.equal(group.pending.length,2);assert.equal(group.next.id,'dois');assert.equal(group.total,20000);assert.equal(group.end,'2025-07-15');
});
test('CSV exporta apenas o recorte recebido, mantém centavos e neutraliza fórmulas em texto',()=>{
  const s=state([entry('selecionado','expense',4590,{description:'=1+1',notes:'Texto "citado"'}),entry('fora','income',10000)]);
  const text=csvText(s,[s.entries[0]]);assert.equal(text.split('\r\n').length,2);assert.ok(text.includes('"-45,90"'));assert.ok(text.includes('"\'=1+1"'));assert.ok(text.includes('Texto ""citado""'));assert.ok(!text.includes('fora'));
});
test('Backup aceita objetivo sem prazo e rejeita prazo impossível',()=>{
  const settings=state([]).settings;settings.goals=[{id:'g',name:'Reserva',target:100000,saved:0}];
  assert.equal(validSettings(settings),true);settings.goals[0].targetDate='2026-02-30';assert.equal(validSettings(settings),false);
});

// ---- Visão geral 5.1 ----
import {spendingPace,cashSeries,safeToSpend,monthForecast,balanceSeries,moneyFlow} from './product.js';
test('Previsão soma salário pendente ao saldo e desconta compromissos e atrasos, sem legado ou meses futuros',()=>{
  const planned={status:'planned',settledDate:''};
  const s=state([
    entry('salário','income',300000,{...planned,dueDate:'2025-05-30'}),
    entry('aluguel','expense',80000,{...planned,dueDate:'2025-05-30'}),
    entry('atrasado','expense',20000,{...planned,dueDate:'2025-04-30'}),
    entry('pago','expense',10000,{settledDate:'2025-05-02'}),
    entry('legado','expense',99999,{...planned,status:'legacy'}),
    entry('junho','expense',99999,{...planned,dueDate:'2025-06-01'}),
    entry('interna','transfer',50000,{...planned,toAccount:'Carteira'}),
  ]);
  const original=structuredClone(s),f=monthForecast(s,'2025-05','2025-05-05');
  assert.deepEqual(f,{balance:90000,receive:300000,pay:100000,overdue:20000,unconfirmed:99999,projected:290000});
  assert.deepEqual(s,original);
  assert.equal(monthForecast(s,'2025-04','2025-05-05'),null);
  assert.equal(monthForecast(s,'2025-06','2025-05-05'),null);
});
test('Previsão permanece igual ao confirmar receita, despesa e pagamento parcial da fatura',()=>{
  const planned={status:'planned',settledDate:''};
  const s=state([
    entry('receber','income',30000,{...planned,dueDate:'2025-05-25'}),
    entry('pagar','expense',15000,{...planned,dueDate:'2025-05-25'}),
    entry('compra','expense',40000,{account:'Cartão',invoiceMonth:'2025-04'}),
    entry('fatura-agendada','transfer',40000,{...planned,toAccount:'Cartão',invoiceMonth:'2025-04'}),
  ]);
  assert.equal(monthForecast(s,'2025-05','2025-05-15').projected,75000);
  s.entries[0].status='settled';s.entries[0].settledDate='2025-05-15';
  s.entries[1].status='settled';s.entries[1].settledDate='2025-05-15';
  s.entries.push(entry('parcial','transfer',10000,{toAccount:'Cartão',invoiceMonth:'2025-04',settledDate:'2025-05-15'}));
  const f=monthForecast(s,'2025-05','2025-05-15');
  assert.equal(f.pay,30000);assert.equal(f.projected,75000);
});
test('Previsão mantém saldo negativo e centavos, sem transformar déficit em sobra zero',()=>{
  const s=state([entry('despesa','expense',100001,{status:'planned',settledDate:'',dueDate:'2025-05-30'})]);
  assert.equal(monthForecast(s,'2025-05','2025-05-05').projected,-1);
});
test('Ritmo de gasto acumula por referência e compara no mesmo dia do mês anterior',()=>{
  const s=state([entry('a','expense',10000,{date:'2025-05-02'}),entry('b','expense',5000,{date:'2025-05-09',account:'Cartão'}),entry('c','expense',7000,{date:'2025-05-20',status:'planned',settledDate:''}),entry('d','expense',4000,{date:'2025-04-05'}),entry('e','expense',9000,{date:'2025-04-28'}),entry('t','transfer',99999,{toAccount:'Cartão'}),entry('r','income',50000)]);
  const p=spendingPace(s,'2025-05','2025-05-10');
  assert.equal(p.cut,10);assert.equal(p.current.length,10);assert.equal(p.spent,15000);
  assert.equal(p.before,4000);assert.equal(p.previousTotal,13000);assert.equal(p.difference,11000);assert.equal(p.percent,275);
  assert.equal(spendingPace(s,'2025-04','2025-05-10').spent,13000);
  assert.equal(spendingPace(s,'2025-06','2025-05-10').cut,0);
});
test('Séries de caixa acumulam só realizados até a data de corte',()=>{
  const s=state([entry('r','income',30000,{settledDate:'2025-05-03'}),entry('p','expense',10000,{settledDate:'2025-05-04'}),entry('prev','expense',5000,{status:'planned',settledDate:''}),entry('compra','expense',8000,{account:'Cartão',settledDate:'2025-05-04'})]);
  const c=cashSeries(s,'2025-05','2025-05-05');
  assert.deepEqual(c.income,[0,0,30000,30000,30000]);assert.deepEqual(c.expense,[0,0,0,10000,10000]);
});
test('Livre para gastar desconta tudo a pagar e ignora recebimentos previstos',()=>{
  const s=state([entry('pagar','expense',30000,{date:'2025-05-20',dueDate:'2025-05-20',status:'planned',settledDate:''}),entry('atraso','expense',10000,{date:'2025-04-20',dueDate:'2025-04-20',status:'planned',settledDate:''}),entry('receber','income',99000,{date:'2025-05-25',dueDate:'2025-05-25',status:'planned',settledDate:''})]);
  const realToday=today();
  const asOf=realToday.slice(0,7)+'-01';
  const f=safeToSpend(s,asOf.slice(0,7),asOf);
  assert.equal(f.balance,100000);assert.equal(f.pay,40000);assert.equal(f.free,60000);assert.equal(f.receive,99000);
  assert.equal(f.perDay,Math.floor(60000/f.daysLeft));
  assert.equal(safeToSpend(s,'2020-01',asOf),null);
});
test('Série do saldo: dia a dia no mês e semanal em 6 meses, terminando no corte',()=>{
  const s=state([entry('r','income',50000,{settledDate:'2025-05-03'})]);
  const m=balanceSeries(s,'2025-05','month','2025-05-04');
  assert.equal(m.length,5);assert.equal(m[0].date,'2025-04-30');assert.equal(m.at(-1).value,150000);
  const w=balanceSeries(s,'2025-05','6m','2025-05-04');
  assert.equal(w[0].date,'2024-11-04');assert.equal(w.at(-1).date,'2025-05-04');assert.ok(w.length>=26&&w.length<=28);
  assert.deepEqual(balanceSeries(s,'2025-07','month','2025-05-04'),[]);
});
test('Fluxo do mês agrupa categorias, junta excedentes em Outras e mostra a sobra',()=>{
  const cats=['A','B','C','D','E','F','G'];
  const s=state([entry('sal','income',100000),...cats.map((c,i)=>entry('x'+c,'expense',1000*(i+1),{category:c}))]);
  const f=moneyFlow(s,'2025-05');
  assert.equal(f.targets.length,6);assert.equal(f.targets.at(-1).name,'Outras');assert.equal(f.targets.at(-1).total,3000);
  assert.equal(f.expense,28000);assert.equal(f.surplus,72000);assert.equal(f.deficit,0);
});
