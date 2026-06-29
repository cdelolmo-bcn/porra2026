// ══ NUEVA PORRA ══
function goNewBet(){
  if(!currentUser){openAuthModal();return;}
  if(deadlinePassed()){alert('⛔ El plazo ha cerrado, no se pueden enviar nuevas porras.');return;}
  // Reset form silently (no confirm needed - user explicitly clicked Nueva Porra)
  isEditing=false;
  Object.keys(localStorage).filter(k=>k.startsWith('p_')||k.startsWith('ext-')||k.startsWith('ko_')).forEach(k=>localStorage.removeItem(k));
  currentStep=0;
  showPage('porra');
  renderStep(0);
}
function newBet(){
  if(!confirm(t('confirm_new')))return;
  // Clear all localStorage draft keys
  const keys=Object.keys(localStorage).filter(k=>k.startsWith('p_'));
  keys.forEach(k=>localStorage.removeItem(k));
  document.getElementById('bet-status-banner').innerHTML='';
  currentStep=0;renderStep(0);
  window.scrollTo(0,0);
}

// ══ VIEW BET DETAIL ══
function renderBracketReadOnly(ko, realKo, grupos, r32Slots){
  // ko: porra ko data {r32_1: teamId, ...}
  // realKo: real ko data {r32_1: {h,a,w}, ...} or null
  // grupos: porra grupos data for R32 reconstruction
  const rH=slot=>{if(!realKo)return null;const v=realKo[slot==='final_1'?'fin_1':slot]||realKo[slot];return v&&typeof v==='object'?v.h:null;};
  const rA=slot=>{if(!realKo)return null;const v=realKo[slot==='final_1'?'fin_1':slot]||realKo[slot];return v&&typeof v==='object'?v.a:null;};
  const rW=slot=>{if(!realKo)return null;const v=realKo[slot==='final_1'?'fin_1':slot]||realKo[slot];return v&&typeof v==='object'?v.w:v;};

  // Reconstruir R32 siempre desde grupos (más fiable que r32_slots que puede tener
  // datos corruptos de importación Excel). r32_slots solo como fallback si no hay grupos.
  let pR32Map={};
  try{
    if(grupos&&Object.keys(grupos).length>0){
      const st=calcStandings(Object.fromEntries(Object.entries(grupos).map(([g,ms])=>[g,ms.map(m=>({gh:m.gh,ga:m.ga}))])));
      const btRes=getBT(st);
      const r32=bR32(st,btRes.map);
      r32.forEach((tie,i)=>{pR32Map['r32_'+(i+1)]={h:tie.h,a:tie.a};});
    }
  }catch(e){}
  if(Object.keys(pR32Map).length===0&&r32Slots&&Object.keys(r32Slots).length>0){
    pR32Map=r32Slots;
  }

  // Build porra h/a for each phase from winners
  const pW=slot=>ko?.[slot]??null;
  const pOct=[[1,2],[3,4],[5,6],[7,8],[9,10],[11,12],[13,14],[15,16]].map(([a,b],i)=>({slot:'oct_'+(i+1),h:pW('r32_'+a),a:pW('r32_'+b)}));
  const pQF=[[2,1],[5,6],[3,4],[7,8]].map(([a,b],i)=>({slot:'qf_'+(i+1),h:pW('oct_'+a),a:pW('oct_'+b)}));
  const pSF=[[1,2],[3,4]].map(([a,b],i)=>({slot:'sf_'+(i+1),h:pW('qf_'+a),a:pW('qf_'+b)}));
  const pFin={slot:'final_1',h:pW('sf_1'),a:pW('sf_2')};

  function matchCard(slot, ph, pa, pw, showSlot){
    const rh=rH(slot), ra=rA(slot), rw=rW(slot);
    const hOk=rh!=null&&ph===rh, aOk=ra!=null&&pa===ra;
    const wOk=rw!=null&&pw===rw;
    let h='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem;margin-bottom:.35rem">';
    if(showSlot)h+='<div style="font-size:.6rem;color:var(--muted);margin-bottom:.2rem">'+slot.replace('_',' ').toUpperCase()+'</div>';
    // Home team
    h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:.15rem 0;border-bottom:1px solid var(--border)">';
    h+='<div style="display:flex;align-items:center;gap:.3rem;font-size:.8rem;'+(pw===ph?'font-weight:700;color:var(--gold)':'')+'">';
    h+=ph!=null?fi(ph,true)+' '+tn(ph):'<span style="color:var(--muted)">—</span>';
    h+='</div>';
    if(ph!=null&&rh!=null)h+='<span style="font-size:.65rem">'+(hOk?'✅':'❌')+'</span>';
    h+='</div>';
    // Away team
    h+='<div style="display:flex;align-items:center;justify-content:space-between;padding:.15rem 0">';
    h+='<div style="display:flex;align-items:center;gap:.3rem;font-size:.8rem;'+(pw===pa?'font-weight:700;color:var(--gold)':'')+'">';
    h+=pa!=null?fi(pa,true)+' '+tn(pa):'<span style="color:var(--muted)">—</span>';
    h+='</div>';
    if(pa!=null&&ra!=null)h+='<span style="font-size:.65rem">'+(aOk?'✅':'❌')+'</span>';
    h+='</div>';
    h+='</div>';
    return h;
  }

  let h='';

  // R32
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.5rem 0 .3rem">Ronda de 32</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem">';
  h+='<div><div style="font-size:.65rem;color:var(--muted);text-align:center;margin-bottom:.2rem">'+t('left_half')+'</div>';
  for(let i=1;i<=16;i++){
    if(i===9)h+='</div><div><div style="font-size:.65rem;color:var(--muted);text-align:center;margin-bottom:.2rem">'+t('right_half')+'</div>';
    const slot='r32_'+i;
    const pw=pW(slot);
    // Use porra grupos reconstruction first, then real data as fallback
    const pSlot=pR32Map[slot]||{};
    const hTeam=pSlot.h??rH(slot)??null;
    const aTeam=pSlot.a??rA(slot)??null;
    const rh=rH(slot),ra=rA(slot);
    let card='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:.4rem .6rem;margin-bottom:.35rem">';
    card+='<div style="font-size:.6rem;color:var(--muted);margin-bottom:.2rem">R32-'+i+'</div>';
    // Local
    card+='<div style="display:flex;align-items:center;justify-content:space-between;padding:.12rem 0;border-bottom:1px solid var(--border)">';
    card+='<div style="font-size:.78rem;'+(pw===hTeam&&hTeam!=null?'font-weight:700;color:var(--gold)':'')+'">'+(hTeam!=null?fi(hTeam,true)+' '+tn(hTeam):'<span style="color:var(--muted)">—</span>')+'</div>';
    if(hTeam!=null&&rh!=null)card+='<span style="font-size:.65rem">'+(hTeam===rh?'✅':'❌')+'</span>';
    card+='</div>';
    // Visitante
    card+='<div style="display:flex;align-items:center;justify-content:space-between;padding:.12rem 0">';
    card+='<div style="font-size:.78rem;'+(pw===aTeam&&aTeam!=null?'font-weight:700;color:var(--gold)':'')+'">'+(aTeam!=null?fi(aTeam,true)+' '+tn(aTeam):'<span style="color:var(--muted)">—</span>')+'</div>';
    if(aTeam!=null&&ra!=null)card+='<span style="font-size:.65rem">'+(aTeam===ra?'✅':'❌')+'</span>';
    card+='</div></div>';
    h+=card;
  }
  h+='</div></div>';

  // Octavos — left: 1,2,5,6 / right: 3,4,7,8
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.5rem 0 .3rem">Octavos de Final</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem">';
  h+='<div>';
  [0,1,4,5].forEach(i=>{const {slot,h:ph,a:pa}=pOct[i];h+=matchCard(slot,ph,pa,pW(slot),true);});
  h+='</div><div>';
  [2,3,6,7].forEach(i=>{const {slot,h:ph,a:pa}=pOct[i];h+=matchCard(slot,ph,pa,pW(slot),true);});
  h+='</div></div>';

  // QF — left: 1,2 / right: 3,4
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.5rem 0 .3rem">Cuartos de Final</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem">';
  h+='<div>';
  [0,1].forEach(i=>{const {slot,h:ph,a:pa}=pQF[i];h+=matchCard(slot,ph,pa,pW(slot),true);});
  h+='</div><div>';
  [2,3].forEach(i=>{const {slot,h:ph,a:pa}=pQF[i];h+=matchCard(slot,ph,pa,pW(slot),true);});
  h+='</div></div>';

  // SF — left: 1 / right: 2
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.5rem 0 .3rem">Semifinales</div>';
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:.4rem">';
  h+='<div>'+matchCard(pSF[0].slot,pSF[0].h,pSF[0].a,pW(pSF[0].slot),true)+'</div>';
  h+='<div>'+matchCard(pSF[1].slot,pSF[1].h,pSF[1].a,pW(pSF[1].slot),true)+'</div>';
  h+='</div>';

  // Final
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.5rem 0 .3rem">🏆 Final</div>';
  h+=matchCard(pFin.slot,pFin.h,pFin.a,pW('final_1'),false);

  return h;
}

