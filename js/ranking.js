// ══ RANKING ══
async function loadRanking(){
  if(!sb){
    document.getElementById('rank-container').innerHTML='<div class="alert aerr">❌ Sin conexión a la base de datos. Recarga la página.</div>';
    // Unlock nav
    document.querySelectorAll('.nav-btn').forEach(b=>b.style.pointerEvents='');
    return;
  }
  const rc=document.getElementById('rank-container');
  rc.innerHTML='<div style="text-align:center;padding:3rem;color:var(--muted)"><div class="spin"></div><br><span style="font-size:.8rem">Cargando...</span></div>';
  // Unlock nav immediately so user isn't stuck
  document.querySelectorAll('.nav-btn').forEach(b=>b.style.pointerEvents='');
  const preDeadline=!deadlinePassed();
  let query=(window._sbAnon||sb).from('porras').select('nombre,puntos,paid,updated_at,logros');
  if(!preDeadline)query=query.eq('paid',true);
  // Timeout after 8 seconds
  let timedOut=false;
  const timeout=setTimeout(()=>{
    timedOut=true;
    rc.innerHTML='<div class="alert aerr">⏱ La consulta tardó demasiado. Comprueba tu conexión y recarga.</div>';
  },20000);
  const[{data,error},histResult]=await Promise.all([
    query.order('puntos',{ascending:false}),
    (window._sbAnon||sb).from('historial_ranking').select('nombre,posicion').eq('fecha',new Date(Date.now()-86400000).toISOString().slice(0,10))
  ]);
  if(timedOut)return;
  clearTimeout(timeout);
  // Build prev position map
  const prevPos={};
  (histResult?.data||[]).forEach(h=>{prevPos[h.nombre]=h.posicion;});
  if(error){
    if(error.code==='PGRST301'||error.message?.includes('JWT')){
      rc.innerHTML='<div class="card"><div style="text-align:center;padding:2.5rem;color:var(--muted)">'+t('no_bets')+'</div></div>';
    }else{
      rc.innerHTML='<div class="alert aerr">'+error.message+'</div>';
    }
    return;
  }
  if(!data?.length){rc.innerHTML='<div class="card"><div style="text-align:center;padding:2.5rem;color:var(--muted)">'+t('no_bets')+'</div></div>';return;}
  // Check if Mundial has finished
  let mundialFinal=false,campeon=null,finalExtras={};
  try{
    const{data:resData}=await dbq(c=>(window._sbAnon||sb).from('resultados').select('data').eq('id',1).single());
    if(resData){
      const rd=JSON.parse(resData.data);
      const finSlot=rd.ko?.fin_1||rd.ko?.final_1;
      const finW=finSlot!=null?(typeof finSlot==='object'?finSlot.w:finSlot):null;
      if(finW!=null&&rd.extras?.gol&&rd.extras?.jug){
        mundialFinal=true;campeon=finW;finalExtras=rd.extras||{};
      }
    }
  }catch(e){}
  const PRICE=5;
  const total=data.length;
  const paid=data.filter(r=>r.paid).length;
  const pending=total-paid;
  const moneyConfirmed=paid*PRICE;
  const moneyPending=pending*PRICE;
  const moneyTotal=total*PRICE;
  const prize1=(Math.floor(moneyConfirmed*0.7*100)/100).toFixed(2);
  const prize2=(Math.floor(moneyConfirmed*0.3*100)/100).toFixed(2);
  let h='<div class="card" style="margin-bottom:1rem">';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:.6rem;margin-bottom:.75rem">';
  h+='<div style="background:var(--surf2);border-radius:8px;padding:.7rem;text-align:center"><div style="font-family:"Bebas Neue",sans-serif;font-size:1.6rem;color:var(--gold)">'+total+'</div><div style="font-size:.74rem;color:var(--muted)">'+t('rank_participants')+'</div></div>';
  h+='<div style="background:var(--surf2);border-radius:8px;padding:.7rem;text-align:center"><div style="font-family:"Bebas Neue",sans-serif;font-size:1.6rem;color:#86efac">'+paid+'</div><div style="font-size:.74rem;color:var(--muted)">'+t('rank_confirmed_n')+'</div></div>';
  h+='<div style="background:var(--surf2);border-radius:8px;padding:.7rem;text-align:center"><div style="font-family:"Bebas Neue",sans-serif;font-size:1.6rem;color:var(--gold)">'+moneyConfirmed+'€</div><div style="font-size:.74rem;color:var(--muted)">'+t('rank_collected')+'</div></div>';
  if(preDeadline&&pending>0)h+='<div style="background:var(--surf2);border-radius:8px;padding:.7rem;text-align:center"><div style="font-family:"Bebas Neue",sans-serif;font-size:1.6rem;color:#fdba74">'+moneyPending+'€</div><div style="font-size:.74rem;color:var(--muted)">'+t('rank_pending_money')+'</div></div>';
  h+='<div style="background:var(--surf2);border-radius:8px;padding:.7rem;text-align:center"><div style="font-family:"Bebas Neue",sans-serif;font-size:1.3rem;color:#ffd700">'+prize1+'€</div><div style="font-size:.74rem;color:var(--muted)">'+t('rank_prize1')+'</div></div>';
  h+='<div style="background:var(--surf2);border-radius:8px;padding:.7rem;text-align:center"><div style="font-family:"Bebas Neue",sans-serif;font-size:1.3rem;color:#c0c0c0">'+prize2+'€</div><div style="font-size:.74rem;color:var(--muted)">'+t('rank_prize2')+'</div></div>';
  h+='</div>';
  if(preDeadline)h+='<div style="font-size:.75rem;color:var(--muted);margin-bottom:.6rem;background:var(--surf2);border:1px solid var(--border);border-radius:7px;padding:.55rem .75rem;line-height:1.5">'+t('rank_pre_warn')+'</div>';
  h+='</div>';
  h+='<div class="card"><table class="rank-table" style="table-layout:fixed;width:100%"><thead><tr><th style="width:2.5rem">#</th><th></th><th style="width:4rem;text-align:center">'+t('pts')+'</th>';
  if(preDeadline)h+='<th>'+t('rank_status_col')+'</th>';
  h+=(deadlinePassed()&&currentUser?'<th style="width:2.5rem"></th>':'<th style="width:2.5rem"></th>')+'</tr></thead><tbody>';
  // For pre-deadline: number only paid bets, show pending separately at bottom
  const paidBets=data.filter(r=>r.paid);
  const pendingBets=data.filter(r=>!r.paid);

  // ── MUNDIAL FINALIZADO ──────────────────────────────────────────────────
  if(mundialFinal&&paidBets.length>0){
    const sorted=[...paidBets].sort((a,b)=>b.puntos-a.puntos);
    const maxPts=sorted[0].puntos;
    const winners=sorted.filter(r=>r.puntos===maxPts);
    const rest=sorted.filter(r=>r.puntos<maxPts);
    const secondPts=rest.length>0?rest[0].puntos:null;
    const seconds=secondPts!=null?rest.filter(r=>r.puntos===secondPts):[];
    let prizes=[];
    if(winners.length>1){
      winners.forEach(w=>prizes.push({nom:w.nombre,share:(moneyConfirmed/winners.length).toFixed(2),pos:1}));
    }else{
      prizes.push({nom:winners[0].nombre,share:(moneyConfirmed*0.7).toFixed(2),pos:1});
      if(seconds.length>0){
        const share2=moneyConfirmed*0.3/seconds.length;
        seconds.forEach(s=>prizes.push({nom:s.nombre,share:share2.toFixed(2),pos:2}));
      }
    }
    h+='<div class="card" style="margin-bottom:1.2rem;border:2px solid var(--gold);text-align:center">';
    h+='<div style="font-size:2.5rem;margin-bottom:.3rem">🏆</div>';
    h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.5rem;color:var(--gold);letter-spacing:2px;margin-bottom:.3rem">El Mundial ha acabado!</div>';
    h+='<div style="font-size:.85rem;color:var(--muted);margin-bottom:.2rem">'+fi(campeon,true)+' '+tn(campeon)+' — Campeón del Mundo 🏆</div>';
    if(finalExtras.gol)h+='<div style="font-size:.78rem;color:var(--muted)">⚽ Máximo Goleador: <strong style="color:var(--text)">'+esc(finalExtras.gol)+'</strong></div>';
    if(finalExtras.jug)h+='<div style="font-size:.78rem;color:var(--muted);margin-bottom:.8rem">🌟 Jugador del Torneo: <strong style="color:var(--text)">'+esc(finalExtras.jug)+'</strong></div>';
    h+='<div style="display:flex;justify-content:center;align-items:flex-end;gap:1rem;margin:1rem 0">';
    if(seconds.length>0){h+='<div style="text-align:center;min-width:80px"><div style="font-size:1.8rem">🥈</div>';seconds.forEach(s=>h+='<div style="font-size:.82rem;font-weight:700">'+esc(s.nombre)+'</div>');h+='<div style="font-size:.72rem;color:var(--muted)">'+secondPts+' pts</div></div>';}
    h+='<div style="text-align:center;min-width:80px"><div style="font-size:2.2rem">🥇</div>';winners.forEach(w=>h+='<div style="font-size:.9rem;font-weight:700;color:var(--gold)">'+esc(w.nombre)+'</div>');h+='<div style="font-size:.78rem;color:var(--muted)">'+maxPts+' pts</div></div>';
    if(seconds.length>0)h+='<div style="min-width:80px"></div>';
    h+='</div>';
    h+='<div style="border-top:1px solid var(--border);padding-top:.8rem">';
    h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin-bottom:.5rem">Reparto de premios</div>';
    prizes.forEach(prize=>{h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:.35rem .6rem;background:var(--surf3);border-radius:6px;margin-bottom:.3rem;max-width:320px;margin-left:auto;margin-right:auto"><span>'+(prize.pos===1?'🥇':'🥈')+' <strong>'+esc(prize.nom)+'</strong></span><span style="font-weight:700;color:var(--gold)">'+prize.share+'€</span></div>';});
    h+='</div></div>';
  }



  function badgeTip(logros){
    var earned=(logros||[]).filter(function(id){return BADGES_DEF[id];});
    if(!earned.length)return '';
    var icons=earned.map(function(id){return bi(id,true)||BADGES_DEF[id].i;}).join('');
    var list=earned.map(function(id){return '<div class="badge-item"><span>'+(bi(id,true)||BADGES_DEF[id].i)+'</span><span>'+BADGES_DEF[id].n+'</span></div>';}).join('');
    return ' <span class="badge-tip" onclick="this.classList.toggle(\'open\')">'+'<span style="font-size:.8rem;letter-spacing:1px">'+icons+'</span>'+'<div class="badge-popup"><div class="badge-popup-title">Logros</div>'+list+'</div>'+'</span>';
  }
  const renderRow=(r,rank,showRank)=>{
    const gc=rank===1?'g1':rank===2?'g2':rank===3?'g3':'',medal=rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'';
    // Position arrow
    let arrow='';
    if(showRank&&prevPos[r.nombre]!=null){
      const diff=prevPos[r.nombre]-rank;
      if(diff>0)arrow='<div style="color:#4ade80;font-size:.6rem;line-height:1;margin-top:.1rem" title="'+t('rank_arrow_up')+'">▲'+diff+'</div>';
      else if(diff<0)arrow='<div style="color:#f87171;font-size:.6rem;line-height:1;margin-top:.1rem" title="'+t('rank_arrow_dn')+'">▼'+Math.abs(diff)+'</div>';
      else arrow='<div style="color:var(--muted);font-size:.6rem;line-height:1;margin-top:.1rem" title="'+t('rank_arrow_eq')+'">=</div>';
    }
    let row='<tr><td style="text-align:center;vertical-align:middle"><div style="display:flex;flex-direction:column;align-items:center"><span class="rk '+gc+'">'+(showRank?(medal||rank):'—')+'</span>'+arrow+'</div></td>';
    row+='<td style="white-space:nowrap">'+(deadlinePassed()?'<button class="btn btn-ghost" style="font-size:.82rem;padding:.1rem .4rem;font-weight:700" data-nombre="'+esc(r.nombre)+'" onclick="viewBetDetail(this.getAttribute(\'data-nombre\'))">'+ esc(r.nombre)+'</button>':'<strong>'+esc(r.nombre)+'</strong>')+badgeTip(r.logros)+'</td>';
    row+='<td><span class="pbadge">'+(r.puntos||0)+'</span></td>';
    if(preDeadline)row+='<td>'+(r.paid?'<span class="paid-badge">✓ '+t('rank_confirmed')+'</span>':'<span class="unpaid-badge">'+t('unpaid')+'</span>')+'</td>';
    if(deadlinePassed()&&currentUser)row+='<td><button class="btn btn-ghost" style="padding:.1rem .4rem;font-size:.8rem" title="'+t('compare')+'" onclick="openCompare(\''+esc(r.nombre)+'\')">⚖️</button></td>';
    else row+='<td></td>';
    row+='</tr>';
    return row;
  };
  paidBets.forEach((r,i)=>{h+=renderRow(r,i+1,true);});
  if(preDeadline&&pendingBets.length){
    h+='<tr><td colspan="'+(preDeadline?4:3)+'" style="padding:.4rem .82rem;font-size:.73rem;color:var(--muted);background:var(--surf3)">'+t('rank_pending_row')+'</td></tr>';
    pendingBets.forEach(r=>{h+=renderRow(r,0,false);});
  }
  rc.innerHTML=h+'</tbody></table></div>';
}

// ══ SCORING (official rules) ══
// R32:  32 teams × 1pt = 32 pts max (all teams porra placed in the R32 bracket)
// Oct:  16 teams × 1pt = 16 pts max (teams porra predicted would reach last 16)
// QF:   8 teams × 1pt = 8 pts max
// SF:   4 teams × 1pt = 4 pts max (semifinalists, any path)
// Final: 2 finalists × 1pt = 2 pts max (any path)
// Champion: 3 pts
// Extras: 3+3+3 = 9 pts
// Total max: 32+16+8+4+2+3+9 = 74 pts

function getTeamsInRound(ko, round){
  // Returns set of team IDs that reached a given round
  // round: 'r32'=all 32 teams in bracket, 'oct'=R32 winners, 'qf'=Oct winners,
  //        'sf'=QF winners, 'final'=SF winners
  const winners = n => Array.from({length:n},(_,i)=>ko?.[(round==='r32'?'r32':'')+'_'+(i+1)]).filter(v=>v!=null);
  switch(round){
    case 'r32': {
      // All 32 teams = both sides of every R32 tie
      // We don't store the losers directly, but the bracket is computed from groups
      // So we return the 16 R32 winners (best we can do with stored data)
      // PLUS the 16 teams that LOST in R32 - we need those from the bracket
      // For scoring: compare porra R32 bracket vs real R32 bracket
      // Both the predicted winners AND the slots they play in
      // = the 16 R32 winner slots (already stored)
      // The "teams in R32" for the porra = the 32 teams in the computed bracket
      // For real results = also 32 teams
      // We'll handle r32 specially in calcScore
      return new Set(Array.from({length:16},(_,i)=>ko?.['r32_'+(i+1)]).filter(v=>v!=null));
    }
    case 'oct': return new Set(Array.from({length:16},(_,i)=>ko?.['r32_'+(i+1)]).filter(v=>v!=null));
    case 'qf':  return new Set(Array.from({length:8}, (_,i)=>ko?.['oct_'+(i+1)]).filter(v=>v!=null));
    case 'sf':  return new Set(Array.from({length:4}, (_,i)=>ko?.['qf_'+(i+1)]).filter(v=>v!=null));
    case 'final': return new Set(Array.from({length:2}, (_,i)=>ko?.['sf_'+(i+1)]).filter(v=>v!=null));
    default: return new Set();
  }
}

function calcScore(porra,real){
  let pts=0;
  const pk=porra.ko||{};

  // Normalize real ko: extract .w (winner) and keep h/a (slot teams)
  const rawRk=real.ko||{};
  const rSlots={}; // rSlots[slot] = {h, a, w} normalized
  Object.entries(rawRk).forEach(([k,v])=>{
    const key=k==='fin_1'?'final_1':k;
    if(v!=null&&typeof v==='object') rSlots[key]={h:v.h??null,a:v.a??null,w:v.w??null};
    else rSlots[key]={h:null,a:null,w:v??null};
  });

  // Helper: get real slot teams
  const rH=slot=>rSlots[slot]?.h??null;
  const rA=slot=>rSlots[slot]?.a??null;
  const rW=slot=>rSlots[slot]?.w??null;

  // Reconstruct porra bracket from ko winners to get h/a per slot
  // R32: porra stores winner of each r32 slot
  // Oct: built from r32 winners → oct_i.h = winner of r32_(2i-1), oct_i.a = winner of r32_(2i)
  // QF: built from oct winners
  // SF: built from qf winners
  // Final: built from sf winners

  const pW=slot=>pk[slot]??null; // porra predicted winner for slot

  // Build porra oct slots from r32 winners (correct FIFA bracket feeding)
  const pOct=[[3,4],[1,2],[9,10],[11,12],[5,6],[7,8],[13,14],[15,16]].map(([a,b],i)=>({
    slot:'oct_'+(i+1), h:pW('r32_'+a), a:pW('r32_'+b)
  }));
  // Build porra qf slots from oct winners
  const pQF=[[2,1],[5,6],[3,4],[7,8]].map(([a,b],i)=>({
    slot:'qf_'+(i+1), h:pW('oct_'+a), a:pW('oct_'+b)
  }));
  // Build porra sf slots from qf winners
  const pSF=[[1,2],[3,4]].map(([a,b],i)=>({
    slot:'sf_'+(i+1), h:pW('qf_'+a), a:pW('qf_'+b)
  }));

  // ── R32 (max 32pts): 1pt por cada equipo acertado en el cruce correcto ──
  // Los equipos de cada cruce de R32 NO se derivan de un "ganador" previo (no hay ronda
  // anterior dentro de la porra): se derivan de los grupos predichos por el participante.
  // Reconstruimos h/a de cada cruce igual que hace renderBracketReadOnly(), usando
  // r32_slots si está disponible (import Excel) o calculándolo desde grupos.
  let pR32Map={};
  if(porra.r32_slots&&Object.keys(porra.r32_slots).length>0){
    pR32Map=porra.r32_slots;
  } else {
    try{
      if(porra.grupos&&Object.keys(porra.grupos).length>0){
        const st=calcStandings(Object.fromEntries(Object.entries(porra.grupos).map(([g,ms])=>[g,ms.map(m=>({gh:m.gh,ga:m.ga}))])));
        const btRes=getBT(st);
        const r32=bR32(st,btRes.map);
        r32.forEach((tie,i)=>{pR32Map['r32_'+(i+1)]={h:tie.h,a:tie.a};});
      }
    }catch(e){}
  }
  for(let i=1;i<=16;i++){
    const slot='r32_'+i;
    const pSlot=pR32Map[slot]||{};
    const hTeam=pSlot.h??null, aTeam=pSlot.a??null;
    if(hTeam!=null&&rH(slot)!=null&&hTeam===rH(slot))pts+=1;
    if(aTeam!=null&&rA(slot)!=null&&aTeam===rA(slot))pts+=1;
  }

  // ── Octavos (max 16pts): 1pt por cada equipo acertado en slot correcto ──
  pOct.forEach(({slot,h,a})=>{
    if(h!=null&&rH(slot)!=null&&h===rH(slot))pts+=1;
    if(a!=null&&rA(slot)!=null&&a===rA(slot))pts+=1;
  });

  // ── QF (max 8pts): 1pt por cada equipo acertado en slot correcto ──
  pQF.forEach(({slot,h,a})=>{
    if(h!=null&&rH(slot)!=null&&h===rH(slot))pts+=1;
    if(a!=null&&rA(slot)!=null&&a===rA(slot))pts+=1;
  });

  // ── SF (max 4pts): 1pt por cada equipo acertado en slot correcto ──
  pSF.forEach(({slot,h,a})=>{
    if(h!=null&&rH(slot)!=null&&h===rH(slot))pts+=1;
    if(a!=null&&rA(slot)!=null&&a===rA(slot))pts+=1;
  });

  // ── Final (max 2pts): 1pt por finalista acertado sin importar lado ──
  {const pFin=new Set([pW('sf_1'),pW('sf_2')].filter(v=>v!=null));
   const rFin=new Set([rW('sf_1'),rW('sf_2')].filter(v=>v!=null));
   pFin.forEach(t=>{if(rFin.has(t))pts+=1;});}

  // ── Campeón: 3pts ──
  {const pw=pW('final_1'),rw=rW('final_1');if(pw!=null&&rw!=null&&pw===rw)pts+=3;}

  // ── Extras: 3pts cada uno (solo cuando la Final está resuelta) ──
  if(rW('final_1')!=null){
    const pe=porra.extras||{},re=real.extras||{};
    if(re.esp&&pe.esp===re.esp)pts+=3;
    if(re.gol&&pe.gol&&playerMatch(re.gol,pe.gol))pts+=3;
    if(re.jug&&pe.jug&&playerMatch(re.jug,pe.jug))pts+=3;
  }

  return pts;
}


