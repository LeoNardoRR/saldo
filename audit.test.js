import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMoney,seriesEntries,invoice,shiftMonth,invoiceMonth,summary,validState} from './finance.js';
import {today,amount,money,available,cashSummary,cashHistory,dailyCash,categoryTotals,csvText,pendingTotals,cashEffect,compareCash} from './product.js';

// Gerador pseudoaleatório determinístico: as falhas são reproduzíveis.
const rng=seed=>()=>(seed=(seed*1664525+1013904223)>>>0)/4294967296;
const pick=(r,list)=>list[Math.floor(r()*list.length)];
const isoDaysAgo=days=>{const d=new Date();d.setDate(d.getDate()-days);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

function randomState(seed,count=120){
  const r=rng(seed),opening=isoDaysAgo(200);
  const accounts=[
    {id:'a',name:'Banco',type:'bank',opening:Math.floor(r()*500000),openingDate:opening,closingDay:25,dueDay:5},
    {id:'b',name:'Reserva',type:'bank',opening:Math.floor(r()*100000),openingDate:opening,closingDay:25,dueDay:5},
    {id:'c',name:'Dinheiro',type:'cash',opening:Math.floor(r()*20000),openingDate:opening,closingDay:25,dueDay:5},
    {id:'d',name:'Cartão',type:'credit',opening:0,openingDate:opening,closingDay:20,dueDay:27},
  ];
  const bank=accounts.filter(a=>a.type!=='credit');
  const categories=[{id:'c1',name:'Mercado',type:'expense'},{id:'c2',name:'Salário',type:'income'},{id:'c3',name:'Lazer',type:'expense'}];
  const entries=[];
  for(let i=0;i<count;i++){
    const kind=pick(r,['income','expense','expense','transfer','card','payment']);
    const date=isoDaysAgo(Math.floor(r()*190)),status=pick(r,['settled','settled','settled','planned']);
    const cents=1+Math.floor(r()*250000);
    const base={id:`e${i}`,description:`Registro ${i}`,date,dueDate:date,status,settledDate:status==='settled'?date:'',notes:''};
    if(kind==='income')entries.push({...base,type:'income',category:'Salário',account:pick(r,bank).name,cents});
    else if(kind==='expense')entries.push({...base,type:'expense',category:pick(r,['Mercado','Lazer']),account:pick(r,bank).name,cents});
    else if(kind==='transfer'){const [from,to]=[bank[0],bank[1+Math.floor(r()*(bank.length-1))]];entries.push({...base,type:'transfer',category:'Transferência',account:from.name,toAccount:to.name,cents});}
    else if(kind==='card'){const cycle=invoiceMonth(date,20);entries.push({...base,type:'expense',category:'Mercado',account:'Cartão',cents,invoiceMonth:cycle,dueDate:date});}
    else entries.push({...base,type:'transfer',category:'Transferência',account:pick(r,bank).name,toAccount:'Cartão',cents,invoiceMonth:invoiceMonth(date,20)});
  }
  return {version:3,revision:1,entries,categories,accounts,settings:{profile:{name:'',photo:''},goals:[],budgets:[]}};
}

const months=state=>[...new Set(state.entries.map(e=>(e.settledDate||e.date).slice(0,7)))];

test('Estado gerado é válido para o app (premissa dos testes de consistência)',()=>{
  for(const seed of [1,2,3])assert.ok(validState(randomState(seed)),`seed ${seed}`);
});

test('Saldo disponível = saldos iniciais + efeitos de caixa realizados (qualquer composição de lançamentos)',()=>{
  for(const seed of [1,2,3,4,5,6,7,8]){
    const state=randomState(seed),openings=state.accounts.filter(a=>a.type!=='credit').reduce((n,a)=>n+a.opening,0);
    const effects=state.entries.reduce((n,e)=>n+cashEffect(state,e),0);
    assert.equal(available(state),openings+effects,`seed ${seed}`);
  }
});

test('Soma dos meses do caixa = variação do saldo; nenhum centavo se perde entre telas',()=>{
  for(const seed of [11,12,13,14]){
    const state=randomState(seed),openings=state.accounts.filter(a=>a.type!=='credit').reduce((n,a)=>n+a.opening,0);
    const total=months(state).reduce((n,m)=>n+cashSummary(state,m).balance,0);
    assert.equal(available(state)-openings,total,`seed ${seed}`);
  }
});

test('Gráfico diário do mês atual termina no mesmo saldo do resumo mensal',()=>{
  for(const seed of [21,22,23]){
    const state=randomState(seed),month=today().slice(0,7),days=dailyCash(state,month);
    assert.equal(days.at(-1).sum,cashSummary(state,month,days.length).balance,`seed ${seed}`);
  }
});

test('Histórico de seis meses repete exatamente o resumo de cada mês',()=>{
  const state=randomState(31),month=today().slice(0,7),history=cashHistory(state,month);
  assert.equal(history.length,6);
  for(const row of history)assert.equal(row.balance,row.income-row.expense);
  assert.equal(history.at(-1).month,month);
});

test('Compras no cartão não são despesa de caixa; pagamento de fatura é',()=>{
  const state=randomState(41);
  for(const e of state.entries){
    const card=e.type==='expense'&&e.account==='Cartão',payment=e.type==='transfer'&&e.toAccount==='Cartão';
    if(card)assert.equal(cashEffect(state,e),0);
    if(payment&&e.status==='settled')assert.equal(cashEffect(state,e),-e.cents);
  }
});

test('Parcelas somam exatamente o total, sem erro de centavos',()=>{
  const r=rng(7);
  for(let i=0;i<500;i++){
    const count=2+Math.floor(r()*59),total=count+Math.floor(r()*99999999);
    const rows=seriesEntries({id:'x',description:'Compra',type:'expense',category:'Mercado',account:'Cartão',cents:total,date:'2026-01-31',dueDate:'2026-01-31',status:'planned',settledDate:'',notes:'',invoiceMonth:'2026-02'},{count,installments:true,closingDay:20});
    assert.equal(rows.length,count);
    assert.equal(rows.reduce((n,x)=>n+x.cents,0),total);
    const sizes=new Set(rows.map(x=>x.cents));assert.ok(sizes.size<=2&&Math.max(...sizes)-Math.min(...sizes)<=1);
    assert.deepEqual(new Set(rows.map(x=>x.id)).size,count);
  }
});

test('Repetição mensal preserva o valor e vira o mês corretamente em 31 de janeiro',()=>{
  const rows=seriesEntries({id:'r',description:'Aluguel',type:'expense',category:'Moradia',account:'Banco',cents:150000,date:'2026-01-31',dueDate:'2026-01-31',status:'planned',settledDate:'',notes:''},{count:4});
  assert.deepEqual(rows.map(x=>x.date),['2026-01-31','2026-02-28','2026-03-31','2026-04-30']);
  assert.ok(rows.every(x=>x.cents===150000));
});

test('Entrada e formatação de dinheiro são inversas para todos os valores amostrados',()=>{
  const r=rng(99);
  for(let i=0;i<5000;i++){
    const cents=1+Math.floor(r()*99999999900);
    assert.equal(parseMoney(amount(cents)),cents,String(cents));
    const display=(cents/100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
    assert.equal(parseMoney(display),cents,display);
  }
  assert.equal(parseMoney('0,1'),10);assert.equal(parseMoney('1.234,5'),123450);assert.equal(parseMoney('abc'),null);
  assert.equal(parseMoney('0'),null);assert.equal(parseMoney('-5'),null);assert.equal(parseMoney('1,234'),null);
});

test('0,10 + 0,20 não gera erro de ponto flutuante (tudo em centavos inteiros)',()=>{
  assert.equal(parseMoney('0,10')+parseMoney('0,20'),parseMoney('0,30'));
  assert.equal(money(parseMoney('1234,56')).replace(/\s/g,' '),'R$ 1.234,56');
});

test('Categorias com acento ou caixa diferentes são somadas como uma só',()=>{
  const month=today().slice(0,7),state={accounts:[{name:'Banco',type:'bank'}],entries:[
    {id:'1',type:'expense',category:'Alimentação',cents:1000,date:`${month}-02`,status:'settled'},
    {id:'2',type:'expense',category:'alimentacao',cents:500,date:`${month}-03`,status:'planned'}]};
  const totals=categoryTotals(state,month);
  assert.equal(totals.length,1);assert.equal(totals[0].total,1500);assert.equal(totals[0].realized,1000);assert.equal(totals[0].planned,500);
});

test('Fatura: restante = compras − pagamentos realizados; valor livre nunca fica negativo',()=>{
  for(const seed of [51,52,53]){
    const state=randomState(seed),card=state.accounts.find(a=>a.type==='credit');
    for(const cycle of new Set(state.entries.filter(e=>e.account==='Cartão'&&e.type==='expense').map(e=>e.invoiceMonth))){
      const bill=invoice(state.entries,card,cycle);
      assert.equal(bill.remaining,bill.total-bill.paid);
      assert.ok(bill.unallocated>=0);
      assert.ok(bill.unallocated<=Math.max(0,bill.remaining));
    }
  }
});

test('Comparativo mensal: percentual coerente com o delta e sem divisão por zero',()=>{
  const state=randomState(61),c=compareCash(state,today().slice(0,7));
  assert.equal(c.delta,c.current.expense-c.before.expense);
  if(c.before.expense===0)assert.equal(c.percent,null);else assert.equal(c.percent,Math.round(c.delta/c.before.expense*100));
  assert.equal(compareCash(state,shiftMonth(`${today().slice(0,7)}-01`,2).slice(0,7)).future,true);
});

test('Resumo de finance.js e caixa de product.js concordam para lançamentos simples sem cartão',()=>{
  const month=today().slice(0,7),state={accounts:[{id:'a',name:'Banco',type:'bank',opening:0,openingDate:'2020-01-01'}],entries:[
    {id:'1',type:'income',category:'Salário',account:'Banco',cents:500000,date:`${month}-01`,dueDate:`${month}-01`,status:'settled',settledDate:`${month}-01`},
    {id:'2',type:'expense',category:'Mercado',account:'Banco',cents:123456,date:`${month}-01`,dueDate:`${month}-01`,status:'settled',settledDate:`${month}-01`}]};
  const a=summary(state.entries,month),b=cashSummary(state,month);
  assert.equal(a.income,b.income);assert.equal(a.expense,b.expense);assert.equal(a.balance,b.balance);
  assert.equal(available(state),376544);
});

test('Pendências nunca contam registros pagos e atrasados anteriores ficam visíveis',()=>{
  const state=randomState(71),month=today().slice(0,7),totals=pendingTotals(state,month);
  for(const item of totals.items)assert.ok(item.kind==='invoice'||item.entry.status!=='settled');
  assert.ok(totals.overdue<=totals.pay);
});

test('CSV neutraliza fórmulas em texto e mantém o valor numérico sem apóstrofo',()=>{
  const state={accounts:[{name:'Banco',type:'bank'}]};
  const row={id:'1',description:'=HYPERLINK("x")',category:'+cmd',account:'Banco',type:'expense',cents:12345,date:'2026-01-02',dueDate:'2026-01-02',status:'settled',settledDate:'2026-01-02',notes:'@x'};
  const csv=csvText(state,[row]);
  assert.ok(csv.includes('"\'=HYPERLINK(""x"")"'));assert.ok(csv.includes('"\'+cmd"'));assert.ok(csv.includes('"\'@x"'));
  assert.ok(csv.includes('"-123,45"'));
});
