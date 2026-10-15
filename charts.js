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
