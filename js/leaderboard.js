import {boot,db,collection,getDocs,limit,query,esc,$,$$,avatar,MIN_BOARD_DAYS} from './common.js';
boot('leaderboard',async ctx=>{
  const m=ctx.main,me=ctx.user.uid;
  const snap=await getDocs(query(collection(db,'publicBoard'),limit(500)));
  const all=snap.docs.map(d=>d.data()).filter(u=>u.onBoard&&u.daysTracked>=MIN_BOARD_DAYS);
  const tabs={overall:['Overall','completionPct','%'],week:['This week','weekPct','%'],streak:['Streak','currentStreak',' 🔥'],cons:['Consistency','consistencyPct','%']};
  let tab='overall';
  function draw(){
    const [,k,suf]=tabs[tab],list=all.slice().sort((a,b)=>(b[k]-a[k])||(b.daysTracked-a.daysTracked));
    const row=(u,i,cl='')=>`<a class="lb-row r${i+1<4?i+1:''} ${u.uid===me?'me':''} ${cl}" href="profile.html?u=${u.uid}"><div class="rk">${i+1<=3?['🥇','🥈','🥉'][i]:i+1}</div>${avatar(u.name)}<div class="nm"><b>${esc(u.name)}</b><small>@${esc(u.username)} · Day ${u.day}</small></div><div class="val">${u[k]}${suf}</div></a>`;
    const mi=list.findIndex(u=>u.uid===me);
    m.innerHTML=`<div class="page-head"><h1 style="font-size:1.9rem">Leaderboard</h1><p>Ranked by percentage, so everyone competes fairly whatever their number of rules. Appear after ${MIN_BOARD_DAYS} finished days.</p></div>
    <div class="tabs">${Object.entries(tabs).map(([id,t])=>`<button data-t="${id}" class="${id===tab?'on':''}">${t[0]}</button>`).join('')}</div>
    <div class="card">${list.length?list.slice(0,100).map((u,i)=>row(u,i)).join(''):'<div class="empty">Nobody is ranked yet. Finish 3 days to take the first spot.</div>'}</div>
    ${mi>=0?`<div class="pin">${row(list[mi],mi)}</div>`:`<div class="card" style="margin-top:12px"><small>You will appear here after ${MIN_BOARD_DAYS} finished days (and if “Show me on the leaderboard” is on).</small></div>`}`;
    $$('[data-t]',m).forEach(b=>b.onclick=()=>{tab=b.dataset.t;draw()});
  }
  draw();
});
