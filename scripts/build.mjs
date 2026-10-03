import {cp,rm,mkdir,readFile,writeFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const files=['index.html','app.js','finance.js','pwa.js','sw.js','style.css','manifest.webmanifest'];
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of files)await cp(file,path.join('dist',file));
await cp('assets','dist/assets',{recursive:true});
const hash=createHash('sha256');
async function fingerprint(dir){for(const file of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const p=path.join(dir,file.name);if(file.isDirectory())await fingerprint(p);else{hash.update(p);hash.update(await readFile(p))}}}
await fingerprint('dist');const version=hash.digest('hex').slice(0,16);
const sw=await readFile('dist/sw.js','utf8');await writeFile('dist/sw.js',sw.replace('__BUILD_ID__',version));
console.log(`Saldo: pacote estático criado em dist/ · versão ${version}`);
