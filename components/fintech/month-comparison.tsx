// Adaptado de shadcn-fintech/src/components/analytics/month-comparison.tsx (MIT © 2026 Abderrahim Ghazali).
// Mudanças: categorias reais do mês selecionado vs. mês anterior (categoryTotals), BRL/pt-BR, aviso de mês em andamento.
import {useMemo} from 'react';
import {BarChart,Bar,XAxis,YAxis,CartesianGrid,LabelList} from 'recharts';
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from '@/components/ui/card';
import {ChartContainer,ChartTooltip,ChartTooltipContent,type ChartConfig} from '@/components/ui/chart';
import {categoryTotals} from '../../product.js';
import {brl,brlCompact,previousMonth,shortMonth,todayISO,TooltipRow,type FintechContext} from './shared';

type Row={category:string;thisMonth:number;lastMonth:number};

// Variação percentual sobre a barra do mês atual (função de renderização, fora do componente).
function changeLabel(props:Record<string,unknown>,rows:Row[]){
 const {x,y,width,index}=props as {x:number;y:number;width:number;index:number};const row=rows[index];
 if(!row||!row.lastMonth)return null;const pct=Math.round((row.thisMonth-row.lastMonth)/row.lastMonth*100);if(!pct)return null;
 return <text x={x+width/2} y={y-6} textAnchor="middle" className={`text-[10px] font-medium tabular-nums ${pct>0?'fill-destructive':'fill-success'}`}>{pct>0?'+':''}{pct}%</text>;
}

export function MonthComparison({ctx}:{ctx:FintechContext}){
 const prev=previousMonth(ctx.month),current=ctx.month===todayISO().slice(0,7);
 const rows=useMemo(()=>{
  const now=categoryTotals(ctx.state,ctx.month,ctx.categoryMode) as {name:string;total:number}[];
  const before=categoryTotals(ctx.state,prev,ctx.categoryMode) as {name:string;total:number}[];
  const map=new Map<string,Row>();
  for(const c of now)map.set(c.name.toLocaleLowerCase('pt-BR'),{category:c.name,thisMonth:c.total,lastMonth:0});
  for(const c of before){const key=c.name.toLocaleLowerCase('pt-BR'),row=map.get(key);if(row)row.lastMonth=c.total;else map.set(key,{category:c.name,thisMonth:0,lastMonth:c.total});}
  return [...map.values()].sort((a,b)=>Math.max(b.thisMonth,b.lastMonth)-Math.max(a.thisMonth,a.lastMonth)).slice(0,6);
 },[ctx.state,ctx.month,ctx.categoryMode,prev]);
 if(!rows.length)return null;
 const totals={thisMonth:rows.reduce((n,r)=>n+r.thisMonth,0),lastMonth:rows.reduce((n,r)=>n+r.lastMonth,0)};
 const nowLabel=shortMonth(ctx.month),beforeLabel=shortMonth(prev);
 const config={thisMonth:{label:nowLabel,color:'var(--color-primary)'},lastMonth:{label:beforeLabel,color:'var(--color-muted-foreground)'}} satisfies ChartConfig;
 return <Card className="panel fintech-card gap-4">
  <CardHeader className="px-0">
   <CardTitle className="text-[17px] tracking-tight">Mês contra mês</CardTitle>
   <CardDescription>
    <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
     <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary"/>{nowLabel}{current?' até hoje':''} <span className="font-medium tabular-nums text-foreground">{brl(totals.thisMonth)}</span></span>
     <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/30"/>{beforeLabel} <span className="font-medium tabular-nums text-foreground">{brl(totals.lastMonth)}</span></span>
    </span>
   </CardDescription>
  </CardHeader>
  <CardContent className="min-w-0 px-0">
   <ChartContainer config={config} className="h-[240px] w-full">
    <BarChart accessibilityLayer data={rows} margin={{top:24,right:4,bottom:0,left:0}} barGap={4}>
     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" strokeOpacity={.6}/>
     <XAxis dataKey="category" tickLine={false} axisLine={false} fontSize={11} tickMargin={8} stroke="var(--color-muted-foreground)" interval={0} tickFormatter={(v:string)=>v.length>9?`${v.slice(0,8)}…`:v}/>
     <YAxis width={56} tickLine={false} axisLine={false} fontSize={11} tickMargin={4} stroke="var(--color-muted-foreground)" tickFormatter={(v:number)=>brlCompact(v)}/>
     <ChartTooltip content={<ChartTooltipContent formatter={(value,name)=><TooltipRow name={config[name as keyof typeof config]?.label??name} value={Number(value)}/>}/>}/>
     <Bar dataKey="lastMonth" fill="var(--color-muted-foreground)" fillOpacity={.3} radius={[4,4,0,0]} maxBarSize={18} isAnimationActive={false}/>
     <Bar dataKey="thisMonth" fill="var(--color-primary)" radius={[4,4,0,0]} maxBarSize={18} isAnimationActive={false}><LabelList dataKey="thisMonth" content={props=>changeLabel(props as unknown as Record<string,unknown>,rows)}/></Bar>
    </BarChart>
   </ChartContainer>
   {current&&<p className="mt-2 text-xs text-muted-foreground">O mês atual ainda está em andamento; o anterior aparece completo.</p>}
  </CardContent>
 </Card>;
}
