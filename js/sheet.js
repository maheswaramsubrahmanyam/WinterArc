import {boot,db,doc,getDoc,loadDays,today,addDays,diffDays,esc,$,$$,niceDate,openModal,arcInfo,longDate} from './common.js';
boot('sheet',async ctx=>{
  const {arc,user}=ctx,m=ctx.main,t=today();
  const days=await loadDays(user.uid),map=Object.fromEntries(days.map(d=>[d.date,d]));
  const cols=new Map();ctx.rules.forEach(r=>cols.set(r.id,r.name));
  days.slice().sort((a,b)=>a.date<b.date?-1:1).forEach(d=>Object.entries(d.names||{}).forEach(([id,n])=>cols.set(id,n)));
  const ids=[...cols.keys()],total=arcInfo(arc).total,rows=[];
  for(let i=0;i<total;i++){
    const D=addDays(arc.startDate,i),r=map[D],fut=D>t,isT=D===t;
    const cells=ids.map(id=>{
      if(r&&r.frozen&&!r.finished)return '❄️';
      if(r&&r.finished)return r.done.includes(id)?'✅':(r.ruleIds.includes(id)?'❌':'·');
      if(r&&r.done&&r.done.includes(id))return '✅';
      return D<t?'❌':'⬜';
    });
    const score=r&&r.finished?r.pct+'%':(r&&r.frozen?'❄️':(D<t?'0%':'–'));
    rows.push(`<tr class="${isT?'today':fut?'future':''}"><td>Day ${i+1} · ${niceDate(D)}</td>${cells.map(c=>`<td>${c}</td>`).join('')}<td><b>${score}</b></td><td>${r&&r.hasProof?`<button class="btn ghost sm" data-p="${D}">📷</button>`:''}</td></tr>`);
  }
  m.innerHTML=`<div class="row between page-head"><div><h1 style="font-size:1.9rem">My sheet</h1><p>✅ done · ❌ missed · ⬜ not yet · ❄️ frozen</p></div><button class="btn ghost" id="csv">Download CSV</button></div>
  ${ids.length?`<div class="scroll"><table><thead><tr><th>Day</th>${ids.map(id=>`<th>${esc(cols.get(id))}</th>`).join('')}<th>Score</th><th>Proof</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`:'<div class="card empty">Add rules in My Arc to see your sheet.</div>'}`;
  $$('[data-p]',m).forEach(b=>b.onclick=async()=>{
    const mo=openModal(`<h3>${longDate(b.dataset.p)}</h3><p class="muted">Loading proof…</p>`);
    try{const s=await getDoc(doc(db,'arcs',user.uid,'proofs',b.dataset.p));mo.querySelector('.modal').innerHTML=`<h3>${longDate(b.dataset.p)}</h3>${s.exists()?`<img class="proof-full" src="${s.data().img}" alt="Proof photo">`:'<p>No photo found.</p>'}<div class="row end"><button class="btn ghost" id="x">Close</button></div>`;$('#x',mo).onclick=()=>mo.close();}catch(e){mo.querySelector('p').textContent=e.message}
  });
  const c=$('#csv',m);if(c)c.onclick=()=>{
    const head=['Day','Date',...ids.map(i=>cols.get(i)),'Score'],out=[head];
    for(let i=0;i<total;i++){const D=addDays(arc.startDate,i),r=map[D];out.push([i+1,D,...ids.map(id=>r&&r.finished?(r.done.includes(id)?1:0):''),r&&r.finished?r.pct:'']);}
    const blob=new Blob([out.map(r=>r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')],{type:'text/csv'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='winter-arc-sheet.csv';a.click();
  };
});
