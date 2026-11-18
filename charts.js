// Gráficos do Saldo: funções puras que devolvem HTML/SVG. Sem dependências e sem estado.
// Números ficam sempre em centavos; o texto monetário vem de product.js, nunca de abreviações.
import {esc} from './ui.js';
import {money} from './product.js';

const DONUT_GAP=0.6;
export const DONUT_COLORS=6;

// Teto "redondo" para o eixo (1, 2, 2.5, 5 × 10^n), sempre ≥ ao maior valor.
export function niceMax(cents){
  if(!(cents>0))return 10000;
  const exp=10**Math.floor(Math.log10(cents)),f=cents/exp;
  return (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*exp;
}
export const axisTicks=(max,steps=4)=>Array.from({length:steps+1},(_,i)=>Math.round(max/steps*(steps-i)));
export const axisLabel=cents=>`R$ ${Math.round(cents/100).toLocaleString('pt-BR')}`;

// Percentuais das fatias (somam 100). Categorias além do limite viram "Outras".
export function donutShares(categories,total,limit=5){
  if(!(total>0))return [];
  const top=categories.slice(0,limit),rest=categories.slice(limit).reduce((n,c)=>n+c.total,0);
  const items=rest>0?[...top,{name:'Outras',total:rest,other:true}]:top;
  return items.map(c=>({...c,share:c.total/total*100}));
}

// Pontos normalizados (0–100) de uma série; devolve o y do último ponto para posicionar o marcador.
export function sparkPoints(values){
  if(values.length<2)return null;
  const min=Math.min(...values),max=Math.max(...values),span=max-min||1;
  const points=values.map((v,i)=>[i/(values.length-1)*100,92-(v-min)/span*84]);
  return {points,endY:points.at(-1)[1],flat:max===min};
}

export function sparkline(values){
  const data=sparkPoints(values);if(!data)return '';
  const line=data.points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');
  return `<div class="spark-wrap"><svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="spark-area" d="${line}L100 100L0 100Z"/><path class="spark-line" d="${line}" vector-effect="non-scaling-stroke"/></svg><span class="spark-dot" style="top:${data.endY.toFixed(2)}%" aria-hidden="true"></span></div>`;
}

const tipText=(rows)=>rows.map(([label,value])=>`${label}::${value}`).join('||');

// Barras agrupadas (recebido × pago) com eixo, grade, tooltip e acesso por teclado.
export function evolutionChart({history,month,monthName}){
  const peak=Math.max(0,...history.flatMap(x=>[x.income,x.expense])),max=niceMax(peak);
  const height=value=>value>0?Math.max(2,value/max*100):0;
  const short=m=>new Date(`${m}-02T12:00:00`).toLocaleDateString('pt-BR',{month:'short'}).replace('.','');
  const ticks=axisTicks(max);
  const columns=history.map(x=>{
    const label=monthName(x.month),result=x.income-x.expense;
    const tip=tipText([['Recebido',money(x.income)],['Pago',money(x.expense)],['Resultado',`${result<0?'−':result>0?'+':''}${money(Math.abs(result))}`]]);
    return `<button type="button" class="evo-col${x.month===month?' current':''}" data-action="change-month" data-id="${esc(x.month)}" data-tip-title="${esc(label)}" data-tip="${esc(tip)}" aria-label="${esc(`${label}: recebido ${money(x.income)}, pago ${money(x.expense)}. Abrir este mês.`)}" ${x.month===month?'aria-current="true"':''}><span class="evo-bar income" style="--h:${height(x.income).toFixed(2)}%"></span><span class="evo-bar expense" style="--h:${height(x.expense).toFixed(2)}%"></span></button>`;
  }).join('');
  return `<div class="evo"><div class="evo-axis" aria-hidden="true">${ticks.map(t=>`<span>${axisLabel(t)}</span>`).join('')}</div><div class="evo-main"><div class="evo-plot"><div class="evo-grid" aria-hidden="true">${ticks.map(()=>'<i></i>').join('')}</div><div class="evo-cols">${columns}</div></div><div class="evo-labels" aria-hidden="true">${history.map(x=>`<span class="${x.month===month?'current':''}">${esc(short(x.month))}</span>`).join('')}</div></div></div>`;
}

// Rosca de distribuição. `pathLength=100` faz o traço usar percentuais diretos.
export function donut(categories,total,{limit=5,cash=v=>esc(money(v))}={}){
  const items=donutShares(categories,total,limit);if(!items.length)return {chart:'',legend:items};
  let offset=0;
  const segments=items.map((c,i)=>{
    const gap=items.length>1?DONUT_GAP:0,size=Math.max(0.3,c.share-gap),start=offset;offset+=c.share;
    return `<circle class="donut-seg" cx="21" cy="21" r="15.9155" pathLength="100" fill="none" stroke="var(--c${(i%DONUT_COLORS)+1})" stroke-width="5" stroke-dasharray="${size.toFixed(3)} ${(100-size).toFixed(3)}" stroke-dashoffset="${(-start).toFixed(3)}" style="--p:${size.toFixed(3)};--i:${i}"/>`;
  }).join('');
  const chart=`<div class="donut"><svg viewBox="0 0 42 42" aria-hidden="true" focusable="false"><circle class="donut-track" cx="21" cy="21" r="15.9155" fill="none" stroke-width="5"/>${segments}</svg><div class="donut-center"><small>Total</small><strong>${cash(total)}</strong></div></div>`;
  return {chart,legend:items};
}

export const dot=index=>`<i class="dot" style="background:var(--c${(index%DONUT_COLORS)+1})"></i>`;

// ---- Visão geral 5.1 ----
const pathOf=pts=>pts.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join('');
// Cubic segments stay within adjacent points: smooth appearance without invented extrema.
export const smoothPath=pts=>pts.map(([x,y],i)=>{
  if(!i)return `M${x.toFixed(2)} ${y.toFixed(2)}`;
  const [px,py]=pts[i-1],mid=((px+x)/2).toFixed(2);
  return `C${mid} ${py.toFixed(2)} ${mid} ${y.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)}`;
}).join('');
const scaleY=(values,top=8,bottom=92)=>{const min=Math.min(...values),max=Math.max(...values),span=max-min||1;return v=>bottom-(v-min)/span*(bottom-top);};

// Área do saldo no hero. `points` = [{date,value}]; `label(date)` e `cash(value)` formatam o tooltip.
export function areaChart(points,{label=d=>d,cash=money,id='area-fill',ticks=[]}={}){
  if(points.length<2)return '';
  const values=points.map(p=>p.value),low=Math.min(...values),high=Math.max(...values);
  const y=ticks.length?scaleY(ticks,10,90):scaleY([...values,low-(high-low)*.35],6,96);
  const dates=[...new Set(points.map(point=>point.date))];
  const positions=new Map(dates.map((date,i)=>[date,i*100/Math.max(1,dates.length-1)]));
  const pts=points.map(p=>[positions.get(p.date),y(p.value)]);
  const split=points.findIndex(p=>p.projected);
  const actual=split<0?pts:pts.slice(0,split);
  const forecast=split<0?[]:pts.slice(Math.max(0,split-1));
  const line=actual.length?smoothPath(actual):'';
  const forecastLine=forecast.length?`M${forecast[0].join(' ')}`+forecast.slice(1).map(([x,y])=>`H${x}V${y}`).join(''):'';
  const grid=ticks.map(value=>`<line class="area-grid${value===0?' area-grid-zero':''}" x1="0" x2="100" y1="${y(value)}" y2="${y(value)}" vector-effect="non-scaling-stroke"/>`).join('');
  const step=Math.max(1,Math.ceil(points.length/40));
  const zones=points.map((p,i)=>{
    const next=points[i+1];
    if(next?.date===p.date || (i%step&&i!==points.length-1)) return '';
    const previous=points[i-1];
    const tip=p.projected?`${previous?.date===p.date?`Realizado::${cash(previous.value)}||`:''}Projetado::${cash(p.value)}`:`Saldo::${cash(p.value)}`;
    return `<span class="area-zone" style="left:${pts[i][0].toFixed(2)}%;--y:${pts[i][1].toFixed(2)}%" data-tip-title="${esc(label(p.date))}" data-tip="${esc(tip)}"></span>`;
  }).join('');
  return `<div class="area"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="${esc(id)}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--hero-accent)" stop-opacity=".44"/><stop offset="1" stop-color="var(--hero-accent)" stop-opacity="0"/></linearGradient></defs>${grid}${line?`<path class="area-fill" style="fill:url(#${esc(id)})" d="${line}L${actual.at(-1)[0]} 100L0 100Z"/><path class="area-line" d="${line}" vector-effect="non-scaling-stroke"/>`:''}${forecastLine?`<path class="area-projected" d="${forecastLine}" vector-effect="non-scaling-stroke"/>`:''}</svg><span class="area-end${forecast.length?' area-end-projected':''}" style="top:${pts.at(-1)[1].toFixed(2)}%" aria-hidden="true"></span><div class="area-zones" aria-hidden="true">${zones}</div></div>`;
}

// Escala monetária do resumo, com espaço para séries constantes e variações pequenas.
export function balanceChart(points,{label=d=>d,shortDate=label}={}){
  if(points.length<2)return '';
  const values=points.map(point=>point.value);
  const low=Math.min(...values),high=Math.max(...values);
  const rough=Math.max(100,(high-low)/3),magnitude=10**Math.floor(Math.log10(rough));
  const step=([1,2,2.5,5,10].find(multiplier=>multiplier*magnitude>=rough)??10)*magnitude;
  const bottom=Math.floor(low/step)*step-(low===high?step:0);
  const top=Math.ceil(high/step)*step+(low===high&&low%step===0?step:0);
  const ticks=Array.from({length:Math.round((top-bottom)/step)+1},(_,i)=>top-i*step);
  const compact=new Intl.NumberFormat('pt-BR',{notation:'compact',maximumFractionDigits:2});
  const compactLabels=ticks.map(value=>`R$ ${compact.format(value/100)}`);
  const labels=new Set(compactLabels).size===ticks.length?compactLabels:ticks.map(money);
  const first=points[0],last=points.at(-1);
  const dates=[...new Set(points.map(point=>point.date))];
  const datePositions=dates.length>2?[0,Math.floor(dates.length/2),dates.length-1]:[0,dates.length-1];
  const description=`Evolução do saldo de ${label(first.date)} a ${label(last.date)}. Início: ${money(first.value)}. ${last.projected?'Final projetado':'Final'}: ${money(last.value)}. Mínimo: ${money(low)}. Máximo: ${money(high)}.`;
  return `<div class="balance-figure" role="img" aria-label="${esc(description)}">${areaChart(points,{label,id:'summary-balance-fill',ticks})}<div class="balance-scale" aria-hidden="true">${labels.map((value,i)=>`<span style="top:${10+i*80/(labels.length-1)}%">${esc(value)}</span>`).join('')}</div><div class="balance-dates" aria-hidden="true">${datePositions.map(index=>`<span style="left:${index*100/Math.max(1,dates.length-1)}%">${esc(shortDate(dates[index]))}</span>`).join('')}</div></div>`;
}

// Linha mínima para os indicadores.
export function miniLine(values){
  if(values.length<2||!values.some(Boolean))return '';
  const y=scaleY(values,10,90),line=pathOf(values.map((v,i)=>[i/(values.length-1)*100,y(v)]));
  return `<svg class="mini-line" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path class="mini-fill" d="${line}L100 100L0 100Z"/><path class="mini-stroke" d="${line}" vector-effect="non-scaling-stroke"/></svg>`;
}

// Ritmo de gasto: acumulado do mês (linha cheia) contra o mês anterior inteiro (tracejada).
export function paceChart({current,previous,days}){
  const span=Math.max(days,previous.length),max=niceMax(Math.max(0,...current,...previous));
  const pts=list=>list.map((v,i)=>[span>1?i/(span-1)*100:0,100-v/max*100]);
  const now=pts(current),before=pts(previous);
  const end=now.at(-1);
  return `<div class="pace"><div class="pace-axis" aria-hidden="true"><span>${axisLabel(max)}</span><span>${axisLabel(max/2)}</span><span>R$ 0</span></div><div class="pace-plot"><div class="pace-grid" aria-hidden="true"><i></i><i></i><i></i></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">${before.length>1?`<path class="pace-before" d="${smoothPath(before)}" vector-effect="non-scaling-stroke"/>`:''}${now.length>1?`<path class="pace-fill" d="${smoothPath(now)}L${end[0].toFixed(2)} 100L0 100Z"/><path class="pace-now" d="${smoothPath(now)}" vector-effect="non-scaling-stroke"/>`:''}</svg>${end?`<span class="pace-dot" style="left:${end[0].toFixed(2)}%;top:${end[1].toFixed(2)}%" aria-hidden="true"></span>`:''}</div><div class="pace-labels" aria-hidden="true"><span>dia 1</span><span>dia ${span}</span></div></div>`;
}

// Fluxo do mês numa barra só, como o "Armazenamento" do iPhone: cada categoria ocupa a sua fatia do que entrou
// e o pedaço verde é o que sobrou. Se faltou dinheiro, a barra é o total gasto.
const FLOW_TONES=['var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c7)'];
export function flowChart(flow,{cash=v=>esc(money(v))}={}){
  const total=Math.max(flow.income,flow.expense);
  const parts=[...flow.targets.map((c,i)=>({...c,tone:c.other?'var(--c6)':FLOW_TONES[i%FLOW_TONES.length]})),...(flow.surplus?[{name:'Sobrou',total:flow.surplus,tone:'var(--sage)',special:true}]:[])].filter(p=>p.total>0);
  if(!(total>0)||!parts.length)return '';
  const share=v=>v/total*100,pct=v=>{const n=share(v);return n>0&&n<1?'<1%':`${Math.round(n)}%`;};
  const bar=parts.map(p=>`<i style="flex-grow:${share(p.total).toFixed(3)};background:${p.tone}"></i>`).join('');
  const legend=parts.map(p=>`<li${p.special?' class="special"':''}><i style="background:${p.tone}"></i><span>${esc(p.name)}</span><b>${cash(p.total)}</b><em>${pct(p.total)}</em></li>`).join('');
  return `<div class="stack"><div class="stack-bar" aria-hidden="true">${bar}</div><ul class="stack-legend">${legend}</ul></div>`;
}
