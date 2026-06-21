// ══ AUTH FUNCTIONS ══
function showConfirmModal(title, msg, onConfirm){
  document.getElementById('confirm-title').textContent=title;
  document.getElementById('confirm-msg').textContent=msg;
  const btn=document.getElementById('confirm-ok-btn');
  btn.onclick=()=>{closeConfirmModal();onConfirm();};
  document.getElementById('confirm-modal').classList.add('open');
}
function closeConfirmModal(){
  document.getElementById('confirm-modal').classList.remove('open');
}
function openAuthModal(){
  document.getElementById('auth-modal').classList.add('open');
  document.getElementById('auth-msg').textContent='';
  document.getElementById('auth-email').value='';
  document.getElementById('auth-pass').value='';
}
function closeAuthModal(){document.getElementById('auth-modal').classList.remove('open');}

async function loginGoogle(){
  const{error}=await sb.auth.signInWithOAuth({
    provider:'google',
    options:{redirectTo:window.location.href}
  });
  if(error)document.getElementById('auth-msg').textContent='Error: '+error.message;
}

async function loginEmail(){
  const email=document.getElementById('auth-email').value.trim();
  const pass=document.getElementById('auth-pass').value;
  const msg=document.getElementById('auth-msg');
  if(!email||!pass){msg.textContent='Rellena email y contraseña.';return;}
  msg.textContent='⏳ Conectando...';
  let{error}=await sb.auth.signInWithPassword({email,password:pass});
  if(error&&(error.message.includes('Invalid login')||error.message.includes('invalid_credentials'))){
    const{error:e2}=await sb.auth.signUp({email,password:pass});
    if(e2){msg.style.color='var(--red)';msg.textContent='Error: '+e2.message;return;}
    msg.style.color='var(--green)';msg.textContent='✅ Cuenta creada. Revisa tu email para confirmar.';
    return;
  }
  if(error){msg.style.color='var(--red)';msg.textContent='Error: '+error.message;return;}
  msg.style.color='var(--green)';msg.textContent='✅ ¡Bienvenido!';
}

async function deleteAccount(){
  closeUserMenu();
  if(!currentUser)return;
  showConfirmModal(
    '🗑 Eliminar cuenta',
    'Tus porras enviadas y pagadas permanecerán en la clasificación con tu nombre, pero ya no podrás editarlas. Esta acción no se puede deshacer.',
    async()=>{
      try{
        await sb.from('porras').update({user_id:null}).eq('user_id',currentUser.id);
        await sb.auth.signOut();
        currentUser=null;isAdmin=false;
        await onAuthChange(null);
        showPage('ranking');
        showConfirmModal('✅ Cuenta desvinculada','Tus datos personales han sido eliminados. Las porras pagadas siguen en la clasificación.',()=>{});
      }catch(e){
        showConfirmModal('❌ Error',e.message+' — Contacta con el organizador.',()=>{});
      }
    }
  );
}

async function logout(){
  console.log('[AUTH] logout called, sb state check...');
  closeUserMenu();
  currentUser=null;
  isAdmin=false;
  // Try signOut with timeout — if sb is blocked, clear session manually
  console.log('[AUTH] calling sb.auth.signOut()...');
  const signOutPromise=sb.auth.signOut().catch((e)=>{console.warn('[AUTH] signOut error:',e.message);});
  const timeout=new Promise(r=>setTimeout(r,3000));
  await Promise.race([signOutPromise,timeout]);
  console.log('[AUTH] clearing localStorage keys...');
  // Clear Supabase session from localStorage regardless
  Object.keys(localStorage).filter(k=>k.startsWith('sb-')||k.includes('supabase')).forEach(k=>localStorage.removeItem(k));
  await onAuthChange(null);
  showPage('ranking');
}

function showUserMenu(){
  const m=document.getElementById('user-menu');
  const btn=document.getElementById('user-badge-btn');
  if(m.style.display==='none'||m.style.display===''){
    const r=btn.getBoundingClientRect();
    m.style.top=(r.bottom+6)+'px';
    m.style.right=(window.innerWidth-r.right)+'px';
    m.style.display='block';
  }else{
    m.style.display='none';
  }
}
function closeUserMenu(){document.getElementById('user-menu').style.display='none';}

document.addEventListener('click',e=>{
  const menu=document.getElementById('user-menu');
  const badge=document.getElementById('user-badge-btn');
  if(menu&&badge&&!menu.contains(e.target)&&!badge.contains(e.target)){
    menu.style.display='none';
  }
});

function showPage(id){
  if(id==='fantasy'){
    if(!currentUser){openAuthModal();return;}
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.getElementById('page-fantasy')?.classList.add('active');
    document.getElementById('tab-fantasy')?.classList.add('active');
    fantasyTab('myteam',document.getElementById('ftab-myteam'));
    return;
  }
  if((id==='porras'||id==='porra')&&!currentUser){openAuthModal();return;}
  if(id==='admin'&&!isAdmin&&localStorage.getItem('debug_started')!=='1')return;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('page-'+id)?.classList.add('active');
  document.getElementById('tab-'+id)?.classList.add('active');
  if(id==='ranking')loadRanking();
  if(id==='admin')admSec('bracket',document.querySelector('.stab'));
  renderDeadline();
  if(id==='porras'){
    const nb=document.getElementById('btn-new-porra');
    if(nb)nb.style.display=deadlinePassed()?'none':'';
    loadAllMyBets();
  }
  if(id==='normas')renderNormas();
  if(id==='muro'){cargarMuro();}
  if(id==='stats'){loadStats();}
  if(id==='simulador'){
    if(deadlinePassed()){
      loadSimulador();
    }else{
      const el=document.getElementById('sim-ko-content');
      if(el)el.innerHTML='<div class="alert ainfo">'+t('sim_pending')+'</div>';
      const btnSim=document.getElementById('btn-sim');
      const btnReset=document.getElementById('btn-sim-reset');
      if(btnSim){btnSim.disabled=true;btnSim.style.opacity='0.4';btnSim.style.cursor='not-allowed';}
      if(btnReset){btnReset.disabled=true;btnReset.style.opacity='0.4';btnReset.style.cursor='not-allowed';}
    }
  }
}

function buildAdmEditBet(){
  // Load all bets async after rendering
  requestAnimationFrame(()=>requestAnimationFrame(()=>admSearchBets()));
  return `<div style="max-width:600px">
    <div class="card-title" style="margin-bottom:1rem">✏️ Editar Porra de Participante</div>
    <div style="display:flex;gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap">
      <input type="text" id="adm-edit-nombre" placeholder="Filtrar por nombre..." style="flex:1;min-width:140px" oninput="admSearchBets()">
      <input type="text" id="adm-edit-email" placeholder="Filtrar por email..." style="flex:1;min-width:140px" oninput="admSearchBets()">
    </div>
    <div id="adm-edit-results" style="margin-bottom:1rem"></div>
    <div id="adm-edit-form" style="display:none"></div>
  </div>`;
}

