import {getChatGPTUser} from '../../chatgpt-auth';
export const dynamic='force-dynamic';
export async function GET(){const user=await getChatGPTUser();return Response.json(user?{userId:user.userId,email:user.email}:{error:'Entre na sua conta.'},{status:user?200:401,headers:{'Cache-Control':'private, no-store','Vary':'Cookie'}})}
