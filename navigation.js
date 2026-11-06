/** Actual destinations of the existing hash router. Keep actions out of routes. */
export const pageAliases=Object.freeze({
  overview:'overview',transactions:'transactions',accounts:'accounts',
  planning:'planning',recurring:'recurring',settings:'settings','accounts-section':'accounts'
});
export const mobileNavigation=Object.freeze([
  {key:'overview',label:'Início',icon:'home',page:'overview'},
  {key:'transactions',label:'Registros',icon:'list',page:'transactions'},
  {key:'quick',label:'Novo registro',icon:'plus',action:'quick'},
  {key:'accounts',label:'Contas',icon:'wallet',page:'accounts'},
  {key:'more',label:'Mais',icon:'more',action:'more'}
]);
export function resolveNavigationPage(hash){
  const key=String(hash).replace(/^#/,'');
  return Object.hasOwn(pageAliases,key)?pageAliases[key]:'overview';
}
export function activeMobileDestination(page){
  const resolved=resolveNavigationPage(page);
  return ['planning','recurring','settings'].includes(resolved)?'more':resolved;
}

/** Hide the capsule while the visual viewport is occupied by a keyboard.
 * Focus alone is insufficient (hardware keyboards and accessible zoom).
 * No animation frames or polling are needed while the interface is idle.
 */
export function bindNavigationViewport(element,{win=window,doc=document}={}){
  const viewport=win.visualViewport;
  const update=()=>{
    const focused=doc.activeElement;
    const editable=Boolean(focused?.matches?.('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]):not([type=range]):not([type=color]),textarea,select,[contenteditable]:not([contenteditable=false])'));
    const keyboard=Boolean(viewport&&viewport.scale===1&&editable&&win.innerHeight-viewport.height>150);
    element.toggleAttribute('data-keyboard-open',keyboard);
    element.inert=keyboard;
  };
  viewport?.addEventListener('resize',update);
  win.addEventListener('resize',update);
  doc.addEventListener('focusin',update);
  doc.addEventListener('focusout',update);
  update();
  return ()=>{
    viewport?.removeEventListener('resize',update);
    win.removeEventListener('resize',update);
    doc.removeEventListener('focusin',update);
    doc.removeEventListener('focusout',update);
    element.removeAttribute('data-keyboard-open');
    element.inert=false;
  };
}