let _admEditTimer=null;
async function admSearchBets(){
  clearTimeout(_admEditTimer);
  _admEditTimer=setTimeout(async()=>{
    const nombre=(document.getElementById('adm-edit-nombre')?.value||'').trim().toLowerCase();
    const email=(document.getElementById('adm-edit-email')?.value||'').trim().toLowerCase();
    const res=document.getElementById('adm-edit-results');
    res.innerHTML='<div class="spin"></div>';
    const{data,error}=await dbq(c=>c.from('porras').select('id,nombre,email,puntos,paid,data,user_id,updated_at,admin_reviewed'),true);
    if(error||!data){res.innerHTML='<div class="alert aerr">Error cargando porras</div>';return;}
    // Build user_id -> account email map from user_emails view
    const uidEmailMap={};
    const{data:ueData}=await dbq(c=>c.from('user_emails').select('user_id,email'),true);
    (ueData||[]).forEach(r=>{if(r.user_id&&r.email)uidEmailMap[r.user_id]=r.email;});
    const filtered=data.filter(r=>{
      const n=(r.nombre||'').toLowerCase();
      const e=(r.email||'').toLowerCase();
      return(!nombre||n.includes(nombre))&&(!email||e.includes(email));
    }).sort((a,b)=>{
      // No revisadas primero, luego por updated_at desc
      if(!a.admin_reviewed&&b.admin_reviewed)return -1;
      if(a.admin_reviewed&&!b.admin_reviewed)return 1;
      return new Date(b.updated_at||0)-new Date(a.updated_at||0);
    });
    if(!filtered.length){res.innerHTML='<div class="hint" style="padding:.5rem;color:var(--muted)">No se encontraron porras.</div>';return;}
    let h='<div style="display:flex;flex-direction:column;gap:.4rem">';
    filtered.forEach(r=>{
      const ownerEmail=r.user_id?uidEmailMap[r.user_id]||'Sin cuenta':'Sin cuenta';
      const emailMismatch=r.user_id&&ownerEmail!==r.email;
      const pending=!r.admin_reviewed;
      const updStr=r.updated_at?new Date(r.updated_at).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}):'';
      h+=`<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surf2);border:1px solid ${pending?'#fb923c':'var(--border)'};border-radius:8px;padding:.5rem .8rem">
        <div>
          <span style="font-weight:700;color:var(--text)">${esc(r.nombre)}</span>
          ${pending?'<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#fb923c;margin-left:.4rem;vertical-align:middle" title="Modificada recientemente"></span>':''}
          <span style="color:var(--muted);font-size:.75rem;margin-left:.5rem">${esc(r.email||'')}</span>
          <span style="color:var(--gold);font-size:.72rem;margin-left:.5rem">${r.puntos||0}pts</span>
          <span style="color:${r.paid?'#4ade80':'#f87171'};font-size:.72rem;margin-left:.4rem">${r.paid?'✅':'⏳'}</span>
          <div style="font-size:.7rem;color:${emailMismatch?'#fb923c':'var(--muted)'};margin-top:.15rem">
            👤 ${emailMismatch?'<strong>'+esc(ownerEmail)+'</strong>':esc(ownerEmail)}${r.user_id?'':' ⚠️'}
            ${updStr?'<span style="margin-left:.5rem;opacity:.7">· '+updStr+'</span>':''}
          </div>
        </div>
        <div style="display:flex;gap:.3rem">
          ${pending?`<button class="btn btn-ghost" style="font-size:.78rem;padding:.25rem .6rem;color:#fb923c;border-color:#fb923c" onclick="admMarkReviewed(${r.id},this)" title="Marcar como revisada">✓</button>`:''}
          <button class="btn btn-ghost" style="font-size:.78rem;padding:.25rem .6rem" onclick="admLoadEditForm('${r.id}')">✏️ Editar</button>
          <button class="btn btn-ghost" style="font-size:.78rem;padding:.25rem .6rem" onclick="admExportXls('${r.id}')">📤</button>
          <button class="btn btn-ghost" style="font-size:.78rem;padding:.25rem .6rem;color:#f87171;border-color:#f87171" onclick="admDeleteBet('${r.id}','${escJ(r.nombre)}')">🗑️</button>
        </div>
      </div>`;
    });
    h+='</div>';
    res.innerHTML=h;
  },400);
}

