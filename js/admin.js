import {boot,db,doc,getDoc,getDocs,setDoc,updateDoc,deleteDoc,addDoc,collection,serverTimestamp,esc,$,$$,avatar,toast,confirmBox,openModal,today,addDays,niceDate,longDate,loadDays,fmt} from './common.js';
function loadChart(){return new Promise((res,rej)=>{if(window.Chart)return res();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
boot('admin',async ctx=>{
  const m=ctx.main;
  if(!ctx.isAdmin){m.innerHTML=`<div class="card empty"><h2>Admins only</h2>This area is for the Super Admin. To become admin, create a document in the <code>admins</code> collection whose ID is your user ID:<br><code class="mono">${esc(ctx.user.uid)}</code></div>`;return;}
  let tab='dash',users=[],arcs={};
  const [us,as]=await Promise.all([getDocs(collection(db,'users')),getDocs(collection(db,'arcs'))]);
  users=us.docs.map(d=>({uid:d.id,...d.data()}));as.docs.forEach(d=>arcs[d.id]=d.data());
  const t=today();
  const st=u=>(arcs[u.uid]||{}).stats||{};
  const isDone=u=>arcs[u.uid]&&arcs[u.uid].endDate<t;
  function shellTabs(){return `<div class="page-head"><h1 style="font-size:1.9rem">👑 Super Admin</h1></div><div class="tabs">${[['dash','Dashboard'],['users','Users'],['mot','Motivation']].map(([k,n])=>`<button data-tab="${k}" class="${k===tab?'on':''}">${n}</button>`).join('')}</div><div id="tb"></div>`;}
  function go(k){tab=k;m.innerHTML=shellTabs();$$('[data-tab]',m).forEach(b=>b.onclick=()=>go(b.dataset.tab));({dash,users:usersView,mot})[k]();}
  /* dashboard */
  async function dash(){
    const b=$('#tb',m),withArc=users.filter(u=>arcs[u.uid]);
    const act=withArc.filter(u=>[t,addDays(t,-1)].includes(st(u).lastTrackedDate)).length;
    const avg=withArc.length?Math.round(withArc.reduce((a,u)=>a+(st(u).completionPct||0),0)/withArc.length*10)/10:0;
    b.innerHTML=`<div class="grid g4"><div class="card stat"><b>${users.length}</b><small>total users</small></div><div class="card stat"><b>${act}</b><small>active (last 2 days)</small></div><div class="card stat"><b>${avg}%</b><small>avg completion</small></div><div class="card stat"><b>${users.filter(isDone).length}</b><small>arcs ended</small></div></div>
    <div class="card" style="margin-top:14px"><h3>New joins (last 14 days)</h3><canvas id="jc"></canvas></div>`;
    const lab=[],val=[];for(let i=13;i>=0;i--){const d=addDays(t,-i);lab.push(niceDate(d));val.push(users.filter(u=>u.createdAt&&u.createdAt.toDate&&fmt(u.createdAt.toDate())===d).length)}
    try{await loadChart();Chart.defaults.color='#8CA0BF';new Chart($('#jc'),{type:'bar',data:{labels:lab,datasets:[{data:val,backgroundColor:'#7DD3FC',borderRadius:6}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}}}}})}catch(e){}
  }
  /* users */
  let q='',flt='all',sort='progress';
  function usersView(){
    $('#tb',m).innerHTML=`<div class="row"><label style="flex:2">Search<input id="q" placeholder="Name or username" value="${esc(q)}"></label><label>Filter<select id="fl">${['all','active','disabled','completed'].map(x=>`<option ${x===flt?'selected':''}>${x}</option>`).join('')}</select></label><label>Sort<select id="so"><option value="progress" ${sort==='progress'?'selected':''}>Progress</option><option value="joined" ${sort==='joined'?'selected':''}>Newest</option><option value="name" ${sort==='name'?'selected':''}>Name</option></select></label></div><div class="card" style="margin-top:12px;padding:6px"><div class="scroll" style="border:0"><table class="tbl"><thead><tr><th>User</th><th>Joined</th><th>Progress</th><th>Finished</th><th>Streak</th><th>Status</th></tr></thead><tbody id="ub"></tbody></table></div></div><small class="muted">${users.length} users in total</small>`;
    const rows=()=>{
      let l=users.filter(u=>(u.name+' '+u.username).toLowerCase().includes(q.toLowerCase()));
      if(flt==='active')l=l.filter(u=>u.status!=='disabled');if(flt==='disabled')l=l.filter(u=>u.status==='disabled');if(flt==='completed')l=l.filter(isDone);
      l.sort((a,b)=>sort==='progress'?(st(b).completionPct||0)-(st(a).completionPct||0):sort==='joined'?((b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)):a.name.localeCompare(b.name));
      $('#ub').innerHTML=l.map(u=>`<tr class="click" data-u="${u.uid}"><td><div class="row" style="flex-wrap:nowrap">${avatar(u.name)}<div><b>${esc(u.name)}</b><br><small>@${esc(u.username||'')}</small></div></div></td><td>${u.createdAt?niceDate(fmt(u.createdAt.toDate())):'–'}</td><td style="min-width:120px"><b>${st(u).completionPct||0}%</b><div class="bar"><i style="width:${st(u).completionPct||0}%"></i></div></td><td>${st(u).daysTracked||0}</td><td>🔥 ${st(u).currentStreak||0}</td><td>${u.status==='disabled'?'<span style="color:var(--red)">Disabled</span>':isDone(u)?'Completed':arcs[u.uid]?'Active':'No arc'}</td></tr>`).join('')||'<tr><td colspan="6" class="empty">No users match.</td></tr>';
      $$('[data-u]').forEach(r=>r.onclick=()=>detail(r.dataset.u));
    };
    $('#q').oninput=e=>{q=e.target.value;rows()};$('#fl').onchange=e=>{flt=e.target.value;rows()};$('#so').onchange=e=>{sort=e.target.value;rows()};rows();
  }
  async function detail(uid){
    const u=users.find(x=>x.uid===uid),a=arcs[uid],s=st(u);
    m.innerHTML=`<button class="btn ghost sm" id="bk">← All users</button><div class="card empty">Loading…</div>`;$('#bk').onclick=()=>go('users');
    let rules=[],days=[];
    if(a){rules=(await getDocs(collection(db,'arcs',uid,'rules'))).docs.map(d=>({id:d.id,...d.data()}));days=(await loadDays(uid)).sort((x,y)=>x.date<y.date?-1:1);}
    const rs={};days.filter(d=>d.finished).forEach(d=>d.ruleIds.forEach(id=>{const o=rs[id]||(rs[id]={n:d.names[id]||'Rule',a:0,b:0});o.b++;if(d.done.includes(id))o.a++}));
    m.innerHTML=`<button class="btn ghost sm" id="bk">← All users</button>
    <div class="card" style="margin-top:12px"><div class="row between"><div class="row">${avatar(u.name,'lg')}<div><h2 style="margin:0">${esc(u.name)}</h2><small>@${esc(u.username||'')} · joined ${u.createdAt?longDate(fmt(u.createdAt.toDate())):'–'}</small><br><small>${esc(u.bio||'')}</small></div></div>
    <button class="btn ${u.status==='disabled'?'':'danger'}" id="tg">${u.status==='disabled'?'Enable user':'Disable user'}</button></div>
    ${a?`<p class="quote" style="margin-top:16px">“${esc(a.promise)}”</p><small>Arc ${a.startDate} → ${a.endDate}</small>`:'<p class="muted" style="margin-top:12px">No arc created yet.</p>'}</div>
    <div class="grid g4" style="margin-top:14px"><div class="card stat"><b>${s.completionPct||0}%</b><small>completion</small></div><div class="card stat"><b>🔥 ${s.currentStreak||0}</b><small>streak</small></div><div class="card stat"><b>${s.bestStreak||0}</b><small>best streak</small></div><div class="card stat"><b>${s.daysTracked||0}</b><small>days finished</small></div></div>
    ${a?`<div class="grid g2" style="margin-top:14px"><div class="card"><h3>Rules (${rules.length})</h3>${rules.map(r=>`<div class="rule-row"><div class="ic">${esc(r.icon)}</div><div class="tx"><b>${esc(r.name)}${r.active===false?' (paused)':''}</b><small>${esc([r.target,r.unit].join(' '))}</small></div></div>`).join('')}</div>
    <div class="card"><h3>Rule performance</h3>${Object.values(rs).map(o=>{const p=Math.round(o.a/o.b*100);return `<div style="margin-bottom:10px"><div class="row between"><span>${esc(o.n)}</span><b>${p}%</b></div><div class="bar"><i style="width:${p}%"></i></div></div>`}).join('')||'<small class="muted">No finished days yet.</small>'}</div></div>
    <div class="card" style="margin-top:14px;padding:6px"><h3 style="padding:14px 14px 0">Daily records</h3><div class="scroll" style="border:0"><table class="tbl"><thead><tr><th>Date</th><th>Done</th><th>Score</th><th>State</th><th>Proof</th></tr></thead><tbody>${days.map(d=>`<tr><td>${niceDate(d.date)}</td><td>${d.doneCount||0}/${d.total||0}</td><td>${d.pct||0}%</td><td>${d.finished?'🔒 Finished':d.frozen?'❄️ Frozen':'Open'}</td><td>${d.hasProof?`<button class="btn ghost sm" data-p="${d.date}">📷 View</button>`:''}</td></tr>`).join('')}</tbody></table></div></div>`:''}`;
    $('#bk').onclick=()=>go('users');
    $('#tg').onclick=async()=>{const dis=u.status!=='disabled';if(!await confirmBox(`${dis?'Disable':'Enable'} ${u.name}?`,dis?'Disable':'Enable'))return;
      try{await updateDoc(doc(db,'users',uid),{status:dis?'disabled':'active'});u.status=dis?'disabled':'active';if(dis)await setDoc(doc(db,'publicBoard',uid),{onBoard:false},{merge:true});toast('Updated','ok');detail(uid)}catch(e){toast(e.message,'err')}};
    $$('[data-p]').forEach(b=>b.onclick=async()=>{const mo=openModal('<p>Loading…</p>');const s=await getDoc(doc(db,'arcs',uid,'proofs',b.dataset.p));mo.querySelector('.modal').innerHTML=`<h3>${longDate(b.dataset.p)}</h3>${s.exists()?`<img class="proof-full" src="${s.data().img}" alt="Proof">`:'<p>No photo.</p>'}<div class="row end"><button class="btn ghost" id="x">Close</button></div>`;$('#x',mo).onclick=()=>mo.close()});
  }
  /* motivation */
  async function mot(){
    const b=$('#tb',m);const list=(await getDocs(collection(db,'motivations'))).docs.map(d=>({id:d.id,...d.data()}));
    b.innerHTML=`<div class="row between"><p class="muted" style="margin:0">One message is shown per day to everyone. “Comeback” messages show to people who missed yesterday. With none added, built-in quotes are used.</p><button class="btn" id="add">+ Add message</button></div><div class="card" style="margin-top:12px">${list.length?list.map(x=>`<div class="rule-row" style="${x.active===false?'opacity:.5':''}"><div class="tx"><b>“${esc(x.text)}”</b><small>${esc(x.category||'general')}${x.active===false?' · inactive':''}</small></div><button class="btn ghost sm" data-t="${x.id}">${x.active===false?'Activate':'Deactivate'}</button><button class="btn ghost sm" data-e="${x.id}">Edit</button><button class="btn danger sm" data-x="${x.id}">✕</button></div>`).join(''):'<div class="empty">No custom messages yet.</div>'}</div>`;
    const edit=x=>{const mo=openModal(`<h3>${x?'Edit':'New'} message</h3><label>Text<textarea id="tx" maxlength="200">${esc(x?.text||'')}</textarea></label><label>Category<select id="ct">${['general','discipline','fitness','study','comeback'].map(c=>`<option ${x?.category===c?'selected':''}>${c}</option>`).join('')}</select></label><div class="row end"><button class="btn ghost" id="c">Cancel</button><button class="btn" id="s">Save</button></div>`);
      $('#c',mo).onclick=()=>mo.close();$('#s',mo).onclick=async()=>{const text=$('#tx',mo).value.trim();if(!text)return;const d={text,category:$('#ct',mo).value};
        try{x?await updateDoc(doc(db,'motivations',x.id),d):await addDoc(collection(db,'motivations'),{...d,active:true,createdAt:serverTimestamp(),createdBy:ctx.user.uid});mo.close();mot()}catch(e){toast(e.message,'err')}}};
    $('#add').onclick=()=>edit();
    $$('[data-e]',b).forEach(x=>x.onclick=()=>edit(list.find(i=>i.id===x.dataset.e)));
    $$('[data-t]',b).forEach(x=>x.onclick=async()=>{const i=list.find(i=>i.id===x.dataset.t);await updateDoc(doc(db,'motivations',i.id),{active:i.active===false});mot()});
    $$('[data-x]',b).forEach(x=>x.onclick=async()=>{if(await confirmBox('Delete this message?','Delete')){await deleteDoc(doc(db,'motivations',x.dataset.x));mot()}});
  }
  go('dash');
},{noArc:true});
