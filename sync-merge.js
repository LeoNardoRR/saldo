import {migrate,validState} from './finance.js';
const clone=v=>v===undefined?undefined:structuredClone(v);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export function dataState(s){return clone({version:3,revision:0,entries:s.entries,settings:s.settings,categories:s.categories,accounts:s.accounts})}
export const sameData=(a,b)=>equal(dataState(a),dataState(b));
export function mergeStates(base,local,remote){
  base=dataState(base||migrate());local=dataState(local);remote=dataState(remote||migrate());
  const conflicts=[];
  function value(path,b,l,r){if(equal(l,b))return clone(r);if(equal(r,b)||equal(l,r))return clone(l);conflicts.push({path,base:clone(b),local:clone(l),remote:clone(r)});return clone(l)}
  function collection(path,b,l,r,key=x=>x.id){const bm=new Map(b.map(x=>[key(x),x])),lm=new Map(l.map(x=>[key(x),x])),rm=new Map(r.map(x=>[key(x),x]));return [...new Set([...lm.keys(),...rm.keys(),...bm.keys()])].map(k=>value([...path,k],bm.get(k),lm.get(k),rm.get(k))).filter(x=>x!==undefined)}
  const merged={version:3,revision:0,entries:collection(['entries'],base.entries,local.entries,remote.entries),categories:collection(['categories'],base.categories,local.categories,remote.categories),accounts:collection(['accounts'],base.accounts,local.accounts,remote.accounts),settings:{profile:value(['settings','profile'],base.settings.profile,local.settings.profile,remote.settings.profile),goals:collection(['settings','goals'],base.settings.goals,local.settings.goals,remote.settings.goals),budgets:collection(['settings','budgets'],base.settings.budgets,local.settings.budgets,remote.settings.budgets,x=>x.month+'|'+x.category)}};
  if(!validState(merged))return {state:local,conflicts:[{path:[],base,local,remote,structural:true}]};
  return {state:merged,conflicts};
}
export function setPath(state,path,value){if(!path.length)return dataState(value);const next=clone(state);let parent=next;for(const key of path.slice(0,-1))parent=parent[key];const key=path.at(-1);if(Array.isArray(parent)){const i=parent.findIndex(x=>(path.includes('budgets')?x.month+'|'+x.category:x.id)===key);if(i>=0){if(value===undefined)parent.splice(i,1);else parent[i]=clone(value)}else if(value!==undefined)parent.push(clone(value))}else parent[key]=clone(value);return next}
export function resolveConflict(state,base,conflict,choice){const value=choice==='remote'?conflict.remote:conflict.local;const next=setPath(dataState(state),conflict.path,value),nextBase=setPath(dataState(base||migrate()),conflict.path,conflict.remote);if(!validState(next))throw Error('Esta escolha depende de outra alteração em conta ou categoria. Salve um backup e revise os registros.');return {state:next,base:nextBase}}
