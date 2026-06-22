// ══ SIMULADOR ══
let _simRealData=null;
let _simOverrides={};
const SIM_R32_DEFS={
  r32_1:{hl:'1ºE',al:'Mejor 3º',h:[16,17,18,19],a:null},
  r32_2:{hl:'1ºI',al:'Mejor 3º',h:[32,33,34,35],a:null},
  r32_3:{hl:'2ºA',al:'2ºB',h:[0,1,2,3],a:[4,5,6,7]},
  r32_4:{hl:'1ºF',al:'2ºC',h:[20,21,22,23],a:[8,9,10,11]},
  r32_5:{hl:'2ºK',al:'2ºL',h:[40,41,42,43],a:[44,45,46,47]},
  r32_6:{hl:'1ºH',al:'2ºJ',h:[28,29,30,31],a:[36,37,38,39]},
  r32_7:{hl:'1ºD',al:'Mejor 3º',h:[12,13,14,15],a:null},
  r32_8:{hl:'1ºG',al:'Mejor 3º',h:[24,25,26,27],a:null},
  r32_9:{hl:'1ºC',al:'2ºF',h:[8,9,10,11],a:[20,21,22,23]},
  r32_10:{hl:'2ºE',al:'2ºI',h:[16,17,18,19],a:[32,33,34,35]},
  r32_11:{hl:'1ºA',al:'Mejor 3º',h:[0,1,2,3],a:null},
  r32_12:{hl:'1ºL',al:'Mejor 3º',h:[44,45,46,47],a:null},
  r32_13:{hl:'1ºJ',al:'2ºH',h:[36,37,38,39],a:[28,29,30,31]},
  r32_14:{hl:'2ºD',al:'2ºG',h:[12,13,14,15],a:[24,25,26,27]},
  r32_15:{hl:'1ºB',al:'Mejor 3º',h:[4,5,6,7],a:null},
  r32_16:{hl:'1ºK',al:'Mejor 3º',h:[40,41,42,43],a:null},
};
const SIM_OCT_FEEDS={oct_1:['r32_1','r32_2'],oct_2:['r32_3','r32_4'],oct_3:['r32_5','r32_6'],oct_4:['r32_7','r32_8'],oct_5:['r32_9','r32_10'],oct_6:['r32_11','r32_12'],oct_7:['r32_13','r32_14'],oct_8:['r32_15','r32_16']};
const SIM_QF_FEEDS={qf_1:['oct_1','oct_2'],qf_2:['oct_3','oct_4'],qf_3:['oct_5','oct_6'],qf_4:['oct_7','oct_8']};
const SIM_SF_FEEDS={sf_1:['qf_1','qf_2'],sf_2:['qf_3','qf_4']};

// Raw real data (before normalization) — preserves h/a even when w=null
let _simRawKo={};

async function loadSimulador(){
  const el=document.getElementById('sim-ko-content');
  if(!el)return;
  if(!sb){el.innerHTML='<div class="alert aerr">Sin conexión.</div>';return;}
  el.innerHTML='<div class="spin" style="margin:1.5rem auto;display:block"></div>';
  const{data,error}=await dbq(c=>(window._sbAnon||sb).from('resultados').select('data').eq('id',1).single());
  if(error||!data){
    _simRealData={ko:{},grupos:{},extras:{}};
    _simRawKo={};
  }else{
    const raw=JSON.parse(data.data);
    _simRawKo=raw.ko||{};
    const koNorm={};
    Object.entries(_simRawKo).forEach(([k,v])=>{
      const key=k==='fin_1'?'final_1':k;
      // Only store winner if it's a real value
      koNorm[key]=(v!=null&&typeof v==='object')?v.w:v;
    });
    _simRealData={ko:koNorm,grupos:raw.grupos||{},extras:raw.extras||{}};
  }
  _simOverrides={};
  // Hide buttons if deadline not passed (no real data to simulate)
  const btnSim=document.getElementById('btn-sim');
  const btnReset=document.getElementById('btn-sim-reset');
  const canSim=deadlinePassed();
  if(btnSim){btnSim.disabled=!canSim;btnSim.style.opacity=canSim?'1':'0.4';btnSim.style.cursor=canSim?'pointer':'not-allowed';}
  if(btnReset){btnReset.disabled=!canSim;btnReset.style.opacity=canSim?'1':'0.4';btnReset.style.cursor=canSim?'pointer':'not-allowed';}
  renderSimulador();
}

