// ══ STEPS ══
function renderStepNav(){
  document.getElementById('step-nav').innerHTML=STEP_KEYS.map((k,i)=>'<div class="step'+(i===currentStep?' active':i<currentStep?' done':'')+'" onclick="tryStep('+i+')">'+(i+1)+'. '+t(k)+'</div>').join('');
  document.getElementById('pfill').style.width=((currentStep+1)/N_STEPS*100)+'%';
}
function tryStep(n){if(n>currentStep&&!validateStep(currentStep))return;currentStep=n;renderStep(n);}
function renderStep(n){
  currentStep=n;renderStepNav();document.getElementById('porra-msg').innerHTML='';
  const el=document.getElementById('step-content');
  if(n===0)el.innerHTML=step0();
  else if(n===1){el.innerHTML=stepGroups();setTimeout(compStandings,0);}
  else if(n===2){el.innerHTML=stepR32();setTimeout(()=>restKO('r32',16),0);}
  else if(n===3){el.innerHTML=stepKOB('oct');setTimeout(()=>restKO('oct',8),0);}
  else if(n===4){el.innerHTML=stepKOB('qf');setTimeout(()=>restKO('qf',4),0);}
  else if(n===5){el.innerHTML=stepSFX();setTimeout(()=>{restKO('sf',2);restKO('final',1);restExtras();},0);}
}
function step0(){
  return'<div class="field"><label>'+t('your_name')+'</label><input type="text" id="p-name" value="'+ls('p-name')+'" placeholder="..." maxlength="30"></div><div class="field"><label>'+t('email_lbl')+'</label><input type="email" id="p-email" value="'+ls('p-email')+'" placeholder="..."></div>'+navRow(0);
}
function stepGroups(){
  const allT=TNAMES[LANG]||TNAMES.es;
  let h='<div class="alert ainfo">⚽ '+t('groups_hint')+'<br><small style="opacity:.75">'+t('groups_no_pts')+'</small></div>';
  h+='<div style="display:flex;justify-content:flex-end;margin-bottom:.6rem"><button class="btn btn-random" onclick="randGroups()">'+t('random_step')+'</button></div>';
  h+='<div class="groups-grid">';
  Object.entries(GROUPS).forEach(([g,gd])=>{
    h+='<div class="gcard"><div class="gcard-header"><span class="glbl">GRUPO '+g+'</span></div>';
    // TOP: live standings; BOTTOM: matches
    h+='<div id="gstand-'+g+'" style="padding:.4rem .85rem .2rem;font-size:.75rem;border-bottom:1px solid var(--border)"></div>';
    h+='<div>';
    h+='<div class="gmatches">';
    gd.m.forEach(([pi,ai],idx)=>{
      const ti=gd.t[pi],aj=gd.t[ai],k='g'+g+'_'+idx,inf=mi(ti,aj);
      h+='<div>';
      if(inf)h+='<div class="minfo"><span class="city">📍 '+inf.c+'</span><span>🕐 '+inf.e+'h</span></div>';
      h+='<div class="mrow"><span style="display:flex;align-items:center;gap:.18rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+fi(ti,true)+' '+allT[ti]+'</span>';
      h+='<input class="sinp" type="number" min="0" max="9" id="'+k+'_h" value="'+ls('m_'+k+'_h')+'" placeholder="-" oninput="onGI(\''+g+'\')">';
      h+='<span class="vsep">:</span>';
      h+='<input class="sinp" type="number" min="0" max="9" id="'+k+'_a" value="'+ls('m_'+k+'_a')+'" placeholder="-" oninput="onGI(\''+g+'\')">';
      h+='<span class="tr" style="display:flex;align-items:center;justify-content:flex-end;gap:.18rem;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+allT[aj]+' '+fi(aj,true)+'</span></div></div>';
    });
    h+='</div>';
    h+='</div>';
    h+='</div>';
  });
  h+='</div>'+navRow(1);
  return h;
}
function onGI(grp){
  saveGrpLocal();
  if(grp)updateGroupStanding(grp);
  else Object.keys(GROUPS).forEach(g=>updateGroupStanding(g));
}
function updateGroupStanding(g){
  const gd=GROUPS[g],allT=TNAMES[LANG]||TNAMES.es;
  const gp={};
  gp[g]=gd.m.map((_,idx)=>{
    const k='g'+g+'_'+idx,h=document.getElementById(k+'_h')?.value,a=document.getElementById(k+'_a')?.value;
    return{gh:h!==''&&h!=null?parseInt(h):null,ga:a!==''&&a!=null?parseInt(a):null};
  });
  const st=calcStandings(gp);
  const rows=st[g]||[];
  const el=document.getElementById('gstand-'+g);
  if(!el)return;
  let h='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.72rem;color:var(--green);letter-spacing:.5px;margin-bottom:.25rem">CLASIFICACIÓN</div>';
  rows.forEach((r,i)=>{
    const cls=i<2?'adv':i===2?'th':'out';
    const icon=i===0?'①':i===1?'②':i===2?'③':'④';
    h+='<div class="sr '+cls+'" style="padding:.1rem 0">';
    h+='<div class="sr-team">'+icon+' '+fi(r.ti,true)+' <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+allT[r.ti]+'</span></div>';
    h+='<span style="flex-shrink:0;font-weight:700">'+r.pts+'p</span></div>';
  });
  el.innerHTML=h;
}
function compStandings(){
  // Called on initial render to populate all group standings
  Object.keys(GROUPS).forEach(g=>updateGroupStanding(g));
}
function readGrp(){
  const gp={};
  Object.entries(GROUPS).forEach(([g,gd])=>{
    gp[g]=gd.m.map((_,idx)=>{const k='g'+g+'_'+idx,h=document.getElementById(k+'_h')?.value,a=document.getElementById(k+'_a')?.value;return{gh:h!==''&&h!=null?parseInt(h):null,ga:a!==''&&a!=null?parseInt(a):null};});
  });
  return gp;
}
function stepR32(){
  const b=compBracket(),left=b.r32.slice(0,8),right=b.r32.slice(8,16);
  return'<div class="alert ainfo">💡 '+t('ko_hint')+'</div><div style="display:flex;justify-content:flex-end;margin-bottom:.6rem"><button class="btn btn-random" onclick="randKO(\'r32\',16)">'+t('random_step')+'</button></div><div class="bracket-wrap"><div class="bracket-half"><div class="bh-title">'+t('left_half')+'</div>'+renderKOList(left,'r32',1)+'</div><div class="bracket-half"><div class="bh-title">'+t('right_half')+'</div>'+renderKOList(right,'r32',9)+'</div></div>'+navRow(2);
}
function stepKOB(prefix){
  const b=compBracket(),matches=b[prefix]||[],half=Math.ceil(matches.length/2);
  return'<div class="alert ainfo">💡 '+t('ko_hint')+'</div><div style="display:flex;justify-content:flex-end;margin-bottom:.6rem"><button class="btn btn-random" onclick="randKO(\''+prefix+'\','+matches.length+')">'+t('random_step')+'</button></div><div class="bracket-wrap"><div class="bracket-half"><div class="bh-title">'+t('left_half')+'</div>'+renderKOList(matches.slice(0,half),prefix,1)+'</div><div class="bracket-half"><div class="bh-title">'+t('right_half')+'</div>'+renderKOList(matches.slice(half),prefix,half+1)+'</div></div>'+navRow(currentStep);
}
function renderKOList(matches,prefix,startNum){
  let h='<div class="ko-grid">';
  matches.forEach((m,idx)=>{
    const num=startNum+idx,key=prefix+'_'+num;
    let opts='<option value="">— '+t('sel_win')+' —</option>';
    if(m.h!=null)opts+='<option value="'+m.h+'">'+tn(m.h)+'</option>';
    if(m.a!=null)opts+='<option value="'+m.a+'">'+tn(m.a)+'</option>';
    h+='<div class="kom"><div class="kolbl">'+prefix.toUpperCase()+'-'+num+'</div><div class="ko-teams"><div class="ko-team'+(m.h==null?' tbd':'')+'">'+( m.h!=null?fi(m.h,true)+' '+tn(m.h):t('tbd'))+'</div><div class="ko-vs">vs</div><div class="ko-team'+(m.a==null?' tbd':'')+'">'+( m.a!=null?fi(m.a,true)+' '+tn(m.a):t('tbd'))+'</div></div><div class="ko-win">'+t('advances')+'<select id="ko_'+key+'_w" onchange="onKOC(\''+key+'\',this)">'+opts+'</select></div></div>';
  });
  return h+'</div>';
}
function onKOC(key,sel){sel.classList.toggle('sel',sel.value!=='');ss('ko_'+key+'_w',sel.value);if(key.startsWith('sf_'))propFinal();if(key==='final_1')updateCampFromFinal();autoEspStep();}
function autoEspStep(){
  // Reconstruir ko desde localStorage
  const ko={};
  ['r32','oct','qf','sf'].forEach(p=>{const n=p==='r32'?16:p==='oct'?8:p==='qf'?4:2;for(let i=1;i<=n;i++){const v=ls('ko_'+p+'_'+i+'_w');if(v!=='')ko[p+'_'+i]=parseInt(v);}});
  const fw=ls('ko_final_1_w');if(fw!=='')ko['final_1']=parseInt(fw);
  // Reconstruir r32_slots desde grupos
  let r32Slots={};
  try{
    const grData={};
    'ABCDEFGHIJKL'.split('').forEach(g=>{
      const gd=GROUPS[g];
      grData[g]=gd.m.map(([hi,ai],idx)=>({h:gd.t[hi],a:gd.t[ai],gh:parseInt(ls('g_'+g+'_'+idx+'_h'))||null,ga:parseInt(ls('g_'+g+'_'+idx+'_a'))||null}));
    });
    const st=calcStandings(grData);const bt=getBT(st);const r32b=bR32(st,bt);
    r32b.forEach(s=>r32Slots[s.id]={h:s.h,a:s.a});
  }catch(e){}
  const esp=calcEspFromKo(ko,r32Slots);
  const ee=document.getElementById('ext-esp');
  if(ee&&esp){ee.value=esp;ss('ext-esp',esp);}
  const disp=document.getElementById('ext-esp-display');
  if(disp){disp.innerHTML=esp?fi(28,true)+' '+t(esp):'<em>'+t('tbd')+'</em>';}
}
function getCampDisplay(){
  const fw=ls('ko_final_1_w');
  if(!fw||fw==='')return '<em>'+t('tbd')+'</em>';
  const ti=parseInt(fw);
  return fi(ti,true)+' '+tn(ti);
}
function propFinal(){
  const s1=ls('ko_sf_1_w'),s2=ls('ko_sf_2_w'),fsel=document.getElementById('ko_final_1_w');
  if(!fsel)return;
  const h1=s1!==''?parseInt(s1):null,h2=s2!==''?parseInt(s2):null,prev=fsel.value;
  let opts='<option value="">— '+t('sel_win')+' —</option>';
  if(h1!=null)opts+='<option value="'+h1+'">'+tn(h1)+'</option>';
  if(h2!=null)opts+='<option value="'+h2+'">'+tn(h2)+'</option>';
  fsel.innerHTML=opts;
  const fh=document.getElementById('final_th'),fa=document.getElementById('final_ta');
  if(fh)fh.innerHTML=h1!=null?fi(h1,true)+' '+tn(h1):'<em>'+t('tbd')+'</em>';
  if(fa)fa.innerHTML=h2!=null?fi(h2,true)+' '+tn(h2):'<em>'+t('tbd')+'</em>';
  if(prev!==''&&[h1,h2].includes(parseInt(prev)))fsel.value=prev;
  // Auto-update champion from final winner
  updateCampFromFinal();
}
function updateCampFromFinal(){
  const fsel=document.getElementById('ko_final_1_w');
  const campDisp=document.getElementById('ext-camp-display');
  const campHidden=document.getElementById('ext-camp');
  const fw=fsel?.value||ls('ko_final_1_w');
  if(campDisp){
    if(fw&&fw!==''){
      const ti=parseInt(fw);
      campDisp.innerHTML=fi(ti,true)+' '+tn(ti);
      campDisp.style.color='var(--text)';
      if(campHidden){campHidden.value=fw;ss('ext-camp',fw);}
    }else{
      campDisp.innerHTML='<em>'+t('tbd')+'</em>';
      campDisp.style.color='var(--muted)';
      if(campHidden){campHidden.value='';ss('ext-camp','');}
    }
  }
}
function stepSFX(){
  const b=compBracket(),sf=b.sf,fm=b.fin[0];
  let h='<div style="display:flex;justify-content:flex-end;margin-bottom:.6rem"><button class="btn btn-random" onclick="randSF()">'+t('random_step')+'</button></div>';
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--green);letter-spacing:1px;margin-bottom:.5rem">SEMIFINALES</div><div class="bracket-wrap">';
  sf.forEach((m,i)=>{
    let opts='<option value="">— '+t('sel_win')+' —</option>';
    if(m.h!=null)opts+='<option value="'+m.h+'">'+tn(m.h)+'</option>';
    if(m.a!=null)opts+='<option value="'+m.a+'">'+tn(m.a)+'</option>';
    h+='<div class="bracket-half"><div class="ko-grid"><div class="kom"><div class="kolbl">SF-'+(i+1)+'</div><div class="ko-teams"><div class="ko-team'+(m.h==null?' tbd':'')+'">'+( m.h!=null?fi(m.h,true)+' '+tn(m.h):t('tbd'))+'</div><div class="ko-vs">vs</div><div class="ko-team'+(m.a==null?' tbd':'')+'">'+( m.a!=null?fi(m.a,true)+' '+tn(m.a):t('tbd'))+'</div></div><div class="ko-win">'+t('advances')+' <select id="ko_sf_'+(i+1)+'_w" onchange="onKOC(\'sf_'+(i+1)+'\',this)">'+opts+'</select></div></div></div></div>';
  });
  h+='</div>';
  let fOpts='<option value="">— '+t('sel_win')+' —</option>';
  if(fm.h!=null)fOpts+='<option value="'+fm.h+'">'+tn(fm.h)+'</option>';
  if(fm.a!=null)fOpts+='<option value="'+fm.a+'">'+tn(fm.a)+'</option>';
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.85rem 0 .45rem">🏆 FINAL</div><div class="final-ko-grid"><div class="kom"><div class="ko-teams"><div class="ko-team'+(fm.h==null?' tbd':'')+'" id="final_th">'+( fm.h!=null?fi(fm.h,true)+' '+tn(fm.h):'<em>'+t('tbd')+'</em>')+'</div><div class="ko-vs">vs</div><div class="ko-team'+(fm.a==null?' tbd':'')+'" id="final_ta">'+( fm.a!=null?fi(fm.a,true)+' '+tn(fm.a):'<em>'+t('tbd')+'</em>')+'</div></div><div class="ko-win">'+t('advances')+' <select id="ko_final_1_w" onchange="onKOC(\'final_1\',this)">'+fOpts+'</select></div></div></div>';
  const allT=TNAMES[LANG]||TNAMES.es;
  const tOpts='<option value="">--</option>'+allT.map((nm,i)=>'<option value="'+i+'">'+tn(i)+'</option>').join('');
  const posOpts=[['champion',t('champion')],['runner_up',t('runner_up')],['semis',t('semis')],['quarters',t('quarters')],['r16',t('r16')],['r32s',t('r32s')],['groups_out',t('groups_out')]].map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.85rem 0 .45rem">🎯 '+t('extras_lbl')+'</div>';
  h+='<div class="extgrid">';
  h+='<div class="extf"><label>🥇 '+t('winner')+'<span style="font-size:.7rem;color:var(--muted);font-weight:400;margin-left:.3rem">(auto)</span></label><div id="ext-camp-display" style="background:var(--surf3);border:1px solid var(--border);border-radius:7px;padding:.5rem .72rem;font-size:.88rem;color:var(--muted);min-height:2.2rem;display:flex;align-items:center;gap:.4rem"><em>'+t('tbd')+'</em></div><input type="hidden" id="ext-camp"></div>';
  h+='<div class="extf"><label>'+fi(28,true)+' '+t('spain_pos')+'<span style="font-size:.7rem;color:var(--muted);font-weight:400;margin-left:.3rem">(auto)</span></label><div id="ext-esp-display" style="background:var(--surf3);border:1px solid var(--border);border-radius:7px;padding:.5rem .72rem;font-size:.88rem;color:var(--muted);min-height:2.2rem;display:flex;align-items:center"><em>'+t('tbd')+'</em></div><input type="hidden" id="ext-esp"></div>';
  h+='<div class="extf"><label>⚽ '+t('top_scorer')+'</label><div class="ac-wrap"><input type="text" id="ext-gol" value="'+ls('ext-gol')+'" placeholder="'+t('player_hint')+'" oninput="acF(\'ext-gol\')" autocomplete="off"><div class="ac-list" id="ac-ext-gol"></div></div></div>';
  h+='<div class="extf"><label>🌟 '+t('best_player')+'</label><div class="ac-wrap"><input type="text" id="ext-jug" value="'+ls('ext-jug')+'" placeholder="'+t('player_hint')+'" oninput="acF(\'ext-jug\')" autocomplete="off"><div class="ac-list" id="ac-ext-jug"></div></div></div>';
  h+='</div>';
  h+='<div style="margin-top:.95rem;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap"><button class="btn btn-ghost" onclick="tryStep(4)">← '+t('back').replace('← ','')+'</button><button class="btn btn-success" id="btn-sub" onclick="submitPorra()">'+(isEditing?t('update'):t('submit'))+'</button><span id="sub-spin" style="display:none"><div class="spin"></div></span></div>';
  return h;
}
function restKO(prefix,count){
  for(let i=1;i<=count;i++){const key=prefix==='final'?'final_1':prefix+'_'+i,v=ls('ko_'+key+'_w'),el=document.getElementById('ko_'+key+'_w');if(el&&v!==''){el.value=v;el.classList.add('sel');}}
  if(prefix==='sf')propFinal();
}
function restExtras(){
  const ev=ls('ext-esp'),ee=document.getElementById('ext-esp');
  if(ee&&ev!==''){ee.value=ev;const disp=document.getElementById('ext-esp-display');if(disp)disp.innerHTML=fi(28,true)+' '+t(ev);}
  setTimeout(updateCampFromFinal,50);
  setTimeout(autoEspStep,100);
}
function navRow(step){
  const isFirst=step===0,isLast=step===N_STEPS-1;
  return'<div style="margin-top:.9rem;display:flex;gap:.45rem;flex-wrap:wrap">'+(isFirst?'':'<button class="btn btn-ghost" onclick="tryStep('+(step-1)+')">'+t('back')+'</button>')+(isLast?'':'<button class="btn btn-primary" onclick="tryStep('+(step+1)+')">'+t('next')+'</button>')+'</div>';
}

