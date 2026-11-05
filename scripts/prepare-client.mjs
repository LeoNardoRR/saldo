import {cp,rm,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=['app.js','product.js','ui.js','views.js','charts.js','flows.js','finance.js','store.js','sync.js','sync-merge.js','identity.js','pwa.js','sw.js','fonts.css','style.css','theme.css','ios.css','fx.js','manifest.webmanifest'];
await rm('public',{recursive:true,force:true});await mkdir('public',{recursive:true});
const hash=createHash('sha256');hash.update(await readFile('index.html'));
for(const file of files){hash.update(file);hash.update(await readFile(file));await cp(file,`public/${file}`)}
await cp('assets','public/assets',{recursive:true});
async function hashAssets(dir){for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const path=`${dir}/${entry.name}`;if(entry.isDirectory())await hashAssets(path);else{hash.update(path);hash.update(await readFile(path));}}}
await hashAssets('assets');
const version=hash.digest('hex').slice(0,16);
await writeFile('public/sw.js',(await readFile('sw.js','utf8')).replace('__BUILD_ID__',version));
console.log(`Saldo · sincronização · ${version}`);