async function viewBetDetail(nombre){
  const{data,error}=await dbq(c=>(window._sbAnon||sb).from('porras').select('nombre,puntos,paid,updated_at,data,user_id,logros').eq('nombre',nombre).limit(1).maybeSingle());
  // data/error already set by dbq above
  if(error){console.error('viewBetDetail error:',error.message);showMsg('porra-msg','Error al cargar la porra: '+error.message,'err');return;}
  if(!data){showMsg('porra-msg','No se encontró la porra.','err');return;}
  const p=JSON.parse(data.data);
  const allT=TNAMES[LANG]||TNAMES.es;
  const dm=document.getElementById('detail-modal');
  if(dm)dm.style.display='flex';
  document.getElementById('detail-title').textContent=t('detail_title')+': '+nombre;
  let h='';
  // Paid status
  h+='<div style="display:flex;gap:.75rem;align-items:center;margin-bottom:1rem;flex-wrap:wrap">';
  h+='<span class="'+(data.paid?'paid-badge':'unpaid-badge')+'" style="font-size:.85rem;padding:.2rem .7rem">'+(data.paid?'✓ '+t('paid'):t('unpaid'))+'</span>';
  h+='<span style="color:var(--muted);font-size:.82rem">'+t('pts')+': <strong>'+data.puntos+'</strong></span>';
  h+='<span style="color:var(--muted);font-size:.8rem">'+new Date(data.updated_at).toLocaleString()+'</span>';
  // email not shown publicly
  h+='</div>';
  // Groups
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--accent);letter-spacing:1px;margin-bottom:.5rem">FASE DE GRUPOS</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:.5rem;margin-bottom:1rem">';
  Object.entries(GROUPS).forEach(([g,gd])=>{
    const pg=p.grupos?.[g]||[];
    h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:.65rem">';
    h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.82rem;color:var(--accent);margin-bottom:.35rem">GRUPO '+g+'</div>';
    gd.m.forEach(([pi,ai],idx)=>{
      const ti=gd.t[pi],aj=gd.t[ai],m=pg[idx];
      const gh=m?.gh,ga=m?.ga;
      const hasRes=gh!=null&&ga!=null;
      const sgn=v=>v>0?1:v<0?-1:0;
      const resColor=hasRes?(sgn(gh-ga)>0?'var(--green)':sgn(gh-ga)<0?'#f87171':'var(--muted)'):'var(--muted)';
      h+='<div style="display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:.3rem;font-size:.75rem;margin-bottom:.18rem">';
      h+='<span style="text-align:right;white-space:nowrap">'+fi(ti,true)+' '+allT[ti]+'</span>';
      h+='<span style="font-weight:700;color:var(--gold);white-space:nowrap;text-align:center;min-width:2.5rem">'+(hasRes?gh+' : '+ga:'- : -')+'</span>';
      h+='<span style="text-align:left;white-space:nowrap">'+allT[aj]+' '+fi(aj,true)+'</span>';
      h+='</div>';
    });
    h+='</div>';
  });
  h+='</div>';
  // KO bracket
  // Load real results for comparison
  let realKoData=null;
  try{const{data:rd}=await dbq(c=>(window._sbAnon||sb).from('resultados').select('data').eq('id',1).single());if(rd)realKoData=JSON.parse(rd.data).ko;}catch(e){}
  h+=renderBracketReadOnly(p.ko||{},realKoData,p.grupos||{});
  // Extras
  const ex=p.extras||{};
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.65rem 0 .35rem">EXTRAS</div>';
  h+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.45rem">';
  if(ex.camp!=null)h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:6px;padding:.45rem .7rem;font-size:.8rem">🥇 '+t('winner')+'<br><strong>'+fi(ex.camp,true)+' '+allT[ex.camp]+'</strong></div>';
  if(ex.esp)h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:6px;padding:.45rem .7rem;font-size:.8rem">'+fi(28,true)+' '+t('spain_pos')+'<br><strong>'+fmtEsp(ex.esp)+'</strong></div>';
  if(ex.gol)h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:6px;padding:.45rem .7rem;font-size:.8rem">⚽ '+t('top_scorer')+'<br><strong>'+ex.gol+'</strong></div>';
  if(ex.jug)h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:6px;padding:.45rem .7rem;font-size:.8rem">🌟 '+t('best_player')+'<br><strong>'+ex.jug+'</strong></div>';
  h+='</div>';
  // Badges
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin:.65rem 0 .35rem">🏅 LOGROS</div>';
  h+=renderBadges(data.logros||[],false);
  // Gráfica evolución si hay user_id
  if(data.user_id){
    h+='<div class="card-title" style="margin-top:1rem">📈 Evolución en el Torneo</div>';
    h+='<div class="chart-wrap"><canvas id="chart-evolucion"></canvas></div>';
  }
  document.getElementById('detail-content').innerHTML=h;
  if(data.user_id)setTimeout(()=>dibujarGraficaEvolucion(data.user_id,'chart-evolucion'),100);
  const modal=document.getElementById('detail-modal');modal.style.display='flex';
}
function closeDetail(){const dm=document.getElementById('detail-modal');if(dm)dm.style.display='none';}
async function recalcAll(realData){
  if(!sb)return;
  if(!realData){const{data}=await sb.from('resultados').select('data').eq('id',1).single();if(!data){showMsg('rc-msg','Sin resultados guardados','err');return;}realData=JSON.parse(data.data);}
  const{data:porras}=await sb.from('porras').select('nombre,data');if(!porras)return;
  // Calcular posiciones antes y después para badges de remontada
  const{data:histPrev}=await sb.from('historial_ranking').select('user_id,posicion').eq('fecha',new Date(Date.now()-86400000).toISOString().slice(0,10));
  const prevPos=Object.fromEntries((histPrev||[]).map(h=>[h.user_id,h.posicion]));
  // Calcular pts y badges para cada porra
  const scored=porras.map(row=>{
    const p=JSON.parse(row.data||'{}');
    const pts=calcScore(p,realData);
    return{...row,pts,p};
  }).sort((a,b)=>b.pts-a.pts);
  // Contar mensajes por user
  const{data:msgs}=await sb.from('muro_mensajes').select('user_id,id').then(r=>r);
  const msgCount=Object.fromEntries(Object.entries(
    (msgs||[]).reduce((acc,m)=>{acc[m.user_id]=(acc[m.user_id]||0)+1;return acc;},{})
  ));
  for(let i=0;i<scored.length;i++){
    const row=scored[i],posActual=i+1,posAnterior=prevPos[row.user_id]||null;
    const badges=calcBadges(row.p,realData,posActual,posAnterior,msgCount[row.user_id]||0,false);
    await sb.from('porras').update({puntos:row.pts,logros:badges}).eq('nombre',row.nombre);
  }
  const count=porras.length;
  const el=document.getElementById('rc-msg');if(el)showMsg('rc-msg','✅ '+count+' porras recalculadas','ok');
  await guardarHistorial();
}
function buildSQL(){
  return'<div class="alert ainfo">Ejecuta en <strong>Supabase → SQL Editor → New query</strong></div><div class="sql-box">-- PRIMERA VEZ (tablas nuevas):\ncreate table if not exists porras (\n  id         bigserial primary key,\n  nombre     text unique not null,\n  email      text,\n  data       text,\n  puntos     integer default 0,\n  paid       boolean default false,\n  updated_at timestamptz default now()\n);\ncreate table if not exists resultados (\n  id   integer primary key default 1,\n  data text\n);\nalter table porras     enable row level security;\nalter table resultados enable row level security;\ncreate policy "porras_read"   on porras    for select using (true);\ncreate policy "porras_insert" on porras    for insert with check (true);\ncreate policy "porras_update" on porras    for update using (true);\ncreate policy "res_read"      on resultados for select using (true);\ncreate policy "res_all"       on resultados for all    using (true);\n\n-- SI YA TIENES LA TABLA (solo añadir columna paid):\nALTER TABLE porras ADD COLUMN IF NOT EXISTS paid boolean default false;</div><button class="btn btn-primary" onclick="navigator.clipboard.writeText(document.querySelector(\'.sql-box\').textContent.trim());this.textContent=\'✅ Copiado!\'">📋 Copiar SQL</button>';
}
// ══ MIS PORRAS ══
// Load all bets (called on page open)
async function loadAllMyBets(){
  const mc=document.getElementById('my-bets-container');
  if(!mc||!sb)return;
  if(!currentUser){mc.innerHTML='<div class="alert ainfo">Inicia sesión para ver tus porras.</div>';return;}
  mc.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)"><div class="spin"></div></div>';
  const{data,error}=await dbq(c=>c.from('porras').select('nombre,puntos,paid,updated_at,data').eq('user_id',currentUser.id).order('updated_at',{ascending:false}), true);
  if(error){mc.innerHTML='<div class="alert aerr">'+error.message+'</div>';return;}
  if(!data?.length){
    mc.innerHTML='<div class="alert ainfo" style="text-align:center">'+t('no_bets')+'<br><br><button class="btn btn-success" onclick="goNewBet()">'+t('new_bet')+'</button></div>';
    return;
  }
  renderMyBetsList(data);
}