// ══ RANDOM ══
function rnd(n){return Math.floor(Math.random()*n);}
// Clear all KO data from a given round onwards (inclusive)
// order: r32 → oct → qf → sf → final
const KO_ORDER=['r32','oct','qf','sf','final'];
const KO_COUNT={r32:16,oct:8,qf:4,sf:2,final:1};
function clearKOFrom(fromPrefix){
  const idx=KO_ORDER.indexOf(fromPrefix);
  if(idx<0)return;
  KO_ORDER.slice(idx).forEach(prefix=>{
    const n=KO_COUNT[prefix];
    for(let i=1;i<=n;i++){
      const key=prefix==='final'?'final_1':prefix+'_'+i;
      localStorage.removeItem('p_ko_'+key+'_w');
    }
  });
}

function randGroups(){
  Object.entries(GROUPS).forEach(([g,gd])=>{
    gd.m.forEach((_,idx)=>{
      const k='g'+g+'_'+idx,hEl=document.getElementById(k+'_h'),aEl=document.getElementById(k+'_a');
      if(hEl)hEl.value=rnd(6);if(aEl)aEl.value=rnd(6);
    });
  });
  saveGrpLocal();
  // Clear ALL KO data since groups changed → bracket is completely different
  clearKOFrom('r32');
  compStandings();
}

