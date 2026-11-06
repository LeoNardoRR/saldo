import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile('sw.js','utf8');
function worker({fetch=async()=>({ok:true,redirected:false,url:'https://saldo.test/',clone:()=>({text:async()=>'<meta name="application-name" content="Saldo">'})})}={}){const listeners={},stored=new Map(),deleted=[],network=[];const cache={put:async(k,v)=>stored.set(k,v),match:async k=>stored.get(k)};const context={URL,Request,Array,Error,self:{location:{origin:'https://saldo.test'},registration:{scope:'https://saldo.test/'},clients:{claim:async()=>{}},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:()=>{}},caches:{open:async()=>cache,keys:async()=>['saldo-shell-old','other-app-cache'],delete:async k=>{deleted.push(k);stored.clear()}},fetch:async r=>{network.push(r.url);return fetch(r)}};vm.runInNewContext(source,context);return {listeners,stored,deleted,network}}
test('Manifesto e ícones têm escopo local, tamanhos e formato reais',async()=>{const m=JSON.parse(await readFile('manifest.webmanifest'));assert.equal(m.display,'standalone');assert.equal(m.start_url,'./');for(const i of m.icons){const b=await readFile(i.src);assert.equal(b.subarray(1,4).toString(),'PNG');const [w,h]=i.sizes.split('x').map(Number);assert.equal(b.readUInt32BE(16),w);assert.equal(b.readUInt32BE(20),h)}const html=await readFile('index.html','utf8');assert.ok(html.includes('rel="manifest"'));assert.ok(!String(await readFile('style.css')).includes('https://fonts.googleapis.com'))});
test('Instalação não armazena redirects ou páginas de autenticação',async()=>{for(const fake of [{ok:true,redirected:true,url:'https://saldo.test/',clone:()=>({text:async()=>''})},{ok:true,redirected:false,url:'https://saldo.test/',clone:()=>({text:async()=>'<html>Login</html>'})}]){const w=worker({fetch:async()=>fake});let install;w.listeners.install({waitUntil:p=>install=p});await assert.rejects(install);assert.equal(w.stored.size,0);assert.ok(w.deleted.some(k=>k.startsWith('saldo-shell-')))}});
test('Cache offline serve somente o shell e deixa APIs/autenticação na rede',async()=>{const w=worker({fetch:async()=>{throw Error('offline')}});const cached={body:'App offline'};w.stored.set('https://saldo.test/',cached);let response;w.listeners.fetch({request:new Request('https://saldo.test/index.html'),respondWith:p=>response=p});assert.equal(await response,cached);assert.equal(w.network.length,0);for(const url of ['https://saldo.test/auth/login','https://saldo.test/api/entries','https://other.test/index.html']){let intercepted=false;w.listeners.fetch({request:new Request(url),respondWith:()=>intercepted=true});assert.equal(intercepted,false)}});
test('Atualização limpa só caches do Saldo e preserva dados de outras aplicações',async()=>{const w=worker();let activated;w.listeners.activate({waitUntil:p=>activated=p});await activated;assert.deepEqual(w.deleted,['saldo-shell-old'])});
test('Registro offline inicia mesmo se o script carregar após o evento load',async()=>{const elements=new Map();const element=()=>({hidden:false,addEventListener:()=>{},replaceChildren:()=>{},append:()=>{},classList:{toggle:()=>{}},showModal:()=>{}});const document={readyState:'complete',querySelector:s=>{if(!elements.has(s))elements.set(s,element());return elements.get(s)},createElement:element,createTextNode:text=>({text})};let registered=0;const sw={register:async()=>{registered++;return {waiting:null,addEventListener:()=>{}}},controller:null,addEventListener:()=>{}};const window={isSecureContext:true,matchMedia:()=>({matches:false,addEventListener:()=>{}}),addEventListener:()=>{},location:{reload:()=>{}}};vm.runInNewContext(await readFile('pwa.js','utf8'),{document,window,navigator:{serviceWorker:sw,onLine:true},console});await new Promise(resolve=>setImmediate(resolve));assert.equal(registered,1)});

test("Precache usa a página inicial sem solicitar index.html, redirecionado pelo Sites",async()=>{const w=worker();let installed;w.listeners.install({waitUntil:p=>installed=p});await installed;assert.ok(w.network.includes("https://saldo.test/"));assert.equal(w.network.includes("https://saldo.test/index.html"),false);assert.ok(w.stored.has("https://saldo.test/"))});

function updateHarness(openForm) {
  const elements=new Map(),events=[],posted=[];
  const element=()=>({hidden:true,handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},replaceChildren(){},append(){},classList:{toggle(){}},showModal(){}});
  const document={querySelector(selector){if(selector==='dialog[open]')return openForm?{}:null;if(!elements.has(selector))elements.set(selector,element());return elements.get(selector);},createElement:element,createTextNode:text=>({text})};
  const waiting={postMessage:message=>posted.push(message)};
  const navigator={onLine:true,serviceWorker:{controller:{},register:async()=>({waiting,addEventListener(){}}),addEventListener(){}}};
  const window={isSecureContext:true,matchMedia:()=>({matches:false,addEventListener(){}}),addEventListener(){},dispatchEvent:event=>events.push(event.type),location:{reload(){}}};
  return {context:{document,navigator,window,console,Event},elements,events,posted};
}

test('Atualização com formulário aberto informa o app sem ativar o novo worker',async()=>{
  const h=updateHarness(true);vm.runInNewContext(await readFile('pwa.js','utf8'),h.context);await new Promise(resolve=>setImmediate(resolve));
  h.elements.get('#apply-update').handlers.click();assert.deepEqual(h.events,['saldo:update-blocked']);assert.equal(h.posted.length,0);
});

test('Atualização emite persistência do contexto antes de ativar o novo worker',async()=>{
  const h=updateHarness(false);vm.runInNewContext(await readFile('pwa.js','utf8'),h.context);await new Promise(resolve=>setImmediate(resolve));
  h.elements.get('#apply-update').handlers.click();assert.deepEqual(h.events,['saldo:before-update']);assert.equal(h.posted[0].type,'SKIP_WAITING');
});


test('Cache offline inclui a configuração de navegação mobile',async()=>{
 const w=worker();let installed;w.listeners.install({waitUntil:p=>installed=p});await installed;
 assert.ok(w.network.includes('https://saldo.test/navigation.js'));
});
