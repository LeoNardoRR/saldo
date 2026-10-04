import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '../../chatgpt-auth';
import {handleLedger} from '../../../server-ledger.js';
export const dynamic='force-dynamic';
async function handle(request:Request){const user=await getChatGPTUser();return handleLedger(request,{userId:user?.userId,db:env.DB})}
export const GET=handle;
export const POST=handle;
