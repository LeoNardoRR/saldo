import React from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {MotionConfig} from 'motion/react';
import {Wallet, Landmark, CreditCard, ArrowUpRight, Plus} from 'lucide-react';
import {Card,CardHeader,CardTitle,CardDescription,CardContent,CardFooter} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {Badge} from '@/components/ui/badge';
import {ChartContainer} from '@/components/ui/chart';
import {BarChart,Bar,XAxis,YAxis,CartesianGrid,Tooltip} from 'recharts';
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
function WalletDeck({ctx}:{ctx:Context}){
 return <section className="wallet-section finance-island"><div className="section-heading"><h2>Minha carteira</h2><Button variant="ghost" className="wallet-add" data-action="new-account"><Plus aria-hidden size={16}/>Adicionar</Button></div><ul className="wallet-rail" aria-label="Contas e cartões; deslize para ver mais" tabIndex={0}>{ctx.state.accounts.map((account,index)=>{
 const credit=account.type==='credit',bill=credit?invoice(ctx.state.entries,account,ctx.month):null;
 const value=credit?Math.max(0,bill!.remaining):accountBalance(ctx.state.entries,account,today());
 const Icon=credit?CreditCard:account.type==='cash'?Wallet:Landmark;
 return <li key={account.id} className="wallet-item"><Card className={`finance-account tone-${index%3}`}><CardHeader><div className="account-heading"><Icon size={20} aria-hidden/><Badge variant="outline">{credit?'Crédito':account.type==='cash'?'Carteira':'Conta'}</Badge></div><CardTitle>{account.name}</CardTitle><CardDescription>{credit?`Fatura em aberto · vence ${dateLabel(bill!.dueDate)}`:'Saldo da conta'}</CardDescription></CardHeader><CardContent><strong className="wallet-card-value">{ctx.preferences.hidden?'••••':money(value)}</strong></CardContent><CardFooter><Button variant="ghost" data-action={credit?'invoice':'filter-account'} data-id={credit?account.id:account.name} aria-label={`${account.name}: ${credit?'ver fatura':'ver registros'}`}>{credit?'Ver fatura':'Ver registros'}<ArrowUpRight size={16} aria-hidden/></Button></CardFooter></Card></li>;
 })}</ul>{ctx.state.accounts.length>1&&<p className="wallet-hint">Deslize para ver suas contas e cartões</p>}</section>;
}
function FlowComparison({ctx}:{ctx:Context}){
 const flow=moneyFlow(ctx.state,ctx.month,4),data=[{name:'Receitas',value:flow.income},{name:'Despesas',value:flow.expense}];
 return <div className="finance-island finance-comparison"><ChartContainer config={{value:{label:'Valor',color:'var(--brand)'}}} className="finance-chart"><BarChart accessibilityLayer data={data} margin={{top:16,right:12,left:0,bottom:0}}><CartesianGrid vertical={false} stroke="var(--line)"/><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:12}}/><YAxis width={52} axisLine={false} tickLine={false} tick={{fill:'var(--muted)',fontSize:11}} tickFormatter={value=>`${new Intl.NumberFormat('pt-BR',{notation:'compact'}).format(Number(value)/100)}`}/><Tooltip cursor={{fill:'var(--fill)'}} formatter={value=>money(Number(value))} contentStyle={{background:'var(--surface)',border:'1px solid var(--line)',borderRadius:8,color:'var(--ink)'}}/><Bar dataKey="value" name="Valor" fill="var(--brand)" radius={[5,5,0,0]} isAnimationActive={false}/></BarChart></ChartContainer><p className="helper">Receitas e despesas registradas no mês, incluindo previstas. Valores em reais.</p></div>;
}
function OverviewTabs({ctx}:{ctx:Context}){
 const selected=ctx.overviewSection||'summary';
 return <AnimatedBackground defaultValue={selected} className="tab-highlight" transition={{duration:.18}}>{[['summary','Resumo'],['analysis','Análises'],['activity','Atividade']].map(([id,label])=><button key={id} type="button" data-id={id} data-action="overview-section" aria-pressed={selected===id} aria-controls={`overview-${id}`}>{label}</button>)}</AnimatedBackground>;
}
export function mountFinancialUI(ctx:Context){
 const table=document.querySelector<HTMLTableElement>('.transaction-table');
 if(table){const head=table.tHead?.innerHTML||'',body=table.tBodies[0]?.innerHTML||'',label=table.getAttribute('aria-label')||'Movimentações';const host=document.createElement('div');host.className='finance-island finance-table-host';table.replaceWith(host);mount(host,<Table className="transaction-table" aria-label={label}><TableHeader dangerouslySetInnerHTML={{__html:head}}/><TableBody dangerouslySetInnerHTML={{__html:body}}/></Table>);}
 const wallet=document.querySelector('.wallet-section');if(wallet){const host=document.createElement('div');host.className='wallet-section wallet-host';wallet.replaceWith(host);mount(host,<WalletDeck ctx={ctx}/>);}
 mount(document.querySelector('.overview-switch'),<OverviewTabs ctx={ctx}/>);
 // Keep privacy mode free of numeric series, tooltip data and bar widths.
 if(ctx.preferences.hidden)return;
 if(!ctx.state.settings.budgets?.some(b=>b.month===ctx.month)){
 const list=document.querySelector('.cat-bars');if(list){const host=document.createElement('div');list.replaceWith(host);mount(host,<CategoryDonut ctx={ctx}/>);}
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
