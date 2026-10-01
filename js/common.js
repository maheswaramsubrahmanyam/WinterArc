import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs,query,orderBy,limit,serverTimestamp,increment,writeBatch,deleteField,addDoc} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";

export const app=initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getFirestore(app);
export {onAuthStateChanged,signOut,doc,getDoc,setDoc,updateDoc,deleteDoc,collection,getDocs,query,orderBy,limit,serverTimestamp,increment,writeBatch,deleteField,addDoc};

/* ---------- constants ---------- */
export const SEASON_START="2026-10-01", SEASON_END="2026-12-31";
export const STREAK_MIN=80;      // % needed for a day to keep the streak
export const FREEZE_GAP=30;      // days between streak freezes
export const MIN_BOARD_DAYS=3;   // finished days needed to appear on leaderboard
export const defaultPrivacy={showOnLeaderboard:true,publicProfile:true,showStreak:true,showPercent:true};

/* ---------- small helpers ---------- */
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const initials=n=>String(n||'?').trim().split(/\s+/).slice(0,2).map(w=>w[0]).join('').toUpperCase()||'?';
export const avatar=(n,cls='')=>`<div class="avatar ${cls}">${esc(initials(n))}</div>`;
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const round1=n=>Math.round(n*10)/10;

const p2=n=>String(n).padStart(2,'0');
export const fmt=d=>`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;
export const parse=s=>{const [y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d);};
export const today=()=>fmt(new Date());
export const addDays=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return fmt(d);};
export const diffDays=(a,b)=>Math.round((parse(a)-parse(b))/864e5);
export const niceDate=s=>parse(s).toLocaleDateString(undefined,{day:'numeric',month:'short'});
export const longDate=s=>parse(s).toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});

export function toast(msg,type=''){
  let box=$('#toasts');if(!box){box=document.createElement('div');box.id='toasts';document.body.appendChild(box);}
  const t=document.createElement('div');t.className='toast '+type;t.textContent=msg;box.appendChild(t);setTimeout(()=>t.remove(),4200);
}
export function openModal(html){
  const bg=document.createElement('div');bg.className='modal-bg';bg.innerHTML=`<div class="modal">${html}</div>`;
  document.body.appendChild(bg);bg.close=()=>bg.remove();
  bg.addEventListener('mousedown',e=>{if(e.target===bg)bg.close();});return bg;
}
export function confirmBox(msg,yes='Yes'){
  return new Promise(res=>{
    const m=openModal(`<h3>Please confirm</h3><p>${esc(msg)}</p><div class="row end"><button class="btn ghost" id="n">Cancel</button><button class="btn danger" id="y">${esc(yes)}</button></div>`);
    $('#n',m).onclick=()=>{m.close();res(false)};$('#y',m).onclick=()=>{m.close();res(true)};
  });
}

/* ---------- arc dates & stats ---------- */
export function newArcDates(){
  const t=today();const startDate=t>SEASON_START?t:SEASON_START;
  let endDate=SEASON_END;if(diffDays(endDate,startDate)<30)endDate=addDays(startDate,89);
  return {startDate,endDate};
}
export function arcInfo(arc){
  const t=today();const total=diffDays(arc.endDate,arc.startDate)+1;
  const dayNo=clamp(diffDays(t,arc.startDate)+1,0,total);
  return {total,dayNo,started:t>=arc.startDate,ended:t>arc.endDate,t};
}
export const emptyStats={completionPct:0,weekPct:0,consistencyPct:0,currentStreak:0,bestStreak:0,daysTracked:0,perfectDays:0,totalDone:0,totalPossible:0,lastTrackedDate:'',perfectWeek:false,comeback:false,badges:[]};

export const BADGES=[
 {id:'first',icon:'🌱',name:'First Step',desc:'Finish your first day'},
 {id:'s7',icon:'🔥',name:'7-Day Warrior',desc:'Reach a 7-day streak'},
 {id:'s14',icon:'⚡',name:'14-Day Streak',desc:'Reach a 14-day streak'},
 {id:'s30',icon:'🧊',name:'30-Day Discipline',desc:'Reach a 30-day streak'},
 {id:'pw',icon:'💯',name:'Perfect Week',desc:'7 perfect days in a row'},
 {id:'half',icon:'🏔️',name:'Halfway',desc:'Reach the halfway point'},
 {id:'fin',icon:'🏆',name:'Arc Finisher',desc:'Complete the whole arc'},
 {id:'cb',icon:'🔁',name:'Comeback',desc:'Return after 3+ missed days'}];

export function computeStats(arc,days){
  const t=today(),map={};days.forEach(d=>map[d.date]=d);
  const last=t>arc.endDate?arc.endDate:t;
  let fin=0,sum=0,perf=0,done=0,poss=0,elapsed=0,best=0,run=0,gap=0,pRun=0,pw=false,cb=false,lastT='';
  let wSum=0,wEl=0;const wStart=addDays(t,-6);
  for(let d=arc.startDate;d<=last;d=addDays(d,1)){
    const r=map[d],isF=!!(r&&r.finished),isZ=!!(r&&r.frozen&&!r.finished);
    if(isF){fin++;sum+=r.pct;done+=r.doneCount;poss+=r.total;if(r.pct===100)perf++;if(gap>=3)cb=true;gap=0;lastT=d;}
    else if(!isZ&&d<t)gap++;
    if(!isZ&&(d<t||isF)){elapsed++;if(d>=wStart){wEl++;if(isF)wSum+=r.pct;}}
    const q=(isF&&r.pct>=STREAK_MIN)||isZ;
    if(q){run++;best=Math.max(best,run);}else if(d!==t)run=0;
    if(isF&&r.pct===100){pRun++;if(pRun>=7)pw=true;}else if(!isZ&&d!==t)pRun=0;
  }
  const s={completionPct:elapsed?round1(sum/elapsed):0,weekPct:wEl?round1(wSum/wEl):0,consistencyPct:elapsed?round1(fin/elapsed*100):0,
    currentStreak:run,bestStreak:best,daysTracked:fin,perfectDays:perf,totalDone:done,totalPossible:poss,lastTrackedDate:lastT,perfectWeek:pw,comeback:cb};
  const info=arcInfo(arc),b=[];
  if(fin>=1)b.push('first');if(best>=7)b.push('s7');if(best>=14)b.push('s14');if(best>=30)b.push('s30');
  if(pw)b.push('pw');if(info.dayNo>=Math.ceil(info.total/2)&&fin>=10)b.push('half');
  if(info.ended&&fin>=info.total*.7)b.push('fin');if(cb)b.push('cb');
  s.badges=b;return s;
}
export async function loadDays(uid){
  const s=await getDocs(collection(db,'arcs',uid,'days'));return s.docs.map(d=>({date:d.id,...d.data()}));
}
export async function syncPublic(ctx){
  const {profile,arc,user}=ctx,s=arc.stats||emptyStats,info=arcInfo(arc),p=profile.privacy||defaultPrivacy;
  await setDoc(doc(db,'publicBoard',user.uid),{uid:user.uid,name:profile.name,username:profile.username||'',promise:arc.promise,day:info.dayNo,total:info.total,
    completionPct:s.completionPct,weekPct:s.weekPct,consistencyPct:s.consistencyPct,currentStreak:s.currentStreak,bestStreak:s.bestStreak,daysTracked:s.daysTracked,perfectDays:s.perfectDays,badges:s.badges||[],
    onBoard:!!p.showOnLeaderboard,publicProfile:!!p.publicProfile,showStreak:!!p.showStreak,showPercent:!!p.showPercent,updatedAt:serverTimestamp()});
}
export async function recalc(ctx,days){
  days=days||await loadDays(ctx.user.uid);
  const stats=computeStats(ctx.arc,days);ctx.arc.stats=stats;
  await updateDoc(doc(db,'arcs',ctx.user.uid),{stats});await syncPublic(ctx);return stats;
}
export async function postFeed(ctx,type,text){
  if(!(ctx.profile.privacy||defaultPrivacy).publicProfile)return;
  try{await addDoc(collection(db,'feed'),{uid:ctx.user.uid,name:ctx.profile.name,type,text,createdAt:serverTimestamp(),reactions:{}});}catch(e){console.warn(e)}
}

/* ---------- proof image ---------- */
export async function compressImage(file){
  const img=await new Promise((res,rej)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);res(i)};i.onerror=()=>rej(new Error('That file is not a readable image.'));i.src=u;});
  const h=document.createElement('canvas');h.width=9;h.height=8;const hc=h.getContext('2d');hc.drawImage(img,0,0,9,8);
  const px=hc.getImageData(0,0,9,8).data,g=(x,y)=>{const i=(y*9+x)*4;return px[i]*.3+px[i+1]*.59+px[i+2]*.11};
  let bits='';for(let y=0;y<8;y++)for(let x=0;x<8;x++)bits+=g(x,y)>g(x+1,y)?'1':'0';
  const hash=[...bits.match(/.{4}/g)].map(b=>parseInt(b,2).toString(16)).join('');
  let max=800,q=.62,url='';
  for(let i=0;i<4;i++){
    const sc=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*sc);c.height=Math.round(img.height*sc);
    const x=c.getContext('2d');x.drawImage(img,0,0,c.width,c.height);
    x.fillStyle='rgba(0,0,0,.6)';x.fillRect(0,c.height-26,c.width,26);x.fillStyle='#fff';x.font='13px sans-serif';x.fillText('Winter Arc • '+new Date().toLocaleString(),8,c.height-8);
    url=c.toDataURL('image/jpeg',q);if(url.length<450000)break;max-=150;q-=.08;
  }
  if(url.length>=600000)throw new Error('Photo is too large. Try another one.');
  return {img:url,hash};
}
export function hamming(a,b){let n=0;for(let i=0;i<a.length;i++){let x=parseInt(a[i],16)^parseInt(b[i],16);while(x){n+=x&1;x>>=1}}return n;}

/* ---------- motivation ---------- */
const QUOTES=["You don't need to feel motivated. You need to keep the promise you made to yourself.","Discipline is choosing what you want most over what you want now.","Consistency beats intensity.","Small daily wins build a big arc.","Do it tired. Do it bored. Just do it.","Your future self is watching what you do today.","Show up first. Motivation shows up later.","The cold season builds the strongest people.","Don't count the days. Make the days count.","Progress is quiet. Keep going.","One more rep. One more page. One more day.","Be the person who keeps promises to themselves.","Comfort is a slow way to lose.","Winter is where the work gets done.","You are one habit away from a different life.","Done today beats perfect tomorrow.","Every checked box is a vote for who you're becoming.","Start where you are. Use what you have.","Stay hard on the plan, soft on yourself.","Great things are built by ordinary days repeated.","The streak is just proof that you showed up.","Rest is part of the plan. Quitting is not.","Focus on the next task, not the whole mountain.","Momentum loves a small start.","Make it so consistent it becomes who you are.","Today's effort is tomorrow's ease.","No one is coming to do it for you. That's the good news.","Win the morning, shape the day.","What you do daily matters more than what you do occasionally.","Trust the process. Keep the promise.","Your only competition is yesterday's you.","Ice forms one layer at a time.","Keep going. The view changes at the top.","Habits are votes. Cast one now.","Hard days build the streak that easy days can't.","Be proud of showing up.","A slow day is still a day forward.","Build the life you'll thank yourself for.","Energy follows action.","Finish what you promised today."];
const COMEBACK=["One missed day is not the end of your arc. Start again today.","You didn't fall behind. You paused. Press play.","Comebacks are where the strongest streaks start.","Yesterday is gone. Today is a clean sheet.","Never miss twice. Do one thing right now.","A bad day doesn't erase your progress. Keep the promise today.","Get back on track with the smallest possible win.","Missing a day is human. Returning is discipline."];
export async function todaysMotivation(missedYesterday){
  let list=[];try{const s=await getDocs(collection(db,'motivations'));list=s.docs.map(d=>({id:d.id,...d.data()})).filter(m=>m.active!==false&&m.text);}catch(e){}
  let pool;
  if(missedYesterday){pool=list.filter(m=>m.category==='comeback').map(m=>m.text);if(!pool.length)pool=COMEBACK;}
  else{pool=list.filter(m=>m.category!=='comeback').map(m=>m.text).sort();if(!pool.length)pool=QUOTES;}
  return pool[Math.abs(diffDays(today(),'2026-01-01'))%pool.length];
}

/* ---------- profile / shell ---------- */
export async function ensureProfile(user,extra={}){
  const ref=doc(db,'users',user.uid),s=await getDoc(ref);
  if(s.exists())return;
  const base=(user.email||'user').split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g,'');
  await setDoc(ref,{name:extra.name||user.displayName||base,username:extra.username||base,bio:'',status:'active',privacy:defaultPrivacy,createdAt:serverTimestamp()});
  try{await setDoc(doc(db,'siteStats','global'),{totalUsers:increment(1)},{merge:true});}catch(e){}
}
const NAV=[['dashboard','🏠','Home'],['tracker','✅','Track'],['sheet','📋','My Sheet'],['my-arc','🎯','My Arc'],['analysis','📊','Analysis'],['leaderboard','🏆','Leaderboard'],['community','💬','Community'],['profile','👤','Profile'],['settings','⚙️','Settings']];
const BOTTOM=['dashboard','tracker','analysis','leaderboard','profile'];
function shell(page,ctx){
  document.body.innerHTML=`<div class="app"><aside class="side"><a class="brand" href="dashboard.html">❄️ Winter Arc</a>
  <nav>${NAV.map(([k,i,n])=>`<a href="${k}.html" class="${k===page?'on':''}"><span>${i}</span>${n}</a>`).join('')}${ctx.isAdmin?`<a href="admin.html" class="${page==='admin'?'on':''}"><span>👑</span>Admin</a>`:''}</nav>
  <div class="side-foot">${avatar(ctx.profile.name)}<div><b>${esc(ctx.profile.name)}</b><br><a href="#" id="logout">Log out</a></div></div></aside>
  <main class="main" id="main"></main>
  <nav class="bottom">${NAV.filter(n=>BOTTOM.includes(n[0])).map(([k,i,n])=>`<a href="${k}.html" class="${k===page?'on':''}"><span>${i}</span>${n==='Leaderboard'?'Ranks':n}</a>`).join('')}</nav></div><div id="toasts"></div>`;
  $('#logout').onclick=async e=>{e.preventDefault();await signOut(auth);location.href='index.html';};
  return $('#main');
}
export function boot(page,cb,opts={}){
  let ran=false;
  onAuthStateChanged(auth,async user=>{
    if(ran)return;
    if(!user){location.replace('auth.html');return;}
    ran=true;
    try{
      await ensureProfile(user);
      const profile=(await getDoc(doc(db,'users',user.uid))).data();
      profile.privacy={...defaultPrivacy,...(profile.privacy||{})};
      if(profile.status==='disabled'){await signOut(auth);location.replace('auth.html?disabled=1');return;}
      let isAdmin=false;try{isAdmin=(await getDoc(doc(db,'admins',user.uid))).exists();}catch(e){}
      const a=await getDoc(doc(db,'arcs',user.uid));
      if(!a.exists()&&!opts.noArc){location.replace('onboarding.html');return;}
      if(a.exists()&&opts.redirectIfArc){location.replace('dashboard.html');return;}
      const arc=a.exists()?a.data():null;let rules=[];
      if(arc){const rs=await getDocs(collection(db,'arcs',user.uid,'rules'));rules=rs.docs.map(d=>({id:d.id,...d.data()})).sort((x,y)=>x.order-y.order);}
      const ctx={user,profile,arc,rules,isAdmin};
      ctx.main=opts.bare?document.body:shell(page,ctx);
      await cb(ctx);
    }catch(e){console.error(e);document.body.innerHTML=`<div class="boot"><div><p style="font-size:1.1rem">Something went wrong.</p><small>${esc(e.message)}</small><p style="margin-top:14px;font-size:1rem"><a href="auth.html">Back to login</a></p></div></div>`;}
  });
}

/* ---------- rule editor modal ---------- */
export const ruleText=r=>[r.target&&r.target!==0?r.target:'',r.unit||''].join(' ').trim();
export function ruleModal(r={},onSave){
  const m=openModal(`<h3>${r.name?'Edit rule':'New rule'}</h3>
   <div class="row"><label style="max-width:90px">Icon<input id="ri" maxlength="4" value="${esc(r.icon||'🎯')}"></label><label>Rule name<input id="rn" maxlength="40" placeholder="Workout" value="${esc(r.name||'')}"></label></div>
   <label>Description (optional)<input id="rd" maxlength="100" placeholder="45 minutes strength training" value="${esc(r.description||'')}"></label>
   <div class="row"><label>Target<input id="rt" type="number" min="0" step="any" value="${r.target??1}"></label><label>Unit<input id="ru" maxlength="12" placeholder="min" value="${esc(r.unit||'')}"></label></div>
   <p class="err" id="re"></p><div class="row end"><button class="btn ghost" id="rc">Cancel</button><button class="btn" id="rs">Save rule</button></div>`);
  $('#rc',m).onclick=()=>m.close();
  $('#rs',m).onclick=()=>{
    const name=$('#rn',m).value.trim();if(!name){$('#re',m).textContent='Give your rule a name.';return;}
    onSave({name,icon:$('#ri',m).value.trim()||'🎯',description:$('#rd',m).value.trim(),target:parseFloat($('#rt',m).value)||0,unit:$('#ru',m).value.trim()});m.close();
  };
}
export const PRESETS=[{icon:'🏋️',name:'Workout',target:45,unit:'min'},{icon:'💻',name:'Study / Coding',target:2,unit:'hours'},{icon:'📚',name:'Read',target:10,unit:'pages'},{icon:'💧',name:'Drink water',target:3,unit:'litres'},{icon:'😴',name:'Sleep before 11 PM',target:1,unit:''},{icon:'🥗',name:'No junk food',target:1,unit:''},{icon:'📱',name:'Social media under 1 hour',target:1,unit:'hour'},{icon:'🧘',name:'Meditate',target:10,unit:'min'}];
