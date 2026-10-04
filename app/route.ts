import shell from '../index.html?raw';
export const dynamic='force-dynamic';
export async function GET(){return new Response(shell,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store'}})}
