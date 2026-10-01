import {auth,db,doc,getDoc,onAuthStateChanged,$} from './common.js';
// snow
const cv=$('#snow'),cx=cv.getContext('2d');let W,H,fl=[];
function size(){W=cv.width=innerWidth;H=cv.height=innerHeight;fl=Array.from({length:Math.min(70,W/18|0)},()=>({x:Math.random()*W,y:Math.random()*H,r:Math.random()*2+.6,v:Math.random()*.6+.25,d:Math.random()*Math.PI}));}
size();addEventListener('resize',size);
(function tick(){cx.clearRect(0,0,W,H);cx.fillStyle='rgba(200,230,255,.65)';fl.forEach(f=>{f.y+=f.v;f.d+=.01;f.x+=Math.sin(f.d)*.35;if(f.y>H){f.y=-5;f.x=Math.random()*W}cx.beginPath();cx.arc(f.x,f.y,f.r,0,7);cx.fill()});requestAnimationFrame(tick)})();
// gauge demo
setTimeout(()=>{$('#pg').style.strokeDashoffset=251.3*(1-37/92)},300);
// counters
function count(el,to){const t0=performance.now();(function s(t){const p=Math.min(1,(t-t0)/1200);el.textContent=Math.round(to*p).toLocaleString();if(p<1)requestAnimationFrame(s)})(t0)}
getDoc(doc(db,'siteStats','global')).then(s=>{const d=s.exists()?s.data():{};count($('#c1'),d.totalUsers||0);count($('#c2'),d.totalHabitsDone||0)}).catch(()=>{$('#c1').textContent='0';$('#c2').textContent='0'});
onAuthStateChanged(auth,u=>{if(u){$('#lg').textContent='Open app';$('#lg').href='dashboard.html';$('#cta').textContent='Go to my arc';$('#cta').href='dashboard.html'}});