function admTeamOpts(selected){
  return Array.from({length:48},(_,idx)=>`<option value="${idx}" ${selected===idx?'selected':''}>${tn(idx)}</option>`).join('');
}
async function admLoadEditForm(id){
  const form=document.getElementById('adm-edit-form');
  form.innerHTML='<div class="spin"></div>';
  form.style.display='block';
  const{data,error}=await dbq(c=>c.from('porras').select('*').eq('id',id).single(),true);
  if(error||!data){form.innerHTML='<div class="alert aerr">Error cargando porra</div>';return;}
  window._admEditingId=id;
  window._admEditingData=JSON.parse(data.data||'{}');
  // Render form
  let h=`<div style="border-top:1px solid var(--border);padding-top:1rem;margin-top:.5rem">
    <div style="font-family:'Bebas Neue',sans-serif;font-size:1.1rem;color:var(--gold);margin-bottom:.8rem">Editando: ${esc(data.nombre)}</div>
    <div style="display:flex;gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap">
      <div style="flex:1;min-width:160px">
        <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:.2rem">Nombre</label>
        <input type="text" id="adm-ef-nombre" value="${esc(data.nombre)}" style="width:100%">
      </div>
      <div style="flex:1;min-width:160px">
        <label style="font-size:.75rem;color:var(--muted);display:block;margin-bottom:.2rem">Email</label>
        <input type="text" id="adm-ef-email" value="${esc(data.email||'')}" style="width:100%">
      </div>
    </div>`;

  // Grupos
  h+=`<div style="margin-bottom:.8rem">
    <div style="font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:.5rem">📊 Fase de Grupos</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.5rem">`;
  'ABCDEFGHIJKL'.split('').forEach(g=>{
    const gd=GROUPS[g];
    const gp=(window._admEditingData.grupos||{})[g]||[];
    h+=`<div style="background:var(--surf3);border:1px solid var(--border);border-radius:8px;padding:.5rem">
      <div style="font-size:.78rem;font-weight:700;color:var(--gold);margin-bottom:.3rem">Grupo ${g}</div>`;
    gd.m.forEach(([hi,ai],idx)=>{
      const match=gp[idx]||{};
      // t1=gd.t[hi], t2=gd.t[ai] (team indices)
      h+=`<div style="display:flex;align-items:center;gap:.3rem;margin-bottom:.25rem;font-size:.72rem">
        <span title="${tn(gd.t[hi])}">${fi(gd.t[hi])}</span>
        <input type="number" min="0" max="20" id="adm-g-${g}-${idx}-h" value="${match.gh!=null?match.gh:''}" style="width:2.5rem;text-align:center;padding:.15rem;font-size:.72rem">
        <span style="color:var(--muted)">-</span>
        <input type="number" min="0" max="20" id="adm-g-${g}-${idx}-a" value="${match.ga!=null?match.ga:''}" style="width:2.5rem;text-align:center;padding:.15rem;font-size:.72rem">
        <span title="${tn(gd.t[ai])}">${fi(gd.t[ai])}</span>
      </div>`;
    });
    h+='</div>';
  });
  h+='</div></div>';

  // KO
  // KO — bracket interactivo
  const koData=window._admEditingData.ko||{};
  window._admKO={...koData};
  window._admGrupos=window._admEditingData.grupos||{};
  // Pre-compute R32 h/a from grupos if available, store for bracket display
  // Use saved r32_slots if available, else reconstruct from grupos
  window._admR32Slots=window._admEditingData.r32_slots||{};
  if(!Object.keys(window._admR32Slots).length){
    try{
      const g=window._admGrupos;
      if(g&&Object.keys(g).length>0){
        const st=calcStandings(Object.fromEntries(Object.entries(g).map(([gr,ms])=>[gr,ms.map(m=>({gh:m.gh,ga:m.ga}))])));
        const btRes=getBT(st);
        const r32=bR32(st,btRes.map);
        r32.forEach((tie,i)=>{window._admR32Slots['r32_'+(i+1)]={h:tie.h,a:tie.a};});
      }
    }catch(e){}
  }
  h+='<div id="adm-bracket-wrap"></div>';

  // Transfer section
  h+=`<div style="border-top:1px solid var(--border);padding-top:.8rem;margin-bottom:1rem">
    <div style="font-size:.85rem;font-weight:700;color:var(--text);margin-bottom:.5rem">🔄 Transferir a otro usuario</div>
    <div style="font-size:.75rem;color:var(--muted);margin-bottom:.5rem">Busca el usuario registrado al que quieres transferir esta porra. La porra pasará a ser suya.</div>
    <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">
      <input type="text" id="adm-transfer-search" placeholder="Email del usuario destino..." style="flex:1;min-width:200px;font-size:.8rem" oninput="admSearchUsers()">
      <div id="adm-transfer-results" style="width:100%"></div>
    </div>
    <div id="adm-transfer-selected" style="margin-top:.4rem"></div>
  </div>`;

  h+=`<div style="display:flex;gap:.5rem">
    <button class="btn btn-primary" onclick="admSaveBet()">💾 Guardar cambios</button>
    <button class="btn btn-ghost" onclick="document.getElementById('adm-edit-form').style.display='none'">Cancelar</button>
  </div>
  <div id="adm-edit-msg" style="margin-top:.5rem"></div>
  </div>`;
  form.innerHTML=h;
  admRenderBracket();
}

// ── Admin editable bracket ───────────────────────────────────────────────
function admBracketFromKO(){
  const ko=window._admKO||{};
  const grupos=window._admGrupos||{};
  const pW=s=>ko[s]??null;

  // R32: use pre-computed slots if available, else reconstruct from grupos
  let r32=[];
  if(window._admR32Slots&&Object.keys(window._admR32Slots).length>0){
    for(let i=1;i<=16;i++){
      const s=window._admR32Slots['r32_'+i]||{h:null,a:null};
      r32.push({id:'r32_'+i,h:s.h,a:s.a});
    }
  } else {
    try{
      if(grupos&&Object.keys(grupos).length>0){
        const st=calcStandings(Object.fromEntries(Object.entries(grupos).map(([g,ms])=>[g,ms.map(m=>({gh:m.gh,ga:m.ga}))])));
        const btRes=getBT(st);
        r32=bR32(st,btRes.map);
      }
    }catch(e){}
    while(r32.length<16)r32.push({h:null,a:null});
  }

  // Oct from R32 winners
  const oct=[[3,4],[1,2],[9,10],[11,12],[5,6],[7,8],[13,14],[15,16]].map(([a,b],i)=>({
    id:'oct_'+(i+1),h:pW('r32_'+a),a:pW('r32_'+b)
  }));
  // QF from Oct winners
  const qf=[[2,1],[5,6],[3,4],[7,8]].map(([a,b],i)=>({
    id:'qf_'+(i+1),h:pW('oct_'+a),a:pW('oct_'+b)
  }));
  // SF from QF winners
  const sf=[[1,2],[3,4]].map(([a,b],i)=>({
    id:'sf_'+(i+1),h:pW('qf_'+a),a:pW('qf_'+b)
  }));
  // Final from SF winners
  const fin={id:'final_1',h:pW('sf_1'),a:pW('sf_2')};

  return{r32,oct,qf,sf,fin};
}

function admKOMat(match, prefix, num){
  const ko=window._admKO||{};
  const slot=prefix==='final'?'final_1':prefix+'_'+num;
  const cur=ko[slot]??null;
  let opts='<option value="">— Ganador —</option>';
  if(match.h!=null)opts+=`<option value="${match.h}" ${cur===match.h?'selected':''}>${tn(match.h)}</option>`;
  if(match.a!=null)opts+=`<option value="${match.a}" ${cur===match.a?'selected':''}>${tn(match.a)}</option>`;
  const hLabel=match.h!=null?fi(match.h,true)+' '+tn(match.h):'<span style="color:var(--muted)">TBD</span>';
  const aLabel=match.a!=null?fi(match.a,true)+' '+tn(match.a):'<span style="color:var(--muted)">TBD</span>';
  return `<div class="kom" style="margin-bottom:.4rem">
    <div class="kolbl">${prefix.toUpperCase().replace('FINAL','FIN')}-${prefix==='final'?'':num}</div>
    <div class="ko-teams">
      <div class="ko-team${match.h==null?' tbd':''}">${hLabel}</div>
      <div class="ko-vs">vs</div>
      <div class="ko-team${match.a==null?' tbd':''}">${aLabel}</div>
    </div>
    <div class="ko-win">→ <select onchange="admKOChange('${slot}',this.value)">${opts}</select></div>
  </div>`;
}

