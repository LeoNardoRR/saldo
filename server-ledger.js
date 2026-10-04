import {validState} from './finance.js';
import {dataState,sameData} from './sync-merge.js';
const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','Vary':'Cookie','X-Content-Type-Options':'nosniff'};
const json=(value,status=200)=>new Response(JSON.stringify(value),{status,headers});
export async function handleLedger(request,{userId,db}){
  if(!userId)return json({error:'Entre na sua conta para sincronizar.',code:'auth'},401);
  if(!db)return json({error:'A sincronização está indisponível. Os dados locais foram preservados.'},503);
  if(!['GET','POST'].includes(request.method))return json({error:'Método inválido.'},405);
  const read=async()=>{const row=await db.prepare('SELECT revision, state, updated_at FROM saldo_ledgers WHERE user_id = ?').bind(userId).first();if(!row)return {userId,state:null,revision:0,updatedAt:null};const state=JSON.parse(row.state);if(!validState(state))throw Error('Invalid cloud ledger');return {userId,state,revision:row.revision,updatedAt:row.updated_at}};
  try{
    if(request.method==='GET')return json(await read());
    if(request.headers.get('Origin')!==new URL(request.url).origin||request.headers.get('Sec-Fetch-Site')==='cross-site')return json({error:'Origem não autorizada.'},403);
    if(!request.headers.get('Content-Type')?.startsWith('application/json'))return json({error:'Formato inválido.'},415);
    if(Number(request.headers.get('Content-Length')||0)>1048576)return json({error:'Os dados excedem o limite de sincronização de 1 MB. Exporte um backup.'},413);
    const raw=await request.text();if(new TextEncoder().encode(raw).length>1048576)return json({error:'Os dados excedem o limite de sincronização de 1 MB. Exporte um backup.'},413);
    let body;try{body=JSON.parse(raw)}catch{return json({error:'Dados inválidos.'},400)}
    if(body?.userId!==userId)return json({error:'A conta mudou. Entre novamente antes de sincronizar.',code:'account_changed'},403);
    if(!Number.isSafeInteger(body?.revision)||body.revision<0||!validState(body?.state))return json({error:'Dados inválidos. Nada foi alterado.'},400);
    const state=dataState(body.state),current=await read();
    if(current.state&&sameData(state,current.state))return json(current);
    if(current.revision!==body.revision)return json({...current,error:'Outro dispositivo atualizou os dados.'},409);
    const nextRevision=current.revision+1;state.revision=nextRevision;const now=new Date().toISOString();
    const result=current.state
      ?await db.prepare('UPDATE saldo_ledgers SET state = ?, previous_state = state, revision = ?, updated_at = ? WHERE user_id = ? AND revision = ?').bind(JSON.stringify(state),nextRevision,now,userId,current.revision).run()
      :await db.prepare('INSERT INTO saldo_ledgers (user_id, revision, state, updated_at) VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO NOTHING').bind(userId,nextRevision,JSON.stringify(state),now).run();
    if(result.meta.changes!==1)return json({...await read(),error:'Outro dispositivo atualizou os dados.'},409);
    return json({userId,state,revision:nextRevision,updatedAt:now});
  }catch{return json({error:'Não foi possível sincronizar agora. Os dados locais foram preservados.'},503)}
}
