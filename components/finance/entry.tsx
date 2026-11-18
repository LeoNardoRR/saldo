import React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {MotionConfig} from 'motion/react';
import {Wallet, Landmark, CreditCard, ArrowUpRight, Plus, LayoutGrid, PieChart as PieChartIcon, Clock3} from 'lucide-react';
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {ChartContainer} from '@/components/ui/chart';
import {BarChart,Bar,Cell,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';
import {Table,TableHeader,TableBody} from '@/components/ui/table';
import {AnimatedBackground} from './vendor/animated-background';
import {accountBalance,invoice} from '../../finance.js';
import {today,dateLabel,money,moneyFlow} from '../../product.js';
import {CategoryDonut} from '../fintech/category-donut';
import {MonthComparison} from '../fintech/month-comparison';
import {SpendingHeatmap} from '../fintech/spending-heatmap';
import {BudgetRings} from '../fintech/budget-rings';
import {MonthProjection} from '../fintech/month-projection';
import {SavingsGoals} from '../fintech/savings-goals';
import {TransactionSummary} from '../fintech/transaction-summary';
import type {FintechContext} from '../fintech/shared';
import './utilities.css';
import {FloatingLiquidGlassNav} from '../navigation/floating-liquid-glass-nav';
import {bindNavigationViewport} from '../../navigation.js';

// A separate persistent root: financial re-renders must not reset the lens/focus.
export function mountMobileNavigation(target:HTMLElement,page:string){
 const root=createRoot(target);
 let current='';
 const render=(next:string)=>{if(current===next)return;current=next;flushSync(()=>root.render(<MotionConfig reducedMotion="user"><FloatingLiquidGlassNav page={next}/></MotionConfig>));};
 const cleanup=bindNavigationViewport(target);
 render(page);
 return {render,destroy(){cleanup();root.unmount();}};
}


type Context=FintechContext&{state:Parameters<typeof moneyFlow>[0];overviewSection?:string};
const roots:Root[]=[];
export function unmountFinancialUI(){for(const root of roots)root.unmount();roots.length=0;}
function mount(target:Element|null,node:React.ReactNode){if(!target)return;const root=createRoot(target);roots.push(root);flushSync(()=>root.render(<MotionConfig reducedMotion="user">{node}</MotionConfig>));}
function brandToneFor(name:string,type:string,index:number){
 const k=name.toLowerCase();
 if(k.includes('nubank')||k.includes('ultravioleta'))return '#820ad1';
 if(k.includes('itaú')||k.includes('itau')||k.includes('inter'))return '#ff6200';
 if(k.includes('bradesco')||k.includes('santander'))return '#e11d48';
 if(type==='cash')return '#1fb38a';
 return ['#0a7cff','#7a5cff','#1fb38a'][index%3];
}
function WalletDeck({ctx}:{ctx:Context}){
 return <section className="wallet-section finance-island"><div className="section-heading"><div><h2>Minha carteira</h2><p>Liquidez imediata e ciclos de cartão sincronizados</p></div><Button variant="ghost" className="wallet-add" data-action="new-account"><Plus aria-hidden size={16}/>Adicionar</Button></div><ul className="wallet-rail" aria-label="Contas e cartões; deslize para ver mais" tabIndex={0}>{ctx.state.accounts.map((account,index)=>{
 const credit=account.type==='credit',bill=credit?invoice(ctx.state.entries,account,ctx.month):null;
 const value=credit?Math.max(0,bill!.remaining):accountBalance(ctx.state.entries,account,today());
 const Icon=credit?CreditCard:account.type==='cash'?Wallet:Landmark;
 const brandBg=brandToneFor(account.name,account.type,index);
 return <li key={account.id} className="wallet-item"><Card className={`finance-account tone-${index%3} account-kind-${account.type}`} data-account-type={account.type}><CardHeader><div className="account-heading"><span className="ss-squircle account-squircle" style={{'--sq-bg':brandBg} as React.CSSProperties}><Icon size={18} strokeWidth={2.2} aria-hidden/></span><div className="account-badges">{credit&&<span className="ss-contactless" aria-hidden="true"><svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6.8 6.2a2.5 2.5 0 0 1 0 3.6M8.5 4.5a5 5 0 0 1 0 7M10.3 2.7a7.5 7.5 0 0 1 0 10.6"/></svg></span>}<Badge variant="outline">{credit?'Crédito':account.type==='cash'?'Carteira':'Conta bancária'}</Badge></div></div><CardTitle>{account.name}</CardTitle><CardDescription>{credit?`Fatura em aberto · vence ${dateLabel(bill!.dueDate)}`:account.type==='cash'?'Disponível em mãos':'Saldo disponível hoje'}</CardDescription></CardHeader><CardContent><strong className="wallet-card-value">{ctx.preferences.hidden?'••••':money(value)}</strong></CardContent><CardFooter><Button variant="ghost" data-action={credit?'invoice':'filter-account'} data-id={credit?account.id:account.name} aria-label={`${account.name}: ${credit?'ver fatura':'ver registros'}`}>{credit?'Ver fatura':'Ver registros'}<ArrowUpRight size={16} aria-hidden/></Button></CardFooter></Card></li>;
 })}</ul>{ctx.state.accounts.length>1&&<p className="wallet-hint">Deslize para explorar suas contas e cartões</p>}</section>;
}
function FlowComparison({ctx}:{ctx:Context}){
 const flow=moneyFlow(ctx.state,ctx.month,4),data=[{name:'Receitas',value:flow.income,fill:'var(--income)'},{name:'Despesas',value:flow.expense,fill:'var(--expense)'}];
 return <div className="finance-island finance-comparison"><ChartContainer config={{value:{label:'Valor',color:'var(--brand)'}}} className="finance-chart"><BarChart accessibilityLayer data={data} margin={{top:16,right:12,left:0,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 3"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:12,fontWeight:600}}/><YAxis width={56} axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:11}} tickFormatter={value=>`${new Intl.NumberFormat('pt-BR',{notation:'compact'}).format(Number(value)/100)}`}/><Tooltip cursor={{fill:'var(--fill)'}} formatter={value=>money(Number(value))} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:12,color:'var(--ink)',boxShadow:'0 12px 28px -8px rgba(0,0,0,0.35)'}}/><Bar dataKey="value" name="Valor" radius={[8,8,2,2]} maxBarSize={56} isAnimationActive={false}>{data.map(entry=><Cell key={entry.name} fill={entry.fill}/>)}</Bar></BarChart></ChartContainer><p className="helper">Balanço comparativo entre entradas e saídas registradas no mês (incluindo previstas).</p></div>;
}
function OverviewTabs({ctx}:{ctx:Context}){
 const selected=ctx.overviewSection||'summary';
 const items=[['summary','Resumo',LayoutGrid],['analysis','Análises',PieChartIcon],['activity','Atividade',Clock3]] as const;
 return <AnimatedBackground defaultValue={selected} className="tab-highlight" transition={{duration:.2}}>{items.map(([id,label,Icon])=><button key={id} type="button" data-id={id} data-action="overview-section" aria-pressed={selected===id} aria-controls={`overview-${id}`}><span className="overview-tab-inner"><Icon size={15} aria-hidden/><span>{label}</span></span></button>)}</AnimatedBackground>;
}
export function mountFinancialUI(ctx:Context){
 const table=document.querySelector<HTMLTableElement>('.transaction-table');
 if(table){const head=table.tHead?.innerHTML||'',body=table.tBodies[0]?.innerHTML||'',label=table.getAttribute('aria-label')||'Movimentações';const host=document.createElement('div');host.className='finance-island finance-table-host';table.replaceWith(host);mount(host,<Table className="transaction-table" aria-label={label}><TableHeader dangerouslySetInnerHTML={{__html:head}}/><TableBody dangerouslySetInnerHTML={{__html:body}}/></Table>);}
 const wallet=document.querySelector('.wallet-section');if(wallet){const host=document.createElement('div');host.className='wallet-section wallet-host';wallet.replaceWith(host);mount(host,<WalletDeck ctx={ctx}/>);}
 mount(document.querySelector('.overview-switch'),<OverviewTabs ctx={ctx}/>);
 // Keep privacy mode free of numeric series, tooltip data and bar widths.
 if(ctx.preferences.hidden)return;
 const list=document.querySelector('.cat-bars');
 if(list){
  const host=document.createElement('div');host.className='fintech-donut-host';
  if(!ctx.state.settings.budgets?.some(b=>b.month===ctx.month))list.replaceWith(host);
  else list.before(host);
  mount(host,<CategoryDonut ctx={ctx}/>);
 }
 const flow=document.querySelector('.panel-flow .stack');
 if(flow){const host=document.createElement('div');flow.before(host);mount(host,<FlowComparison ctx={ctx}/>);}
 // Componentes adaptados do Shadcn Fintech (MIT): cada ponto de montagem é opcional e some se não houver dados reais.
 const slot=(name:string)=>document.querySelector<HTMLElement>(`[data-fintech="${name}"]`);
 const transactionsSlot=slot('tx-summary');if(transactionsSlot)mount(transactionsSlot,<TransactionSummary ctx={ctx}/>);
 const analysisSlot=slot('analysis');if(analysisSlot)mount(analysisSlot,<><MonthComparison ctx={ctx}/><SpendingHeatmap ctx={ctx}/></>);
 const planningSlot=slot('planning');if(planningSlot)mount(planningSlot,<><BudgetRings ctx={ctx}/><MonthProjection ctx={ctx}/></>);
 const goals=document.querySelector<HTMLElement>('.goal-list');if(goals)mount(goals,<SavingsGoals ctx={ctx}/>);
}
