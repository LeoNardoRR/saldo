// Movimento discreto: entrada, contagem de valores e alternância de tema. Não toca em dados: só observa o DOM já renderizado.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const root=document.documentElement;
const main=document.getElementById('main-content');

/* ---- tema claro/escuro ---- */
const THEME_KEY='saldo.theme.v1';
const themeColors={dark:'#101013',light:'#f2f2f7'};
function applyTheme(theme){
  root.dataset.theme=theme;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content',themeColors[theme]);
}
function currentTheme(){return root.dataset.theme==='dark'?'dark':'light';}
function mountThemeToggle(){
  const actions=document.querySelector('.header-actions');if(!actions||actions.querySelector('.theme-toggle'))return;
  const button=document.createElement('button');
  button.className='icon-button theme-toggle';button.type='button';
  button.innerHTML='<svg class="moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"/></svg><svg class="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
  const sync=()=>{const dark=currentTheme()==='dark';button.setAttribute('aria-label',dark?'Usar tema claro':'Usar tema escuro');button.title=button.getAttribute('aria-label');};
  button.addEventListener('click',()=>{
    const next=currentTheme()==='dark'?'light':'dark';
    const swap=()=>{applyTheme(next);try{localStorage.setItem(THEME_KEY,next);}catch{}sync();};
    if(document.startViewTransition&&!reduced.matches)document.startViewTransition(swap);else swap();
  });
  sync();actions.prepend(button);
}

/* ---- contagem animada de valores ---- */
const brl=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
const COUNT_SELECTOR='.hero-amount .financial-value,.kpi-value .financial-value,.account-value .financial-value';
function parseBRL(text){
  const match=text.replace(/ /g,' ').match(/^(-)?\s*R\$\s*(-)?\s*([\d.]+),(\d{2})$/);
  if(!match)return null;
  const value=Number(match[3].replace(/\./g,'')+'.'+match[4]);
  return match[1]||match[2]?-value:value;
}
function tween(el,from,to,duration){
  // Aba oculta não executa requestAnimationFrame: nesse caso o valor real permanece e nunca aparece um número intermediário preso.
  if(document.hidden)return;
  const original=el.textContent,start=performance.now(),ease=t=>1-Math.pow(2,-10*t);
  const finish=()=>{if(el.isConnected)el.textContent=original;};
  const step=now=>{
    const t=Math.min(1,(now-start)/duration);
    if(t<1){el.textContent=brl.format(from+(to-from)*ease(t));requestAnimationFrame(step);}else finish();
  };
  el.textContent=brl.format(from);
  requestAnimationFrame(step);
  setTimeout(finish,duration+80); // garantia: o texto exato é restaurado mesmo se os quadros forem pausados
}
function countUp(el){const target=parseBRL(el.textContent);if(target!==null&&target!==0)tween(el,0,target,900);}

/* ---- transição de valores quando os dados mudam (mesma tela, mesmo mês) ---- */
const labelOf=el=>{
  const card=el.closest('.hero,.kpi,.account-card');
  const label=card?.querySelector('.hero-label,.kpi-label,h3')?.textContent.trim();
  return label?`${location.hash}|${label}`:'';
};
let remembered=new Map();
function remember(){remembered=new Map();main.querySelectorAll(COUNT_SELECTOR).forEach(el=>{const key=labelOf(el);if(key)remembered.set(key,el.textContent);});}
function tweenChanged(){
  if(!reduced.matches)main.querySelectorAll(COUNT_SELECTOR).forEach(el=>{
    const key=labelOf(el),before=remembered.get(key);
    if(!key||before===undefined||before===el.textContent)return;
    const from=parseBRL(before),to=parseBRL(el.textContent);
    if(from!==null&&to!==null)tween(el,from,to,500);
  });
  remember();
}

/* ---- entrada orquestrada ----
   Troca de página: entrada em cascata e contagem a partir de zero.
   Troca de mês na mesma página: entrada visual, mas os valores só animam do número anterior ao novo
   (um valor que não mudou, como o saldo disponível, não é recontado). */
let lastPage=null,lastMonth=null,enterTimer=0;
const monthInput=document.getElementById('month');
function enter(){
  if(!main||main.getAttribute('aria-busy')==='true')return;
  const page=location.hash,month=monthInput?.value||'',newPage=page!==lastPage,newMonth=month!==lastMonth;
  lastPage=page;lastMonth=month;
  if(!newPage&&!newMonth){tweenChanged();return;}
  if(newPage)remember();else tweenChanged();
  if(reduced.matches)return;
  main.setAttribute('data-enter','');
  if(newPage)main.querySelectorAll(COUNT_SELECTOR).forEach(countUp);
  clearTimeout(enterTimer);
  enterTimer=setTimeout(()=>main.removeAttribute('data-enter'),1600);
}
if(main){
  new MutationObserver(()=>enter()).observe(main,{childList:true,attributes:true,attributeFilter:['aria-busy']});
}

/* ---- tooltip dos gráficos (ponteiro e foco) ---- */
let tip=null;
function showTip(target){
  const title=target.dataset.tipTitle,rows=(target.dataset.tip||'').split('||').filter(Boolean).map(row=>row.split('::'));
  if(!title&&!rows.length)return;
  if(!tip){tip=document.createElement('div');tip.className='tip';tip.setAttribute('aria-hidden','true');document.body.append(tip);}
  tip.replaceChildren();
  if(title){const head=document.createElement('div');head.className='tip-title';head.textContent=title;tip.append(head);}
  for(const [label,value] of rows){const row=document.createElement('div');row.className='tip-row';const a=document.createElement('span'),b=document.createElement('strong');a.textContent=label;b.textContent=value;row.append(a,b);tip.append(row);}
  const box=target.getBoundingClientRect(),size=tip.getBoundingClientRect();
  const x=Math.max(8,Math.min(innerWidth-size.width-8,box.left+box.width/2-size.width/2));
  let y=box.top-size.height-10;if(y<8)y=box.bottom+10;
  tip.style.transform=`translate(${Math.round(x)}px,${Math.round(y)}px)`;tip.dataset.show='';
}
const hideTip=()=>tip?.removeAttribute('data-show');
document.addEventListener('pointerover',event=>{const target=event.target.closest?.('[data-tip]');if(target&&event.pointerType!=='touch')showTip(target);});
document.addEventListener('pointerout',event=>{if(event.target.closest?.('[data-tip]'))hideTip();});
document.addEventListener('focusin',event=>{const target=event.target.closest?.('[data-tip]');if(target)showTip(target);});
document.addEventListener('click',event=>{
  const area=event.target.closest?.('.area');
  const targets=area?[...area.querySelectorAll('[data-tip]')]:[];
  const target=targets.length?targets.reduce((best,node)=>{
    const distance=el=>Math.abs(el.getBoundingClientRect().left+el.getBoundingClientRect().width/2-event.clientX);
    return distance(node)<distance(best)?node:best;
  }):event.target.closest?.('[data-tip]');
  if(target)showTip(target);else hideTip();
});
document.addEventListener('focusout',hideTip);
window.addEventListener('scroll',hideTip,{passive:true});
if(main)new MutationObserver(hideTip).observe(main,{childList:true});

mountThemeToggle();
applyTheme(currentTheme());
enter();

/* ---- barra de período em vidro ao rolar (estilo iOS) ---- */
const title=document.getElementById('page-title');
if(title&&'IntersectionObserver' in window){
  new IntersectionObserver(([entry])=>{
    if(entry.isIntersecting)delete root.dataset.scrolled;else root.dataset.scrolled='';
  },{rootMargin:'-8px 0px 0px 0px'}).observe(title);
}
