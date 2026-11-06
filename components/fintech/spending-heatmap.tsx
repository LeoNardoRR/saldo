// Adaptado de shadcn-fintech/src/components/analytics/spending-heatmap.tsx (MIT © 2026 Abderrahim Ghazali).
// Mudanças: dados reais (despesas realizadas e sem confirmação por data de referência, até hoje), BRL/pt-BR,
// semana começando no domingo com rótulos em português, leitura por hover/foco sem 370 tooltips,
// <title> em cada célula e resumo textual para leitores de tela. Janela de 52 semanas terminando hoje.
import {useEffect,useMemo,useRef,useState} from 'react';
import {Card,CardContent,CardHeader,CardTitle,CardDescription} from '@/components/ui/card';
import {brl,isoDay,todayISO,type FintechContext} from './shared';

const CELL=12,GAP=3,STEP=CELL+GAP,LEFT=28,TOP=16,WEEKS=52;
const DAY_LABELS=['','seg','','qua','','sex',''];
const level=(amount:number,max:number)=>{
 if(amount<=0)return 'fill-muted';
 const r=amount/max;
 return r<.2?'fill-primary/15':r<.4?'fill-primary/30':r<.65?'fill-primary/55':'fill-primary/85';
};
const longDate=(iso:string)=>new Date(`${iso}T12:00:00`).toLocaleDateString('pt-BR',{day:'numeric',month:'long',year:'numeric'});

export function SpendingHeatmap({ctx}:{ctx:FintechContext}){
 const scroller=useRef<HTMLDivElement>(null);
 const [hover,setHover]=useState<{date:string;amount:number}|null>(null);
 const model=useMemo(()=>{
  const end=todayISO(),totals=new Map<string,number>();
  for(const e of ctx.state.entries){
   if(e.type!=='expense'||e.date>end||(e.status&&e.status!=='settled'&&e.status!=='legacy'))continue;
   totals.set(e.date,(totals.get(e.date)||0)+e.cents);
  }
  const last=new Date(`${end}T12:00:00`),start=new Date(last);
  start.setDate(start.getDate()-last.getDay()-(WEEKS-1)*7);
  const cells:{date:string;amount:number;col:number;row:number}[]=[],months:{label:string;col:number}[]=[];
  let seen='',max=0,sum=0,top:{date:string;amount:number}|null=null;
  for(let col=0;col<WEEKS;col++)for(let row=0;row<7;row++){
   const d=new Date(start);d.setDate(start.getDate()+col*7+row);const date=isoDay(d);
   if(date>end)continue;
   const amount=totals.get(date)||0;cells.push({date,amount,col,row});
   if(amount>max){max=amount;top={date,amount};}sum+=amount;
   const key=date.slice(0,7);
   if(row===0&&key!==seen){seen=key;months.push({label:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),col});}
  }
  return {cells,months,max,sum,top};
 },[ctx.state]);
 // O painel "Análises" pode estar oculto quando o componente monta (largura 0): rola para as semanas mais recentes assim que ficar visível.
 useEffect(()=>{
  const el=scroller.current;if(!el)return;
  const toEnd=()=>{if(el.scrollWidth>el.clientWidth){el.scrollLeft=el.scrollWidth;return true;}return false;};
  if(toEnd())return;
  const observer=new ResizeObserver(()=>{if(toEnd())observer.disconnect();});
  observer.observe(el);
  return()=>observer.disconnect();
 },[model]);
 if(!model.sum)return null;
 const width=LEFT+WEEKS*STEP,height=TOP+7*STEP;
 const summary=`Despesas por dia nas últimas 52 semanas, total de ${brl(model.sum)}.${model.top?` Maior dia: ${longDate(model.top.date)}, ${brl(model.top.amount)}.`:''}`;
 return <Card className="panel fintech-card fintech-heatmap gap-4">
  <CardHeader className="px-0">
   <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    <div><CardTitle className="text-[17px] tracking-tight">Ritmo de gastos no ano</CardTitle>
     <CardDescription><span className="font-medium tabular-nums text-foreground">{brl(model.sum)}</span> em despesas nas últimas 52 semanas</CardDescription></div>
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-hidden="true">
     <span>Menos</span>{['bg-muted','bg-primary/15','bg-primary/30','bg-primary/55','bg-primary/85'].map(c=><span key={c} className={`inline-block size-3 rounded-sm ${c}`}/>)}<span>Mais</span>
    </div>
   </div>
  </CardHeader>
  <CardContent className="px-0">
   <div ref={scroller} className="overflow-x-auto pb-1" tabIndex={0} role="region" aria-label="Mapa de calor das despesas, role para os lados para ver o ano todo">
    <svg width={width} height={height} role="img" aria-label={summary} onMouseLeave={()=>setHover(null)}>
     {model.months.map(m=><text key={`${m.label}-${m.col}`} x={LEFT+m.col*STEP} y={10} className="fill-muted-foreground text-[10px]">{m.label}</text>)}
     {DAY_LABELS.map((label,i)=>label?<text key={label} x={0} y={TOP+i*STEP+CELL-2} className="fill-muted-foreground text-[10px]">{label}</text>:null)}
     {model.cells.map(c=><rect key={c.date} x={LEFT+c.col*STEP} y={TOP+c.row*STEP} width={CELL} height={CELL} rx={3} className={`${level(c.amount,model.max)} transition-colors hover:stroke-foreground/40`} onMouseEnter={()=>setHover({date:c.date,amount:c.amount})}><title>{`${longDate(c.date)}: ${brl(c.amount)}`}</title></rect>)}
    </svg>
   </div>
   <p className="mt-2 min-h-5 text-xs text-muted-foreground" aria-live="off">{hover?<><span className="tabular-nums font-medium text-foreground">{brl(hover.amount)}</span> em {longDate(hover.date)}</>:'Passe o dedo ou o mouse sobre um dia para ver o valor.'}</p>
  </CardContent>
 </Card>;
}