function admRenderBracket(){
  const wrap=document.getElementById('adm-bracket-wrap');
  if(!wrap)return;
  const b=admBracketFromKO();
  const ext=window._admEditingData?.extras||{};
  const ko=window._admKO||{};

  let h='<div style="margin-bottom:.8rem">';
  h+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:.9rem;color:var(--gold);letter-spacing:1px;margin-bottom:.4rem">🏆 Fase KO</div>';

  // R32
  h+='<div style="font-size:.78rem;font-weight:700;color:var(--text);margin:.4rem 0 .25rem">Ronda de 32</div>';
  h+='<div class="bracket-wrap"><div class="bracket-half"><div class="bh-title">'+t('left_half')+'</div><div class="ko-grid">';
  b.r32.slice(0,8).forEach((m,i)=>h+=admKOMat(m,'r32',i+1));
  h+='</div></div><div class="bracket-half"><div class="bh-title">'+t('right_half')+'</div><div class="ko-grid">';
  b.r32.slice(8,16).forEach((m,i)=>h+=admKOMat(m,'r32',i+9));
  h+='</div></div></div>';

  // Oct — left: 1,2,5,6 / right: 3,4,7,8
  h+='<div style="font-size:.78rem;font-weight:700;color:var(--text);margin:.6rem 0 .25rem">Octavos de Final</div>';
  h+='<div class="bracket-wrap"><div class="bracket-half"><div class="ko-grid">';
  [0,1,4,5].forEach(i=>h+=admKOMat(b.oct[i],'oct',i<2?i+1:i+1));
  h+='</div></div><div class="bracket-half"><div class="ko-grid">';
  [2,3,6,7].forEach(i=>h+=admKOMat(b.oct[i],'oct',i<4?i+1:i+1));
  h+='</div></div></div>';

  // QF — left: 1,2 / right: 3,4
  h+='<div style="font-size:.78rem;font-weight:700;color:var(--text);margin:.6rem 0 .25rem">Cuartos de Final</div>';
  h+='<div class="bracket-wrap"><div class="bracket-half"><div class="ko-grid">';
  b.qf.slice(0,2).forEach((m,i)=>h+=admKOMat(m,'qf',i+1));
  h+='</div></div><div class="bracket-half"><div class="ko-grid">';
  b.qf.slice(2,4).forEach((m,i)=>h+=admKOMat(m,'qf',i+3));
  h+='</div></div></div>';

  // SF + Final
  h+='<div style="font-size:.78rem;font-weight:700;color:var(--text);margin:.6rem 0 .25rem">Semifinales</div>';
  h+='<div class="bracket-wrap"><div class="bracket-half"><div class="ko-grid">';
  h+=admKOMat(b.sf[0],'sf',1);
  h+='</div></div><div class="bracket-half"><div class="ko-grid">';
  h+=admKOMat(b.sf[1],'sf',2);
  h+='</div></div></div>';

  h+='<div style="font-size:.78rem;font-weight:700;color:var(--gold);margin:.6rem 0 .25rem">🏆 Final</div>';
  h+='<div class="ko-grid">'+admKOMat(b.fin,'final',1)+'</div>';

  // Extras
  const finW=ko['final_1'];
  const posOpts=['champion','runner_up','semis','quarters','r16','r32s','groups_out'];
  h+=`<div style="margin-top:.8rem;border-top:1px solid var(--border);padding-top:.8rem">
    <div style="font-size:.78rem;font-weight:700;color:var(--text);margin-bottom:.4rem">⭐ Extras</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:.4rem">
      <div>
        <label style="font-size:.72rem;color:var(--muted)">Campeón (auto desde Final)</label>
        <div style="padding:.3rem .5rem;background:var(--surf3);border-radius:6px;font-size:.82rem">
          ${finW!=null?fi(finW,true)+' '+tn(finW):'<span style="color:var(--muted)">TBD</span>'}
        </div>
      </div>
      <div>
        <label style="font-size:.72rem;color:var(--muted)">Posición España <span style="opacity:.6">(auto)</span></label>
        <div style="padding:.3rem .5rem;background:var(--surf3);border-radius:6px;font-size:.82rem;color:var(--muted)">Se calcula automáticamente al guardar</div>
      </div>
      <div>
        <label style="font-size:.72rem;color:var(--muted)">Máx. Goleador</label>
        <input type="text" id="adm-ext-gol-ef" value="${esc(ext.gol||'')}" style="width:100%;font-size:.75rem">
      </div>
      <div>
        <label style="font-size:.72rem;color:var(--muted)">Jugador Torneo</label>
        <input type="text" id="adm-ext-jug-ef" value="${esc(ext.jug||'')}" style="width:100%;font-size:.75rem">
      </div>
    </div>
  </div>`;

  h+='</div>';
  wrap.innerHTML=h;
}

function admKOChange(slot, val){
  window._admKO[slot]=val!==''?parseInt(val):null;
  admRenderBracket();
}

window._admTransferUserId=null;
let _admSearchUsersTimer=null;
async function admSearchUsers(){
  clearTimeout(_admSearchUsersTimer);
  _admSearchUsersTimer=setTimeout(async()=>{
    const q=(document.getElementById('adm-transfer-search')?.value||'').trim();
    const res=document.getElementById('adm-transfer-results');
    const sel=document.getElementById('adm-transfer-selected');
    window._admTransferUserId=null;
    if(sel)sel.innerHTML='';
    if(!q||q.length<3){if(res)res.innerHTML='';return;}
    if(res)res.innerHTML='<div class="spin" style="height:20px"></div>';
    // Query user_emails view (created from auth.users) for real user UUIDs
    const{data:uData,error:uErr}=await dbq(c=>c.from('user_emails').select('user_id,email').ilike('email','%'+q+'%'),true);
    if(uErr){if(res)res.innerHTML='<div class="hint" style="color:#f87171">Error buscando usuarios: '+uErr.message+'</div>';return;}
    const users=uData||[];
    if(!users.length){
      if(res)res.innerHTML='<div class="hint" style="padding:.4rem;color:var(--muted)">No se encontró ningún usuario registrado con ese email.</div>';
      return;
    }
    let h='<div style="display:flex;flex-direction:column;gap:.3rem;margin-top:.3rem">';
    users.forEach(u=>{
      h+=`<div style="display:flex;align-items:center;justify-content:space-between;background:var(--surf3);border:1px solid var(--border);border-radius:6px;padding:.35rem .6rem;font-size:.78rem">
        <span style="font-weight:600">${esc(u.email)}</span>
        <button class="btn btn-ghost" style="font-size:.72rem;padding:.2rem .5rem" onclick="admSelectUser('${escJ(u.user_id)}','${escJ(u.email)}')">Seleccionar</button>
      </div>`;
    });
    h+='</div>';
    if(res)res.innerHTML=h;
  },400);
}

