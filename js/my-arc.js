import {boot,db,doc,collection,updateDoc,setDoc,deleteDoc,addDoc,writeBatch,serverTimestamp,esc,$,$$,ruleModal,ruleText,toast,confirmBox,syncPublic,longDate,arcInfo} from './common.js';
boot('my-arc',ctx=>{
  const {arc,user}=ctx,m=ctx.main,info=arcInfo(arc);
  const rcol=id=>doc(db,'arcs',user.uid,'rules',id);
  function draw(){
    m.innerHTML=`<div class="page-head"><h1 style="font-size:1.9rem">My arc</h1><p>${longDate(arc.startDate)} → ${longDate(arc.endDate)} · ${info.total} days</p></div>
    <div class="card stack"><h3>My promise</h3><textarea id="pr" maxlength="200">${esc(arc.promise)}</textarea><div class="row between"><small id="cc">${arc.promise.length}/200</small><button class="btn" id="sp">Save promise</button></div></div>
    <div class="card" style="margin-top:14px"><div class="row between"><h3 style="margin:0">My rules</h3><button class="btn sm" id="add">+ Add rule</button></div>
    <p class="muted" style="font-size:.85rem;margin:6px 0">Changes apply from today. Days you already locked keep the rules they had.</p>
    ${ctx.rules.length?ctx.rules.map((r,i)=>`<div class="rule-row" style="${r.active===false?'opacity:.5':''}"><div class="ic">${esc(r.icon)}</div><div class="tx"><b>${esc(r.name)}${r.active===false?' (paused)':''}</b><small>${esc(ruleText(r))}${r.description?' · '+esc(r.description):''}</small></div>
      <div class="row" style="gap:4px;flex-wrap:nowrap"><button class="btn ghost sm" data-u="${i}" ${i?'':'disabled'} aria-label="Move up">↑</button><button class="btn ghost sm" data-dn="${i}" ${i<ctx.rules.length-1?'':'disabled'} aria-label="Move down">↓</button><button class="btn ghost sm" data-t="${i}">${r.active===false?'Resume':'Pause'}</button><button class="btn ghost sm" data-e="${i}">Edit</button><button class="btn danger sm" data-x="${i}">✕</button></div></div>`).join(''):'<div class="empty">No rules yet.</div>'}</div>`;
    $('#pr',m).oninput=e=>$('#cc',m).textContent=e.target.value.length+'/200';
    $('#sp',m).onclick=async()=>{const v=$('#pr',m).value.trim();if(v.length<10)return toast('Promise needs at least 10 characters.','err');
      try{await updateDoc(doc(db,'arcs',user.uid),{promise:v});arc.promise=v;await syncPublic(ctx);toast('Promise saved','ok')}catch(e){toast(e.message,'err')}};
    $('#add',m).onclick=()=>ruleModal({},async d=>{try{const ref=await addDoc(collection(db,'arcs',user.uid,'rules'),{...d,order:ctx.rules.length,active:true,createdAt:serverTimestamp()});ctx.rules.push({id:ref.id,...d,order:ctx.rules.length,active:true});draw();toast('Rule added','ok')}catch(e){toast(e.message,'err')}});
    $$('[data-e]',m).forEach(b=>b.onclick=()=>{const r=ctx.rules[+b.dataset.e];ruleModal(r,async d=>{try{await updateDoc(rcol(r.id),d);Object.assign(r,d);draw();toast('Rule updated','ok')}catch(e){toast(e.message,'err')}})});
    $$('[data-t]',m).forEach(b=>b.onclick=async()=>{const r=ctx.rules[+b.dataset.t],v=r.active===false;try{await updateDoc(rcol(r.id),{active:v});r.active=v;draw()}catch(e){toast(e.message,'err')}});
    $$('[data-x]',m).forEach(b=>b.onclick=async()=>{const r=ctx.rules[+b.dataset.x];if(!await confirmBox(`Delete “${r.name}”? Past days keep their history.`,'Delete'))return;
      try{await deleteDoc(rcol(r.id));ctx.rules.splice(+b.dataset.x,1);draw()}catch(e){toast(e.message,'err')}});
    const mv=async(i,j)=>{const a=ctx.rules[i],b=ctx.rules[j];if(!b)return;try{const bt=writeBatch(db);bt.update(rcol(a.id),{order:j});bt.update(rcol(b.id),{order:i});await bt.commit();a.order=j;b.order=i;ctx.rules.sort((x,y)=>x.order-y.order);draw()}catch(e){toast(e.message,'err')}};
    $$('[data-u]',m).forEach(b=>b.onclick=()=>mv(+b.dataset.u,+b.dataset.u-1));
    $$('[data-dn]',m).forEach(b=>b.onclick=()=>mv(+b.dataset.dn,+b.dataset.dn+1));
  }
  draw();
});
