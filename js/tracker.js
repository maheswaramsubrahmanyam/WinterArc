import {boot,db,doc,setDoc,updateDoc,writeBatch,collection,serverTimestamp,increment,loadDays,recalc,today,addDays,diffDays,longDate,esc,$,$$,openModal,toast,compressImage,hamming,postFeed,BADGES,FREEZE_GAP,STREAK_MIN,ruleText,arcInfo} from './common.js';
boot('tracker',async ctx=>{
  const {arc,user}=ctx,m=ctx.main,t=today(),y=addDays(t,-1),info=arcInfo(arc);
  let days=await loadDays(user.uid);
  const rec=d=>days.find(x=>x.date===d);
  const activeRules=()=>ctx.rules.filter(r=>r.active!==false);
  const inArc=d=>d>=arc.startDate&&d<=arc.endDate;
  const locked=r=>r&&(r.finished||r.frozen);
  function view(D){ // rules shown for a date
    const r=rec(D);
    if(locked(r)&&r.ruleIds)return r.ruleIds.map(id=>({id,name:r.names[id]||'Rule',icon:(ctx.rules.find(x=>x.id===id)||{}).icon||'🎯',desc:''}));
    return activeRules().map(x=>({id:x.id,name:x.name,icon:x.icon,desc:ruleText(x)+(x.description?' · '+x.description:'')}));
  }
  function snap(D,doneSet){
    const rs=activeRules(),ids=rs.map(r=>r.id),names=Object.fromEntries(rs.map(r=>[r.id,r.name]));
    const done=[...doneSet].filter(i=>ids.includes(i)),total=ids.length;
    return {date:D,ruleIds:ids,names,done,total,doneCount:done.length,pct:total?Math.round(done.length/total*100):0};
  }
  function card(D,label){
    const r=rec(D),rs=view(D),done=new Set(r?.done||[]),lk=locked(r);
    const dc=rs.filter(x=>done.has(x.id)).length,pct=rs.length?Math.round(dc/rs.length*100):0;
    return `<div class="card" data-d="${D}"><div class="row between"><div><h3 style="margin:0">${label}</h3><small>${longDate(D)}</small></div>${r?.finished?'<span class="locked-tag">🔒 Locked with proof</span>':r?.frozen?'<span class="locked-tag">❄️ Frozen</span>':''}</div>
    <div class="row" style="margin:14px 0 6px"><b class="mono" style="font-size:1.6rem">${dc}/${rs.length}</b><span class="muted">${pct}%</span><span style="flex:1"></span>${pct>=STREAK_MIN?'<span class="chip static">🔥 counts for streak</span>':''}</div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div style="margin-top:8px">${rs.length?rs.map(x=>`<div class="rule-row"><div class="ic">${esc(x.icon)}</div><div class="tx"><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></div><button class="check ${done.has(x.id)?'on':''}" data-r="${x.id}" aria-label="Toggle ${esc(x.name)}" ${lk?'disabled':''}></button></div>`).join(''):'<div class="empty">No active rules. Add some in <a href="my-arc.html">My Arc</a>.</div>'}</div>
    ${lk?'':`<div class="row end" style="margin-top:12px"><button class="btn" data-fin="${D}" ${dc?'':'disabled'}>📸 Finish day with photo</button></div><small class="muted">Tick at least one rule, then attach a photo to lock this day. Locked days cannot be edited.</small>`}</div>`;
  }
  function draw(){
    let h=`<div class="page-head"><h1 style="font-size:1.9rem">Daily tracker</h1><p>Tick your rules, then lock the day with a proof photo.</p></div>`;
    if(!info.started){m.innerHTML=h+`<div class="card empty">Your arc starts on <b>${longDate(arc.startDate)}</b>.<br>Use the time to fine-tune your <a href="my-arc.html">rules</a>.</div>`;return;}
    if(info.ended){m.innerHTML=h+`<div class="card empty">Your arc has ended. Check your <a href="analysis.html">analysis</a>.</div>`;return;}
    h+=`<div class="stack">`;
    const yr=rec(y);
    if(inArc(y)&&!locked(yr)){
      const canF=!arc.freezeUsedAt||diffDays(t,arc.freezeUsedAt)>=FREEZE_GAP;
      h+=`<div class="card" style="border-color:var(--amber)"><b>Yesterday is still open.</b><p class="muted">You can finish it today. After today it will count as missed.</p>${canF?`<button class="btn ghost sm" id="frz">❄️ Use my streak freeze for yesterday</button><small class="muted" style="display:block;margin-top:6px">One freeze every ${FREEZE_GAP} days. Frozen days do not break your streak.</small>`:`<small class="muted">Freeze available again ${FREEZE_GAP-diffDays(t,arc.freezeUsedAt)} days from now.</small>`}</div>`+card(y,'Yesterday');
    }
    h+=card(t,'Today')+`</div>`;m.innerHTML=h;wire();
  }
  function wire(){
    $$('.check',m).forEach(b=>b.onclick=()=>toggle(b.closest('[data-d]').dataset.d,b.dataset.r,b));
    $$('[data-fin]',m).forEach(b=>b.onclick=()=>finish(b.dataset.fin));
    const f=$('#frz',m);if(f)f.onclick=freeze;
  }
  async function toggle(D,rid,btn){
    const r=rec(D),set=new Set(r?.done||[]);set.has(rid)?set.delete(rid):set.add(rid);
    const d={...snap(D,set),finished:false,frozen:false};
    const old=r;days=days.filter(x=>x.date!==D);days.push(d);
    const sc=window.scrollY;draw();window.scrollTo(0,sc);
    const nb=$(`[data-d="${D}"] [data-r="${rid}"]`,m);if(nb&&set.has(rid)){nb.classList.add('burst');setTimeout(()=>nb.classList.remove('burst'),600);}
    try{await setDoc(doc(db,'arcs',user.uid,'days',D),d,{merge:true});}
    catch(e){toast('Could not save: '+e.message,'err');days=days.filter(x=>x.date!==D);if(old)days.push(old);draw();}
  }
  async function freeze(){
    try{
      await setDoc(doc(db,'arcs',user.uid,'days',y),{date:y,frozen:true,finished:false,ruleIds:[],names:{},done:[],total:0,doneCount:0,pct:0,frozenAt:serverTimestamp()});
      await updateDoc(doc(db,'arcs',user.uid),{freezeUsedAt:t});arc.freezeUsedAt=t;
      days=days.filter(x=>x.date!==y);days.push({date:y,frozen:true,finished:false,pct:0,total:0,doneCount:0});
      await recalc(ctx,days);toast('Yesterday frozen. Streak protected ❄️','ok');draw();
    }catch(e){toast(e.message,'err')}
  }
  function finish(D){
    const r=rec(D);if(!r||!r.doneCount)return;
    const mo=openModal(`<h3>Lock ${longDate(D)}</h3><p class="muted">Attach a photo as proof (workout, notes, study screen, anything that shows today's effort). Your photo is private. Only you and the admin can see it.</p>
    <div class="row"><label class="btn ghost" style="cursor:pointer">📷 Take photo<input type="file" accept="image/*" capture="environment" hidden id="f1"></label><label class="btn ghost" style="cursor:pointer">🖼️ Choose file<input type="file" accept="image/*" hidden id="f2"></label></div>
    <img class="proof-prev" id="pv" style="display:none" alt="Proof preview"><p class="err" id="er"></p>
    <div class="row end"><button class="btn ghost" id="cn">Cancel</button><button class="btn" id="go" disabled>🔒 Lock this day</button></div>`);
    let proof=null;const er=$('#er',mo);
    const pick=async f=>{
      if(!f)return;er.textContent='';proof=null;$('#go',mo).disabled=true;
      try{
        const p=await compressImage(f);
        const dup=days.find(d=>d.date!==D&&d.proofHash&&hamming(d.proofHash,p.hash)<=3);
        if(dup)throw new Error('This looks like the photo you used on '+dup.date+'. Take a fresh photo for today.');
        proof=p;const pv=$('#pv',mo);pv.src=p.img;pv.style.display='block';$('#go',mo).disabled=false;
      }catch(e){er.textContent=e.message}
    };
    $('#f1',mo).onchange=e=>pick(e.target.files[0]);$('#f2',mo).onchange=e=>pick(e.target.files[0]);
    $('#cn',mo).onclick=()=>mo.close();
    $('#go',mo).onclick=async()=>{
      if(!proof)return;$('#go',mo).disabled=true;$('#go',mo).textContent='Locking…';
      try{
        const before=new Set(ctx.arc.stats?.badges||[]);
        const d={...snap(D,new Set(r.done)),finished:true,frozen:false,hasProof:true,proofHash:proof.hash,finishedAt:serverTimestamp()};
        const b=writeBatch(db);
        b.set(doc(db,'arcs',user.uid,'proofs',D),{date:D,img:proof.img,hash:proof.hash,createdAt:serverTimestamp()});
        b.set(doc(db,'arcs',user.uid,'days',D),d,{merge:true});await b.commit();
        days=days.filter(x=>x.date!==D);days.push({...d,finishedAt:new Date()});
        const s=await recalc(ctx,days);mo.close();
        try{await setDoc(doc(db,'siteStats','global'),{totalHabitsDone:increment(d.doneCount)},{merge:true});}catch(e){}
        toast(`Day locked ❄️ ${d.pct}% complete`,'ok');
        const nb=s.badges.filter(x=>!before.has(x));
        nb.forEach(id=>{const bd=BADGES.find(x=>x.id===id);toast(`New badge: ${bd.icon} ${bd.name}`,'ok');postFeed(ctx,'badge',`${ctx.profile.name} earned ${bd.icon} ${bd.name}`);});
        if(d.pct===100)postFeed(ctx,'perfect',`${ctx.profile.name} had a perfect day 💯`);
        if([7,14,21,30,45,60,90].includes(s.currentStreak))postFeed(ctx,'streak',`${ctx.profile.name} reached a ${s.currentStreak}-day streak 🔥`);
        draw();
      }catch(e){console.error(e);er.textContent='Could not lock the day: '+e.message;$('#go',mo).disabled=false;$('#go',mo).textContent='🔒 Lock this day';}
    };
  }
  draw();
});
