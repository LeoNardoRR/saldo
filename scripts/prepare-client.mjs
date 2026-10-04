import {cp,rm,mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const files=['app.js','finance.js','store.js','sync.js','sync-merge.js','pwa.js','sw.js','style.css','manifest.webmanifest'];
await rm('public',{recursive:true,force:true});await mkdir('public',{recursive:true});
const hash=createHash('sha256');hash.update(await readFile('index.html'));
for(const file of files){hash.update(file);hash.update(await readFile(file));await cp(file,`public/${file}`)}
await cp('assets','public/assets',{recursive:true});
const version=hash.digest('hex').slice(0,16);
await writeFile('public/sw.js',(await readFile('sw.js','utf8')).replace('__BUILD_ID__',version));
console.log(`Saldo · sincronização · ${version}`);
