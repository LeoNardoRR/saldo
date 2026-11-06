// Adaptado de shadcn-fintech/src/components/budgets/month-projection.tsx (MIT © 2026 Abderrahim Ghazali).
// Mudanças: gasto acumulado real do mês (spendingPace), limite = soma dos orçamentos de despesa do mês,
// média diária sobre os dias já decorridos (e não só dias com gasto), eixos e valores em BRL/pt-BR.
// Só aparece no mês corrente e quando existe ao menos um limite de despesa; sem insight inventado.
import {useMemo} from 'react';
import {Area,AreaChart,ReferenceLine,XAxis,YAxis} from 'recharts';
import {AlertTriangle,CheckCircle2} from 'lucide-react';
import {Card,CardContent,CardHeader,CardTitle} from '@/components/ui/card';
import {ChartContainer,ChartTooltip,ChartTooltipContent,type ChartConfig} from '@/components/ui/chart';
import {spendingPace} from '../../product.js';
import {brl,brlCompact,todayISO,TooltipRow,type FintechContext} from './shared';

const config={spent:{label:'Gasto acumulado',color:'var(--color-primary)'},projected:{label:'Ritmo atual',color:'var(--color-muted-foreground)'}} satisfies ChartConfig;

export function MonthProjection({ctx}:{ctx:FintechContext}){
 const data=useMemo(()=>{
  if(ctx.month!==todayISO().slice(0,7))return null;
  const limit=(ctx.state.settings.budgets||[]).filter(b=>b.month===ctx.month&&b.kind!=='income').reduce((n,b)=>n+b.limit,0);
  if(!limit)return null;
  const pace=spendingPace(ctx.state,ctx.month) as {cut:number;days:number;spent:number;current:number[]};
  if(!pace.cut)return null;
  const perDay=pace.spent/pace.cut,projected=Math.round(perDay*pace.days);
  const points=Array.from({length:pace.days},(_,i)=>{
   const day=i+1;
   return {day,spent:day<=pace.cut?pace.current[i]:null,projected:day>=pace.cut?Math.round(perDay*day):null};
  });
  return {limit,projected,perDay:Math.round(perDay),daysLeft:pace.days-pace.cut,spent:pace.spent,over:projected>limit,points};
 },[ctx.state,ctx.month]);
 if(!data)return null;
 return <Card className="panel fintech-card gap-4">
  <CardHeader className="px-0"><CardTitle className="text-[17px] tracking-tight">Projeção do mês</CardTitle></CardHeader>
  <CardContent className="space-y-4 px-0">
   <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium ${data.over?'bg-destructive/10 text-destructive':'bg-success/10 text-success'}`} role="status">
    {data.over?<AlertTriangle className="size-4 shrink-0" aria-hidden/>:<CheckCircle2 className="size-4 shrink-0" aria-hidden/>}
    {data.over?'No ritmo atual, os gastos passam do limite do mês':'No ritmo atual, os gastos ficam dentro do limite do mês'}
   </p>
   <dl className="grid grid-cols-2 gap-3">
    {[['Gasto até agora',brl(data.spent)],['Média por dia',brl(data.perDay)],['Dias restantes',String(data.daysLeft)],['Projeção no fim do mês',brl(data.projected)]].map(([label,value],i)=><div key={label}>
     <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
     <dd className={`text-lg font-semibold tabular-nums ${i===3&&data.over?'text-destructive':'text-foreground'}`}>{value}</dd></div>)}
   </dl>
   <ChartContainer config={config} className="h-[150px] w-full">
    <AreaChart accessibilityLayer data={data.points} margin={{top:6,right:4,bottom:0,left:0}}>
     <defs><linearGradient id="fintechSpend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--color-primary)" stopOpacity={.22}/><stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0}/></linearGradient></defs>
     <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={10} tickMargin={4} stroke="var(--color-muted-foreground)" interval="preserveStartEnd"/>
     <YAxis width={56} tickLine={false} axisLine={false} fontSize={10} tickMargin={4} stroke="var(--color-muted-foreground)" tickFormatter={(v:number)=>brlCompact(v)} domain={[0,(max:number)=>Math.max(max,data.limit)]}/>
     <ChartTooltip content={<ChartTooltipContent labelFormatter={(_,p)=>`Dia ${p?.[0]?.payload?.day??''}`} formatter={(value,name)=><TooltipRow name={config[name as keyof typeof config]?.label??name} value={Number(value)}/>}/>}/>
     <ReferenceLine y={data.limit} stroke="var(--color-destructive)" strokeDasharray="4 4" strokeOpacity={.55}/>
     <Area dataKey="projected" type="linear" stroke="var(--color-muted-foreground)" strokeOpacity={.6} strokeDasharray="4 4" fill="transparent" dot={false} connectNulls isAnimationActive={false}/>
     <Area dataKey="spent" type="monotone" stroke="var(--color-primary)" strokeWidth={2} fill="url(#fintechSpend)" dot={false} isAnimationActive={false}/>
    </AreaChart>
   </ChartContainer>
   <p className="text-xs text-muted-foreground">Linha tracejada vermelha: soma dos limites de despesa ({brl(data.limit)}). Linha cinza: projeção se o ritmo diário se mantiver.</p>
  </CardContent>
 </Card>;
}
