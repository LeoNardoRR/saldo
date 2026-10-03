export function parseMoney(raw, allowZero=false) {
  const clean=String(raw).trim().replace(/\s|R\$/g,'');
  const format=clean.includes(',')?/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/:/^\d+(?:\.\d{1,2})?$/;
  if(!format.test(clean)) return null;
  const normalized=clean.includes(',')?clean.replaceAll('.','').replace(',','.'):clean;
  const cents=Math.round(Number(normalized)*100);
  return Number.isSafeInteger(cents)&&cents>=(allowZero?0:1)&&cents<=99999999900?cents:null;
}
export function validDate(date) {
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const d=new Date(date+'T12:00:00Z');
  return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===date;
}
const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
export const validEntry=e=>!!e&&text(e.id,100)&&text(e.description,160)&&text(e.category,60)&&text(e.account,60)&&['income','expense','transfer'].includes(e.type)&&Number.isSafeInteger(e.cents)&&e.cents>0&&e.cents<=99999999900&&validDate(e.date)&&(e.notes===undefined||(typeof e.notes==='string'&&e.notes.length<=300));
export function summary(entries,month) {
  const rows=entries.filter(e=>e.date.startsWith(month));
  let income=0,expense=0;const categories=new Map();
  for(const e of rows){if(e.type==='income')income+=e.cents;if(e.type==='expense'){expense+=e.cents;categories.set(e.category,(categories.get(e.category)||0)+e.cents)}}
  return {rows,income,expense,balance:income-expense,categories};
}
export function budgetUsage(entries,month,budget){const spent=summary(entries,month).categories.get(budget.category)||0;return {spent,remaining:budget.limit-spent,percent:spent/budget.limit*100}}
export function dailyFlow(entries,month){const [year,m]=month.split('-').map(Number);const days=new Date(year,m,0).getDate();const amounts=Array(days).fill(0);for(const e of entries){if(e.date.startsWith(month)&&e.type!=='transfer')amounts[Number(e.date.slice(-2))-1]+=(e.type==='income'?1:-1)*e.cents}let sum=0;return amounts.map(c=>sum+=c)}
export const validSettings=s=>!!s&&s.profile&&typeof s.profile.name==='string'&&s.profile.name.length<=60&&typeof s.profile.photo==='string'&&(s.profile.photo===''||(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(s.profile.photo)&&s.profile.photo.length<400000))&&Array.isArray(s.goals)&&s.goals.every(g=>text(g.id,100)&&text(g.name,80)&&Number.isSafeInteger(g.target)&&g.target>0&&g.target<=99999999900&&Number.isSafeInteger(g.saved)&&g.saved>=0&&g.saved<=99999999900)&&new Set(s.goals.map(g=>g.id)).size===s.goals.length&&Array.isArray(s.budgets)&&s.budgets.every(b=>typeof b.month==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(b.month)&&text(b.category,60)&&Number.isSafeInteger(b.limit)&&b.limit>0&&b.limit<=99999999900)&&new Set(s.budgets.map(b=>b.month+'|'+b.category)).size===s.budgets.length;