function admSelectUser(uid, email){
  window._admTransferUserId=uid;
  const res=document.getElementById('adm-transfer-results');
  const sel=document.getElementById('adm-transfer-selected');
  const inp=document.getElementById('adm-transfer-search');
  if(res)res.innerHTML='';
  if(inp)inp.value='';
  if(sel)sel.innerHTML=`<div style="background:var(--surf3);border:1px solid #4ade80;border-radius:6px;padding:.35rem .6rem;font-size:.78rem;display:flex;align-items:center;justify-content:space-between">
    <span>✅ Transferir a: <strong style="color:#4ade80">${esc(email)}</strong></span>
    <button class="btn btn-ghost" style="font-size:.72rem;padding:.2rem .4rem" onclick="window._admTransferUserId=null;document.getElementById('adm-transfer-selected').innerHTML=''">✕</button>
  </div>`;
}

async function admDeleteBet(id, nombre){
  if(!confirm('¿Eliminar la porra de "'+nombre+'"? Esta acción no se puede deshacer.'))return;
  const{error}=await dbq(c=>c.from('porras').delete().eq('id',id),true);
  if(error){alert('Error eliminando: '+error.message);}
  else{
    document.getElementById('adm-edit-form').style.display='none';
    admSearchBets();
  }
}

async function admSaveBet(){
  const id=window._admEditingId;
  if(!id)return;
  const msg=document.getElementById('adm-edit-msg');
  msg.innerHTML='Guardando...';
  // Collect nombre/email
  const nombre=document.getElementById('adm-ef-nombre')?.value.trim();
  const email=document.getElementById('adm-ef-email')?.value.trim();
  if(!nombre){msg.innerHTML='<span style="color:#f87171">El nombre es obligatorio</span>';return;}
  // Collect grupos
  const grupos={};
  'ABCDEFGHIJKL'.split('').forEach(g=>{
    const gd=GROUPS[g];
    grupos[g]=gd.m.map(([hi,ai],idx)=>{
      const ghEl=document.getElementById(`adm-g-${g}-${idx}-h`);
      const gaEl=document.getElementById(`adm-g-${g}-${idx}-a`);
      const gh=ghEl?.value!==''?parseInt(ghEl.value):null;
      const ga=gaEl?.value!==''?parseInt(gaEl.value):null;
      const ti=gd.t[hi];const aj=gd.t[ai];
      return{h:ti,a:aj,gh,ga};
    });
  });
  // Collect KO from _admKO state
  const ko={...(window._admKO||{})};
  // Reconstruir r32_slots desde grupos
  let r32Slots={};
  try{const st=calcStandings(grupos);const bt=getBT(st);const r32b=bR32(st,bt);r32b.forEach(s=>r32Slots[s.id]={h:s.h,a:s.a});}catch(e){console.warn('r32_slots reconstrucción fallida:',e.message);}
  // Collect extras — esp se calcula automáticamente
  const camp=ko['final_1']!=null?ko['final_1']:null;
  const esp=calcEspFromKo(ko,r32Slots);
  const gol=document.getElementById('adm-ext-gol-ef')?.value.trim();
  const jug=document.getElementById('adm-ext-jug-ef')?.value.trim();
  const newData={grupos,ko,r32_slots:r32Slots,extras:{camp:camp!=null?camp:null,esp:esp||null,gol:gol||null,jug:jug||null}};
  const updateObj={nombre,email,data:JSON.stringify(newData)};
  if(window._admTransferUserId)updateObj.user_id=window._admTransferUserId;
  const{data:updData,error}=await dbq(c=>c.from('porras').update(updateObj).eq('id',id).select('id,user_id'),true);
  if(error){
    msg.innerHTML=`<span style="color:#f87171">Error: ${error.message}</span>`;
  } else if(updateObj.user_id && (!updData||!updData.length||updData[0].user_id!==updateObj.user_id)){
    msg.innerHTML='<span style="color:#f87171">⚠️ La transferencia fue bloqueada por la política de seguridad (RLS). Añade una policy de admin en Supabase para permitirlo.</span>';
  } else{
    msg.innerHTML='<span style="color:#4ade80">✅ Guardado correctamente'+(updateObj.user_id?' — porra transferida':'')+' </span>';
    window._admTransferUserId=null;
    admSearchBets();
  }
}

// ── TEAM NAME → ID MAP ──────────────────────────────────────────────────
const XLS_TEAM_MAP={
  'México':0,'Sudáfrica':1,'Rep. de Corea':2,'Checa':3,
  'Canadá':4,'Bosnia/Herzeg.':5,'Qatar':6,'Suiza':7,
  'Brasil':8,'Marruecos':9,'Haiti':10,'Escocia':11,
  'EE.UU.':12,'Paraguay':13,'Australia':14,'Turquía':15,
  'Alemania':16,'Curazao':17,'Costa de Marfil':18,'Ecuador':19,
  'Países Bajos':20,'Japón':21,'Suecia':22,'Túnez':23,
  'Bélgica':24,'Egipto':25,'IR Irán':26,'Nueva Zelanda':27,
  'España':28,'Cabo Verde':29,'Arabia Saudita':30,'Uruguay':31,
  'Francia':32,'Senegal':33,'Iraq':34,'Noruega':35,
  'Argentina':36,'Argelia':37,'Austria':38,'Jordán':39,
  'Portugal':40,'RD Congo':41,'Uzbekistán':42,'Colombia':43,
  'Inglaterra':44,'Croacia':45,'Ghana':46,'Panamá':47,
};
const XLS_ESP_MAP={
  'Campeona':'champion','Subcampeona':'runner_up',
  'Semifinales':'semis','Cuartos':'quarters',
  'Octavos':'r16','Ronda de 32':'r32s','Grupos':'groups_out',
};

function buildAdmImportXls(){
  return `<div style="max-width:560px">
    <div class="card-title" style="margin-bottom:1rem">📥 Importar Porra desde Excel</div>
    <p style="font-size:.82rem;color:var(--muted);margin-bottom:1rem">Sube el Excel del participante (hoja "World Cup"). Se importarán los ganadores de todas las fases KO y los extras.</p>
    <div style="display:flex;gap:.5rem;margin-bottom:.8rem;flex-wrap:wrap">
      <input type="text" id="imp-nombre" placeholder="Nombre del participante..." style="flex:1;min-width:180px">
      <input type="text" id="imp-email" placeholder="Email (opcional)..." style="flex:1;min-width:180px">
    </div>
    <div style="margin-bottom:.8rem">
      <label style="display:block;font-size:.78rem;color:var(--muted);margin-bottom:.3rem">Fichero Excel (.xlsx o .xlsm):</label>
      <input type="file" id="imp-file" accept=".xlsx,.xlsm,.xls" style="font-size:.82rem;color:var(--text)">
    </div>
    <button class="btn btn-primary" onclick="admImportXls()">📥 Importar y guardar porra</button>
    <div id="imp-msg" style="margin-top:.8rem"></div>
    <div id="imp-preview" style="margin-top:.8rem"></div>
  </div>`;
}

