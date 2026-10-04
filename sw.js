/* The packaging script replaces this marker with the fingerprint of this release. */
const BUILD_ID='__BUILD_ID__';
const CACHE_PREFIX='saldo-shell-';
const CACHE_NAME=CACHE_PREFIX+BUILD_ID;
const SHELL=[
  './','./style.css','./app.js','./finance.js','./store.js','./sync.js','./sync-merge.js','./pwa.js','./manifest.webmanifest',
  './assets/logo.svg','./assets/icons/icon-192.png','./assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png','./assets/icons/apple-touch-icon.png',
  ...Array.from({length:8},(_,i)=>`./assets/fonts/font-${i}.woff2`)
];
const urls=SHELL.map(path=>new URL(path,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  try{for(const url of urls){const response=await fetch(new Request(url,{credentials:'same-origin',cache:'reload'}));
    if(!response.ok||response.redirected||new URL(response.url).origin!==self.location.origin)throw new Error('App shell unavailable');
    if(new URL(url).pathname.endsWith('/')||new URL(url).pathname.endsWith('/index.html')){const html=await response.clone().text();if(!html.includes('<meta name="application-name" content="Saldo">'))throw new Error('Not the Saldo app shell')}
    await cache.put(url,response);
  }}catch(error){await caches.delete(CACHE_NAME);throw error}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(CACHE_PREFIX)&&key!==CACHE_NAME)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  /* Cache only this release's static shell. Login, API calls and other routes use the network. */
  const indexPath=new URL('index.html',self.registration.scope).pathname;
  const allowed=url.pathname===indexPath?urls[0]:urls.find(path=>new URL(path).pathname===url.pathname);
  if(!allowed)return;
  event.respondWith((async()=>{const cache=await caches.open(CACHE_NAME);return await cache.match(allowed)||fetch(request)})());
});
