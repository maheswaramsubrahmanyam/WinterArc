import {boot,loadDays,today,addDays,diffDays,parse,esc,$,niceDate,arcInfo,round1,STREAK_MIN} from './common.js';
function loadChart(){return new Promise((res,rej)=>{if(window.Chart)return res();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js';s.onload=res;s.onerror=()=>rej(new Error('Could not load charts'));document.head.appendChild(s)})}
boot('analysis',async ctx=>{
  const {arc,user}=ctx,m=ctx.main,t=today(),info=arcInfo(arc);
  const days=await loadDays(user.uid),map=Object.fromEntries(days.map(d=>[d.date,d]));
  m.innerHTML=`<div class="page-head"><h1 style="font-size:1.9rem">Analysis</h1><p>Where you shine and where to focus next.</p></div>`;
  if(!info.started||!days.some(d=>d.finished)){m.innerHTML+='<div class="card empty">Finish your first day to unlock charts and your weekly report.</div>';return;}
  // daily series (missed past days count as 0, frozen days skipped)
  const series=[];const last=t>arc.endDate?arc.endDate:t;
  for(let d=arc.startDate;d<=last;d=addDays(d,1)){const r=map[d];if(r&&r.frozen&&!r.finished)continue;if(r&&r.finished)series.push({d,p:r.pct});else if(d<t)series.push({d,p:0});}
  const avg=a=>a.length?round1(a.reduce((x,y)=>x+y,0)/a.length):0;
  // rule stats
  const rs={};days.filter(d=>d.finished).forEach(d=>d.ruleIds.forEach(id=>{const o=rs[id]||(rs[id]={n:d.names[id]||'Rule',a:0,b:0});o.n=d.names[id]||o.n;o.b++;if(d.done.includes(id))o.a++}));
  const rl=Object.values(rs).map(o=>({n:o.n,p:Math.round(o.a/o.b*100)})).sort((a,b)=>b.p-a.p);
  // weekday, weekly, monthly
  const wd=[[],[],[],[],[],[],[]];series.forEach(s=>wd[parse(s.d).getDay()].push(s.p));
  const wdn=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],wdv=wd.map(avg);
  const hasWd=wd.map((a,i)=>a.length?i:-1).filter(i=>i>=0);
  const bestWd=hasWd.sort((a,b)=>wdv[b]-wdv[a])[0];
  const weeks={};series.forEach(s=>{const w=Math.floor(diffDays(s.d,arc.startDate)/7);(weeks[w]=weeks[w]||[]).push(s.p)});
  const wk=Object.keys(weeks).map(Number).sort((a,b)=>a-b);
  const mons={};series.forEach(s=>{const k=s.d.slice(0,7);(mons[k]=mons[k]||[]).push(s.p)});
  const mn=Object.keys(mons).sort();
  const cur=wk.length?avg(weeks[wk[wk.length-1]]):0,prev=wk.length>1?avg(weeks[wk[wk.length-2]]):null;
  const s=arc.stats||{};
  const report=`<b>Your strongest habit:</b> ${esc(rl[0].n)} (${rl[0].p}%).${rl.length>1?` <b>Needs attention:</b> ${esc(rl[rl.length-1].n)} (${rl[rl.length-1].p}%).`:''} ${bestWd!==undefined?`Your best weekday is <b>${wdn[bestWd]}</b> (${wdv[bestWd]}%).`:''} ${prev!==null?(cur>=prev?`This week is up ${round1(cur-prev)} points on last week. Keep it going.`:`This week is down ${round1(prev-cur)} points on last week. Pick one rule to tighten up.`):''}`;
  // heatmap
  const months=[];{let d=arc.startDate.slice(0,7);const end=arc.endDate.slice(0,7);while(d<=end){months.push(d);const [y,mo]=d.split('-').map(Number);d=mo===12?`${y+1}-01`:`${y}-${String(mo+1).padStart(2,'0')}`}}
  const hm=months.map(mk=>{const [y,mo]=mk.split('-').map(Number),first=new Date(y,mo-1,1),n=new Date(y,mo,0).getDate(),off=(first.getDay()+6)%7;
    let c=['M','T','W','T','F','S','S'].map(x=>`<div class="h">${x}</div>`).join('')+'<div style="background:none"></div>'.repeat(off);
    for(let i=1;i<=n;i++){const D=`${mk}-${String(i).padStart(2,'0')}`,r=map[D];let cl='fut',tt='';
      if(D<arc.startDate||D>arc.endDate)cl='fut';else if(r&&r.frozen&&!r.finished){cl='frz';tt='Frozen'}else if(r&&r.finished){cl=r.pct===100?'perf':r.pct>=STREAK_MIN?'good':'part';tt=r.pct+'%'}else if(D<t){cl='miss';tt='Missed'}
      c+=`<div class="${cl}" title="${niceDate(D)} ${tt}">${i}</div>`}
    return `<div><b>${first.toLocaleString(undefined,{month:'long'})}</b><div class="hm" style="margin-top:8px">${c}</div></div>`}).join('');
  m.innerHTML+=`<div class="grid g4"><div class="card stat"><b>${s.completionPct||0}%</b><small>overall</small></div><div class="card stat"><b>${s.weekPct||0}%</b><small>last 7 days</small></div><div class="card stat"><b>${rl[0].p}%</b><small>best rule: ${esc(rl[0].n)}</small></div><div class="card stat"><b>${rl[rl.length-1].p}%</b><small>weakest: ${esc(rl[rl.length-1].n)}</small></div></div>
  <div class="card" style="margin-top:14px;border-color:var(--violet)"><h3>Weekly arc report</h3><p>${report}</p></div>
  <div class="grid g2" style="margin-top:14px"><div class="card"><h3>Daily completion</h3><canvas id="c1"></canvas></div><div class="card"><h3>Rule performance</h3><canvas id="c2"></canvas></div>
  <div class="card"><h3>Weekly average</h3><canvas id="c3"></canvas></div><div class="card"><h3>Best weekday</h3><canvas id="c4"></canvas></div></div>
  <div class="card" style="margin-top:14px"><h3>Monthly trend</h3><div class="grid g3">${mn.map(k=>`<div class="stat"><b>${avg(mons[k])}%</b><small>${new Date(k+'-01T00:00').toLocaleString(undefined,{month:'long'})}</small></div>`).join('')}</div></div>
  <div class="card" style="margin-top:14px"><h3>Calendar</h3><div class="months">${hm}</div><div class="legend"><span><i style="background:var(--ice)"></i>Perfect</span><span><i style="background:rgba(94,234,212,.55)"></i>≥${STREAK_MIN}%</span><span><i style="background:rgba(251,191,36,.45)"></i>Partial</span><span><i style="background:rgba(248,113,113,.35)"></i>Missed</span><span><i style="background:rgba(167,139,250,.6)"></i>Frozen</span></div></div>`;
  try{await loadChart()}catch(e){return}
  Chart.defaults.color='#8CA0BF';Chart.defaults.borderColor='rgba(125,211,252,.1)';Chart.defaults.font.family='Inter';
  const opt=(x={})=>({responsive:true,plugins:{legend:{display:false}},scales:{y:{min:0,max:100,ticks:{callback:v=>v+'%'}},...x}});
  new Chart($('#c1'),{type:'line',data:{labels:series.map(x=>niceDate(x.d)),datasets:[{data:series.map(x=>x.p),borderColor:'#7DD3FC',backgroundColor:'rgba(125,211,252,.15)',fill:true,tension:.3,pointRadius:2}]},options:opt()});
  new Chart($('#c2'),{type:'bar',data:{labels:rl.map(x=>x.n),datasets:[{data:rl.map(x=>x.p),backgroundColor:'#5EEAD4',borderRadius:6}]},options:{indexAxis:'y',plugins:{legend:{display:false}},scales:{x:{min:0,max:100,ticks:{callback:v=>v+'%'}}}}});
  new Chart($('#c3'),{type:'bar',data:{labels:wk.map(w=>'Wk '+(w+1)),datasets:[{data:wk.map(w=>avg(weeks[w])),backgroundColor:'#A78BFA',borderRadius:6}]},options:opt()});
  new Chart($('#c4'),{type:'bar',data:{labels:wdn,datasets:[{data:wdv,backgroundColor:'#7DD3FC',borderRadius:6}]},options:opt()});
});