async function searchMyBets(){
  if(!sb)return;
  const q=document.getElementById('search-name')?.value.trim();
  const mc=document.getElementById('my-bets-container');
  if(!q){loadAllMyBets();return;}
  mc.innerHTML='<div class="spin"></div>';
  // Load all and filter client-side (handles accents, case)
  const{data,error}=await dbq(c=>(window._sbAnon||sb).from('porras').select('nombre,puntos,paid,updated_at,data').order('nombre'));
  if(error){c.innerHTML='<div class="alert aerr">'+error.message+'</div>';return;}
  const norm=s=>s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'');
  const filtered=(data||[]).filter(r=>norm(r.nombre).includes(norm(q)));
  if(!filtered.length){mc.innerHTML='<div class="alert aerr">'+t('no_results')+'</div>';return;}
  renderMyBetsList(filtered);
}

function renderMyBetsList(data){
  const c=document.getElementById('my-bets-container');
  if(!c)return;
  const allT=TNAMES[LANG]||TNAMES.es;
  const canEdit=!deadlinePassed();
  let h='';
  data.forEach(r=>{
    const p=JSON.parse(r.data||'{}');
    const ex=p.extras||{};
    // Summary line: champion + spain pos
    const champStr=ex.camp!=null?fi(ex.camp,true)+' '+allT[ex.camp]:'—';
    const espStr=ex.esp||'—';
    h+='<div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:1rem;margin-bottom:.75rem">';
    // Header row
    h+='<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.5rem;margin-bottom:.65rem">';
    h+='<div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap">';
    h+='<strong style="font-size:1rem">'+esc(r.nombre)+'</strong>';
    h+='<span class="'+(r.paid?'paid-badge':'unpaid-badge')+'">'+(r.paid?'✓ '+t('paid'):t('unpaid'))+'</span>';
    h+='<span class="pbadge">'+r.puntos+' '+t('pts')+'</span>';
    h+='</div>';
    h+='<div style="display:flex;gap:.4rem">';
    h+='<button class="btn btn-ghost" style="font-size:.76rem;padding:.28rem .6rem" data-nombre="'+esc(r.nombre)+'" onclick="viewBetDetail(this.getAttribute(\'data-nombre\'))">'+t('view_bet')+'</button>';
    if(canEdit){
      h+='<button class="btn btn-primary" style="font-size:.76rem;padding:.28rem .6rem" data-nombre="'+esc(r.nombre)+'" onclick="loadBetForEdit(this.getAttribute(\'data-nombre\'))">'+t('edit_bet')+'</button>';
    }
    h+='</div></div>';
    // Quick summary
    h+='<div style="display:flex;gap:1rem;flex-wrap:wrap;font-size:.8rem;color:var(--muted)">';
    h+='<span>🥇 '+champStr+'</span>';
    h+='<span>'+fi(28,true)+' '+fmtEsp(espStr)+'</span>';
    if(ex.gol)h+='<span>⚽ '+esc(ex.gol)+'</span>';
    if(ex.jug)h+='<span>🌟 '+esc(ex.jug)+'</span>';
    h+='<span style="margin-left:auto;font-size:.74rem">'+new Date(r.updated_at).toLocaleString()+'</span>';
    h+='</div>';
    if(!r.paid)h+='<div class="alert awarn" style="margin-top:.6rem;margin-bottom:0;font-size:.78rem;padding:.4rem .7rem">'+t('pending_warn')+'</div>';
    h+='</div>';
  });
  if(!canEdit)h+='<div class="alert aerr" style="margin-top:.5rem">'+t('closed_edit')+'</div>';
  c.innerHTML=h;
}

