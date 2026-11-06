// Adaptado de shadcn-fintech/src/components/budgets/savings-goals.tsx (MIT © 2026 Abderrahim Ghazali).
// Mudanças: metas reais (state.settings.goals), BRL/pt-BR, "no ritmo/atrasada" removido (não há contribuição mensal
// cadastrada, então seria inventado). Quando há prazo, mostra o quanto guardar por mês para chegar lá.
// Mantém as ações existentes: editar meta e atualizar valor guardado.
import {Card,CardContent} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Progress} from '@/components/ui/progress';
import {Target} from 'lucide-react';
import {dateLabel} from '../../product.js';
import {brl,todayISO,type FintechContext} from './shared';

const monthsUntil=(iso:string)=>{
 const now=new Date(`${todayISO()}T12:00:00`),end=new Date(`${iso}T12:00:00`);
 return (end.getFullYear()-now.getFullYear())*12+end.getMonth()-now.getMonth()+(end.getDate()>=now.getDate()?1:0);
};

export function SavingsGoals({ctx}:{ctx:FintechContext}){
 const goals=ctx.state.settings.goals||[];
 return <div className="grid gap-3">
  {goals.map(g=>{
   const percent=Math.round(g.saved/g.target*100),missing=Math.max(0,g.target-g.saved),done=missing===0;
   const months=g.targetDate&&!done?monthsUntil(g.targetDate):0;
   return <Card key={g.id} className="flex-row gap-4 rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground" aria-hidden="true"><Target className="size-5"/></span>
    <CardContent className="min-w-0 flex-1 space-y-2 px-0">
     <div className="flex items-center justify-between gap-2">
      <h3 className="truncate text-[15px] font-semibold text-foreground">{g.name}</h3>
      <Badge variant={done?'secondary':'outline'} className="shrink-0 text-[10px]">{done?'Meta alcançada':'Manual'}</Badge>
     </div>
     <p className="flex flex-wrap items-baseline gap-x-1.5"><span className="text-lg font-semibold tabular-nums text-foreground">{brl(g.saved)}</span><span className="text-xs text-muted-foreground">de {brl(g.target)}</span></p>
     <Progress value={Math.min(100,percent)} className="h-2" aria-label={`${g.name}: ${percent}% concluído`}/>
     <p className="text-xs text-muted-foreground">{done?(g.saved>g.target?`${brl(g.saved-g.target)} acima do objetivo`:'Objetivo atingido'):`${percent}% concluído · faltam ${brl(missing)}`}</p>
     {g.targetDate&&<p className="text-xs text-muted-foreground">Objetivo até {dateLabel(g.targetDate)}{!done&&(months>0?` · cerca de ${brl(Math.ceil(missing/months))} por mês`:' · prazo vencido')}</p>}
     <div className="pt-1"><button type="button" data-action="goal-add-value" data-id={g.id} className="min-h-9 rounded-md px-1 text-[13px] font-semibold text-primary hover:underline">Atualizar valor guardado</button>
      <button type="button" data-action="edit-goal" data-id={g.id} className="ml-3 min-h-9 rounded-md px-1 text-[13px] font-semibold text-primary hover:underline">Editar</button></div>
    </CardContent>
   </Card>;
  })}
 </div>;
}
