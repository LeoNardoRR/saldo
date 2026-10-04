import {dataState,mergeStates,sameData,resolveConflict} from './sync-merge.js';
import {validState,migrate} from './finance.js';
export function createSync({store,fetcher=fetch,locks=navigator.locks,onStatus=()=>{},online=()=>navigator.onLine,clock=()=>new Date().toISOString()}={}){
  let running=false,timer,pollTimer,stopped=false;
  const status=(kind,message,extra={})=>onStatus({kind,message,...extra});
  const request=async(body)=>{const res=await fetcher('/api/ledger',{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});if(res.status===401||res.status===403||res.redirected){const e=Error('Entre na mesma conta do ChatGPT em todos os dispositivos.');e.auth=true;throw e}let data;try{data=await res.json()}catch{throw Error('Não foi possível acessar a sincronização. Seus dados continuam salvos neste dispositivo.')}if(!res.ok&&res.status!==409)throw Error(data.error||'Não foi possível sincronizar.');if(typeof data.userId!=='string'||!data.userId||!Number.isSafeInteger(data.revision)||data.revision<0||data.state!==null&&!validState(data.state))throw Error('Resposta de sincronização inválida. Seus dados foram preservados.');return {data,conflict:res.status===409}};
  async function run(){
    if(stopped||running)return;
    if(!online()){status('offline','Offline · alterações salvas neste dispositivo');return}
    running=true;status('busy','Sincronizando…');
    try{await locks.request('saldo-cloud-sync-v1',{mode:'exclusive'},async()=>{
      for(let attempt=0;attempt<4;attempt++){
        const {data:cloud}=await request();
        let mismatch=false;
        const merged=await store.sync(current=>{
          if(current._sync?.userId&&current._sync.userId!==cloud.userId){mismatch=true;return current}
          if(current._sync?.cloudRevision>cloud.revision)throw Error('A cópia da conta está desatualizada ou indisponível. Nenhum dado foi substituído.');
          const base=current._sync?.base||migrate(),remote=cloud.state||migrate();
          const result=mergeStates(base,current,remote);
          return {...result.state,revision:current.revision,_sync:{userId:cloud.userId,base:result.conflicts.length||!sameData(result.state,remote)?base:dataState(remote),cloudRevision:cloud.revision,remote:dataState(remote),conflicts:result.conflicts,lastSync:current._sync?.lastSync||null}};
        });
        if(mismatch){status('account','Este dispositivo está ligado a outra conta. Entre na conta original; nenhum dado foi enviado.');return}
        if(merged._sync.conflicts.length){status('conflict',`${merged._sync.conflicts.length} conflito(s) · revise as versões`,{conflicts:merged._sync.conflicts});return}
        if(cloud.state&&sameData(merged,cloud.state)){
          await store.sync(current=>({...current,_sync:{...current._sync,lastSync:clock()}}));
          status('synced','Sincronizado com sua conta');return;
        }
        const sent=dataState(merged),{data:ack,conflict}=await request({userId:cloud.userId,revision:cloud.revision,state:sent});
        if(conflict)continue;
        if(ack.userId!==cloud.userId)throw Error('A conta mudou durante a sincronização. Nenhum dado local foi substituído.');
        const after=await store.sync(current=>{
          const result=mergeStates(sent,current,ack.state);
          return {...result.state,revision:current.revision,_sync:{userId:ack.userId,base:dataState(ack.state),remote:dataState(ack.state),cloudRevision:ack.revision,conflicts:result.conflicts,lastSync:clock()}};
        });
        if(after._sync.conflicts.length){status('conflict','Revise as alterações de dois dispositivos.',{conflicts:after._sync.conflicts});return}
        if(!sameData(after,ack.state))continue;
        status('synced','Sincronizado com sua conta');return;
      }
      status('pending','Alterações pendentes · vou tentar novamente');
    })}catch(e){const network=e instanceof TypeError||e.name==='TimeoutError'||e.name==='AbortError';status(e.auth?'auth':'pending',network?'Não foi possível conectar. Alterações salvas neste aparelho; tente novamente.':e.message||'Alterações locais preservadas · tente novamente')}finally{running=false}
  }
  return {run,schedule(){status(online()?'pending':'offline',online()?'Alterações salvas · aguardando sincronização':'Offline · alterações salvas neste dispositivo');clearTimeout(timer);timer=setTimeout(run,500)},start(){stopped=false;run();pollTimer=setInterval(run,15000)},stop(){stopped=true;clearTimeout(timer);clearInterval(pollTimer)},async resolve(expected,choice){await store.sync(current=>{const found=current._sync?.conflicts.find(c=>JSON.stringify(c.path)===JSON.stringify(expected.path));if(!found||JSON.stringify(found)!==JSON.stringify(expected))throw Error('O conflito mudou. Sincronize novamente e revise.');const result=resolveConflict(current,current._sync.base,found,choice);const originalLocal=mergeStates(current._sync.base,current,current._sync.remote).conflicts.find(c=>JSON.stringify(c.path)===JSON.stringify(found.path));if(JSON.stringify(originalLocal)!==JSON.stringify(found))throw Error('Este registro foi editado depois. Sincronize novamente.');return {...result.state,revision:current.revision,_sync:{...current._sync,base:result.base,conflicts:current._sync.conflicts.filter(c=>c!==found)}}},{backup:true});return run()}};
}