async function loadBetForEdit(nombre){
  if(deadlinePassed()){showPage('porras');return;}
  if(!currentUser){openAuthModal();return;}
  const{data,error}=await sb.from('porras').select('nombre,email,data').eq('nombre',nombre).eq('user_id',currentUser.id).single();
  if(error||!data)return;
  const p=JSON.parse(data.data||'{}');
  // Clear all draft keys first
  Object.keys(localStorage).filter(k=>k.startsWith('p_')).forEach(k=>localStorage.removeItem(k));
  // Load personal data
  ss('p-name',data.nombre||'');
  ss('p-email',data.email||'');
  // Load groups
  Object.entries(GROUPS).forEach(([g,gd])=>{
    const pg=p.grupos?.[g]||[];
    gd.m.forEach(([pi,ai],idx)=>{
      const m=pg[idx]||{};
      ss('m_g'+g+'_'+idx+'_h',m.gh!=null?String(m.gh):'');
      ss('m_g'+g+'_'+idx+'_a',m.ga!=null?String(m.ga):'');
    });
  });
  // Load KO winners
  const allKO=[...Array.from({length:16},(_,i)=>'r32_'+(i+1)),...Array.from({length:8},(_,i)=>'oct_'+(i+1)),...Array.from({length:4},(_,i)=>'qf_'+(i+1)),...Array.from({length:2},(_,i)=>'sf_'+(i+1)),'final_1'];
  allKO.forEach(k=>{const v=p.ko?.[k];if(v!=null)ss('ko_'+k+'_w',String(v));});
  // Load extras
  const ex=p.extras||{};
  if(ex.camp!=null)ss('ext-camp',String(ex.camp));
  if(ex.esp)ss('ext-esp',ex.esp);
  if(ex.gol)ss('ext-gol',ex.gol);
  if(ex.jug)ss('ext-jug',ex.jug);
  // Go to form in edit mode
  isEditing=true;
  showPage('porra');
  currentStep=0;renderStep(0);
  const banner=document.getElementById('bet-status-banner');
  if(banner)banner.innerHTML='<div class="alert ainfo">'+t('edit_loaded')+'</div>';
  window.scrollTo(0,0);
}


