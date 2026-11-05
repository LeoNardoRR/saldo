const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export function bindMonthNavigation({getMonth,onChange,currentMonth}){
  const root=document.getElementById('period-control'),trigger=document.getElementById('month'),panel=document.getElementById('month-picker'),grid=document.getElementById('month-grid');
  let year=Number(getMonth().slice(0,4));
  const value=(y,m)=>`${String(y).padStart(4,'0')}-${String(m+1).padStart(2,'0')}`;
  function close(){panel.hidden=true;trigger.setAttribute('aria-expanded','false');}
  function renderGrid(){
    document.getElementById('picker-year').textContent=year;
    document.getElementById('previous-year').disabled=year<=1;
    document.getElementById('next-year').disabled=year>=9999;
    grid.replaceChildren(...months.map((name,index)=>{
      const button=document.createElement('button');button.type='button';button.textContent=name;button.dataset.month=value(year,index);button.setAttribute('aria-pressed',String(button.dataset.month===getMonth()));return button;
    }));
  }
  function render(){
    const [y,m]=getMonth().split('-').map(Number);
    document.getElementById('month-name').textContent=months[m-1];document.getElementById('month-year').textContent=y;
    trigger.setAttribute('aria-label',`Escolher mês: ${months[m-1]} de ${y}`);
    document.getElementById('prev-month').disabled=y===1&&m===1;
    document.getElementById('next-month').disabled=y===9999&&m===12;
    if(!panel.hidden)renderGrid();
  }
  function choose(month){close();onChange(month);render();trigger.focus({preventScroll:true});}
  trigger.onclick=()=>{if(!panel.hidden){close();return;}year=Number(getMonth().slice(0,4));renderGrid();panel.hidden=false;trigger.setAttribute('aria-expanded','true');};
  for(const [id,delta] of [['prev-month',-1],['next-month',1]])document.getElementById(id).onclick=()=>{
    const [y,m]=getMonth().split('-').map(Number),index=y*12+m-1+delta;
    choose(value(Math.floor(index/12),index%12));
  };
  for(const [id,delta] of [['previous-year',-1],['next-year',1]])document.getElementById(id).onclick=()=>{year=Math.max(1,Math.min(9999,year+delta));renderGrid();};
  grid.onclick=event=>{const button=event.target.closest('button[data-month]');if(button)choose(button.dataset.month);};
  document.getElementById('current-month').onclick=()=>choose(currentMonth());
  root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!panel.hidden){event.preventDefault();close();trigger.focus();}});
  document.addEventListener('click',event=>{if(!root.contains(event.target))close();});
  root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close();});
  render();return {render};
}
