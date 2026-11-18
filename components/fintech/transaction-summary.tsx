// Adaptado de shadcn-fintech/src/components/transactions/transaction-summary.tsx (MIT © 2026 Abderrahim Ghazali).
// Mudanças: calculado sobre o recorte atual da lista (filteredEntries), em centavos, BRL/pt-BR.
// Transferências ficam fora de entradas e saídas (não são receita nem despesa), como no restante do Saldo.
import {ArrowDownLeft,ArrowUpRight,Hash,TrendingUp} from 'lucide-react';
import {cn} from '@/lib/utils';
import {filteredEntries} from '../../product.js';
import {brl,type Entry,type FintechContext} from './shared';

export function TransactionSummary({ctx}:{ctx:FintechContext}){
 const rows=filteredEntries(ctx.state,ctx.filter,ctx.month) as Entry[];
 if(!rows.length)return null;
 const money=rows.filter(e=>e.type!=='transfer');
 const totalIn=money.filter(e=>e.type==='income').reduce((n,e)=>n+e.cents,0);
 const totalOut=money.filter(e=>e.type==='expense').reduce((n,e)=>n+e.cents,0);
 const largest=money.reduce((max,e)=>e.cents>max?e.cents:max,0);
 const cards=[
  {label:'Entradas',value:brl(totalIn),icon:ArrowDownLeft,color:'text-success',bg:'bg-success/10'},
  {label:'Saídas',value:brl(totalOut),icon:ArrowUpRight,color:'text-destructive',bg:'bg-destructive/10'},
  {label:'Maior valor',value:brl(largest),icon:TrendingUp,color:'text-primary',bg:'bg-primary/10'},
  {label:'Registros',value:String(rows.length),icon:Hash,color:'text-muted-foreground',bg:'bg-muted'},
 ];
 return <dl className="fintech-tiles grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Resumo do recorte atual">
  {cards.map(c=><div key={c.label} className="fintech-tile flex flex-col justify-between gap-2 rounded-2xl bg-card p-3.5">
   <div className="flex items-center justify-between gap-2">
    <dt className="text-xs font-medium text-muted-foreground">{c.label}</dt>
    <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg',c.bg)} aria-hidden="true"><c.icon className={cn('size-3.5',c.color)}/></span>
   </div>
   <dd className="text-[17px] font-semibold tabular-nums tracking-tight text-foreground">{c.value}</dd>
  </div>)}
 </dl>;
}
