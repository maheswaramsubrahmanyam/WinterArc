import {boot,loadDays,computeStats,recalc,arcInfo,today,addDays,diffDays,esc,$,niceDate,todaysMotivation,BADGES,STREAK_MIN,longDate} from './common.js';
boot('dashboard',async ctx=>{
  const {arc,profile,user}=ctx,m=ctx.main,info=arcInfo(arc),t=today(),y=addDays(t,-1);
  const days=await loadDays(user.uid);const s=computeStats(arc,days);
  const o=arc.stats||{};
  if(o.completionPct!==s.completionPct||o.currentStreak!==s.currentStreak||o.daysTracked!==s.daysTracked||o.weekPct!==s.weekPct||(o.badges||[]).length!==s.badges.length){recalc(ctx,days).catch(()=>{});}
  ctx.arc.stats=s;
  const td=days.find(d=>d.date===t),yd=days.find(d=>d.date===y);
  const missed=y>=arc.startDate&&y<=arc.endDate&&!(yd&&(yd.finished||yd.frozen));
  const quote=await todaysMotivation(missed&&info.started);
  const frac=info.total?info.dayNo/info.total:0;
  const frost=Math.max(.15,Math.min(1,(s.weekPct||0)/100+.15));
  const act=ctx.rules.filter(r=>r.active!==false).length;
  const tPct=td?td.pct:0,tDone=td?td.doneCount:0,tTot=td&&!td.finished?act:(td?td.total:act);
  const missedDays=Math.max(0,(info.started?Math.min(diffDays(t,arc.startDate),info.total):0)-s.daysTracked-days.filter(d=>d.frozen&&!d.finished&&d.date<t).length);
  const hr=new Date().getHours(),greet=hr<12?'Good morning':hr<18?'Good afternoon':'Good evening';
  m.innerHTML=`<div class="page-head"><h1 style="font-size:1.9rem">${greet}, ${esc(profile.name.split(' ')[0])} 👋</h1><p class="quote" style="margin-top:10px;font-size:1rem;color:var(--mut)">“${esc(arc.promise)}”</p></div>
  <div class="grid g2">
   <div class="card" style="--frost:${frost}"><div class="gauge"><svg viewBox="0 0 200 112"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#5EEAD4"/><stop offset=".6" stop-color="#7DD3FC"/><stop offset="1" stop-color="#A78BFA"/></linearGradient></defs>
    <path class="track" d="M20 100A80 80 0 0 1 180 100" fill="none" stroke-width="12" stroke-linecap="round"/>
    <path class="fill" id="arcp" d="M20 100A80 80 0 0 1 180 100" fill="none" stroke="url(#gg)" stroke-width="12" stroke-linecap="round" stroke-dasharray="251.3" stroke-dashoffset="251.3"/></svg>
    <div class="center"><b>${info.started?'DAY '+info.dayNo:'SOON'}</b><small>${info.started?'of '+info.total:'starts '+niceDate(arc.startDate)}</small></div></div>
    <p class="muted" style="text-align:center;margin-top:14px;font-size:.85rem">Frost Meter: ${frost>.7?'solid and glowing':frost>.4?'holding steady':'starting to thaw. Get back on track.'}</p></div>
   <div class="card stack"><div class="row between"><h3 style="margin:0">Today</h3>${td&&td.finished?'<span class="locked-tag">🔒 Locked</span>':''}</div>
    <div class="row"><b class="mono" style="font-size:2.2rem">${tDone}/${tTot}</b><span class="muted">rules done · ${tPct}%</span></div>
    <div class="bar"><i style="width:${tPct}%"></i></div>
    <p class="muted" style="font-size:.88rem">${!info.started?'Your arc starts '+longDate(arc.startDate)+'.':info.ended?'Your arc has ended. Great work.':td&&td.finished?'Day locked with your proof photo. See you tomorrow.':'Tick your rules, then attach a proof photo to lock the day.'}</p>
    <a class="btn" href="tracker.html">${td&&td.finished?'View today':'Track today'}</a></div>
  </div>
  <div class="grid g4" style="margin-top:14px">
   <div class="card stat"><b>${s.completionPct}%</b><small>completion</small></div>
   <div class="card stat"><b class="ember">🔥 ${s.currentStreak}</b><small>current streak (≥${STREAK_MIN}%)</small></div>
   <div class="card stat"><b>${s.bestStreak}</b><small>best streak</small></div>
   <div class="card stat"><b>${s.daysTracked}</b><small>days finished</small></div>
   <div class="card stat"><b>${s.perfectDays}</b><small>perfect days</small></div>
   <div class="card stat"><b>${missedDays}</b><small>missed days</small></div>
  </div>
  <div class="card" style="margin-top:14px"><small>Today's motivation</small><p class="quote" style="margin-top:8px">${esc(quote)}</p></div>
  <div class="card" style="margin-top:14px"><h3>Badges</h3><div class="row">${BADGES.map(b=>`<div class="badge ${s.badges.includes(b.id)?'':'locked'}" title="${esc(b.desc)}"><span>${b.icon}</span><b>${esc(b.name)}</b></div>`).join('')}</div></div>
  <div class="row" style="margin-top:14px"><a class="btn ghost" href="sheet.html">📋 My sheet</a><a class="btn ghost" href="analysis.html">📊 Analysis</a><a class="btn ghost" href="my-arc.html">🎯 Edit arc</a><a class="btn ghost" href="community.html">💬 Community</a></div>`;
  setTimeout(()=>$('#arcp').style.strokeDashoffset=251.3*(1-frac),150);
});