function randKO(prefix,count){
  // First clear all downstream KO rounds
  const idx=KO_ORDER.indexOf(prefix);
  if(idx>=0)clearKOFrom(KO_ORDER[idx+1]||'__none__');
  // Now compute fresh bracket and pick random winners
  const b=compBracket(),matches=prefix==='r32'?b.r32:b[prefix]||[];
  for(let i=0;i<count;i++){
    const m=matches[i];if(!m)continue;
    const key=prefix+'_'+(i+1),opts=[m.h,m.a].filter(v=>v!=null);
    if(!opts.length)continue;
    const w=opts[rnd(opts.length)];ss('ko_'+key+'_w',String(w));
    const el=document.getElementById('ko_'+key+'_w');if(el){el.value=w;el.classList.add('sel');}
  }
  if(prefix==='sf')propFinal();
}

function randSF(){
  // Clear final before randomizing SF
  clearKOFrom('final');
  randKO('sf',2);
  setTimeout(()=>{
    propFinal();
    setTimeout(()=>{
      const fsel=document.getElementById('ko_final_1_w');
      if(fsel){const opts=[...fsel.options].map(o=>o.value).filter(v=>v!=='');if(opts.length){const w=opts[rnd(opts.length)];fsel.value=w;ss('ko_final_1_w',w);fsel.classList.add('sel');}}
      const posVals=['champion','runner_up','semis','quarters','r16','r32s','groups_out'];
      updateCampFromFinal(); // camp se auto-rellena desde el ganador de la final
      const ee=document.getElementById('ext-esp');if(ee){const v=posVals[rnd(posVals.length)];ee.value=v;ss('ext-esp',v);}
      const gEl=document.getElementById('ext-gol');if(gEl){const v=PLAYERS[rnd(PLAYERS.length)];gEl.value=v;ss('ext-gol',v);}
      const jEl=document.getElementById('ext-jug');if(jEl){const v=PLAYERS[rnd(PLAYERS.length)];jEl.value=v;ss('ext-jug',v);}
    },60);
  },50);
}