async function admImportXls(){
  const msg=document.getElementById('imp-msg');
  const preview=document.getElementById('imp-preview');
  const nombre=document.getElementById('imp-nombre')?.value.trim();
  const email=document.getElementById('imp-email')?.value.trim();
  const fileEl=document.getElementById('imp-file');
  if(!nombre){msg.innerHTML='<span style="color:#f87171">Introduce el nombre del participante.</span>';return;}
  if(!fileEl?.files?.length){msg.innerHTML='<span style="color:#f87171">Selecciona un fichero Excel.</span>';return;}
  msg.innerHTML='<div class="spin"></div> Leyendo Excel...';
  preview.innerHTML='';
  try{
    const buf=await fileEl.files[0].arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const ws=wb.Sheets['World Cup'];
    if(!ws){msg.innerHTML='<span style="color:#f87171">No se encontró la hoja "World Cup" en el Excel.</span>';return;}
    const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:null,raw:true});
    const c=(r,col)=>rows[r-1]?rows[r-1][col-1]??null:null; // Excel 1-indexed → array 0-indexed

    const tid=name=>{if(!name)return null;return XLS_TEAM_MAP[String(name).trim()]??null;};
    const win=(sh,sa,th,ta,penRow,colH,colA)=>{
      const h=Number(sh),a=Number(sa);
      if(isNaN(h)||isNaN(a))return null;
      if(h>a)return tid(th);
      if(a>h)return tid(ta);
      // Draw — check penalty row
      if(penRow&&colH){
        const pCol2=colA||colH+1;
        const ph=Number(c(penRow,colH)),pa=Number(c(penRow,pCol2));
        if(!isNaN(ph)&&!isNaN(pa)){
          if(ph>pa)return tid(th);
          if(pa>ph)return tid(ta);
        }
      }
      return null;
    };

    // Group cols: [col_h, col_a] for each group A-L
    const GRP_COLS={A:[2,3],B:[5,6],C:[8,9],D:[11,12],E:[14,15],F:[17,18],G:[20,21],H:[23,24],I:[26,27],J:[29,30],K:[32,33],L:[35,36]};
    // Match rows: [team_row, score_row] for each of 6 matches
    const MATCH_ROWS=[[13,14],[18,19],[23,24],[28,29],[33,34],[38,39]];

    // Parse grupos
    const grupos={};
    'ABCDEFGHIJKL'.split('').forEach(g=>{
      const [ch,ca]=GRP_COLS[g];
      grupos[g]=MATCH_ROWS.map(([tr,sr])=>{
        const th=c(tr,ch),ta=c(tr,ca);
        const sh=c(sr,ch),sa=c(sr,ca);
        const gh=(sh!=null&&!isNaN(Number(sh)))?Number(sh):null;
        const ga=(sa!=null&&!isNaN(Number(sa)))?Number(sa):null;
        return{h:tid(th),a:tid(ta),gh,ga};
      });
    });

    // Excel r32 slot → Code r32 slot translation
    const EXCEL_R32_TO_CODE=[3,9,1,4,10,2,11,12,8,7,6,5,15,14,13,16];
    // R32_COLS: [col_h, col_a, excel_slot_num]
    const R32_COLS=[[2,3,3],[5,6,6],[8,9,1],[11,12,4],[14,15,12],[17,18,11],[20,21,10],[23,24,9],[26,27,2],[29,30,5],[32,33,7],[35,36,8],[38,39,15],[41,42,14],[44,45,13],[47,48,16]];
    const OCT_COLS=[[2,3,2],[5,6,1],[8,9,5],[11,12,6],[14,15,3],[17,18,4],[20,21,7],[23,24,8]];
    const QF_COLS=[[3,5,1],[9,11,2],[15,17,3],[21,23,4]];
    const SF_COLS=[[6,8,1],[18,20,2]];

    const ko={};
    const r32Slots={};
    R32_COLS.forEach(([ch,ca,excelSlot])=>{
      const codeSlot=EXCEL_R32_TO_CODE[excelSlot-1];
      ko['r32_'+codeSlot]=win(c(51,ch),c(51,ca),c(50,ch),c(50,ca),53,ch);
      r32Slots['r32_'+codeSlot]={h:tid(c(50,ch)),a:tid(c(50,ca))};
    });
    OCT_COLS.forEach(([ch,ca,slot])=>{ko['oct_'+slot]=win(c(61,ch),c(61,ca),c(60,ch),c(60,ca),63,ch);});
    QF_COLS.forEach(([ch,ca,slot])=>{ko['qf_'+slot]=win(c(71,ch),c(71,ca),c(70,ch),c(70,ca),73,ch,ca);});
    SF_COLS.forEach(([ch,ca,slot])=>{ko['sf_'+slot]=win(c(81,ch),c(81,ca),c(80,ch),c(80,ca),83,ch,ca);});
    ko['final_1']=win(c(91,12),c(91,14),c(90,12),c(90,14),93,12,14);

    const campName=c(98,12);
    const espRaw=c(94,21);
    const gol=c(98,18);
    const jug=c(98,21);
    const esp=XLS_ESP_MAP[String(espRaw||'').trim()]||null;
    const camp=tid(campName);
    const extras={camp,esp,gol:gol?String(gol):null,jug:jug?String(jug):null};

    const data=JSON.stringify({ko,extras,grupos,r32_slots:r32Slots});

    // Show preview using bracket visual
    let ph='<div style="background:var(--surf3);border:1px solid var(--border);border-radius:8px;padding:.8rem">';
    ph+='<div style="font-family:\'Bebas Neue\',sans-serif;font-size:1rem;color:var(--gold);margin-bottom:.5rem">Vista previa del bracket</div>';
    ph+=`<div style="font-size:.75rem;color:var(--muted);margin-bottom:.5rem">⭐ Campeón: ${camp!=null?tn(camp):'—'} | España: ${esp||'—'} | Goleador: ${gol||'—'} | Jugador: ${jug||'—'}</div>`;
    ph+=renderBracketReadOnly(ko, null, grupos, r32Slots);
    ph+='</div>';
    preview.innerHTML=ph;

    // Save to Supabase
    msg.innerHTML='<div class="spin"></div> Guardando...';
    const{error}=await dbq(c=>c.from('porras').insert({nombre,email:email||null,data,puntos:0,paid:false}),true);
    if(error){msg.innerHTML=`<span style="color:#f87171">Error guardando: ${error.message}</span>`;}
    else{msg.innerHTML='<span style="color:#4ade80">✅ Porra importada correctamente para '+esc(nombre)+'</span>';}
  }catch(e){
    msg.innerHTML=`<span style="color:#f87171">Error leyendo Excel: ${e.message}</span>`;
    console.error(e);
  }
}

