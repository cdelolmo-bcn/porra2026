// ══ ADMIN ══
function showAdmModal(){} // removed - auth via Supabase
function closeAdmModal(){}
function checkAdm(){} // removed - auth via Supabase
function admSec(sec,btn){
  if(sec==='fantasy'){
    document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    const ac=document.getElementById('adm-content');
    ac.innerHTML=fBuildAdminHTML();
    fLoadAdminMatches();
    return;
  }
  document.querySelectorAll('.stab').forEach(b=>b.classList.remove('active'));btn?.classList.add('active');
  const ac=document.getElementById('adm-content');
  if(sec==='setup'){ac.innerHTML=buildSQL();return;}
  if(sec==='bracket'){ac.innerHTML='<div class="spin"></div>';buildAdmBracket(ac);return;}
  if(sec==='bets'){ac.innerHTML='<div class="spin"></div>';loadAdmBets(ac);return;}
  if(sec==='recalc')ac.innerHTML='<p class="hint" style="margin-bottom:.9rem">Recalcula los puntos de todos los participantes según los resultados guardados.</p><button class="btn btn-primary" onclick="recalcAll()">'+t('recalc_all')+'</button><div id="rc-msg" style="margin-top:.7rem"></div>';
  if(sec==='muro'){ac.innerHTML='<div class="spin"></div>';loadAdmMuro(ac);return;}
  if(sec==='editbet'){ac.innerHTML=buildAdmEditBet();return;}
  if(sec==='importxls'){ac.innerHTML=buildAdmImportXls();return;}
  if(sec==='debug'){const on=localStorage.getItem('debug_started')==='1';ac.innerHTML='<div class="card" style="max-width:420px"><div class="card-title">🧪 Simulación</div><p class="hint" style="margin-bottom:.9rem">Activa para que la app se comporte como si el Mundial hubiera comenzado (útil para probar el comparador, clasificación, etc.).</p><button class="btn '+(on?'btn-primary':'btn-ghost')+'" onclick="toggleDebug();admSec(\'debug\',document.querySelector(\'.stab.active\'))">🧪 '+(on?'✅ Activado — Desactivar':'Activar simulación')+'</button></div>';}
}
// R32 bracket slot definitions for Admin/Simulator
const ADM_R32_DEFS={
  r32_1: {hl:'1ºE',  al:'Mejor 3º',h:[16,17,18,19],a:null},
  r32_2: {hl:'1ºI',  al:'Mejor 3º',h:[32,33,34,35],a:null},
  r32_3: {hl:'2ºA',  al:'2ºB',     h:[0,1,2,3],    a:[4,5,6,7]},
  r32_4: {hl:'1ºF',  al:'2ºC',     h:[20,21,22,23],a:[8,9,10,11]},
  r32_5: {hl:'2ºK',  al:'2ºL',     h:[40,41,42,43],a:[44,45,46,47]},
  r32_6: {hl:'1ºH',  al:'2ºJ',     h:[28,29,30,31],a:[36,37,38,39]},
  r32_7: {hl:'1ºD',  al:'Mejor 3º',h:[12,13,14,15],a:null},
  r32_8: {hl:'1ºG',  al:'Mejor 3º',h:[24,25,26,27],a:null},
  r32_9: {hl:'1ºC',  al:'2ºF',     h:[8,9,10,11],  a:[20,21,22,23]},
  r32_10:{hl:'2ºE',  al:'2ºI',     h:[16,17,18,19],a:[32,33,34,35]},
  r32_11:{hl:'1ºA',  al:'Mejor 3º',h:[0,1,2,3],    a:null},
  r32_12:{hl:'1ºL',  al:'Mejor 3º',h:[44,45,46,47],a:null},
  r32_13:{hl:'1ºJ',  al:'2ºH',     h:[36,37,38,39],a:[28,29,30,31]},
  r32_14:{hl:'2ºD',  al:'2ºG',     h:[12,13,14,15],a:[24,25,26,27]},
  r32_15:{hl:'1ºB',  al:'Mejor 3º',h:[4,5,6,7],    a:null},
  r32_16:{hl:'1ºK',  al:'Mejor 3º',h:[40,41,42,43],a:null},
};

