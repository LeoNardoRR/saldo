// Adaptado de shadcn-fintech/src/components/analytics/category-donut.tsx (MIT © 2026 Abderrahim Ghazali).
// Mudanças: dados reais (categoryTotals), BRL/pt-BR, sem subcategorias fictícias — a seleção mostra a fatia
// e oferece "Ver registros" (filtro existente filter-category); categorias além das 5 maiores viram "Outras".
import {useMemo,useState} from 'react';
import {PieChart,Pie,Cell} from 'recharts';
import {AnimatePresence,motion} from 'motion/react';
import {ArrowLeft,ArrowUpRight} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {ChartContainer,ChartTooltip,ChartTooltipContent,type ChartConfig} from '@/components/ui/chart';
import {categoryTotals} from '../../product.js';
import {brl,SLICE_COLORS,OTHER_COLOR,TooltipRow,type FintechContext} from './shared';

type Slice={name:string;value:number;fill:string;other?:boolean};

export function CategoryDonut({ctx}:{ctx:FintechContext}){
 const [selected,setSelected]=useState<string|null>(null);
 const {slices,all,total}=useMemo(()=>{
  const list=(categoryTotals(ctx.state,ctx.month,ctx.categoryMode) as {name:string;total:number}[]).filter(c=>c.total>0);
  const total=list.reduce((n,c)=>n+c.total,0);
  const top=list.slice(0,list.length>6?5:6).map((c,i)=>({name:c.name,value:c.total,fill:SLICE_COLORS[i%SLICE_COLORS.length]}));
  const rest=list.slice(top.length);
  const slices:Slice[]=rest.length?[...top,{name:'Outras',value:rest.reduce((n,c)=>n+c.total,0),fill:OTHER_COLOR,other:true}]:top;
  const all:Slice[]=list.map((c,i)=>({name:c.name,value:c.total,fill:i<top.length?top[i].fill:OTHER_COLOR}));
  return {slices,all,total};
 },[ctx.state,ctx.month,ctx.categoryMode]);
 if(!slices.length)return null;
 const focus=slices.find(s=>s.name===selected)||null;
 const legend=ctx.categoryExpanded?all:slices;
 const config:ChartConfig=Object.fromEntries(slices.map(s=>[s.name,{label:s.name,color:s.fill}]));
 const share=(v:number)=>`${Math.round(v/total*100)}%`;
 return <div className="fintech-donut">
  <div className="mb-1 flex min-h-8 items-center justify-between gap-2">
   <p className="text-sm font-medium text-foreground">{focus?focus.name:'Distribuição das despesas'}</p>
   {focus&&<Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={()=>setSelected(null)}><ArrowLeft className="size-3" aria-hidden/>Todas</Button>}
  </div>
  <AnimatePresence mode="wait" initial={false}>
   <motion.div key={selected??'all'} initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:.97}} transition={{duration:.18}}>
    <ChartContainer config={config} className="mx-auto aspect-square h-[240px] max-w-full">
     <PieChart accessibilityLayer>
      <ChartTooltip content={<ChartTooltipContent hideLabel formatter={(value,name)=><TooltipRow name={name} value={Number(value)}/>}/>}/>
      <Pie data={slices} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={68} outerRadius={100} strokeWidth={2} stroke="var(--color-card)" paddingAngle={2}
       onClick={(_,index)=>{const s=slices[index];if(s&&!s.other)setSelected(s.name===selected?null:s.name);}} className="cursor-pointer" isAnimationActive={false}>
       {slices.map(s=><Cell key={s.name} fill={s.fill} fillOpacity={focus&&focus.name!==s.name?.25:1}/>)}
      </Pie>
      <text x="50%" y="47%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-xl font-semibold tabular-nums">{brl(focus?focus.value:total)}</text>
      <text x="50%" y="57%" textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-xs">{focus?`${share(focus.value)} das despesas`:'total no mês'}</text>
     </PieChart>
    </ChartContainer>
   </motion.div>
  </AnimatePresence>
  {focus?<div className="mt-3 flex justify-center"><Button variant="outline" size="sm" className="gap-1" data-action="filter-category" data-id={focus.name}>Ver registros<ArrowUpRight className="size-3.5" aria-hidden/></Button></div>:
  <ul className="m-0 mt-3 grid list-none p-0 gap-x-4 gap-y-0.5 text-[13px] sm:grid-cols-2" aria-label="Categorias de despesa">
   {legend.map(s=><li key={s.name}>{s.other?<span className="flex min-h-9 items-center gap-2 px-1"><i className="size-2.5 shrink-0 rounded-full" style={{background:s.fill}}/><span className="truncate text-muted-foreground">{s.name}</span><span className="ml-auto font-medium tabular-nums">{brl(s.value)}</span></span>:
    <button type="button" data-action="filter-category" data-id={s.name} className="flex min-h-9 w-full items-center gap-2 rounded-md px-1 text-left hover:bg-accent" aria-label={`${s.name}: ${brl(s.value)}, ${share(s.value)}. Ver registros`}>
     <i className="size-2.5 shrink-0 rounded-full" style={{background:s.fill}} aria-hidden/><span className="truncate text-muted-foreground">{s.name}</span><span className="ml-auto font-medium tabular-nums text-foreground">{brl(s.value)}</span></button>}</li>)}
  </ul>}
 </div>;
}