function simGetTeam(key){
  if(_simOverrides[key]!=null)return parseInt(_simOverrides[key]);
  const v=_simRealData&&_simRealData.ko&&_simRealData.ko[key];
  return(v!=null)?parseInt(v):null;
}

// Get the admin-configured h/a teams for a r32 slot (from raw data)
function simGetAdminTeams(slot){
  const raw=_simRawKo[slot];
  if(!raw||typeof raw!=='object')return null;
  if(raw.h==null&&raw.a==null)return null;
  return{h:raw.h,a:raw.a};
}

function simGetUsedTeams(){
  const used=new Set();
  for(let i=1;i<=16;i++){
    const slot='r32_'+i;
    const admin=simGetAdminTeams(slot);
    if(admin){
      if(admin.h!=null)used.add(parseInt(admin.h));
      if(admin.a!=null)used.add(parseInt(admin.a));
    } else {
      const h=_simOverrides[slot+'_h'],a=_simOverrides[slot+'_a'];
      if(h!=null)used.add(parseInt(h));
      if(a!=null)used.add(parseInt(a));
    }
  }
  return used;
}

function simDetectSpainPos(rk){
  const SP=28;
  // Check from final backwards using only CONFIRMED winners (not candidates)
  if(simGetTeam('final_1')===SP)return 'champion';
  if(simGetTeam('sf_1')===SP||simGetTeam('sf_2')===SP)return 'runner_up';
  for(let i=1;i<=4;i++){if(simGetTeam('qf_'+i)===SP)return 'semis';}
  for(let i=1;i<=8;i++){if(simGetTeam('oct_'+i)===SP)return 'quarters';}
  // Check R32 winners
  for(let i=1;i<=16;i++){
    const rw=rk['r32_'+i];
    const ov=_simOverrides['r32_'+i]!=null?parseInt(_simOverrides['r32_'+i]):null;
    const winner=rw!=null?rw:ov;
    if(winner===SP)return 'r16'; // Spain won R32 = made it to oct
    // Check if Spain is a participant in this R32 slot
    const admin=simGetAdminTeams('r32_'+i);
    const oh=admin?parseInt(admin.h):(_simOverrides['r32_'+i+'_h']!=null?parseInt(_simOverrides['r32_'+i+'_h']):null);
    const oa=admin?parseInt(admin.a):(_simOverrides['r32_'+i+'_a']!=null?parseInt(_simOverrides['r32_'+i+'_a']):null);
    if(oh===SP||oa===SP){
      if(winner!=null&&winner!==SP)return 'r32s'; // Spain lost in R32
      return 'r32s'; // Spain in R32 (with or without winner yet)
    }
  }
  // Spain not found in any R32 slot
  return 'groups_out';
}

function simFixedCard(label,team){
  return '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem;background:var(--surf2);border:1px solid #2a9d8f55;border-radius:8px;padding:.35rem .7rem">'
    +'<span style="font-size:.65rem;color:#2a9d8f;min-width:55px">'+label+'</span>'
    +'<span style="font-size:.82rem">'+fi(team,true)+' '+tn(team)+'</span>'
    +'<span style="color:#2a9d8f;font-size:.7rem;margin-left:auto">&#10003;</span></div>';
}