function admMakeOpts(teams, allT, usedSet, exceptVal){
  // teams: array of indices, or null = all 48
  // usedSet: Set of already-used team indices
  // exceptVal: current value of this select (don't exclude it)
  const list=teams||Array.from({length:48},(_,i)=>i);
  let o='<option value="">--</option>';
  list.forEach(i=>{
    if(usedSet.has(i)&&i!==exceptVal)return; // skip used teams
    o+='<option value="'+i+'">'+allT[i]+'</option>';
  });
  return o;
}

function admGetUsedTeams(){
  const used=new Set();
  for(let i=1;i<=16;i++){
    const h=document.getElementById('adm_r32_'+i+'_h')?.value;
    const a=document.getElementById('adm_r32_'+i+'_a')?.value;
    if(h&&h!=='')used.add(parseInt(h));
    if(a&&a!=='')used.add(parseInt(a));
  }
  return used;
}

function admRefreshR32Selects(){
  // Re-render R32 selects filtering out already-used teams
  const allT=TNAMES[LANG]||TNAMES.es;
  for(let i=1;i<=16;i++){
    const slot='r32_'+i;
    const def=ADM_R32_DEFS[slot];
    const hEl=document.getElementById('adm_'+slot+'_h');
    const aEl=document.getElementById('adm_'+slot+'_a');
    if(!hEl||!aEl)continue;
    const hCur=hEl.value?parseInt(hEl.value):null;
    const aCur=aEl.value?parseInt(aEl.value):null;
    const used=admGetUsedTeams();
    // Rebuild h options
    hEl.innerHTML=admMakeOpts(def.h,allT,used,hCur);
    if(hCur!=null)hEl.value=hCur;
    // Rebuild a options
    aEl.innerHTML=admMakeOpts(def.a,allT,used,aCur);
    if(aCur!=null)aEl.value=aCur;
  }
}


