import {boot,db,doc,collection,writeBatch,serverTimestamp,$,$$,esc,ruleModal,ruleText,PRESETS,newArcDates,toast,syncPublic,postFeed,longDate,emptyStats} from './common.js';
boot('onboarding',ctx=>{
  const m=ctx.main;let step=1,promise='',rules=[],priv={...ctx.profile.privacy};
  const dates=newArcDates();
  const steps=['Promise','Rules','Privacy'];
  function draw(){
    m.innerHTML=`<div class="page-head"><h1 style="font-size:2rem">Create your arc</h1><p>Step ${step} of 3: ${steps[step-1]}</p><div class="bar" style="margin-top:10px"><i style="width:${step/3*100}%"></i></div></div><div class="card stack" id="body"></div>`;
    const b=$('#body',m);
    if(step===1){
      b.innerHTML=`<h3>Your promise</h3><p class="muted">One sentence you will hold yourself to. You can change it later.</p>
      <textarea id="pr" maxlength="200" placeholder="For the next 90 days, I promise to become more disciplined, healthier and more focused.">${esc(promise)}</textarea>
      <div class="row">${['I will keep my word to myself every day.','I will build a body and mind I am proud of.','I will show up even when I do not feel like it.'].map(s=>`<span class="chip" data-s="${esc(s)}">${esc(s)}</span>`).join('')}</div>
      <p class="err" id="e"></p><div class="row end"><button class="btn" id="nx">Next: rules</button></div>`;
      $$('.chip',b).forEach(c=>c.onclick=()=>$('#pr',b).value=c.dataset.s);
      $('#nx',b).onclick=()=>{promise=$('#pr',b).value.trim();if(promise.length<10)return $('#e',b).textContent='Write at least a short sentence (10+ characters).';step=2;draw()};
    }else if(step===2){
      b.innerHTML=`<h3>Your rules</h3><p class="muted">Add the habits you will check off every day. 3 to 6 works best. Tap a suggestion or create your own.</p>
      <div class="row">${PRESETS.map((p,i)=>`<span class="chip" data-p="${i}">${p.icon} ${esc(p.name)}</span>`).join('')}</div>
      <div id="list">${rules.length?rules.map((r,i)=>`<div class="rule-row"><div class="ic">${esc(r.icon)}</div><div class="tx"><b>${esc(r.name)}</b><small>${esc(ruleText(r))}</small></div><button class="btn ghost sm" data-e="${i}">Edit</button><button class="btn danger sm" data-d="${i}">Remove</button></div>`).join(''):'<div class="empty">No rules yet. Add your first one.</div>'}</div>
      <button class="btn ghost" id="add">+ Add custom rule</button><p class="err" id="e"></p>
      <div class="row between"><button class="btn ghost" id="bk">Back</button><button class="btn" id="nx">Next: privacy</button></div>`;
      $$('[data-p]',b).forEach(c=>c.onclick=()=>{const p=PRESETS[c.dataset.p];if(!rules.some(r=>r.name===p.name))rules.push({...p,description:''});draw()});
      $$('[data-d]',b).forEach(c=>c.onclick=()=>{rules.splice(+c.dataset.d,1);draw()});
      $$('[data-e]',b).forEach(c=>c.onclick=()=>ruleModal(rules[+c.dataset.e],d=>{rules[+c.dataset.e]=d;draw()}));
      $('#add',b).onclick=()=>ruleModal({},d=>{rules.push(d);draw()});
      $('#bk',b).onclick=()=>{step=1;draw()};
      $('#nx',b).onclick=()=>{if(rules.length<1)return $('#e',b).textContent='Add at least one rule.';step=3;draw()};
    }else{
      const sw=(k,t)=>`<div class="switch"><span>${t}</span><input type="checkbox" data-k="${k}" ${priv[k]?'checked':''}></div>`;
      b.innerHTML=`<h3>Start date and privacy</h3><p>Your arc runs <b>${longDate(dates.startDate)}</b> to <b>${longDate(dates.endDate)}</b>. The start date is fixed so stats stay fair.</p>
      ${sw('showOnLeaderboard','Show me on the leaderboard')}${sw('publicProfile','Make my profile public')}${sw('showPercent','Show my completion %')}${sw('showStreak','Show my streak')}
      <p class="muted" style="font-size:.85rem">Your email and your proof photos are never shown to other users.</p><p class="err" id="e"></p>
      <div class="row between"><button class="btn ghost" id="bk">Back</button><button class="btn" id="fin">Start my arc ❄️</button></div>`;
      $$('[data-k]',b).forEach(c=>c.onchange=()=>priv[c.dataset.k]=c.checked);
      $('#bk',b).onclick=()=>{step=2;draw()};
      $('#fin',b).onclick=async()=>{
        $('#fin',b).disabled=true;
        try{
          const uid=ctx.user.uid,bt=writeBatch(db);
          const arc={promise,startDate:dates.startDate,endDate:dates.endDate,status:'active',freezeUsedAt:null,createdAt:serverTimestamp(),stats:emptyStats};
          bt.set(doc(db,'arcs',uid),arc);
          rules.forEach((r,i)=>bt.set(doc(collection(db,'arcs',uid,'rules')),{...r,order:i,active:true,createdAt:serverTimestamp()}));
          bt.update(doc(db,'users',uid),{privacy:priv});await bt.commit();
          ctx.arc={...arc,createdAt:null};ctx.profile.privacy=priv;await syncPublic(ctx);
          await postFeed(ctx,'join',`${ctx.profile.name} started their Winter Arc`);
          location.href='dashboard.html';
        }catch(e){console.error(e);toast(e.message,'err');$('#fin',b).disabled=false}
      };
    }
  }
  draw();
},{noArc:true,redirectIfArc:true});
