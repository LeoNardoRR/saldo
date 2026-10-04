export const ACTIVE_USER_KEY='saldo.active-user.v1';
const LEGACY_KEYS=['saldo.ledger.v3','saldo.transactions.v1','saldo.settings.v1','saldo.migration.v3.backup','saldo.before-restore.v3','saldo.before-recovery.v3','saldo.before-sync.v3','saldo.before-sync-conflict.v3'];
export function userStorage(storage,userId){
  if(typeof userId!=='string'||!userId||userId.length>200)throw Error('Conta inválida.');
  const prefix=`saldo.user.${encodeURIComponent(userId)}.`;
  return {getItem:key=>storage.getItem(prefix+key),setItem:(key,value)=>storage.setItem(prefix+key,value),removeItem:key=>storage.removeItem(prefix+key),logicalKey:key=>typeof key==='string'&&key.startsWith(prefix)?key.slice(prefix.length):null,monthKey:prefix+'selected-month'};
}
export function prepareUserStorage(storage,userId,{adoptLegacy=false}={}){
  const scoped=userStorage(storage,userId);
  let old;try{old=JSON.parse(storage.getItem('saldo.ledger.v3')||'null')}catch{}
  const oldOwner=old?._sync?.userId;
  const compatible=oldOwner===userId||!oldOwner&&adoptLegacy;
  if(scoped.getItem('saldo.ledger.v3')===null&&compatible){for(const key of LEGACY_KEYS){const raw=storage.getItem(key);if(raw!==null)scoped.setItem(key,raw)}}
  storage.setItem(ACTIVE_USER_KEY,userId);
  return scoped;
}
function gate(message,{login=true,retry=false}={}){
  document.body.classList.add('identity-locked');let box=document.querySelector('#identity-gate');
  if(!box){box=document.createElement('section');box.id='identity-gate';box.setAttribute('role','status');document.body.append(box)}
  box.replaceChildren();const logo=document.createElement('img');logo.src='./assets/logo.svg';logo.alt='Saldo';const title=document.createElement('h1');title.textContent='Seu dinheiro. Seu espaço.';const p=document.createElement('p');p.textContent=message;box.append(logo,title,p);
  box.setAttribute('aria-busy',String(!login&&!retry));if(!login&&!retry){const progress=document.createElement('div');progress.className='identity-progress';progress.setAttribute('aria-hidden','true');progress.append(document.createElement('span'));box.append(progress)}
  if(login){const a=document.createElement('a');a.className='primary';a.textContent='Entrar com ChatGPT';a.href='/signin-with-chatgpt?return_to=%2F';a.target='_top';box.append(a)}
  if(retry){const b=document.createElement('button');b.className='ghost';b.textContent='Tentar novamente';b.onclick=()=>location.reload();box.append(b)}
  return box;
}
export function maskAccount(message,{clearActive=true}={}){gate(message);if(clearActive)try{localStorage.removeItem(ACTIVE_USER_KEY);}catch{}}
export async function selectWorkspace({storage=localStorage,fetcher=fetch,online=()=>navigator.onLine}={}){
  gate('Confirmando sua conta…',{login:false});let userId,email='';
  if(!online()){
    userId=storage.getItem(ACTIVE_USER_KEY);
    if(!userId){gate('Entre uma vez com internet para abrir seu espaço neste dispositivo.',{retry:true});return new Promise(()=>{})}
  }else{
    try{const res=await fetcher('/api/session',{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
      if(res.status===401||res.status===403||res.redirected){storage.removeItem(ACTIVE_USER_KEY);gate('Entre com sua própria conta do ChatGPT. Seus dados ficam separados dos outros usuários.');return new Promise(()=>{})}
      if(!res.ok)throw Error('Session unavailable');const data=await res.json();userId=data.userId;if(typeof userId!=='string'||!userId||userId.length>200)throw Error('Invalid identity');email=typeof data.email==='string'?data.email:'';
    }catch{gate('Não foi possível confirmar sua conta agora. Seus dados foram preservados. Reconecte e tente novamente.',{login:false,retry:true});return new Promise(()=>{})}
  }
  let old;try{old=JSON.parse(storage.getItem('saldo.ledger.v3')||'null')}catch{}
  const hasLegacy=!old?._sync?.userId&&(old?.entries?.length||storage.getItem('saldo.transactions.v1')&&storage.getItem('saldo.transactions.v1')!=='[]');
  let adoptLegacy=false;
  if(userStorage(storage,userId).getItem('saldo.ledger.v3')===null&&hasLegacy){
    const box=gate('Este navegador tem registros de uma versão antiga sem conta vinculada. Associe somente se esses registros são seus.',{login:false});
    adoptLegacy=await new Promise(resolve=>{for(const [label,value]of [['Associar meus registros antigos',true],['Abrir apenas os dados da minha conta',false]]){const b=document.createElement('button');b.className=value?'primary':'ghost';b.textContent=label;b.onclick=()=>resolve(value);box.append(b)}});
  }
  let scoped;try{scoped=prepareUserStorage(storage,userId,{adoptLegacy});if(email)scoped.setItem('saldo.account.v1',JSON.stringify({email}));else try{email=JSON.parse(scoped.getItem('saldo.account.v1')||'{}').email||''}catch{}}catch{gate('Não foi possível preparar o armazenamento deste aparelho. Libere espaço ou permita dados do site neste navegador e tente novamente.',{login:false,retry:true});return new Promise(()=>{});}document.querySelector('#identity-gate')?.remove();document.body.classList.remove('identity-locked');
  return {storage:scoped,userId,email,monthKey:scoped.monthKey,logicalKey:scoped.logicalKey,mask:maskAccount};
}
