import {boot,db,auth,doc,updateDoc,deleteDoc,collection,getDocs,writeBatch,esc,$,$$,toast,confirmBox,syncPublic,signOut} from './common.js';
import {sendPasswordResetEmail,deleteUser} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
boot('settings',ctx=>{
  const m=ctx.main,p=ctx.profile,pr={...p.privacy};
  const sw=(k,t)=>`<div class="switch"><span>${t}</span><input type="checkbox" data-k="${k}" ${pr[k]?'checked':''}></div>`;
  m.innerHTML=`<div class="page-head"><h1 style="font-size:1.9rem">Settings</h1></div>
  <div class="card stack"><h3>Profile</h3><label>Full name<input id="n" maxlength="40" value="${esc(p.name)}"></label><label>Username<input id="u" maxlength="20" value="${esc(p.username||'')}"></label><label>Bio<input id="b" maxlength="80" value="${esc(p.bio||'')}"></label><label>Email<input value="${esc(ctx.user.email||'')}" disabled></label></div>
  <div class="card" style="margin-top:14px"><h3>Privacy</h3>${sw('showOnLeaderboard','Show me on the leaderboard')}${sw('publicProfile','Make my profile public')}${sw('showPercent','Show my completion %')}${sw('showStreak','Show my streak')}</div>
  <div class="row" style="margin-top:14px"><button class="btn" id="sv">Save changes</button></div>
  <div class="card stack" style="margin-top:20px"><h3>Account</h3><div class="row"><button class="btn ghost" id="pw">Send password reset email</button><button class="btn ghost" id="lo">Log out</button></div>
  <hr style="border:0;border-top:1px solid var(--line)"><p class="muted">Deleting your account removes your arc, sheet, proof photos and ranking permanently.</p><button class="btn danger" id="del">Delete my account</button></div>`;
  $$('[data-k]',m).forEach(c=>c.onchange=()=>pr[c.dataset.k]=c.checked);
  $('#sv',m).onclick=async()=>{
    const name=$('#n',m).value.trim(),username=$('#u',m).value.trim().toLowerCase().replace(/[^a-z0-9_]/g,'');
    if(!name||!username)return toast('Name and username are required.','err');
    try{await updateDoc(doc(db,'users',ctx.user.uid),{name,username,bio:$('#b',m).value.trim(),privacy:pr});Object.assign(ctx.profile,{name,username,bio:$('#b',m).value.trim(),privacy:pr});
      if(ctx.arc)await syncPublic(ctx);toast('Settings saved','ok')}catch(e){toast(e.message,'err')}};
  $('#pw',m).onclick=async()=>{try{await sendPasswordResetEmail(auth,ctx.user.email);toast('Reset email sent','ok')}catch(e){toast(e.message,'err')}};
  $('#lo',m).onclick=async()=>{await signOut(auth);location.href='index.html'};
  $('#del',m).onclick=async()=>{
    if(!await confirmBox('This permanently deletes your account and all your data. Continue?','Delete everything'))return;
    const uid=ctx.user.uid;
    try{
      for(const sub of ['days','rules','proofs']){const s=await getDocs(collection(db,'arcs',uid,sub));let b=writeBatch(db);s.docs.forEach(d=>b.delete(d.ref));await b.commit();}
      await deleteDoc(doc(db,'arcs',uid));await deleteDoc(doc(db,'publicBoard',uid));await deleteDoc(doc(db,'users',uid));
      await deleteUser(auth.currentUser);location.href='index.html';
    }catch(e){toast(e.code==='auth/requires-recent-login'?'For safety, log out, log in again, then retry deleting.':e.message,'err')}
  };
});