function simSelectEl(key,cands,cur,label){
  return '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.3rem">'
    +'<span style="font-size:.68rem;color:var(--muted);min-width:55px">'+label+'</span>'
    +'<select data-simkey="'+key+'" style="flex:1;max-width:260px;background:var(--surf2);border:1px solid '+(cur!=null?'var(--accent)':'var(--border)')+';color:var(--text);border-radius:6px;padding:.22rem .45rem;font-size:.8rem" onchange="simChange(this)">'
    +'<option value="">-- Ganador --</option>'
    +cands.map(ti=>'<option value="'+ti+'"'+(cur===ti?' selected':'')+'>'+fi(ti,true)+' '+tn(ti)+'</option>').join('')
    +'</select></div>';
}

function renderSimulador(){
  const el=document.getElementById('sim-ko-content');
  if(!el||!_simRealData)return;
  const rk=_simRealData.ko||{};
  let h='';

  // ── RONDA DE 32 ──────────────────────────────────────────────────────────
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--gold);letter-spacing:1px;margin:.5rem 0 .4rem">Ronda de 32</div>';
  h+='<div style="font-size:.72rem;color:var(--muted);margin-bottom:.5rem">&#128994; Oficial &nbsp; &#9634; Hipótesis</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem">';
  h+='<div><div style="font-family:\'Bebas Neue\',sans-serif;font-size:.75rem;color:var(--muted);letter-spacing:1px;margin-bottom:.4rem;text-align:center">'+t('left_half')+'</div>';
  const used=simGetUsedTeams();

  for(let i=1;i<=16;i++){
    if(i===9)h+='</div><div><div style="font-family:\'Bebas Neue\',sans-serif;font-size:.75rem;color:var(--muted);letter-spacing:1px;margin-bottom:.4rem;text-align:center">'+t('right_half')+'</div>';
    const slot='r32_'+i;
    const def=SIM_R32_DEFS[slot];
    const rw=rk[slot]; // real winner (w)
    const admin=simGetAdminTeams(slot); // {h,a} from admin, w=null

    if(rw!=null){
      // Winner known — show as fixed green
      h+=simFixedCard('R32-'+i,rw);
      continue;
    }

    if(admin&&admin.h!=null&&admin.a!=null){
      // Admin has configured both teams but no winner yet
      // Show compact match row with winner selector
      const cur=_simOverrides[slot]!=null?parseInt(_simOverrides[slot]):null;
      h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem;margin-bottom:.35rem">';
      h+='<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.3rem;margin-bottom:.3rem">';
      h+='<div style="font-size:.8rem">'+fi(admin.h,true)+' '+tn(admin.h)+'</div>';
      h+='<div style="color:var(--muted);font-size:.72rem;text-align:center">vs</div>';
      h+='<div style="font-size:.8rem;text-align:right">'+tn(admin.a)+' '+fi(admin.a,true)+'</div>';
      h+='</div>';
      h+='<div style="display:flex;align-items:center;gap:.4rem">';
      h+='<span style="font-size:.65rem;color:var(--muted)">R32-'+i+':</span>';
      h+='<select data-simkey="'+slot+'" style="flex:1;background:var(--surf3);border:1px solid '+(cur!=null?'var(--accent)':'var(--border)')+';color:var(--text);border-radius:5px;padding:.2rem .4rem;font-size:.78rem" onchange="simChange(this)">';
      h+='<option value="">-- Ganador --</option>';
      h+='<option value="'+admin.h+'"'+(cur===parseInt(admin.h)?' selected':'')+'>'+fi(admin.h,true)+' '+tn(admin.h)+'</option>';
      h+='<option value="'+admin.a+'"'+(cur===parseInt(admin.a)?' selected':'')+'>'+fi(admin.a,true)+' '+tn(admin.a)+'</option>';
      h+='</select></div></div>';
      continue;
    }

    if(admin&&(admin.h!=null||admin.a!=null)){
      // Only one team known — show known team as fixed text, dropdown only for unknown rival
      const knownSide=admin.h!=null?'h':'a';
      const knownTeam=admin[knownSide];
      const unknownLabel=knownSide==='h'?def.al:def.hl;
      const unknownCandKey=knownSide==='h'?'a':'h';
      const unknownCands=(def[unknownCandKey]||Array.from({length:48},(_,idx)=>idx)).filter(ti=>!used.has(ti)||ti===_simOverrides[slot+'_'+unknownCandKey]);
      const rivalVal=_simOverrides[slot+'_'+unknownCandKey]!=null?parseInt(_simOverrides[slot+'_'+unknownCandKey]):null;
      const cur=_simOverrides[slot]!=null?parseInt(_simOverrides[slot]):null;
      h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem;margin-bottom:.35rem">';
      h+='<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.3rem;margin-bottom:.3rem">';
      const fixedEl='<div style="font-size:.8rem;display:flex;align-items:center;gap:.3rem">'+fi(knownTeam,true)+' <span>'+tn(knownTeam)+'</span></div>';
      const dropEl='<div><div style="font-size:.6rem;color:var(--muted);margin-bottom:.1rem'+(knownSide==='h'?';text-align:right':'')+'">'
        +unknownLabel+'</div>'
        +'<select data-simkey="'+slot+'_'+unknownCandKey+'" style="width:100%;background:var(--surf3);border:1px solid '+(rivalVal!=null?'var(--accent)':'var(--border)')+';color:var(--text);border-radius:5px;padding:.2rem .35rem;font-size:.76rem" onchange="simChange(this)">'
        +'<option value="">--</option>'
        +unknownCands.filter(ti=>ti!==knownTeam).map(ti=>'<option value="'+ti+'"'+(rivalVal===ti?' selected':'')+'>'+fi(ti,true)+' '+tn(ti)+'</option>').join('')
        +'</select></div>';
      if(knownSide==='h'){
        h+=fixedEl;
        h+='<div style="color:var(--muted);font-size:.72rem;text-align:center">vs</div>';
        h+=dropEl;
      }else{
        h+=dropEl;
        h+='<div style="color:var(--muted);font-size:.72rem;text-align:center">vs</div>';
        h+=fixedEl;
      }
      h+='</div>';
      if(rivalVal!=null){
        const t1=knownSide==='h'?knownTeam:rivalVal;
        const t2=knownSide==='h'?rivalVal:knownTeam;
        h+='<div style="display:flex;align-items:center;gap:.4rem">';
        h+='<span style="font-size:.65rem;color:var(--muted)">R32-'+i+':</span>';
        h+='<select data-simkey="'+slot+'" style="flex:1;background:var(--surf3);border:1px solid '+(cur!=null?'var(--accent)':'var(--border)')+';color:var(--text);border-radius:5px;padding:.2rem .4rem;font-size:.78rem" onchange="simChange(this)">';
        h+='<option value="">-- Ganador --</option>';
        h+='<option value="'+t1+'"'+(cur===t1?' selected':'')+'>'+fi(t1,true)+' '+tn(t1)+'</option>';
        h+='<option value="'+t2+'"'+(cur===t2?' selected':'')+'>'+fi(t2,true)+' '+tn(t2)+'</option>';
        h+='</select></div>';
      }
      h+='</div>';
      continue;
    }

    // Fully pending — dual dropdown for both teams + winner
    const hVal=_simOverrides[slot+'_h']!=null?parseInt(_simOverrides[slot+'_h']):null;
    const aVal=_simOverrides[slot+'_a']!=null?parseInt(_simOverrides[slot+'_a']):null;
    const cur=_simOverrides[slot]!=null?parseInt(_simOverrides[slot]):null;
    h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem;margin-bottom:.35rem">';
    h+='<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.3rem;margin-bottom:.3rem">';
    // Home
    h+='<div><div style="font-size:.6rem;color:var(--muted);margin-bottom:.1rem">'+def.hl+'</div>';
    h+='<select data-simkey="'+slot+'_h" style="width:100%;background:var(--surf3);border:1px solid '+(hVal!=null?'var(--accent)':'var(--border)')+';color:var(--text);border-radius:5px;padding:.2rem .35rem;font-size:.76rem" onchange="simChange(this)">';
    h+='<option value="">--</option>';
    def.h.forEach(ti=>{if(!used.has(ti)||ti===hVal)h+='<option value="'+ti+'"'+(hVal===ti?' selected':'')+'>'+fi(ti,true)+' '+tn(ti)+'</option>';});
    h+='</select></div>';
    h+='<div style="color:var(--muted);font-size:.72rem;text-align:center">vs</div>';
    // Away
    h+='<div><div style="font-size:.6rem;color:var(--muted);margin-bottom:.1rem;text-align:right">'+def.al+'</div>';
    h+='<select data-simkey="'+slot+'_a" style="width:100%;background:var(--surf3);border:1px solid '+(aVal!=null?'var(--accent)':'var(--border)')+';color:var(--text);border-radius:5px;padding:.2rem .35rem;font-size:.76rem" onchange="simChange(this)">';
    h+='<option value="">--</option>';
    const alist=def.a||Array.from({length:48},(_,idx)=>idx);
    alist.forEach(ti=>{if((!used.has(ti)||ti===aVal)&&ti!==hVal)h+='<option value="'+ti+'"'+(aVal===ti?' selected':'')+'>'+fi(ti,true)+' '+tn(ti)+'</option>';});
    h+='</select></div></div>';
    // Winner selector (only if both teams chosen)
    if(hVal!=null&&aVal!=null){
      h+='<div style="display:flex;align-items:center;gap:.4rem">';
      h+='<span style="font-size:.65rem;color:var(--muted)">R32-'+i+':</span>';
      h+='<select data-simkey="'+slot+'" style="flex:1;background:var(--surf3);border:1px solid '+(cur!=null?'var(--accent)':'var(--border)')+';color:var(--text);border-radius:5px;padding:.2rem .4rem;font-size:.78rem" onchange="simChange(this)">';
      h+='<option value="">-- Ganador --</option>';
      h+='<option value="'+hVal+'"'+(cur===hVal?' selected':'')+'>'+fi(hVal,true)+' '+tn(hVal)+'</option>';
      h+='<option value="'+aVal+'"'+(cur===aVal?' selected':'')+'>'+fi(aVal,true)+' '+tn(aVal)+'</option>';
      h+='</select></div>';
    }
    h+='</div>';
  }

  function getR32Winner(slot){
    const rw=rk[slot];if(rw!=null)return rw;
    const ov=_simOverrides[slot];if(ov!=null)return parseInt(ov);
    return null;
  }
  h+='</div></div>';
  function getCands(r32slot){
    const w=getR32Winner(r32slot);if(w!=null)return[w];
    const admin=simGetAdminTeams(r32slot);
    if(admin){const res=[];if(admin.h!=null)res.push(parseInt(admin.h));if(admin.a!=null)res.push(parseInt(admin.a));return res;}
    const oh=_simOverrides[r32slot+'_h'],oa=_simOverrides[r32slot+'_a'];
    const res=[];if(oh!=null)res.push(parseInt(oh));if(oa!=null)res.push(parseInt(oa));return res;
  }

  function slotReady(slot){
    if(rk[slot]!=null)return true;
    if(_simOverrides[slot]!=null)return true;
    return false;
  }
  function r32SlotHasMatchup(slot){
    if(rk[slot]!=null)return true;
    if(simGetAdminTeams(slot))return true;
    return _simOverrides[slot+'_h']!=null&&_simOverrides[slot+'_a']!=null;
  }
  const allR32Ready=Array.from({length:16},(_,i)=>'r32_'+(i+1)).every(slotReady);
  const allR32HasMatchup=Array.from({length:16},(_,i)=>'r32_'+(i+1)).every(r32SlotHasMatchup);

  // ── OCTAVOS ──────────────────────────────────────────────────────────────
  if(allR32Ready){
    h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--gold);letter-spacing:1px;margin:.8rem 0 .4rem">Octavos</div>';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem"><div>';
    for(let i=1;i<=8;i++){if(i===5)h+='</div><div>';
      const slot='oct_'+i;const rw=rk[slot];const cur=_simOverrides[slot]!=null?parseInt(_simOverrides[slot]):null;
      if(rw!=null){h+=simFixedCard('OCT-'+i,rw);continue;} // real data — fixed
      const cands=[...new Set([...getCands(SIM_OCT_FEEDS[slot][0]),...getCands(SIM_OCT_FEEDS[slot][1])])];
      h+=simSelectEl(slot,cands,cur,'OCT-'+i);
    }
    h+='</div></div>';
    const octDone=Array.from({length:8},(_,i)=>'oct_'+(i+1)).every(s=>simGetTeam(s)!=null);
    if(octDone){
      h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--gold);letter-spacing:1px;margin:.8rem 0 .4rem">Cuartos</div>';
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:.5rem"><div>';
      for(let i=1;i<=4;i++){if(i===3)h+='</div><div>';
        const slot='qf_'+i;const rw=rk[slot];const cur=_simOverrides[slot]!=null?parseInt(_simOverrides[slot]):null;
        if(rw!=null){h+=simFixedCard('QF-'+i,rw);continue;}
        const[f1,f2]=SIM_QF_FEEDS[slot];
        h+=simSelectEl(slot,[simGetTeam(f1),simGetTeam(f2)].filter(v=>v!=null),cur,'QF-'+i);
      }
      h+='</div></div>';
      const qfDone=Array.from({length:4},(_,i)=>'qf_'+(i+1)).every(s=>simGetTeam(s)!=null);
      if(qfDone){
        h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--gold);letter-spacing:1px;margin:.8rem 0 .4rem">Semis</div>';
        for(let i=1;i<=2;i++){
          const slot='sf_'+i;const rw=rk[slot];const cur=_simOverrides[slot]!=null?parseInt(_simOverrides[slot]):null;
          if(rw!=null){h+=simFixedCard('SF-'+i,rw);continue;}
          const[f1,f2]=SIM_SF_FEEDS[slot];
          h+=simSelectEl(slot,[simGetTeam(f1),simGetTeam(f2)].filter(v=>v!=null),cur,'SF-'+i);
        }
        const sfDone=Array.from({length:2},(_,i)=>'sf_'+(i+1)).every(s=>simGetTeam(s)!=null);
        if(sfDone){
          h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--gold);letter-spacing:1px;margin:.8rem 0 .4rem">Final</div>';
          const rwF=rk['final_1'];const curF=_simOverrides['final_1']!=null?parseInt(_simOverrides['final_1']):null;
          if(rwF!=null){h+=simFixedCard('FINAL',rwF);}
          else h+=simSelectEl('final_1',[simGetTeam('sf_1'),simGetTeam('sf_2')].filter(v=>v!=null),curF,'FINAL');
        }
      }
    }
  }

  // ── EXTRAS ───────────────────────────────────────────────────────────────
  const champ=simGetTeam('final_1');
  const posOpts=[['champion','Campeón'],['runner_up','Finalista'],['semis','Semifinal'],['quarters','Cuartos'],['r16','Octavos'],['r32s','R32'],['groups_out','Grupos']];
  const autoEsp=simDetectSpainPos(rk);
  const espCur=autoEsp||_simOverrides['ext_esp']||(_simRealData.extras&&_simRealData.extras.esp)||'';
  if(autoEsp)_simOverrides['ext_esp']=autoEsp;
  const golCur=_simOverrides['ext_gol']!=null?_simOverrides['ext_gol']:((_simRealData.extras&&_simRealData.extras.gol)||'');
  const jugCur=_simOverrides['ext_jug']!=null?_simOverrides['ext_jug']:((_simRealData.extras&&_simRealData.extras.jug)||'');
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--gold);letter-spacing:1px;margin:1rem 0 .5rem">Extras</div>';
  h+='<div class="extgrid">';
  h+='<div class="extf"><label>Campeón <span style="font-size:.68rem;color:var(--muted)">(auto)</span></label><div style="background:var(--surf3);border:1px solid var(--border);border-radius:7px;padding:.45rem .65rem;font-size:.85rem;min-height:2rem;display:flex;align-items:center;gap:.4rem">'+(champ!=null?fi(champ,true)+' '+tn(champ):'<em style="color:var(--muted)">Por definir</em>')+'</div></div>';
  h+='<div class="extf"><label>'+fi(28,true)+' Posición España</label><select data-simkey="ext_esp" style="width:100%;background:var(--surf2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:.32rem .5rem;font-size:.83rem" onchange="simChange(this)"><option value="">--</option>'+posOpts.map(([v,l])=>'<option value="'+v+'"'+(espCur===v?' selected':'')+'>'+l+'</option>').join('')+'</select></div>';
  h+='<div class="extf"><label>Máximo Goleador</label><div class="ac-wrap"><input type="text" id="sim-ext-gol" data-simkey="ext_gol" value="'+esc(String(golCur||''))+'" placeholder="'+t('player_hint')+'" style="width:100%;background:var(--surf2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:.32rem .5rem;font-size:.83rem" oninput="acF(\'sim-ext-gol\');simChangeAC(\'sim-ext-gol\',\'ext_gol\')" autocomplete="off"><div class="ac-list" id="ac-sim-ext-gol"></div></div></div>';
  h+='<div class="extf"><label>Jugador del Torneo</label><div class="ac-wrap"><input type="text" id="sim-ext-jug" data-simkey="ext_jug" value="'+esc(String(jugCur||''))+'" placeholder="'+t('player_hint')+'" style="width:100%;background:var(--surf2);border:1px solid var(--border);color:var(--text);border-radius:6px;padding:.32rem .5rem;font-size:.83rem" oninput="acF(\'sim-ext-jug\');simChangeAC(\'sim-ext-jug\',\'ext_jug\')" autocomplete="off"><div class="ac-list" id="ac-sim-ext-jug"></div></div></div>';
  h+='</div>';
  el.innerHTML=h;
}
function simChangeAC(inputId, key){
  const val=document.getElementById(inputId)?.value||null;
  _simOverrides[key]=val&&val.trim()!==''?val.trim():null;
}
function simChange(el){
  const key=el.getAttribute('data-simkey');
  const val=el.value===''?null:(el.tagName==='INPUT'?el.value:parseInt(el.value));
  _simOverrides[key]=val;
  if(el.tagName!=='INPUT')renderSimulador();
}
async function ejecutarSimulacion(){
  if(!_simRealData){await loadSimulador();if(!_simRealData)return;}

  // Construir simReal con {h,a,w} completo para cada slot
  const simReal=JSON.parse(JSON.stringify(_simRealData));
  const rk={};

  // Helper: ganador efectivo de un slot (real > override)
  function sw(slot){
    const rv=_simRealData.ko&&_simRealData.ko[slot];
    if(rv!=null)return typeof rv==='object'?rv.w:rv;
    const ov=_simOverrides[slot];
    return ov!=null?parseInt(ov):null;
  }
  // Helper: equipo h/a de r32 slot
  function r32Teams(slot){
    const raw=_simRawKo[slot];
    if(raw&&typeof raw==='object'){
      const h=raw.h!=null?raw.h:(_simOverrides[slot+'_h']!=null?parseInt(_simOverrides[slot+'_h']):null);
      const a=raw.a!=null?raw.a:(_simOverrides[slot+'_a']!=null?parseInt(_simOverrides[slot+'_a']):null);
      return{h,a};
    }
    const h=_simOverrides[slot+'_h']!=null?parseInt(_simOverrides[slot+'_h']):null;
    const a=_simOverrides[slot+'_a']!=null?parseInt(_simOverrides[slot+'_a']):null;
    return{h,a};
  }

  // R32
  for(let i=1;i<=16;i++){
    const slot='r32_'+i;
    const{h,a}=r32Teams(slot);
    rk[slot]={h,a,w:sw(slot)};
  }
  // Octavos: mismos feeds que calcScore (FIFA bracket real)
  [[3,4],[1,2],[9,10],[11,12],[5,6],[7,8],[13,14],[15,16]].forEach(([a,b],i)=>{
    const slot='oct_'+(i+1);
    rk[slot]={h:sw('r32_'+a),a:sw('r32_'+b),w:sw(slot)};
  });
  // Cuartos: mismos feeds que calcScore
  [[2,1],[5,6],[3,4],[7,8]].forEach(([a,b],i)=>{
    const slot='qf_'+(i+1);
    rk[slot]={h:sw('oct_'+a),a:sw('oct_'+b),w:sw(slot)};
  });
  // Semis: mismos feeds que calcScore
  [[1,2],[3,4]].forEach(([a,b],i)=>{
    const slot='sf_'+(i+1);
    rk[slot]={h:sw('qf_'+a),a:sw('qf_'+b),w:sw(slot)};
  });
  // Final
  rk['final_1']={h:sw('sf_1'),a:sw('sf_2'),w:sw('final_1')};

  simReal.ko=rk;
  simReal.extras=simReal.extras||{};
  const champ=sw('final_1');
  if(champ!=null)simReal.extras.camp=champ;
  if(_simOverrides['ext_esp'])simReal.extras.esp=_simOverrides['ext_esp'];
  if(_simOverrides['ext_gol'])simReal.extras.gol=_simOverrides['ext_gol'];
  if(_simOverrides['ext_jug'])simReal.extras.jug=_simOverrides['ext_jug'];

  const{data:porras,error}=await dbq(c=>(window._sbAnon||sb).from('porras').select('nombre,puntos,data').eq('paid',true));
  if(error||!porras||!porras.length){document.getElementById('sim-result-card').style.display='none';showConfirmModal('Sin datos','No hay porras pagadas.',()=>{});return;}
  const ranked=porras.map(p=>{
    let pd={};try{pd=JSON.parse(p.data||'{}');}catch(e){}
    const ptsSimKO=calcScore(pd,simReal);
    const ptsRealKO=calcScore(pd,_simRealData);
    const delta=ptsSimKO-ptsRealKO;
    const ptsReal=p.puntos||0;
    return{nombre:p.nombre,pts:ptsReal+delta,ptsReal,delta};
  }).sort((a,b)=>b.pts-a.pts);
  const card=document.getElementById('sim-result-card');
  const out=document.getElementById('sim-ranking-output');
  let h='<table class="rank-table"><thead><tr><th>#</th><th></th><th>Sim</th><th>Real</th><th>Delta</th></tr></thead><tbody>';
  ranked.forEach((r,i)=>{
    const d=r.delta;
    const ds=d>0?'<span style="color:var(--green)">+'+d+'</span>':d<0?'<span style="color:var(--accent)">'+d+'</span>':'<span style="color:var(--muted)">=</span>';
    h+='<tr><td><span class="rk '+(i<3?'g'+(i+1):'')+'">'+(i+1)+'</span></td><td><strong>'+esc(r.nombre)+'</strong></td><td><span class="pbadge">'+r.pts+'</span></td><td style="color:var(--muted);font-size:.8rem">'+r.ptsReal+'</td><td>'+ds+'</td></tr>';
  });
  out.innerHTML=h+'</tbody></table>';
  card.style.display='';card.scrollIntoView({behavior:'smooth',block:'start'});
}
function resetSimulacion(){
  _simOverrides={};
  const card=document.getElementById('sim-result-card');
  if(card)card.style.display='none';
  if(_simRealData)renderSimulador();
}

