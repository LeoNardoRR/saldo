import test from 'node:test';
import assert from 'node:assert/strict';
import {niceMax,axisTicks,axisLabel,donutShares,sparkPoints,sparkline,evolutionChart,donut,areaChart,miniLine,paceChart,flowChart} from './charts.js';

test('Teto do eixo é redondo e nunca menor que o maior valor',()=>{
  for(const cents of [1,99,100,12345,250000,999999,1234567,98765432]){
    const max=niceMax(cents);
    assert.ok(max>=cents,`${cents} → ${max}`);
    assert.ok(max<=cents*2.5+1,`${cents} → ${max} (folga excessiva)`);
  }
  assert.equal(niceMax(0),10000);assert.equal(niceMax(-5),10000);
  assert.equal(niceMax(100000),100000);assert.equal(niceMax(100001),200000);
});

test('Eixo tem cinco marcas decrescentes do teto até zero, com rótulo em reais inteiros',()=>{
  const ticks=axisTicks(200000);
  assert.deepEqual(ticks,[200000,150000,100000,50000,0]);
  assert.equal(axisLabel(150000).replace(/ /g,' '),'R$ 1.500');
});

test('Fatias da rosca somam 100% e categorias extras viram "Outras"',()=>{
  const cats=[...Array(8)].map((_,i)=>({name:`C${i}`,total:(8-i)*1000}));
  const total=cats.reduce((n,c)=>n+c.total,0),shares=donutShares(cats,total);
  assert.equal(shares.length,6);assert.equal(shares.at(-1).name,'Outras');
  assert.ok(Math.abs(shares.reduce((n,c)=>n+c.share,0)-100)<1e-9);
  assert.equal(shares.at(-1).total,cats.slice(5).reduce((n,c)=>n+c.total,0));
  assert.deepEqual(donutShares([],0),[]);
});

test('Rosca desenha um traço por fatia e preserva o total exibido',()=>{
  const cats=[{name:'A',total:7000},{name:'B',total:3000}];
  const {chart,legend}=donut(cats,10000,{cash:v=>`R$ ${v/100}`});
  assert.equal((chart.match(/class="donut-seg"/g)||[]).length,2);
  assert.ok(chart.includes('R$ 100'));assert.equal(legend.length,2);
  assert.equal(donut([],0).chart,'');
});

test('Sparkline normaliza a série em 0–100 e marca o último ponto',()=>{
  const data=sparkPoints([100,300,200,400]);
  assert.equal(data.points.length,4);assert.equal(data.points[0][0],0);assert.equal(data.points.at(-1)[0],100);
  for(const [x,y] of data.points){assert.ok(x>=0&&x<=100&&y>=0&&y<=100);}
  assert.ok(data.points[3][1]<data.points[0][1],'valor maior fica mais acima');
  assert.equal(sparkPoints([5]),null);assert.equal(sparkline([5]),'');
  assert.equal(sparkPoints([7,7,7]).flat,true);
  assert.ok(sparkline([1,2,3]).includes('spark-dot'));
});

test('Gráfico de evolução tem uma coluna acessível por mês, valores no tooltip e alturas proporcionais',()=>{
  const history=[{month:'2026-05',income:0,expense:0},{month:'2026-06',income:100000,expense:50000},{month:'2026-07',income:200000,expense:200000}];
  const html=evolutionChart({history,month:'2026-07',monthName:m=>`Mês ${m}`});
  assert.equal((html.match(/class="evo-col[ "]/g)||[]).length,3);
  assert.ok(html.includes('data-action="change-month" data-id="2026-06"'));
  assert.ok(html.includes('aria-current="true"'));
  assert.ok(html.includes('Resultado::'));
  const heights=[...html.matchAll(/--h:([\d.]+)%/g)].map(m=>Number(m[1]));
  assert.equal(heights[0],0);assert.equal(heights[1],0);       // mês sem movimento não desenha barra
  assert.equal(heights[2],50);assert.equal(heights[3],25);     // 100000 e 50000 sobre teto de 200000
  assert.equal(heights[4],100);                                  // maior valor encosta no teto
});

test('Textos dinâmicos dos gráficos são escapados',()=>{
  const html=evolutionChart({history:[{month:'2026-07',income:1,expense:1}],month:'2026-07',monthName:()=>'<img src=x onerror=1>'});
  assert.ok(!html.includes('<img src=x'));
});

test('gráficos da visão geral: área, mini-linha, ritmo e fluxo', () => {
  const area=areaChart([{date:'2026-11-01',value:1000},{date:'2026-11-02',value:3000}],{label:d=>d});
  assert.match(area,/class="area-line"/);
  assert.equal((area.match(/class="area-zone"/g)||[]).length,2);
  assert.equal(areaChart([{date:'2026-11-01',value:1}]),'');
  assert.match(miniLine([0,100,250]),/mini-stroke/);
  assert.equal(miniLine([0,0,0]),'');
  const pace=paceChart({current:[100,300],previous:[50,100,400],days:30});
  assert.match(pace,/pace-now/);assert.match(pace,/pace-before/);assert.match(pace,/dia 30/);
  const flow=flowChart({sources:[{name:'Salário',total:10000}],targets:[{name:'Casa',total:6000},{name:'<b>x</b>',total:1000}],income:10000,expense:7000,surplus:3000,deficit:0},{cash:v=>`R$ ${v/100}`});
  assert.match(flow,/Sobrou/);
  assert.match(flow,/class="stack-bar"/);
  assert.equal((flow.match(/<i style="flex-grow/g)||[]).length,3,'uma fatia por categoria e uma para o que sobrou');
  assert.match(flow,/60%/);
  const short=flowChart({sources:[],targets:[{name:'Casa',total:9000},{name:'Outras',total:3000,other:true}],income:10000,expense:12000,surplus:0,deficit:2000},{cash:v=>`R$ ${v/100}`});
  assert.ok(!short.includes('Sobrou'),'sem sobra não mostra a fatia verde');
  assert.match(short,/var\(--c6\)/,'"Outras" fica cinza');
  assert.ok(!flow.includes('<b>x</b>'),'nome de categoria precisa ser escapado');
  assert.equal(flowChart({sources:[],targets:[],income:0,expense:0,surplus:0,deficit:0}),'');
});
