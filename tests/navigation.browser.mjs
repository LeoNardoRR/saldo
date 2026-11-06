/** Real built SPA navigation, isolated loopback server and fictional ledger only.
 * Usage: Chrome --remote-debugging-port=9230 --user-data-dir=<isolated-dir>
 *        node tests/navigation.browser.mjs
 * No npm dependencies; Node 22+ built-in WebSocket/CDP. Never targets production.
 */
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {migrate,validState} from '../finance.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=process.env.NAV_QA_OUTPUT||'/private/tmp/saldo-liquid-glass-results';
await mkdir(output,{recursive:true});
const state=migrate();state.accounts[0].name='Conta de demonstração';state.accounts[0].opening=45000;state.accounts[0].openingDate='2026-11-01';
state.settings.profile.name='Prévia local';
state.entries=[{id:'qa-income',description:'Receita de demonstração',type:'income',category:'Salário',account:'Conta de demonstração',date:'2026-11-01',dueDate:'2026-11-01',settledDate:'2026-11-01',status:'settled',cents:300000},
{id:'qa-expense',description:'Despesa de demonstração',type:'expense',category:'Moradia',account:'Conta de demonstração',date:'2026-11-01',dueDate:'2026-11-30',status:'planned',cents:120000}];
assert.ok(validState(state));
let writes=0;
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1:8766');
  if(url.pathname==='/api/session'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({userId:'navigation-qa',email:'demo@example.invalid'}));return;}
  if(url.pathname==='/api/ledger'){
   if(req.method!=='GET'){writes++;res.writeHead(405);res.end('{}');return;}
   res.setHeader('Content-Type','application/json');res.end(JSON.stringify({userId:'navigation-qa',revision:1,state}));return;
  }
  if(url.pathname==='/'){let html=await readFile(path.join(root,'index.html'),'utf8');
   const setup=`if(!localStorage.getItem('saldo.user.navigation-qa.saldo.ledger.v3'))localStorage.setItem('saldo.user.navigation-qa.saldo.ledger.v3',${JSON.stringify(JSON.stringify(state))});sessionStorage.setItem('saldo.user.navigation-qa.selected-month','2026-11');`;
   html=html.replace('<head>',`<head><script>${setup}</script>`);res.setHeader('Content-Type','text/html');res.end(html);return;
  }
  const file=path.resolve(root,'public','.'+url.pathname);
  if(!file.startsWith(path.join(root,'public')+path.sep)){res.writeHead(403);res.end();return;}
  const types={'.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.png':'image/png'};
  res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(await readFile(file));
 }catch{res.writeHead(404);res.end();}
});
await new Promise(resolve=>server.listen(8766,'127.0.0.1',resolve));
const pages=await (await fetch('http://127.0.0.1:9230/json/list')).json();
const ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
let id=0;const pending=new Map(),errors=[],checks=[];
ws.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text+': '+message.params.exceptionDetails.exception?.description);const request=pending.get(message.id);if(request){pending.delete(message.id);if(message.error)request.reject(Error(message.error.message));else request.resolve(message.result);}});
function send(method,params={}){return new Promise((resolve,reject)=>{const key=++id;pending.set(key,{resolve,reject});ws.send(JSON.stringify({id:key,method,params}));});}
async function run(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
async function until(expression){for(let n=0;n<100;n++){if(await run(expression))return;await new Promise(r=>setTimeout(r,50));}throw Error('Timed out: '+expression);}
async function view(width=402,height=874){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:true});}
async function route(page){await run(`location.hash=${JSON.stringify(page)}`);await until(`document.querySelector('#mobile-navigation [aria-current=page]')?.dataset.navKey===${JSON.stringify(['planning','recurring','settings'].includes(page)?'more':page)} && document.title.includes('Saldo')`);}
async function geometry(){return run(`(()=>{const n=document.querySelector('#mobile-navigation'),r=n.getBoundingClientRect(),s=getComputedStyle(n),lens=document.querySelector('.liquid-nav__indicator'),active=n.querySelector('[aria-current=page]');return {x:r.x,y:r.y,width:r.width,height:r.height,bottom:innerHeight-r.bottom,display:s.display,radius:s.borderRadius,background:s.backgroundColor,blur:getComputedStyle(n.querySelector('.liquid-nav__effect')).backdropFilter,overflow:document.documentElement.scrollWidth>innerWidth,targets:[...n.querySelectorAll('a,button')].map(e=>({w:e.offsetWidth,h:e.offsetHeight})),active:active?.dataset.navKey,lens:!!lens};})()`);}
try{
 await send('Runtime.enable');await send('Page.enable');
 await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
 await send('Storage.clearDataForOrigin',{origin:'http://127.0.0.1:8766',storageTypes:'all'});
 await view();
 await send('Page.navigate',{url:'http://127.0.0.1:8766/#overview'});
 await until(`document.querySelector('.liquid-nav__lens') && !document.body.classList.contains('identity-locked') && !document.querySelector('.page-skeleton')`);
 // All real pages, narrow screens, both themes, no duplicate nav and no covered last content.
 for(const [width,height] of [[320,693],[393,852],[402,874],[430,932]]){
  await view(width,height);
  for(const theme of ['light','dark']){
   await run(`document.documentElement.dataset.theme='${theme}'`);
   for(const page of ['overview','transactions','accounts','planning','recurring','settings']){
    await route(page);await run('window.scrollTo(0,document.documentElement.scrollHeight)');
    const g=await geometry();assert.equal(g.overflow,false,`${width} ${theme} ${page} horizontal overflow`);assert.equal(g.height,64);assert.ok(g.x>=16);assert.ok(Math.abs(g.bottom-8)<1);assert.ok(g.lens);assert.ok(g.targets.every(t=>t.w>=44&&t.h>=44));
    const uncovered=await run(`(()=>{const e=document.querySelector('#main-content'),n=document.querySelector('#mobile-navigation');return e.getBoundingClientRect().bottom<=n.getBoundingClientRect().top;})()`);assert.ok(uncovered,`last content: ${width}/${page}`);
   }
   checks.push(`${width}px/${theme}: all six routes, touch targets, overflow, last content`);
  }
 }
 await view();await route('overview');
 await run(`document.querySelector('.liquid-nav [data-page=transactions]').click()`);await until(`location.hash==='#transactions' && document.querySelector('.liquid-nav [aria-current=page]')?.dataset.navKey==='transactions'`);
 await run(`document.querySelector('.liquid-nav [data-page=accounts]').click()`);await until(`location.hash==='#accounts' && document.querySelector('.liquid-nav [aria-current=page]')?.dataset.navKey==='accounts'`);
 await run('history.back()');await until(`location.hash==='#transactions' && document.querySelector('.liquid-nav [aria-current=page]')?.dataset.navKey==='transactions'`);
 await run('history.forward()');await until(`location.hash==='#accounts' && document.querySelector('.liquid-nav [aria-current=page]')?.dataset.navKey==='accounts'`);
 await send('Page.reload');await until(`document.querySelector('.liquid-nav [aria-current=page]')?.dataset.navKey==='accounts'`);checks.push('Real links, history back/forward and refresh');
 await run(`document.querySelector('.liquid-nav [data-action=more]').click()`);await until(`document.querySelector('dialog[open] a[href="#recurring"]')`);
 await run(`document.querySelector('dialog[open] a[href="#recurring"]').click()`);await until(`location.hash==='#recurring' && !document.querySelector('dialog[open]')`);assert.equal((await geometry()).active,'more');
 await run(`document.querySelector('.liquid-nav [data-action=quick]').click()`);await until(`document.querySelector('dialog[open] [data-action=sheet-entry]')`);
 assert.equal(await run(`document.querySelector('dialog[open] h2').textContent`),'Novo registro');await run(`document.querySelector('dialog[open]').close()`);checks.push('Original More menu, secondary route selection and creation modal');
 await send('Page.navigate',{url:'http://127.0.0.1:8766/#accounts-section'});await until(`document.querySelector('.liquid-nav [aria-current=page]')?.dataset.navKey==='accounts'`);checks.push('Legacy deep link');
 await view(1200,900);assert.equal((await geometry()).display,'none');assert.notEqual(await run(`getComputedStyle(document.querySelector('.sidebar')).display`),'none');checks.push('Desktop sidebar retained, capsule hidden');
 await view(852,393);await route('transactions');assert.equal((await geometry()).overflow,false);checks.push('Landscape viewport');
 await view();await route('overview');
 // Keyboard detection exercised with a controlled visual viewport (physical IME needs device QA).
 const keyboard=await run(`(async()=>{const {bindNavigationViewport}=await import('./navigation.js'),win=new EventTarget(),doc=new EventTarget();win.innerHeight=852;win.visualViewport=new EventTarget();Object.assign(win.visualViewport,{height:480,scale:1});doc.activeElement={matches:()=>true};const nav=document.querySelector('.liquid-nav'),cleanup=bindNavigationViewport(nav,{win,doc}),hidden=getComputedStyle(nav).visibility==='hidden'&&nav.inert;cleanup();return hidden&&!nav.inert;})()`);assert.ok(keyboard);checks.push('Keyboard viewport simulation, inert and cleanup');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await route('accounts');await new Promise(r=>setTimeout(r,120));
 assert.equal(await run(`matchMedia('(prefers-reduced-motion: reduce)').matches`),true);checks.push('Reduced motion');
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'}]});
 assert.equal(await run(`getComputedStyle(document.querySelector('.liquid-nav__effect')).backdropFilter`),'none');
 assert.notEqual(await run(`getComputedStyle(document.querySelector('.liquid-nav__effect')).backgroundColor`),'rgba(0, 0, 0, 0)');checks.push('Opaque accessible fallback without backdrop blur');
 await send('Emulation.setEmulatedMedia',{features:[]});
 // Confirm a real spring transition and final alignment, without layout shifts.
 await route('overview');await new Promise(r=>setTimeout(r,600));
 const before=await run(`document.querySelector('.liquid-nav__indicator').getBoundingClientRect().x`);
 await route('accounts');await new Promise(r=>setTimeout(r,50));
 const during=await run(`document.querySelector('.liquid-nav__indicator').getBoundingClientRect().x`);
 await new Promise(r=>setTimeout(r,600));
 const aligned=await run(`Math.abs(document.querySelector('.liquid-nav__indicator').getBoundingClientRect().x-document.querySelector('.liquid-nav [aria-current=page]').getBoundingClientRect().x)<1`);
 assert.ok(during>before);assert.ok(aligned);checks.push('Spring indicator moves and settles over the route-selected item');
 const ax=await send('Accessibility.getFullAXTree');
 const nav=ax.nodes.find(n=>n.role?.value==='navigation'&&n.name?.value==='Navegação no celular');assert.ok(nav);
 for(const label of ['Início','Registros','Contas','Novo registro','Mais'])assert.ok(ax.nodes.some(n=>['link','button'].includes(n.role?.value)&&n.name?.value===label));
 await run(`document.querySelector('.liquid-nav a').focus()`);
 assert.ok(await run(`document.querySelector('.liquid-nav a')===document.activeElement`));
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert.equal(await run('document.activeElement.dataset.navKey'),'transactions');
 assert.equal(await run(`getComputedStyle(document.activeElement).outlineStyle`),'solid');checks.push('Accessibility tree labels, keyboard tab order and visible focus');
 // PWA shell loads from its own service-worker cache when offline.
 await until(`navigator.serviceWorker.controller!==null`);
 await until(`caches.keys().then(keys=>keys.some(k=>k.startsWith('saldo-shell-')))`);
 await send('Network.enable');await send('Network.emulateNetworkConditions',{offline:true,latency:0,downloadThroughput:0,uploadThroughput:0});
 await send('Page.reload');await until(`document.querySelector('.liquid-nav__lens') && !document.body.classList.contains('identity-locked')`);
 await run(`document.querySelector('.liquid-nav [data-page=accounts]').click()`);await until(`document.querySelector('.liquid-nav [aria-current=page]')?.dataset.navKey==='accounts'`);
 await send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});checks.push('PWA cached shell and navigation work offline');
 await route('overview');await run('window.scrollTo(0,220)');await new Promise(r=>setTimeout(r,550));
 for(const theme of ['light','dark']){
  await run(`document.documentElement.dataset.theme='${theme}'`);await new Promise(r=>setTimeout(r,200));
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(output,`mobile-${theme}.png`),Buffer.from(shot.data,'base64'));
 }
 const g=await geometry();assert.ok(g.blur.includes('16px'));assert.equal(g.background,'rgba(0, 0, 0, 0)');checks.push('Translucent surface with real backdrop blur');
 const images=await Promise.all(['light','dark'].map(async theme=>`<figure><figcaption>${theme==='light'?'Claro':'Escuro'}</figcaption><img width=402 height=874 src="data:image/png;base64,${(await readFile(path.join(output,`mobile-${theme}.png`))).toString('base64')}"></figure>`));
 const board=`<html><meta charset=utf-8><style>body{margin:0;padding:16px;background:#e7e6ed;color:#252332;font:14px system-ui}header{height:40px}main{display:flex;gap:16px}figure{margin:0}figcaption{height:24px}img{display:block;border-radius:16px}</style><header>Saldo · navegação Liquid Glass · prévia local com dados fictícios</header><main>${images.join('')}</main></html>`;
 await send('Emulation.setDeviceMetricsOverride',{width:852,height:970,deviceScaleFactor:1,mobile:false});
 await send('Page.navigate',{url:'data:text/html;charset=utf-8,'+encodeURIComponent(board)});await until(`document.images.length===2 && [...document.images].every(img=>img.complete)`);
 const boardShot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path.join(output,'mobile-board.png'),Buffer.from(boardShot.data,'base64'));
 assert.equal(writes,0,'navigation must not write ledger');assert.deepEqual(errors,[]);
 await writeFile(path.join(output,'report.json'),JSON.stringify({checks,writes,errors,geometry:g},null,2));
 console.log(JSON.stringify({passed:checks.length,checks,writes,errors,output},null,2));
 if(process.env.NAV_QA_KEEP_OPEN==='1'){console.log('Local preview remains on http://127.0.0.1:8766');await new Promise(()=>{});}
}finally{ws.close();await new Promise(resolve=>server.close(resolve));}
