import {boot,db,collection,getDocs,query,orderBy,limit,doc,updateDoc,deleteField,esc,$,$$,avatar,toast} from './common.js';
boot('community',async ctx=>{
  const m=ctx.main,me=ctx.user.uid,EM=['❄️','🔥','💪'];
  const snap=await getDocs(query(collection(db,'feed'),orderBy('createdAt','desc'),limit(60)));
  const posts=snap.docs.map(d=>({id:d.id,...d.data()}));
  const ago=ts=>{if(!ts)return 'now';const s=(Date.now()-ts.toDate())/1000;return s<60?'just now':s<3600?Math.floor(s/60)+'m ago':s<86400?Math.floor(s/3600)+'h ago':Math.floor(s/86400)+'d ago'};
  const icon={perfect:'💯',streak:'🔥',badge:'🏅',join:'❄️'};
  function draw(){
    m.innerHTML=`<div class="page-head"><h1 style="font-size:1.9rem">Community</h1><p>Milestones from everyone in the arc. Send a reaction to cheer them on.</p></div><div class="card">${posts.length?posts.map(p=>{
      const r=p.reactions||{},cnt=e=>Object.values(r).filter(x=>x===e).length;
      return `<div class="post">${avatar(p.name)}<div style="flex:1;min-width:0"><div>${icon[p.type]||''} ${esc(p.text)}</div><small>${ago(p.createdAt)}</small><div class="row" style="margin-top:8px;gap:6px">${EM.map(e=>`<button class="react ${r[me]===e?'on':''}" data-p="${p.id}" data-e="${e}">${e} ${cnt(e)||''}</button>`).join('')}</div></div></div>`}).join(''):'<div class="empty">No activity yet. Finish a day to post the first milestone.</div>'}</div>`;
    $$('.react',m).forEach(b=>b.onclick=async()=>{
      const p=posts.find(x=>x.id===b.dataset.p),e=b.dataset.e;p.reactions=p.reactions||{};
      const same=p.reactions[me]===e;same?delete p.reactions[me]:p.reactions[me]=e;draw();
      try{await updateDoc(doc(db,'feed',p.id),{['reactions.'+me]:same?deleteField():e})}catch(er){toast('Could not react: '+er.message,'err')}
    });
  }
  draw();
});
