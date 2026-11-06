// Tipos e utilitários dos componentes adaptados do Shadcn Fintech (MIT © 2026 Abderrahim Ghazali).
// Origem: https://github.com/abderrahimghazali/shadcn-fintech @ a905058 — ver licenses/shadcn-fintech.txt.
import React from 'react';
import {money,today} from '../../product.js';
import {shiftMonth} from '../../finance.js';

export type Entry={id:string;type:'income'|'expense'|'transfer';cents:number;date:string;status?:string;category:string;description:string;account:string;toAccount?:string;settledDate?:string;dueDate?:string;seriesId?:string};
export type Account={id:string;name:string;type:'credit'|'cash'|'bank';openingDate?:string};
export type Budget={month:string;category:string;limit:number;kind?:'expense'|'income'};
export type Goal={id:string;name:string;saved:number;target:number;targetDate?:string};
export type FinanceState={entries:Entry[];accounts:Account[];settings:{budgets?:Budget[];goals?:Goal[]}};
export type FintechContext={state:FinanceState;month:string;preferences:{hidden?:boolean};categoryMode:string;categoryExpanded?:boolean;filter?:Record<string,unknown>};

/** Valores do Saldo são centavos; a formatação é sempre BRL/pt-BR. */
export const brl=(cents:number):string=>money(cents);
const compactNumber=new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:1});
export const brlCompact=(cents:number)=>`R$ ${compactNumber.format(cents/100)}`;
export const todayISO=():string=>today();
export const previousMonth=(month:string):string=>shiftMonth(`${month}-01`,-1).slice(0,7);
export const shortMonth=(month:string)=>{const [y,m]=month.split('-').map(Number);return new Date(y,m-1,1).toLocaleDateString('pt-BR',{month:'short'}).replace('.','');};
export const isoDay=(d:Date)=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

export const SLICE_COLORS=['var(--color-chart-1)','var(--color-chart-2)','var(--color-chart-3)','var(--color-chart-4)','var(--color-chart-5)'];
export const OTHER_COLOR='var(--color-chart-6)';

export function TooltipRow({name,value}:{name?:React.ReactNode;value:number}){
 return <span className="flex w-full items-center justify-between gap-4"><span className="text-muted-foreground">{name}</span><span className="font-medium tabular-nums text-foreground">{brl(value)}</span></span>;
}