// ── EXPORT XLS ──────────────────────────────────────────────────────────
const APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbweqMoijqxKC67A2Gt02JnncauPNVkc0CeNReZe11QyKB-_XuJ7Sp_jLjMBVuMI8-yn/exec';

async function admExportXls(id){
  let parsed,nomFich='porra';
  try{
    const{data,error}=await dbq(c=>c.from('porras').select('nombre,data').eq('id',id).single());
    if(error||!data){alert('Error cargando porra: '+(error?.message||''));return;}
    nomFich=String(data.nombre||'porra');
    parsed=typeof data.data==='string'?JSON.parse(data.data):data.data;
  }catch(e){alert('Error: '+e.message);return;}

  const ko=parsed.ko||{};
  const extras=parsed.extras||{};
  const grupos=parsed.grupos||{};

  // Reconstruir r32_slots si faltan
  let r32Slots=parsed.r32_slots||{};
  if(!Object.keys(r32Slots).length&&Object.keys(grupos).length){
    try{const st=calcStandings(grupos);const bt=getBT(st);const r32b=bR32(st,bt);r32Slots={};r32b.forEach(s=>r32Slots[s.id]={h:s.h,a:s.a});}
    catch(e){console.warn('r32_slots reconstrucción fallida:',e.message);}
  }

  const payload={
    nombre:nomFich,
    grupos,
    ko,
    extras:{esp:extras.esp||'',gol:extras.gol||'',jug:extras.jug||''},
    r32_slots:r32Slots
  };

  let json;
  try{
    const resp=await fetch(APPS_SCRIPT_URL,{method:'POST',body:JSON.stringify(payload)});
    json=await resp.json();
  }catch(e){alert('Error llamando al exportador: '+e.message);return;}

  if(!json.success){alert('Error en exportación: '+(json.error||''));return;}

  const bytes=Uint8Array.from(atob(json.data),c=>c.charCodeAt(0));
  const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=nomFich.replace(/[^a-zA-Z0-9_\-]/g,'_')+'_porra2026.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

// ── ESTADÍSTICAS ────────────────────────────────────────────────────────
async function loadStats(){
  if(!deadlinePassed()){
    document.getElementById('stats-content').innerHTML='<div class="alert ainfo" style="margin:1rem 0">📊 '+t('stats_pending')+'</div>';
    return;
  }
  const el=document.getElementById('stats-content');
  el.innerHTML='<div class="spin"></div>';
  const[{data,error},{data:jugadors}]=await Promise.all([
    dbq(c=>c.from('porras').select('data').eq('paid',true)),
    dbq(c=>c.from('jugadors').select('nom'))
  ]);
  if(error||!data||!data.length){el.innerHTML='<div style="color:var(--muted);padding:2rem;text-align:center">No hay datos disponibles.</div>';return;}

  // Contar extras — jugadores normalizados contra tabla jugadors
  const campCount={},espCount={},golCount={},jugCount={};
  const normPlayer=(name,pool)=>{
    if(!name)return null;
    const np=normStr(name);
    // 1. Coincidencia exacta
    let m=pool.find(j=>normStr(j.nom)===np);
    if(m)return m.nom;
    // 2. Inclusión: "Oyarzabal" -> "Mikel Oyarzabal"
    m=pool.find(j=>{const n=normStr(j.nom);return n&&(n.includes(np)||np.includes(n));});
    if(m)return m.nom;
    // 3. Coincidencia por APELLIDO (última palabra >=4 chars), nunca solo por nombre de pila
    const wp=np.split(/\s+/).filter(w=>w.length>=4);
    const last=wp[wp.length-1];
    if(last){
      m=pool.find(j=>{const wb=normStr(j.nom).split(/\s+/).filter(w=>w.length>=4);return wb.length&&wb[wb.length-1]===last;});
      if(m)return m.nom;
    }
    return name; // sin resolver: se agrupa por el texto tal cual
  };

  data.forEach(p=>{
    let parsed;try{parsed=typeof p.data==='string'?JSON.parse(p.data):p.data;}catch(e){return;}
    const ex=parsed.extras||{};
    if(ex.camp!=null)campCount[ex.camp]=(campCount[ex.camp]||0)+1;
    if(ex.esp)espCount[ex.esp]=(espCount[ex.esp]||0)+1;
    if(ex.gol){const k=normPlayer(ex.gol,jugadors||[]);if(k)golCount[k]=(golCount[k]||0)+1;}
    if(ex.jug){const k=normPlayer(ex.jug,jugadors||[]);if(k)jugCount[k]=(jugCount[k]||0)+1;}
  });

  const total=data.length;
  const sortObj=obj=>Object.entries(obj).sort((a,b)=>b[1]-a[1]);
  const topCamp=sortObj(campCount).slice(0,6);
  const topGol=sortObj(golCount).slice(0,5);
  const topJug=sortObj(jugCount).slice(0,5);
  const maxCamp=topCamp[0]?.[1]||1;

  const ESP_POS=['champion','runner_up','semis','quarters','r16','r32s','groups_out'];
  const ESP_COLORS=['#085041','#0F6E56','#1D9E75','#5DCAA5','#9FE1CB','#c8eee2','#E1F5EE'];
  const ESP_LABEL={champion:'Campeona',runner_up:'Subcampeona',semis:'Semifinales',quarters:'Cuartos',r16:'Octavos',r32s:'Ronda de 32',groups_out:'Grupos'};

  // Posición más elegida España
  const topEsp=ESP_POS.filter(k=>espCount[k]).sort((a,b)=>(espCount[b]||0)-(espCount[a]||0))[0];
  const topEspCount=topEsp?espCount[topEsp]||0:0;
  const topEspPct=total?Math.round(topEspCount/total*100):0;

  // Top campeón
  const topCampId=topCamp[0]?.[0];
  const topCampN=topCamp[0]?.[1]||0;
  const topCampPct=total?Math.round(topCampN/total*100):0;

  // Top goleador
  const topGolN=topGol[0]?.[1]||0;
  const topGolName=topGol[0]?.[0]||'—';
  const topGolPct=total?Math.round(topGolN/total*100):0;

  // Top MVP
  const topJugN=topJug[0]?.[1]||0;
  const topJugName=topJug[0]?.[0]||'—';
  const topJugPct=total?Math.round(topJugN/total*100):0;

  const barRow=(flag,name,val,max)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:.45rem">
    <span style="font-size:.8rem;color:var(--text);width:110px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${flag} ${esc(name)}</span>
    <div style="flex:1;height:7px;background:var(--surf2);border-radius:4px;overflow:hidden"><div style="width:${Math.round(val/max*100)}%;height:100%;border-radius:4px;background:#534AB7"></div></div>
    <span style="font-size:.72rem;color:var(--muted);width:28px;text-align:right">${val}</span>
  </div>`;

  const topRow=(rank,name,val)=>`<div style="display:flex;align-items:center;gap:8px;padding:.5rem 0;border-bottom:0.5px solid var(--border)">
    <span style="font-size:.72rem;color:var(--muted);width:16px;text-align:center">${rank}</span>
    <span style="font-size:.82rem;color:var(--text);flex:1">${esc(name)}</span>
    <span style="font-size:.72rem;color:var(--muted)">${val} porra${val!==1?'s':''}</span>
  </div>`;

  const heroBlock=(imgUrl,fallbackEmoji,name,sub)=>`
    <div style="display:flex;align-items:center;gap:12px;padding:.5rem 0 1rem;border-bottom:0.5px solid var(--border);margin-bottom:.75rem">
      <img src="${imgUrl}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="width:64px;height:64px;border-radius:50%;background:var(--surf2);border:2px solid var(--border);display:none;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0">${fallbackEmoji}</div>
      <div>
        <p style="font-size:1rem;font-weight:500;color:var(--text);margin:0">${esc(name)}</p>
        <p style="font-size:.75rem;color:var(--muted);margin:.1rem 0 0">${sub}</p>
      </div>
    </div>`;

  const card=content=>`<div class="card">${content}</div>`;
  const label=txt=>`<p style="font-size:.7rem;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;color:var(--muted);margin:0 0 .9rem">${txt}</p>`;

  // Campeón card
  const campHtml=card(`${label('🏆 Campeón')}
    <div style="display:flex;align-items:center;gap:14px;padding:.5rem 0 1rem;border-bottom:0.5px solid var(--border);margin-bottom:.75rem">
      <img src="https://cdelolmo-bcn.github.io/porra2026/images/worldcup.jpg" alt="" style="width:64px;height:64px;object-fit:contain;flex-shrink:0" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
      <div style="width:64px;height:64px;display:none;align-items:center;justify-content:center;font-size:3rem;flex-shrink:0">${topCampId!=null?fi(topCampId,true):'🏆'}</div>
      <div><p style="font-size:1rem;font-weight:500;color:var(--text);margin:0">${topCampId!=null?tn(topCampId):'—'}</p><p style="font-size:.75rem;color:var(--muted);margin:.1rem 0 0">${topCampN} porra${topCampN!==1?'s':''} · ${topCampPct}%</p></div>
    </div>
    ${topCamp.slice(1).map(([id,n])=>barRow(fi(parseInt(id),true),tn(parseInt(id)),n,topCamp[1]?.[1]||1)).join('')}`);

  // España card
  const espTopLabel=topEsp?ESP_LABEL[topEsp]:'—';
  const espHtml=card(`${label('Posición España 🇪🇸')}
    <div style="display:flex;align-items:center;gap:12px;padding:.5rem 0 1rem;border-bottom:0.5px solid var(--border);margin-bottom:.75rem">
      <img src="https://cdelolmo-bcn.github.io/porra2026/images/flag_es.jpg" alt="" style="width:56px;height:56px;object-fit:cover;border-radius:50%;flex-shrink:0" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">
      <span style="display:none;font-size:2rem;flex-shrink:0">🏆</span>
      <div><p style="font-size:1rem;font-weight:500;color:var(--text);margin:0">${espTopLabel}</p><p style="font-size:.75rem;color:var(--muted);margin:.1rem 0 0">${topEspCount} porra${topEspCount!==1?'s':''} · ${topEspPct}%</p></div>
    </div>
    ${ESP_POS.filter(k=>k!==topEsp).map((k,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:.4rem">
      <div style="width:9px;height:9px;border-radius:50%;flex-shrink:0;background:${ESP_COLORS[ESP_POS.indexOf(k)]}${ESP_POS.indexOf(k)===6?';border:0.5px solid var(--border)':''}"></div>
      <span style="font-size:.8rem;color:var(--text);flex:1">${ESP_LABEL[k]}</span>
      <span style="font-size:.8rem;font-weight:500;color:var(--text)">${espCount[k]||0}</span>
    </div>`).join('')}`);

  // Goleador card
  const golHtml=card(`${label('⚽ Máximo Goleador')}
    ${heroBlock('https://cdelolmo-bcn.github.io/porra2026/images/goleador.jpg','⚽',topGolName,`${topGolN} porra${topGolN!==1?'s':''} · ${topGolPct}%`)}
    ${topGol.slice(1).map(([name,n],i)=>topRow(i+2,name,n)).join('')}
    ${topGol.length===0?'<div style="color:var(--muted);font-size:.82rem">Sin datos</div>':''}`);

  // MVP card
  const jugHtml=card(`${label('🌟 MVP')}
    ${heroBlock('https://cdelolmo-bcn.github.io/porra2026/images/mvp.jpg','🌟',topJugName,`${topJugN} porra${topJugN!==1?'s':''} · ${topJugPct}%`)}
    ${topJug.slice(1).map(([name,n],i)=>topRow(i+2,name,n)).join('')}
    ${topJug.length===0?'<div style="color:var(--muted);font-size:.82rem">Sin datos</div>':''}`);

  el.innerHTML=`<p style="font-size:.82rem;color:var(--muted);margin:0 0 1rem">${total} participante${total!==1?'s':''} confirmado${total!==1?'s':''}</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      ${campHtml}${espHtml}${golHtml}${jugHtml}
    </div>`;
}

async function admMarkReviewed(id, btn){
  btn.disabled=true;btn.textContent='...';
  const{error}=await dbq(c=>c.from('porras').update({admin_reviewed:true}).eq('id',id),true);
  if(error){btn.disabled=false;btn.textContent='✓';return;}
  admSearchBets();
}

function tryAdmin(){if(isAdmin||localStorage.getItem('debug_started')==='1')showPage('admin');}


