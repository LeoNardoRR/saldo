export const $ = (selector,root=document) => root.querySelector(selector);
export const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paths={
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  wallet:'<path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3"/><path d="M3 7h16a2 2 0 0 1 2 2v6h-6a3 3 0 0 1 0-6h6M16 12h.01"/>',
  target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  repeat:'<path d="m17 2 4 4-4 4M3 11V8a2 2 0 0 1 2-2h16M7 22l-4-4 4-4M21 13v3a2 2 0 0 1-2 2H3"/>',
  settings:'<path d="m9 3-1 3-3 1-1 4 2 2-1 3 3 3 3-1 2 2 4-1 1-3 3-1 1-4-2-2 1-3-3-3-3 1-2-2Z"/><circle cx="12" cy="12" r="3"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>',
  'chevron-left':'<path d="m15 18-6-6 6-6"/>','chevron-right':'<path d="m9 18 6-6-6-6"/>',
  'arrow-down':'<path d="M12 4v16m-6-6 6 6 6-6"/>','arrow-up':'<path d="M12 20V4m-6 6 6-6 6 6"/>','arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  eye:'<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':'<path d="m3 3 18 18M10 5h2c7 0 10 7 10 7a18 18 0 0 1-4 5M6 6a19 19 0 0 0-4 6s3 7 10 7a12 12 0 0 0 5-1"/>',
  search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  check:'<path d="m5 12 4 4 10-10"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert:'<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v4M12 17h.01"/>',
  card:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 9h20M6 15h4"/>',
  bank:'<path d="m3 7 9-4 9 4H3ZM5 9v9M10 9v9M14 9v9M19 9v9M3 21h18"/>',
  download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
  edit:'<path d="m15 5 4 4M4 20l4-1L20 7a3 3 0 0 0-4-4L4 15l-1 6ZM12 21h9"/>',
  trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',leaf:'<path d="M20 3C7 2 3 7 5 15c7 5 16-1 15-12ZM4 21 16 9"/>',
  shield:'<path d="m12 3 8 3v6c0 5-8 9-8 9S4 17 4 12V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  camera:'<path d="M8 5 6 8H3v13h18V8h-3l-2-3Z"/><circle cx="12" cy="14" r="4"/>',transfer:'<path d="M3 7h18m-4-4 4 4-4 4M21 17H3m4-4-4 4 4 4"/>',
};
export const icon = (name,cls='') => `<svg class="icon ${esc(cls)}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.grid}</svg>`;
export function hydrateIcons(root=document) {root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);delete el.dataset.icon;});}
export const action = (name,label,{id='',cls='button secondary',iconName='',extra=''}={}) => `<button type="button" class="${esc(cls)}" data-action="${esc(name)}" ${id?`data-id="${esc(id)}"`:''} ${extra}>${iconName?icon(iconName):''}${esc(label)}</button>`;
export const badge = (label,kind='neutral') => `<span class="badge ${esc(kind)}">${esc(label)}</span>`;
export const empty = (title,body,button='',symbol='list') => `<div class="empty-state">${icon(symbol)}<h3>${esc(title)}</h3><p>${esc(body)}</p>${button}</div>`;
export const options = (items,value,placeholder='') => `${placeholder?`<option value="">${esc(placeholder)}</option>`:''}${items.map(item=>{const [key,label]=Array.isArray(item)?item:[item,item];return `<option value="${esc(key)}" ${key===value?'selected':''}>${esc(label)}</option>`;}).join('')}`;
export const field = (label,input,{help='',wide=false}={}) => `<label class="field${wide?' full':''}"><span>${esc(label)}</span>${input}${help?`<small>${esc(help)}</small>`:''}</label>`;
export const input = (name,value='',attrs='') => `<input name="${esc(name)}" value="${esc(value)}" ${attrs}>`;
let toastTimer;
export function toast(message,undo) {
  const el=$('#toast');el.replaceChildren();const text=document.createElement('span');text.textContent=message;el.append(text);
  if(undo){const b=document.createElement('button');b.className='text-button';b.textContent='Desfazer';b.onclick=async()=>{b.disabled=true;try{await undo();el.hidden=true;}catch(e){text.textContent=e.message;b.disabled=false;}};el.append(b);}
  el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,undo?20000:6000);
}
let modalIndex=0;
export function modal({title,body,submit='Salvar',onSubmit,onAction,wide=false,draftKey='',storage=sessionStorage,description=''}) {
  const id=`modal-${++modalIndex}`,d=document.createElement('dialog');d.className=`modal${wide?' modal-wide':''}`;d.setAttribute('aria-labelledby',`${id}-title`);
  if(description)d.setAttribute('aria-describedby',`${id}-description`);
  d.innerHTML=`<form novalidate><div class="modal-head"><div><h2 id="${id}-title">${esc(title)}</h2>${description?`<p id="${id}-description" class="helper">${esc(description)}</p>`:''}</div><button type="button" class="icon-button" data-modal-close aria-label="Fechar">${icon('close')}</button></div><div class="modal-body">${body}<p class="form-error" id="${id}-error" role="alert" tabindex="-1" hidden></p></div><div class="modal-footer"><button type="button" class="button secondary" data-modal-close>${onSubmit?'Cancelar':'Fechar'}</button>${onSubmit?`<button type="submit" class="button primary">${esc(submit)}</button>`:''}</div></form>`;
  document.body.append(d);const form=d.querySelector('form'),submitButton=d.querySelector('[type=submit]');const originalFocus=document.activeElement;let dirty=false,saving=false,closingPrompt=false;
  const errorNode=()=>{let node=d.querySelector('.form-error');if(!node){node=document.createElement('p');node.className='form-error';node.hidden=true;node.setAttribute('role','alert');node.tabIndex=-1;form.querySelector('.modal-body').append(node);}node.id=`${id}-error`;return node;};
  const values=()=>Object.fromEntries(Array.from(form.elements).filter(x=>x.name&&x.type!=='file'&&x.type!=='checkbox').map(x=>[x.name,x.value]));
  function saveDraft(){if(!draftKey)return;try{storage.setItem(draftKey,JSON.stringify(values()));}catch{}}
  function close(force=false){
    if(saving)return;
    if(dirty&&!force){if(closingPrompt)return;closingPrompt=true;const confirmation=modal({title:'Fechar sem salvar?',body:`<p>${draftKey?'O rascunho continuará disponível neste aparelho quando você reabrir este formulário.':'As alterações deste formulário serão descartadas.'}</p>`,submit:'Fechar sem salvar',onSubmit:async()=>{dirty=false;close(true);}});confirmation.dialog.addEventListener('close',()=>closingPrompt=false,{once:true});return;}
    d.close();
  }
  function showError(message,fieldName){const error=errorNode();error.textContent=message;error.hidden=false;const target=fieldName&&form.elements.namedItem(fieldName);if(target){target.closest('details')?.setAttribute('open','');target.setAttribute('aria-invalid','true');target.setAttribute('aria-describedby',error.id);target.focus();}else error.focus();}
  const api={dialog:d,form,close,showError,draftRecovered:false,setDirty:()=>{dirty=true;saveDraft();},setTitle:text=>d.querySelector('h2').textContent=text};
  if(draftKey){try{const draft=JSON.parse(storage.getItem(draftKey)||'null');if(draft){api.draftRecovered=true;for(const [key,value]of Object.entries(draft)){const element=form.elements.namedItem(key);if(element&&element.type!=='file')element.value=value;}const note=document.createElement('p');note.className='inline-note';note.textContent='Rascunho recuperado neste aparelho. Revise antes de salvar.';form.querySelector('.modal-body').prepend(note);dirty=true;}}catch{}}
  form.addEventListener('input',()=>{dirty=true;errorNode().hidden=true;form.querySelectorAll('[aria-invalid]').forEach(x=>x.removeAttribute('aria-invalid'));saveDraft();});form.addEventListener('change',()=>{dirty=true;saveDraft();});
  d.addEventListener('cancel',e=>{e.preventDefault();close();});
  d.addEventListener('click',e=>{const b=e.target.closest('button');if(b?.hasAttribute('data-modal-close'))close();else if(b?.dataset.action)Promise.resolve().then(()=>onAction?.(b.dataset.action,b,api)).catch(err=>showError(err.message||'Não foi possível concluir. Tente novamente.'));else if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
  form.addEventListener('submit',async e=>{
    e.preventDefault();if(!onSubmit||saving)return;errorNode().hidden=true;
    if(!form.checkValidity()){const invalid=form.querySelector(':invalid');showError(invalid?.validationMessage||'Revise os campos obrigatórios.',invalid?.name);return;}
    const idleSubmitText=submitButton?.textContent;
    saving=true;form.setAttribute('aria-busy','true');if(submitButton){submitButton.disabled=true;submitButton.textContent='Salvando…';}
    try{const shouldClose=await onSubmit(form,api);dirty=false;if(draftKey)try{storage.removeItem(draftKey);}catch{}if(shouldClose!==false){saving=false;close(true);}}
    catch(err){showError(err.message||'Não foi possível salvar. Seus dados foram preservados.',err.field);}
    finally{saving=false;form.removeAttribute('aria-busy');if(submitButton){submitButton.disabled=false;submitButton.textContent=idleSubmitText||submit;}}
  });
  d.addEventListener('close',()=>{d.remove();if(originalFocus?.isConnected)originalFocus.focus();else {const activeDialog=document.querySelector('dialog[open]');if(activeDialog)activeDialog.querySelector('button')?.focus();else $('#main-content')?.focus({preventScroll:true});}});d.showModal();queueMicrotask(()=>(form.querySelector('.modal-body input:not([type=hidden]):not([type=checkbox]):not([type=file]),.modal-body select')||form.querySelector('button[data-modal-close]'))?.focus());return api;
}
export function refreshModal(api,render){const refresh=()=>{if(api.dialog.open)api.dialog.querySelector('.modal-body').innerHTML=render();};document.addEventListener('saldo:data-change',refresh);api.dialog.addEventListener('close',()=>document.removeEventListener('saldo:data-change',refresh),{once:true});}
export function confirmAction({title,message,label='Confirmar',danger=false,onConfirm}) {return modal({title,body:`<p>${esc(message)}</p>`,submit:label,onSubmit:async()=>{await onConfirm();},description:danger?'Revise o alcance desta alteração antes de confirmar.':''});}
export function download(text,name,type='application/json') {const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function avatar(el,photo,name) {el.replaceChildren();if(photo){const image=document.createElement('img');image.src=photo;image.alt='Sua foto de perfil';el.append(image);}else el.textContent=name.trim()?name.trim().split(/\s+/).slice(0,2).map(x=>x[0]).join('').toLocaleUpperCase('pt-BR'):'EU';}