const ADM_OCT_FEEDS={oct_1:['r32_1','r32_2'],oct_2:['r32_3','r32_4'],oct_3:['r32_5','r32_6'],oct_4:['r32_7','r32_8'],oct_5:['r32_9','r32_10'],oct_6:['r32_11','r32_12'],oct_7:['r32_13','r32_14'],oct_8:['r32_15','r32_16']};
const ADM_QF_FEEDS={qf_1:['oct_1','oct_2'],qf_2:['oct_3','oct_4'],qf_3:['oct_5','oct_6'],qf_4:['oct_7','oct_8']};
const ADM_SF_FEEDS={sf_1:['qf_1','qf_2'],sf_2:['qf_3','qf_4']};
async function buildAdmBracket(container){
  const allT=TNAMES[LANG]||TNAMES.es,opts='<option value="">--</option>'+allT.map((nm,i)=>'<option value="'+i+'">'+nm+'</option>').join('');
  let saved={ko:{},extras:{}};
  if(sb){const{data}=await sb.from('resultados').select('data').eq('id',1).single();if(data)saved=JSON.parse(data.data);}
  const rounds=[{lbl:'RONDA DE 32',n:16,p:'r32'},{lbl:'OCTAVOS',n:8,p:'oct'},{lbl:'CUARTOS',n:4,p:'qf'},{lbl:'SEMIFINALES',n:2,p:'sf'},{lbl:'FINAL',n:1,p:'fin'}];
  let h='<div class="alert ainfo">Rellena los equipos de cada cruce y selecciona el ganador. Las rondas siguientes se propagan automáticamente.</div>';
  function admFeedSlot(p,i){
    if(p==='oct')return ADM_OCT_FEEDS['oct_'+i];
    if(p==='qf')return ADM_QF_FEEDS['qf_'+i];
    if(p==='sf')return ADM_SF_FEEDS['sf_'+i];
    if(p==='fin')return['sf_1','sf_2'];
    return null;
  }
  function admGetWinner(slot){
    const el=document.getElementById('adm_'+slot+'_w');
    return el&&el.value!==''?parseInt(el.value):null;
  }

  rounds.forEach(r=>{
    const half=Math.ceil(r.n/2);
    h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.88rem;color:var(--green);margin:.85rem 0 .38rem;letter-spacing:1px">'+r.lbl+'</div>';
    if(r.n>1){
      h+='<div class="bracket-wrap">';
      [[1,half],[half+1,r.n]].forEach(([from,to],hi)=>{
        h+='<div class="bracket-half"><div class="bh-title">'+(hi===0?t('left_half'):t('right_half'))+'</div><div class="adm-ko-grid">';
        for(let i=from;i<=to;i++){
          const k=r.p+'_'+i;
          if(r.p==='r32'){
            // R32: filtered selects per group
            const def=ADM_R32_DEFS[k];
            const hOpts=admMakeOpts(def?def.h:null,allT,new Set(),-1);
            const aOpts=admMakeOpts(def?def.a:null,allT,new Set(),-1);
            const lbl=(def?def.hl+'vs'+def.al:'');
            h+='<div class="adm-kom"><div class="kolbl">R32-'+i+(def?' <span style="font-size:.68rem;color:var(--muted);font-weight:400">'+def.hl+' vs '+def.al+'</span>':'')+'</div>'
              +'<div class="adm-ko-row"><select id="adm_'+k+'_h" onchange="admPropAndUpdateWinners();admRefreshR32Selects()">'+hOpts+'</select>'
              +'<span style="color:var(--muted);font-size:.68rem">vs</span>'
              +'<select id="adm_'+k+'_a" onchange="admPropAndUpdateWinners();admRefreshR32Selects()">'+aOpts+'</select></div>'
              +'<div class="adm-win-row" id="adm-win-row-'+k+'">'+t('advances')+' <select id="adm_'+k+'_w" onchange="admPropAndUpdateWinners()"><option value="">--</option></select></div></div>';
          } else {
            // Oct+: show team labels (auto from prev round) + winner select
            const feeds=admFeedSlot(r.p,i)||[];
            h+='<div class="adm-kom"><div class="kolbl">'+r.p.toUpperCase()+'-'+i+'</div>'
              +'<div class="adm-ko-row" id="adm-teams-'+k+'">'
              +'<span id="adm_'+k+'_hl" style="flex:1;font-size:.82rem;color:var(--muted);padding:.2rem .3rem">'+t('tbd')+'</span>'
              +'<span style="color:var(--muted);font-size:.68rem">vs</span>'
              +'<span id="adm_'+k+'_al" style="flex:1;font-size:.82rem;color:var(--muted);padding:.2rem .3rem;text-align:right">'+t('tbd')+'</span>'
              +'<input type="hidden" id="adm_'+k+'_h"><input type="hidden" id="adm_'+k+'_a">'
              +'</div>'
              +'<div class="adm-win-row" id="adm-win-row-'+k+'">'+t('advances')+' <select id="adm_'+k+'_w" onchange="admPropAndUpdateWinners()"><option value="">--</option></select></div></div>';
          }
        }
        h+='</div></div>';
      });
      h+='</div>';
    }else{
      const k=r.p+'_1';h+='<div class="adm-ko-grid"><div class="adm-kom"><div class="adm-ko-row"><select id="adm_'+k+'_h" onchange="admPropAndUpdateWinners()">'+opts+'</select><span style="color:var(--muted);font-size:.68rem">vs</span><select id="adm_'+k+'_a" onchange="admPropAndUpdateWinners()">'+opts+'</select></div><div class="adm-win-row">'+t('advances')+' <select id="adm_'+k+'_w" onchange="admPropAndUpdateWinners()"><option value="">--</option></select></div></div></div>';
    }
  });
  const posOpts=[['champion',t('champion')],['runner_up',t('runner_up')],['semis',t('semis')],['quarters',t('quarters')],['r16',t('r16')],['r32s',t('r32s')],['groups_out',t('groups_out')]].map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.88rem;color:var(--gold);margin:.85rem 0 .38rem;letter-spacing:1px">EXTRAS</div><div class="extgrid"><div class="extf"><label>🥇 '+t('winner')+'</label><select id="adm_ext_camp"><option value="">--</option>'+opts+'</select></div><div class="extf"><label>'+fi(28,true)+' '+t('spain_pos')+'</label><select id="adm_ext_esp"><option value="">--</option>'+posOpts+'</select></div><div class="extf"><label>⚽ '+t('top_scorer')+'</label><div class="ac-wrap"><input type="text" id="adm_ext_gol" placeholder="'+t('player_hint')+'" oninput="acF(\'adm_ext_gol\')" autocomplete="off"><div class="ac-list" id="ac-adm_ext_gol"></div></div></div><div class="extf"><label>🌟 '+t('best_player')+'</label><div class="ac-wrap"><input type="text" id="adm_ext_jug" placeholder="'+t('player_hint')+'" oninput="acF(\'adm_ext_jug\')" autocomplete="off"><div class="ac-list" id="ac-adm_ext_jug"></div></div></div></div><div style="margin-top:.9rem;display:flex;gap:.7rem;align-items:center;flex-wrap:wrap"><button class="btn btn-primary" id="btn-saveres" onclick="saveAdmRes()">'+t('save_recalc')+'</button><span id="res-spin" style="display:none"><div class="spin"></div></span></div><div id="res-msg" style="margin-top:.7rem"></div>';
  container.innerHTML=h;
  setTimeout(()=>{
    const sv=(id,v)=>{const el=document.getElementById(id);if(el&&v!=null)el.value=v;};
    const si=(id,v)=>{const el=document.getElementById(id);if(el&&v)el.value=v;};
    // Step 1: restore R32 h/a (not w yet — options not built yet)
    for(let i=1;i<=16;i++){const k='r32_'+i,d=saved.ko?.[k]||{};sv('adm_'+k+'_h',d.h);sv('adm_'+k+'_a',d.a);}
    // Step 2: build winner options for R32 (needs h/a to be set)
    _admPropAndUpdate();
    admRefreshR32Selects();
    // Step 3: NOW restore R32 winners (options exist now)
    for(let i=1;i<=16;i++){const k='r32_'+i,d=saved.ko?.[k]||{};sv('adm_'+k+'_w',d.w);}
    // Step 4: propagate R32 winners to Oct+ and build Oct options
    _admPropAndUpdate();
    // Step 5: restore Oct winners
    for(let i=1;i<=8;i++){const k='oct_'+i,d=saved.ko?.[k]||{};sv('adm_'+k+'_w',d.w);}
    // Step 6: propagate Oct winners to QF and build QF options
    _admPropAndUpdate();
    // Step 7: restore QF winners
    for(let i=1;i<=4;i++){const k='qf_'+i,d=saved.ko?.[k]||{};sv('adm_'+k+'_w',d.w);}
    // Step 8: propagate QF winners to SF and build SF options
    _admPropAndUpdate();
    // Step 9: restore SF winners
    for(let i=1;i<=2;i++){const k='sf_'+i,d=saved.ko?.[k]||{};sv('adm_'+k+'_w',d.w);}
    // Step 10: propagate SF winners to Final and build Final options
    _admPropAndUpdate();
    // Step 11: restore Final winner
    sv('adm_fin_1_w',saved.ko?.fin_1?.w);
    // Extras
    sv('adm_ext_camp',saved.extras?.camp);sv('adm_ext_esp',saved.extras?.esp);
    si('adm_ext_gol',saved.extras?.gol);si('adm_ext_jug',saved.extras?.jug);
    // Final update
    _admPropAndUpdate();
  },0);
}
function admProp(){
  const rw=Array.from({length:16},(_,i)=>{const v=document.getElementById('adm_r32_'+(i+1)+'_w')?.value;return v&&v!==''?parseInt(v):null;});
  [[0,1],[2,3],[4,5],[6,7],[8,9],[10,11],[12,13],[14,15]].forEach(([a,b],i)=>{const hEl=document.getElementById('adm_oct_'+(i+1)+'_h'),aEl=document.getElementById('adm_oct_'+(i+1)+'_a');if(hEl&&rw[a]!=null)hEl.value=rw[a];if(aEl&&rw[b]!=null)aEl.value=rw[b];});
  const ow=Array.from({length:8},(_,i)=>{const v=document.getElementById('adm_oct_'+(i+1)+'_w')?.value;return v&&v!==''?parseInt(v):null;});
  [[0,1],[2,3],[4,5],[6,7]].forEach(([a,b],i)=>{const hEl=document.getElementById('adm_qf_'+(i+1)+'_h'),aEl=document.getElementById('adm_qf_'+(i+1)+'_a');if(hEl&&ow[a]!=null)hEl.value=ow[a];if(aEl&&ow[b]!=null)aEl.value=ow[b];});
  const qw=Array.from({length:4},(_,i)=>{const v=document.getElementById('adm_qf_'+(i+1)+'_w')?.value;return v&&v!==''?parseInt(v):null;});
  [[0,1],[2,3]].forEach(([a,b],i)=>{const hEl=document.getElementById('adm_sf_'+(i+1)+'_h'),aEl=document.getElementById('adm_sf_'+(i+1)+'_a');if(hEl&&qw[a]!=null)hEl.value=qw[a];if(aEl&&qw[b]!=null)aEl.value=qw[b];});
  const sw=Array.from({length:2},(_,i)=>{const v=document.getElementById('adm_sf_'+(i+1)+'_w')?.value;return v&&v!==''?parseInt(v):null;});
  const fh=document.getElementById('adm_fin_1_h'),fa=document.getElementById('adm_fin_1_a');if(fh&&sw[0]!=null)fh.value=sw[0];if(fa&&sw[1]!=null)fa.value=sw[1];
}
function admPropAndUpdateWinners(){_admPropAndUpdate();}
function _admPropAndUpdate(){
  admProp();
  const allT=TNAMES[LANG]||TNAMES.es;
  // Update R32 winner selects
  for(let i=1;i<=16;i++){
    const k='r32_'+i;
    const hEl=document.getElementById('adm_'+k+'_h');
    const aEl=document.getElementById('adm_'+k+'_a');
    const wEl=document.getElementById('adm_'+k+'_w');
    if(!wEl)continue;
    const hv=hEl?.value,av=aEl?.value;
    const curW=wEl.value;
    wEl.innerHTML='<option value="">--</option>';
    if(hv&&hv!==''&&!isNaN(parseInt(hv))){const o=document.createElement('option');o.value=hv;o.textContent=tn(parseInt(hv));wEl.appendChild(o);}
    if(av&&av!==''&&!isNaN(parseInt(av))){const o=document.createElement('option');o.value=av;o.textContent=tn(parseInt(av));wEl.appendChild(o);}
    if(curW&&(curW===hv||curW===av))wEl.value=curW;
  }
  // Update Oct/QF/SF/Fin — team labels and winner selects from prev round winners
  [{n:8,p:'oct',feeds:ADM_OCT_FEEDS},{n:4,p:'qf',feeds:ADM_QF_FEEDS},{n:2,p:'sf',feeds:ADM_SF_FEEDS},{n:1,p:'fin',feeds:{fin_1:['sf_1','sf_2']}}].forEach(({n,p,feeds})=>{
    for(let i=1;i<=n;i++){
      const k=p+'_'+i;
      const fds=feeds[k]||[];
      const hw=fds[0]?document.getElementById('adm_'+fds[0]+'_w')?.value:null;
      const aw=fds[1]?document.getElementById('adm_'+fds[1]+'_w')?.value:null;
      // Update hidden h/a inputs
      const hEl=document.getElementById('adm_'+k+'_h');
      const aEl=document.getElementById('adm_'+k+'_a');
      if(hEl&&hw!=null&&hw!=='')hEl.value=hw; else if(hEl)hEl.value='';
      if(aEl&&aw!=null&&aw!=='')aEl.value=aw; else if(aEl)aEl.value='';
      // Update team labels
      const hlEl=document.getElementById('adm_'+k+'_hl');
      const alEl=document.getElementById('adm_'+k+'_al');
      if(hlEl)hlEl.textContent=hw&&hw!==''?tn(parseInt(hw)):t('tbd');
      if(alEl)alEl.textContent=aw&&aw!==''?tn(parseInt(aw)):t('tbd');
      // Update winner select with only the 2 teams
      const wEl=document.getElementById('adm_'+k+'_w');
      if(!wEl)continue;
      const curW=wEl.value;
      wEl.innerHTML='<option value="">--</option>';
      if(hw&&hw!==''&&!isNaN(parseInt(hw))){const o=document.createElement('option');o.value=hw;o.textContent=tn(parseInt(hw));wEl.appendChild(o);}
      if(aw&&aw!==''&&!isNaN(parseInt(aw))){const o=document.createElement('option');o.value=aw;o.textContent=tn(parseInt(aw));wEl.appendChild(o);}
      if(curW&&(curW===hw||curW===aw))wEl.value=curW;
    }
  });
  // Auto-fill Campeón from Final winner
  const finW=document.getElementById('adm_fin_1_w')?.value;
  const campEl=document.getElementById('adm_ext_camp');
  if(campEl&&finW&&finW!=='')campEl.value=finW;
  // Auto-detect Posición España (team 28)
  const espEl=document.getElementById('adm_ext_esp');
  if(espEl){
    const espPos=admDetectSpainPos();
    if(espPos)espEl.value=espPos;
  }
}

// Calcula posición España (id=28) desde objeto ko y r32Slots
function calcEspFromKo(ko, r32Slots){
  const SP=28;
  if(ko['final_1']===SP)return'champion';
  if(ko['sf_1']===SP||ko['sf_2']===SP)return'runner_up';
  for(let i=1;i<=4;i++){if(ko['qf_'+i]===SP)return'semis';}
  for(let i=1;i<=8;i++){if(ko['oct_'+i]===SP)return'quarters';}
  for(let i=1;i<=16;i++){if(ko['r32_'+i]===SP)return'r16';}
  const slots=r32Slots||{};
  for(let i=1;i<=16;i++){const s=slots['r32_'+i];if(s&&(s.h===SP||s.a===SP))return'r32s';}
  return'groups_out';
}

function admDetectSpainPos(){
  const SPAIN=28;
  const gv=id=>{const el=document.getElementById(id);return el&&el.value!==''?parseInt(el.value):null;};
  if(gv('adm_fin_1_w')===SPAIN)return'champion';
  const finH=gv('adm_fin_1_h'),finA=gv('adm_fin_1_a');
  if(finH===SPAIN||finA===SPAIN)return'runner_up';
  for(let i=1;i<=2;i++){if(gv('adm_sf_'+i+'_h')===SPAIN||gv('adm_sf_'+i+'_a')===SPAIN)return'semis';}
  for(let i=1;i<=4;i++){if(gv('adm_qf_'+i+'_h')===SPAIN||gv('adm_qf_'+i+'_a')===SPAIN)return'quarters';}
  for(let i=1;i<=8;i++){if(gv('adm_oct_'+i+'_h')===SPAIN||gv('adm_oct_'+i+'_a')===SPAIN)return'r16';}
  for(let i=1;i<=16;i++){
    const h=gv('adm_r32_'+i+'_h'),a=gv('adm_r32_'+i+'_a'),w=gv('adm_r32_'+i+'_w');
    if(h===SPAIN||a===SPAIN){
      if(w===SPAIN)return null; // Spain won R32, look further (oct+)
      if(w!=null)return'r32s'; // Spain lost in R32
      return'r32s'; // Spain in R32 but no winner yet — still r32s
    }
  }
  return'groups_out';
}

async function saveAdmRes(){
  if(!sb)return;document.getElementById('res-spin').style.display='';document.getElementById('btn-saveres').disabled=true;
  const res={grupos:{},ko:{},extras:{}};
  const rounds=[{n:16,p:'r32'},{n:8,p:'oct'},{n:4,p:'qf'},{n:2,p:'sf'},{n:1,p:'fin'}];
  rounds.forEach(r=>{for(let i=1;i<=r.n;i++){const k=r.p+'_'+i,gv=(id)=>{const el=document.getElementById(id);return el&&el.value!==''?parseInt(el.value):null;};res.ko[k]={h:gv('adm_'+k+'_h'),a:gv('adm_'+k+'_a'),w:gv('adm_'+k+'_w')};}});
  const gv=(id)=>{const el=document.getElementById(id);return el&&el.value!==''?parseInt(el.value):null;};
  res.extras={camp:gv('adm_ext_camp'),esp:document.getElementById('adm_ext_esp')?.value||null,gol:document.getElementById('adm_ext_gol')?.value.trim()||null,jug:document.getElementById('adm_ext_jug')?.value.trim()||null};
  const{error}=await sb.from('resultados').upsert({id:1,data:JSON.stringify(res)});
  if(error)showMsg('res-msg','Error: '+error.message,'err');else{await recalcAll(res);showMsg('res-msg','✅ Guardado y puntos recalculados','ok');}
  document.getElementById('res-spin').style.display='none';document.getElementById('btn-saveres').disabled=false;
}
async function loadAdmBets(container){
  const{data,error}=await sb.from('porras').select('nombre,email,puntos,paid,updated_at').order('nombre',{ascending:true});
  if(error){container.innerHTML='<div class="alert aerr">'+error.message+'</div>';return;}
  if(!data?.length){container.innerHTML='<div class="alert ainfo">'+t('no_bets')+'</div>';return;}
  let h='<div class="alert ainfo">Marca el checkbox cuando el participante haya pagado. Solo las porras <strong>pagadas</strong> aparecen en la clasificación pública.</div>';
  h+='<table class="rank-table"><thead><tr><th>#</th><th></th><th>Email</th><th>'+t('pts')+'</th><th>💰 '+t('paid')+'</th><th></th></tr></thead><tbody>';
  data.forEach((r,i)=>{
    const paidH=r.paid?'<span class="paid-badge">✓ '+t('paid')+'</span>':'<span class="unpaid-badge">'+t('unpaid')+'</span>';
    h+='<tr><td style="color:var(--muted)">'+(i+1)+'</td><td><strong>'+r.nombre+'</strong></td>'
      +'<td style="color:var(--muted);font-size:.76rem">'+(r.email?esc(r.email):'-')+'</td>'
      +'<td><span class="pbadge">'+(r.puntos||0)+'</span></td>'
      +'<td style="display:flex;align-items:center;gap:.5rem;flex-wrap:wrap">'
      +'<input type="checkbox" class="paid-chk" '+(r.paid?'checked':'')+' onchange="togPaid(\''+esc(r.nombre)+'\',this.checked,this)">'
      +paidH+'</td>'
      +'<td><button class="btn btn-ghost" style="font-size:.75rem;padding:.25rem .6rem" data-nombre="'+esc(r.nombre)+'" onclick="viewBetDetail(this.getAttribute(\'data-nombre\'))">'+t('view_bet')+'</button></td>'
      +'</tr>';
  });
  container.innerHTML=h+'</tbody></table>';
}
async function togPaid(nombre,paid,chk){
  if(!sb)return;
  await sb.from('porras').update({paid}).eq('nombre',nombre);
  // update badge inline
  const td=chk?.parentElement;
  if(td){
    const badge=td.querySelector('.paid-badge,.unpaid-badge');
    if(badge){badge.className=paid?'paid-badge':'unpaid-badge';badge.textContent=paid?'✓ '+t('paid'):t('unpaid');}
  }
}

