const qs=(s,el=document)=>el.querySelector(s);
const qsa=(s,el=document)=>Array.from(el.querySelectorAll(s));

let DATA_CACHE=[];

const STATE={date:null,section:'all',lang:localStorage.getItem('lang')||'en',query:''};

function istToday(){
  const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'});
  return fmt.format(new Date());
}
function paramsFromURL(){
  const p=new URLSearchParams(location.search);
  return {date:p.get('date'),section:p.get('section'),lang:p.get('lang'),q:p.get('q')};
}
function pushURL(){
  const p=new URLSearchParams();
  p.set('date',STATE.date); p.set('section',STATE.section); p.set('lang',STATE.lang);
  if(STATE.query) p.set('q', STATE.query);
  history.replaceState(null,'','?'+p.toString());
}
function setActiveTab(){
  qsa('.tab').forEach(t=>t.classList.remove('active'));
  const a=qs(`[data-tab="${STATE.section}"]`); if(a) a.classList.add('active');
}
async function loadDates(){
  try{const res=await fetch('data/index.json',{cache:'no-store'}); return await res.json();}
  catch{ return [istToday()]; }
}
function pretty(d){
  const [y,m,dd]=d.split('-').map(Number);
  return new Date(Date.UTC(y,m-1,dd)).toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'});
}
async function fetchNews(){
  const url=`data/${STATE.date}/${STATE.section}.${STATE.lang}.json`;
  try{ const res=await fetch(url,{cache:'no-store'}); if(!res.ok) throw 0; return await res.json(); }
  catch{ return {items:[], date:STATE.date, section:STATE.section, lang:STATE.lang}; }
}
function card(it){
  const image= it.image || 'assets/placeholder.svg';
  return `<article class="card">
    <img src="${image}" alt="" loading="lazy">
    <div class="body">
      <h3>${it.title}</h3>
      <p>${it.summary||''}</p>
      <div class="meta"><span>${it.source||'Source'}</span>
      <a class="btn" href="${it.url}" target="_blank" rel="noopener">Read</a></div>
    </div>
  </article>`;
}
function renderSkeletons(n=8){ qs('#grid').innerHTML=Array.from({length:n}).map(_=>'<div class="skeleton"></div>').join(''); }
function filterItems(items, q){
  if(!q) return items;
  const s=q.toLowerCase();
  return items.filter(it=> (it.title||'').toLowerCase().includes(s) || (it.source||'').toLowerCase().includes(s) || (it.summary||'').toLowerCase().includes(s));
}
async function render(){
  setActiveTab(); pushURL(); qs('#datechip').textContent=pretty(STATE.date); qs('#lang').value=STATE.lang; qs('#search').value=STATE.query;
  renderSkeletons();
  const data=await fetchNews();
  DATA_CACHE=data.items;
  const filtered=filterItems(DATA_CACHE, STATE.query);
  if(!filtered.length){
    qs('#grid').innerHTML=`<div style="opacity:.85;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--card)">
      <b>No data for ${STATE.date}${STATE.query?` matching “${STATE.query}”`:''}</b><br>Run the GitHub Action (Python) to populate JSON files.
    </div>`; return;
  }
  qs('#grid').innerHTML=filtered.map(card).join('');
}
async function init(){
  const params=paramsFromURL(); const dates=await loadDates();
  STATE.date=params.date||dates[0]||istToday();
  STATE.section=params.section||'all';
  STATE.lang=params.lang||STATE.lang;
  STATE.query=params.q||'';

  qs('#dates').innerHTML=dates.map(d=>`<button class="chip" data-date="${d}">${pretty(d)}</button>`).join('');

  qs('#lang').addEventListener('change',e=>{STATE.lang=e.target.value;localStorage.setItem('lang',STATE.lang);render();});
  qsa('.tab').forEach(t=>t.addEventListener('click',()=>{STATE.section=t.dataset.tab;render();}));
  qs('#dates').addEventListener('click',e=>{const b=e.target.closest('button[data-date]'); if(!b) return; STATE.date=b.dataset.date; render();});
  qs('#search').addEventListener('input',e=>{STATE.query=e.target.value; pushURL(); const filtered=filterItems(DATA_CACHE, STATE.query); qs('#grid').innerHTML=filtered.map(card).join(''); if(!filtered.length){qs('#grid').innerHTML='<div style="opacity:.85;padding:16px;border:1px solid var(--border);border-radius:12px;background:var(--card)">No matches.</div>';}});

  await render();
}
document.addEventListener('DOMContentLoaded',init);