// ══ AUTOCOMPLETE ══
function acF(fid){
  const raw=document.getElementById(fid)?.value||'';
  const val=normStr(raw);
  const list=document.getElementById('ac-'+fid);
  if(!list||!val||val.length<2){if(list)list.style.display='none';return;}
  const pool=window._PLAYERS.length?window._PLAYERS:PLAYERS;
  const m=pool.filter(p=>normStr(p).includes(val)).slice(0,10);
  if(!m.length){list.style.display='none';return;}
  list.innerHTML=m.map(p=>'<div class="ac-item" onmousedown="acSel(\''+fid+'\',\''+p.replace(/'/g,"\\'")+'\')"">'+p+'</div>').join('');
  list.style.display='block';
}
function acSel(fid,val){const el=document.getElementById(fid);if(el)el.value=val;ss(fid,val);const l=document.getElementById('ac-'+fid);if(l)l.style.display='none';}
document.addEventListener('click',e=>{document.querySelectorAll('.ac-list').forEach(l=>{if(!l.contains(e.target))l.style.display='none';});});

// ══ VALIDATION ══
function validateStep(n){
  if(n===0){const nm=document.getElementById('p-name')?.value.trim();if(!nm){showMsg('porra-msg',t('name_req'),'err');return false;}ss('p-name',nm);ss('p-email',document.getElementById('p-email')?.value.trim()||'');return true;}
  if(n===1){
    saveGrpLocal();let ok=true;
    Object.entries(GROUPS).forEach(([g,gd])=>{gd.m.forEach((_,idx)=>{const k='g'+g+'_'+idx,h=document.getElementById(k+'_h'),a=document.getElementById(k+'_a'),bad=!h?.value||!a?.value;h?.classList.toggle('invalid',bad);a?.classList.toggle('invalid',bad);if(bad)ok=false;});});
    if(!ok){showMsg('porra-msg',t('val_groups'),'err');return false;}
    // Only clear KO if not editing (editing preserves existing KO selections)
    if(!isEditing)clearKOFrom('r32');
    return true;
  }
  if(n===2){const ok=valKO('r32',16,'val_r32');if(ok&&!isEditing)clearKOFrom('oct');return ok;}
  if(n===3){const ok=valKO('oct',8,'val_oct');if(ok&&!isEditing)clearKOFrom('qf');return ok;}
  if(n===4){const ok=valKO('qf',4,'val_qf');if(ok&&!isEditing)clearKOFrom('sf');return ok;}
  return true;
}
function valKO(prefix,count,msgKey){
  let ok=true;
  const b=compBracket();
  const matches=prefix==='r32'?b.r32:b[prefix]||[];
  for(let i=1;i<=count;i++){
    const key=prefix+'_'+i,el=document.getElementById('ko_'+key+'_w');
    const v=el?.value||ls('ko_'+key+'_w');
    const m=matches[i-1];
    // Invalid if empty OR if the saved winner is not one of the two current teams
    const validTeams=m?[m.h,m.a].filter(x=>x!=null).map(String):[];
    const bad=!v||v===''||(validTeams.length>0&&!validTeams.includes(String(v)));
    if(bad){
      // Clear stale value
      if(el)el.value='';
      localStorage.removeItem('p_ko_'+key+'_w');
      if(el)el.classList.add('invalid');
      ok=false;
    }else if(el)el.classList.remove('invalid');
  }
  if(!ok){showMsg('porra-msg',t(msgKey),'err');return false;}return true;
}
function valExtras(){
  const camp=document.getElementById('ext-camp')?.value||ls('ext-camp'),esp=document.getElementById('ext-esp')?.value||ls('ext-esp'),gol=document.getElementById('ext-gol')?.value.trim()||ls('ext-gol'),jug=document.getElementById('ext-jug')?.value.trim()||ls('ext-jug');
  let ok=true;
  const mk=(id,bad)=>{document.getElementById(id)?.classList.toggle('invalid',bad);};
  // camp is auto-filled from final winner - valid if final winner is set
  const finalW=ls('ko_final_1_w');
  if(!finalW||finalW===''){mk('ext-camp',true);ok=false;}else mk('ext-camp',false);
  if(!esp){mk('ext-esp-display',true);ok=false;}else mk('ext-esp-display',false);
  if(!gol){mk('ext-gol',true);ok=false;}else mk('ext-gol',false);
  if(!jug){mk('ext-jug',true);ok=false;}else mk('ext-jug',false);
  if(!ok)showMsg('porra-msg',t('val_extras'),'err');return ok;
}

// ══ LOCAL STORAGE ══
function ls(k){return localStorage.getItem('p_'+k)||'';}
function ss(k,v){localStorage.setItem('p_'+k,v);}
function saveGrpLocal(){Object.entries(GROUPS).forEach(([g,gd])=>{gd.m.forEach((_,idx)=>{const k='g'+g+'_'+idx;ss('m_'+k+'_h',document.getElementById(k+'_h')?.value||'');ss('m_'+k+'_a',document.getElementById(k+'_a')?.value||'');});});}

// ══ COMPUTE BRACKET ══
function compBracket(){
  const gp={};
  Object.entries(GROUPS).forEach(([g,gd])=>{gp[g]=gd.m.map((_,idx)=>{const k='g'+g+'_'+idx,h=ls('m_'+k+'_h'),a=ls('m_'+k+'_a');return{gh:h!==''?parseInt(h):null,ga:a!==''?parseInt(a):null};});});
  const st=calcStandings(gp),{map:tm}=getBT(st);
  const r32=bR32(st,tm);
  const r32w=r32.map((_,i)=>{const v=ls('ko_r32_'+(i+1)+'_w');return v!==''?parseInt(v):null;});
  const oct=bOct(r32w),octw=oct.map((_,i)=>{const v=ls('ko_oct_'+(i+1)+'_w');return v!==''?parseInt(v):null;});
  const qf=bQF(octw),qfw=qf.map((_,i)=>{const v=ls('ko_qf_'+(i+1)+'_w');return v!==''?parseInt(v):null;});
  const sf=bSF(qfw),sfw=sf.map((_,i)=>{const v=ls('ko_sf_'+(i+1)+'_w');return v!==''?parseInt(v):null;});
  return{st,tm,r32,oct,qf,sf,fin:bFin(sfw)};
}

// ══ COLLECT & SUBMIT ══
function collectPorra(){
  const d={nombre:ls('p-name'),email:ls('p-email'),grupos:{},ko:{},extras:{}};
  Object.entries(GROUPS).forEach(([g,gd])=>{d.grupos[g]=gd.m.map(([pi,ai],idx)=>{const k='g'+g+'_'+idx,h=ls('m_'+k+'_h'),a=ls('m_'+k+'_a');return{h:gd.t[pi],a:gd.t[ai],gh:h!==''?parseInt(h):null,ga:a!==''?parseInt(a):null};});});
  const allKO=[...Array.from({length:16},(_,i)=>'r32_'+(i+1)),...Array.from({length:8},(_,i)=>'oct_'+(i+1)),...Array.from({length:4},(_,i)=>'qf_'+(i+1)),...Array.from({length:2},(_,i)=>'sf_'+(i+1)),'final_1'];
  allKO.forEach(k=>{const v=ls('ko_'+k+'_w');d.ko[k]=v!==''?parseInt(v):null;});
  const cv=document.getElementById('ext-camp')?.value||ls('ext-camp'),ev=document.getElementById('ext-esp')?.value||ls('ext-esp'),gv=document.getElementById('ext-gol')?.value.trim()||ls('ext-gol'),jv=document.getElementById('ext-jug')?.value.trim()||ls('ext-jug');
  ss('ext-gol',gv);ss('ext-jug',jv);ss('ext-camp',cv);ss('ext-esp',ev);
  d.extras={camp:cv!==''?parseInt(cv):null,esp:ev||null,gol:gv||null,jug:jv||null};return d;
}
async function submitPorra(){
  if(!sb){showMsg('porra-msg','Sin conexión Supabase','err');return;}
  if(deadlinePassed()&&!isAdmin){showMsg('porra-msg','⛔ El plazo de porras ha cerrado.','err');return;}
  if(!valKO('sf',2,'val_sf'))return;
  const fw=document.getElementById('ko_final_1_w')?.value||ls('ko_final_1_w');
  if(!fw||fw===''){document.getElementById('ko_final_1_w')?.classList.add('invalid');showMsg('porra-msg',t('val_sf'),'err');return;}
  if(!valExtras())return;
  const d=collectPorra();if(!d.nombre){showMsg('porra-msg',t('name_req'),'err');tryStep(0);return;}
  document.getElementById('btn-sub').disabled=true;document.getElementById('sub-spin').style.display='';
  if(!currentUser){showMsg('porra-msg','Debes iniciar sesión.','err');return;}
  const{error}=await sb.from('porras').upsert({user_id:currentUser.id,nombre:d.nombre,email:d.email||currentUser.email,data:JSON.stringify(d),puntos:0,updated_at:new Date().toISOString()},{onConflict:'user_id,nombre'});
  document.getElementById('btn-sub').disabled=false;document.getElementById('sub-spin').style.display='none';
  if(error)showMsg('porra-msg','Error: '+error.message,'err');
  else{
    Object.keys(localStorage).filter(k=>k.startsWith('p_')).forEach(k=>localStorage.removeItem(k));
    showMsg('porra-msg',t('saved'),'ok');
    setTimeout(()=>{ showPage('porras'); },1600);
  }
}

