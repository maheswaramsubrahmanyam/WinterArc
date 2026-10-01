import {boot,db,doc,getDoc,esc,$,avatar,BADGES,toast,arcInfo} from './common.js';
boot('profile',async ctx=>{
  const m=ctx.main,q=new URLSearchParams(location.search).get('u'),own=!q||q===ctx.user.uid;
  let u;
  if(own){const s=ctx.arc.stats||{};u={uid:ctx.user.uid,name:ctx.profile.name,username:ctx.profile.username,bio:ctx.profile.bio,promise:ctx.arc.promise,completionPct:s.completionPct||0,currentStreak:s.currentStreak||0,bestStreak:s.bestStreak||0,daysTracked:s.daysTracked||0,perfectDays:s.perfectDays||0,badges:s.badges||[],publicProfile:true,showStreak:true,showPercent:true,day:arcInfo(ctx.arc).dayNo};}
  else{const s=await getDoc(doc(db,'publicBoard',q));if(!s.exists()){m.innerHTML='<div class="card empty">This person has not started an arc yet.</div>';return;}u=s.data();
    if(!u.publicProfile){m.innerHTML=`<div class="card empty">${avatar(u.name,'lg')}<h2 style="margin-top:12px">${esc(u.name)}</h2>This profile is private.</div>`;return;}
  }
  m.innerHTML=`<div class="card" style="text-align:center">${avatar(u.name,'lg')}<h1 style="font-size:1.8rem;margin-top:12px">${esc(u.name)}</h1><small>@${esc(u.username||'')}${u.bio?' · '+esc(u.bio):''}</small>
   <p class="quote" style="text-align:left;margin:18px auto;max-width:520px">“${esc(u.promise)}”</p>
   <div class="grid g4" style="margin-top:8px"><div class="card flat stat"><b>${u.day||0}</b><small>day</small></div>
   ${u.showPercent?`<div class="card flat stat"><b>${u.completionPct}%</b><small>completion</small></div>`:''}
   ${u.showStreak?`<div class="card flat stat"><b class="ember">🔥 ${u.currentStreak}</b><small>streak</small></div><div class="card flat stat"><b>${u.bestStreak}</b><small>best streak</small></div>`:''}
   <div class="card flat stat"><b>${u.daysTracked}</b><small>days finished</small></div></div></div>
   <div class="card" style="margin-top:14px"><h3>Badges</h3><div class="row">${BADGES.map(b=>`<div class="badge ${(u.badges||[]).includes(b.id)?'':'locked'}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${esc(b.name)}</b></div>`).join('')}</div></div>
   ${own?`<div class="row" style="margin-top:14px"><button class="btn ghost" id="cp">Copy my profile link</button><a class="btn ghost" href="settings.html">Edit profile & privacy</a></div>`:'<div class="row" style="margin-top:14px"><a class="btn ghost" href="leaderboard.html">Back to leaderboard</a></div>'}`;
  const cp=$('#cp',m);if(cp)cp.onclick=async()=>{await navigator.clipboard.writeText(location.origin+location.pathname+'?u='+ctx.user.uid).catch(()=>{});toast('Link copied','ok')};
});
