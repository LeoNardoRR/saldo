// Adaptado de shadcn-fintech/src/components/budgets/budget-rings.tsx (MIT © 2026 Abderrahim Ghazali).
// Mudanças: orçamentos reais do mês (budgetUsage), BRL/pt-BR, percentual no centro no lugar dos ícones fixos,
// cada anel abre a edição existente (edit-budget), sem o pulso infinito de "estourou" (movimento contínuo),
// e respeita prefers-reduced-motion via MotionConfig. Metas de receita usam a mesma leitura, sem estado de excesso.
import {motion} from 'motion/react';
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from '@/components/ui/card';
import {budgetUsage} from '../../finance.js';
import {brl,type FintechContext} from './shared';

const R=40,C=2*Math.PI*R;

export function BudgetRings({ctx}:{ctx:FintechContext}){
 const budgets=(ctx.state.settings.budgets||[]).filter(b=>b.month===ctx.month&&b.limit>0);
 if(!budgets.length)return null;
 const rows=budgets.map(b=>{
  const u=budgetUsage(ctx.state.entries,ctx.month,b) as {spent:number;forecast:number},income=b.kind==='income';
  const ratio=u.spent/b.limit,over=!income&&u.forecast>b.limit;
  return {b,u,income,over,ratio,percent:Math.round(ratio*100)};
 }).sort((a,z)=>z.ratio-a.ratio);
 return <Card className="panel fintech-card gap-4">
  <CardHeader className="px-0">
   <CardTitle className="text-[17px] tracking-tight">Orçamentos do mês</CardTitle>
   <CardDescription>Realizado em relação ao limite de cada categoria. Toque para editar.</CardDescription>
  </CardHeader>
  <CardContent className="px-0">
   <ul className="m-0 grid list-none p-0 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
    {rows.map(({b,u,income,over,ratio,percent},i)=><li key={b.category}>
     <button type="button" data-action="edit-budget" data-id={b.category} className="flex w-full flex-col items-center gap-2 rounded-xl p-1 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" aria-label={`${b.category}: ${brl(u.spent)} ${income?'recebidos de':'gastos de'} ${brl(b.limit)}, ${percent}%${over?', previsão acima do limite':''}. Editar orçamento`}>
      <span className="relative size-24">
       <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" className="text-muted" strokeWidth="8"/>
        <motion.circle cx="50" cy="50" r={R} fill="none" stroke="currentColor" className={over||(!income&&ratio>1)?'text-destructive':income?'text-success':'text-primary'} strokeWidth="8" strokeLinecap="round" strokeDasharray={C}
         initial={{strokeDashoffset:C}} animate={{strokeDashoffset:C-Math.min(ratio,1)*C}} transition={{duration:.8,delay:i*.06,ease:'easeOut'}}/>
       </svg>
       <span className="absolute inset-0 flex items-center justify-center text-base font-semibold tabular-nums text-foreground">{percent}%</span>
      </span>
      <span className="text-center">
       <span className="block max-w-[9rem] truncate text-[13px] font-medium text-foreground">{b.category}</span>
       <span className="block text-xs tabular-nums text-muted-foreground">{brl(u.spent)} <span className="opacity-70">/ {brl(b.limit)}</span></span>
       {over&&<span className="mt-0.5 block text-[11px] font-medium text-destructive">previsão acima do limite</span>}
      </span>
     </button>
    </li>)}
   </ul>
  </CardContent>
 </Card>;
}