// ══ NORMAS PAGE ══
function toggleDebug(){
  const active=localStorage.getItem('debug_started')==='1';
  if(active){localStorage.removeItem('debug_started');}
  else{localStorage.setItem('debug_started','1');}
  updateDebugBar();
  // Reload current page to apply changes
  const p=document.querySelector('.page.active');
  if(p)showPage(p.id.replace('page-',''));
  renderDeadline();
}
function updateDebugBar(){
  const bar=document.getElementById('debug-bar');
  if(!bar)return;
  if(isAdmin&&localStorage.getItem('debug_started')==='1')bar.classList.add('active');
  else bar.classList.remove('active');
}
function renderNormas(){
  const nc=document.getElementById('normas-content');
  if(!nc){setTimeout(renderNormas,100);return;}
  const PRICE=5;
  const whatsapp='https://chat.whatsapp.com/Lr5zzxPFjPdFmlFsoQZ69f';
  let h='';
  const section=(icon,title,body)=>'<div class="card" style="margin-bottom:1rem"><div class="card-title">'+icon+' '+title+'</div>'+body+'</div>';
  const li=(items)=>'<ul style="margin-left:1.2rem;color:var(--text);font-size:.9rem;line-height:1.8">'+items.map(i=>'<li>'+i+'</li>').join('')+'</ul>';
  const p=(txt)=>'<p style="font-size:.9rem;line-height:1.7;margin-bottom:.6rem">'+txt+'</p>';
  const tr=(k)=>t(k);  // alias

  // Objetivo
  h+=section('🎯',tr('n_obj_title'),
    p(tr('n_obj1'))+
    p(tr('n_obj2').replace('{price}',PRICE))+
    p(tr('n_obj3'))
  );

  // Cómo rellenar
  h+=section('📋',tr('n_how_title'),
    '<div style="margin-bottom:.75rem">'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.9rem;margin-bottom:.5rem;border-left:3px solid var(--accent)">'+
    '<strong style="color:var(--accent)">'+tr('n_how1_title')+'</strong><br>'+
    '<span style="font-size:.87rem;color:var(--muted)">'+tr('n_how1_body')+'</span></div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.9rem;margin-bottom:.5rem;border-left:3px solid var(--green)">'+
    '<strong style="color:var(--green)">'+tr('n_how2_title')+'</strong><br>'+
    '<span style="font-size:.87rem;color:var(--muted)">'+tr('n_how2_body')+'</span></div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.9rem;border-left:3px solid var(--gold)">'+
    '<strong style="color:var(--gold)">'+tr('n_how3_title')+'</strong><br>'+
    '<span style="font-size:.87rem;color:var(--muted)">'+tr('n_how3_body')+'</span></div></div>'
  );

  // Puntuación
  h+=section('🏆',tr('n_pts_title'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:.5rem;margin-bottom:.75rem">'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.8rem;color:var(--green);font-weight:700">0</div><div style="font-size:.78rem;color:var(--muted)">'+tr('n_pts_groups')+'</div></div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.8rem;color:var(--green);font-weight:700">1</div><div style="font-size:.78rem;color:var(--muted)">'+tr('n_pts_ko')+'</div></div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.8rem;color:var(--gold);font-weight:700">3</div><div style="font-size:.78rem;color:var(--muted)">'+tr('n_pts_champ')+'</div></div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.8rem;color:var(--accent);font-weight:700">3</div><div style="font-size:.78rem;color:var(--muted)">'+tr('n_pts_player')+'</div></div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.8rem;color:var(--accent);font-weight:700">3</div><div style="font-size:.78rem;color:var(--muted)">'+tr('n_pts_scorer')+'</div></div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.75rem;text-align:center"><div style="font-size:1.8rem;color:var(--accent);font-weight:700">3</div><div style="font-size:.78rem;color:var(--muted)">'+tr('n_pts_spain')+'</div></div>'+
    '</div>'+
    '<div style="background:var(--surf3);border-radius:7px;padding:.65rem .75rem;font-size:.82rem;line-height:1.7">'+
    '📌 '+tr('n_pts_note1')+'<br>'+
    '📌 '+tr('n_pts_note2')+'<br><br>'+
    tr('n_pts_max')+'</div>'
  );

  // TODO: ejemplo de puntuación

  // Desempates
  h+=section('⚖️',tr('n_tb_title'),
    p(tr('n_tb_intro'))+
    li([tr('n_tb1'),tr('n_tb2'),tr('n_tb3'),tr('n_tb4'),tr('n_tb5')])
  );

  // Premios
  h+=section('💰',tr('n_prizes_title'),
    p('<strong>'+tr('n_prizes_price').replace('{price}',PRICE)+'</strong>')+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.75rem">'+
    '<div style="background:linear-gradient(135deg,#1a1a00,#2a2200);border:1px solid var(--gold);border-radius:10px;padding:1rem;text-align:center">'+
    '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.5rem;color:#ffd700">🥇 '+tr('n_prizes_1st')+'</div>'+
    '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:2.5rem;color:var(--gold)">70%</div>'+
    '<div style="font-size:.82rem;color:var(--muted)">'+tr('n_prizes_of_total')+'</div></div>'+
    '<div style="background:linear-gradient(135deg,#0a1a0a,#0a2a0a);border:1px solid #c0c0c0;border-radius:10px;padding:1rem;text-align:center">'+
    '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1.5rem;color:#c0c0c0">🥈 '+tr('n_prizes_2nd')+'</div>'+
    '<div style="font-family:\'Bebas Neue\',sans-serif;font-size:2.5rem;color:#c0c0c0">30%</div>'+
    '<div style="font-size:.82rem;color:var(--muted)">'+tr('n_prizes_of_total')+'</div></div>'+
    '</div>'+
    '<div style="background:var(--surf2);border-radius:8px;padding:.8rem;font-size:.84rem">'+
    '<strong>'+tr('n_prizes_ties')+'</strong><br>'+
    '• '+tr('n_prizes_tie1')+'<br>'+
    '• '+tr('n_prizes_tie2')+'<br><br>'+
    '<strong>'+tr('n_prizes_ex')+'</strong></div>'
  );

  // Normas generales
  h+=section('📌',tr('n_rules_title'),
    li([tr('n_rules1'),tr('n_rules2'),tr('n_rules3'),tr('n_rules4')])
  );

  // Privacidad
  h+=section('🔒',tr('n_priv_title'),
    '<div style="font-size:.87rem;line-height:1.75">'+
    '<p style="margin:0 0 .5rem">'+tr('n_priv_1')+'</p>'+
    '<p style="margin:0 0 .5rem">'+tr('n_priv_2')+'</p>'+
    '<p style="margin:0 0 .5rem">'+tr('n_priv_3')+'</p>'+
    '<p style="margin:0">'+tr('n_priv_4')+'</p>'+
    '</div>'
  );

  // WhatsApp
  h+=section('💬',tr('n_wa_title'),
    p(tr('n_wa_body'))+
    '<a href="'+whatsapp+'" target="_blank" style="display:inline-flex;align-items:center;gap:.5rem;background:#25D366;color:#fff;padding:.6rem 1.2rem;border-radius:8px;font-weight:600;text-decoration:none;font-size:.9rem">💬 '+tr('n_wa_btn')+'</a>'
  );

  h+='<div style="text-align:center;padding:.75rem 0 .25rem;font-size:.72rem;color:var(--surf3);opacity:.5">v1.5.4</div>';
  nc.innerHTML=h;
}
// ══ HISTORIAL RANKING ══
async function guardarHistorial(){
  if(!sb||!isAdmin)return;
  const{data:porras}=await sb.from('porras').select('user_id,puntos').eq('paid',true);
  if(!porras?.length)return;
  // Get current positions
  const sorted=[...porras].sort((a,b)=>b.puntos-a.puntos);
  const rows=sorted.map((p,i)=>({user_id:p.user_id,posicion:i+1,puntos:p.puntos})).filter(r=>r.user_id);
  if(!rows.length)return;
  await sb.from('historial_ranking').upsert(rows,{onConflict:'user_id,fecha'});
}

async function dibujarGraficaEvolucion(userId,canvasId){
  if(!sb)return;
  const{data,error}=await sb.from('historial_ranking').select('posicion,puntos,fecha').eq('user_id',userId).order('fecha',{ascending:true});
  if(error||!data?.length)return;
  const ctx=document.getElementById(canvasId);if(!ctx)return;
  // Destroy previous chart if exists
  if(ctx._chart)ctx._chart.destroy();
  ctx._chart=new Chart(ctx,{
    type:'line',
    data:{
      labels:data.map(d=>new Date(d.fecha).toLocaleDateString([],{month:'short',day:'numeric'})),
      datasets:[{
        label:'Posición',
        data:data.map(d=>d.posicion),
        borderColor:'#f4a261',
        backgroundColor:'rgba(244,162,97,.12)',
        tension:.4,fill:true,pointRadius:4,pointBackgroundColor:'#f4a261'
      },{
        label:'Puntos',
        data:data.map(d=>d.puntos),
        borderColor:'#2a9d8f',
        backgroundColor:'rgba(42,157,143,.08)',
        tension:.4,fill:false,pointRadius:3,pointBackgroundColor:'#2a9d8f',
        yAxisID:'y2'
      }]
    },
    options:{
      responsive:true,maintainAspectRatio:false,
      plugins:{legend:{labels:{color:'#94a3b8',font:{size:11}}}},
      scales:{
        y:{reverse:true,ticks:{precision:0,color:'#f4a261',font:{size:10}},grid:{color:'rgba(255,255,255,.05)'},title:{display:true,text:'Posición',color:'#f4a261',font:{size:10}}},
        y2:{position:'right',ticks:{precision:0,color:'#2a9d8f',font:{size:10}},grid:{display:false},title:{display:true,text:'Puntos',color:'#2a9d8f',font:{size:10}}},
        x:{ticks:{color:'#64748b',font:{size:10}},grid:{color:'rgba(255,255,255,.04)'}}
      }
    }
  });
}

