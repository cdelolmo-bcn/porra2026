// ══ FANTASY ══
const F_SEASON_ID = '6a28c0d3-db64-44ca-8b1c-43f7dd79473d';
const F_LOCK_DATE = new Date('2026-06-11T20:00:00Z');
const F_SS_BASE   = 'https://www.sofascore.com/api/v1';

const F_FORMATIONS = {
  '4-3-3':{DEF:4,MID:3,FWD:3},'4-4-2':{DEF:4,MID:4,FWD:2},
  '4-5-1':{DEF:4,MID:5,FWD:1},'5-3-2':{DEF:5,MID:3,FWD:2},'5-4-1':{DEF:5,MID:4,FWD:1}
};
const F_POS_LABELS = {GK:'Portero',DEF:'Defensa',MID:'Centrocampista',FWD:'Delantero'};
const F_POS_COLORS = {
  GK:'background:rgba(230,57,70,.22);color:#fca5a5',
  DEF:'background:rgba(42,157,143,.22);color:#6ee7b7',
  MID:'background:rgba(59,130,246,.22);color:#93c5fd',
  FWD:'background:rgba(244,162,97,.22);color:#fbbf24'
};

let fPlayers=[],fTeam=null,fSlots={},fCaptain=null,fPickerSlot=null,fPickerPos=null,fPickerFilter='ALL';
let fFormation='4-3-3',fEditMode=false;

// ── Navegación ──
function fantasyTab(sec,btn){
  document.querySelectorAll('#page-fantasy .stab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  ['myteam','ranking','jugadores','normas'].forEach(s=>{
    const el=document.getElementById('fsec-'+s);
    if(el)el.style.display=s===sec?'':'none';
  });
  if(sec==='myteam')fLoadMyTeam();
  if(sec==='ranking')fLoadRanking();
  if(sec==='jugadores')fLoadPlayersRanking();
  if(sec!=='jugadores')_fPRankAll=[];
}




// ── Cargar jugadores con paginación ──
let _fPlayersLoading=false;
async function fLoadPlayers(){
  if(fPlayers.length>0)return;
  if(_fPlayersLoading){
    while(_fPlayersLoading)await new Promise(r=>setTimeout(r,100));
    return;
  }
  _fPlayersLoading=true;
  try{
    let all=[],from=0;
    while(true){
      const{data,error}=await dbq(c=>c.from('fantasy_players')
        .select('id,name,short_name,position,country_code,team_name,active,sofascore_player_id')
        .eq('season_id',F_SEASON_ID).order('team_name').order('name')
        .range(from,from+999));
      if(error||!data){console.warn('[Fantasy] Error cargando jugadores:',error?.message);break;}
      all=all.concat(data);
      if(data.length<1000)break;
      from+=1000;
    }
    if(all.length>0)fPlayers=all;
  }finally{
    _fPlayersLoading=false;
  }
}

// ── Mi equipo ──
async function fLoadMyTeam(){
  const c=document.getElementById('fantasy-team-container');
  if(!c)return;
  if(!currentUser){c.innerHTML='<div class="alert ainfo">🔐 Inicia sesión para crear tu equipo fantasy.</div>';return;}
  c.innerHTML='<div style="text-align:center;padding:2rem"><div class="spin"></div></div>';
  await fLoadPlayers();
  const{data:team}=await dbq(c=>c.from('fantasy_teams')
    .select('*').eq('user_id',currentUser.id).eq('season_id',F_SEASON_ID).maybeSingle(),true);
  if(team&&!fEditMode){
    fTeam=team;
    const{data:tps}=await dbq(c=>c.from('fantasy_team_players')
      .select('*,fantasy_players(*)').eq('fantasy_team_id',team.id));
    const pids=(tps||[]).map(tp=>tp.player_id);
    let scoreMap={};
    if(pids.length>0){
      const{data:scores}=await dbq(c=>c.from('fantasy_player_scores')
        .select('player_id,points_base').in('player_id',pids));
      scores?.forEach(s=>{
        if(!scoreMap[s.player_id])scoreMap[s.player_id]={pts:0,matches:0};
        scoreMap[s.player_id].pts+=s.points_base;
        scoreMap[s.player_id].matches++;
      });
    }
    fRenderMyTeamView(team,tps||[],scoreMap);
  }else{
    fRenderBuilder(c);
  }
}

function fRenderMyTeamView(team,tps,scoreMap){
  const c=document.getElementById('fantasy-team-container');
  const locked=team.locked;
  const byPos={GK:[],DEF:[],MID:[],FWD:[]};
  tps.forEach(tp=>{const pos=tp.fantasy_players?.position;if(byPos[pos])byPos[pos].push(tp);});
  let h=`<div class="card">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.85rem;flex-wrap:wrap;gap:.5rem">
      <div><div class="card-title" style="margin-bottom:.15rem">⚽ Mi Equipo Fantasy</div>
      <div style="font-size:.76rem;color:var(--muted)">Formación: <strong style="color:var(--gold)">${team.formation}</strong> · ${locked?'<span style="color:var(--accent)">🔒 Cerrado</span>':'<span style="color:var(--green)">✅ Activo</span>'}</div></div>
      <div style="display:flex;align-items:center;gap:.5rem">
        <div style="text-align:right"><div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--gold);line-height:1">${team.total_points||0}</div><div style="font-size:.68rem;color:var(--muted);text-transform:uppercase">puntos</div></div>
        ${!locked?`<button class="btn btn-ghost" onclick="fEditTeam()" style="font-size:.8rem">✏️ Editar</button>`:''}
      </div>
    </div>`;
  ['GK','DEF','MID','FWD'].forEach(pos=>{
    if(!byPos[pos].length)return;
    const lbl={GK:'Portero',DEF:'Defensas',MID:'Centrocampistas',FWD:'Delanteros'}[pos];
    h+=`<div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:.5rem 0 .25rem">${lbl}</div>`;
    byPos[pos].forEach(tp=>{
      const pl=tp.fantasy_players;const sm=scoreMap[tp.player_id]||{pts:0,matches:0};
      const pts=sm.pts;const capPts=tp.is_captain?pts*2:pts;const inactive=pl&&!pl.active;
      h+=`<div class="mytp-row${inactive?' mytp-inactive':''}">
        <span class="mytp-pos fpos-${pos}" style="${F_POS_COLORS[pos]}">${pos}</span>
        ${pl?.sofascore_player_id?`<img src="https://img.sofascore.com/api/v1/player/${pl.sofascore_player_id}/image" alt="" width="26" height="26" referrerpolicy="no-referrer" style="border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--surf3)" onerror="this.style.display='none'">`:'' }
        <span class="mytp-name">${pl?.name||'—'}${inactive?' <span style="font-size:.65rem;color:var(--muted)">(eliminado)</span>':''}</span>
        <span class="mytp-team">${pl?.team_name||''}</span>
        ${tp.is_captain?'<span class="mytp-cap">C</span>':''}
        ${sm.matches?`<span style="font-size:.68rem;color:var(--muted);flex-shrink:0">${sm.matches}PJ</span>`:''}
        <span class="mytp-pts">${capPts||pts} pts</span>
      </div>`;
    });
  });
  h+='</div>';
  c.innerHTML=h;
}

function fEditTeam(){
  if(new Date()>=F_LOCK_DATE){alert('🔒 El plazo para editar el equipo fantasy ha cerrado.');return;}
  fEditMode=true;
  if(fTeam){fFormation=fTeam.formation;}
  fSlots={};fCaptain=null;
  const c=document.getElementById('fantasy-team-container');
  fRenderBuilder(c);
  fPreloadSlots();
}

async function fPreloadSlots(){
  if(!fTeam)return;
  const{data:tps}=await dbq(c=>c.from('fantasy_team_players')
    .select('*,fantasy_players(*)').eq('fantasy_team_id',fTeam.id));
  if(!tps)return;
  fSlots={};fCaptain=null;
  tps.forEach(tp=>{fSlots[tp.position_slot]=tp.fantasy_players;if(tp.is_captain)fCaptain=tp.position_slot;});
  fFormation=fTeam.formation;
  fRenderFormations();fRenderField();
}

function fRenderBuilder(c){
  const locked=new Date()>=F_LOCK_DATE;
  if(locked){
    c.innerHTML='<div class="alert aerr">🔒 El plazo para crear o editar el equipo fantasy ha cerrado (11 jun 2026, 22:00h España).</div>';return;
  }
  c.innerHTML=`<div class="card">
    <div class="card-title">🏗️ ${fTeam&&fEditMode?'Editar':'Crea'} tu equipo fantasy</div>
    <div style="font-size:.8rem;color:var(--muted);margin-bottom:.85rem">Elige formación y selecciona 11 jugadores. Pulsa sobre un jugador del campo para designarlo capitán (×2 puntos). Máx. 3 jugadores de la misma selección.</div>
    <div style="font-size:.74rem;color:var(--muted);margin-bottom:.4rem;text-transform:uppercase;letter-spacing:.5px;font-weight:600">Formación</div>
    <div class="fformation-grid" id="fformation-grid"></div>
    <div id="fantasy-field-wrap"></div>
    <div class="field-hint">Pulsa un slot vacío para elegir jugador · Pulsa un jugador para hacer capitán</div>
    <div id="fvalidation-msg" style="margin-top:.75rem"></div>
    <div style="margin-top:.85rem;display:flex;gap:.6rem;align-items:center;flex-wrap:wrap">
      <button class="btn btn-success" id="fbtn-save" onclick="fSaveTeam()" style="flex:1;font-size:.9rem;padding:.7rem" disabled>✅ Guardar equipo</button>
      <span id="fsave-spin" style="display:none"><div class="spin"></div></span>
    </div>
    <div id="fsave-msg" style="margin-top:.5rem"></div>
    ${fTeam&&fEditMode?'<button class="btn btn-ghost" onclick="fCancelEdit()" style="width:100%;margin-top:.5rem;font-size:.82rem">Cancelar</button>':''}
  </div>`;
  fRenderFormations();fRenderField();
}

function fCancelEdit(){fEditMode=false;fTeam&&fLoadMyTeam();}

function fRenderFormations(){
  const g=document.getElementById('fformation-grid');if(!g)return;
  g.innerHTML=Object.keys(F_FORMATIONS).map(f=>`<button class="fformation-btn${f===fFormation?' active':''}" onclick="fSelectFormation('${f}')">${f}</button>`).join('');
}

function fSelectFormation(f){
  const oldForm=F_FORMATIONS[fFormation];
  const newForm=F_FORMATIONS[f];
  fFormation=f;
  // Agrupar jugadores actuales por posición
  const byPos={GK:[],DEF:[],MID:[],FWD:[]};
  Object.entries(fSlots).forEach(([slot,pl])=>{
    if(!pl)return;
    const pos=slot.replace(/\d+$/,'');
    if(byPos[pos])byPos[pos].push(pl);
  });
  // Reasignar slots con los que caben en la nueva formación
  fSlots={};
  const counts={GK:1,DEF:newForm.DEF,MID:newForm.MID,FWD:newForm.FWD};
  Object.entries(counts).forEach(([pos,n])=>{
    const available=byPos[pos]||[];
    for(let i=1;i<=n;i++){
      if(available[i-1])fSlots[pos+i]=available[i-1];
    }
  });
  // Validar capitán sigue existiendo
  if(fCaptain&&!fSlots[fCaptain])fCaptain=null;
  fRenderFormations();fRenderField();fValidateTeam();
}

function fRenderField(){
  const w=document.getElementById('fantasy-field-wrap');if(!w)return;
  const form=F_FORMATIONS[fFormation];
  const makeRow=(pos,count)=>{
    const slots=Array.from({length:count},(_,i)=>{
      const key=`${pos}${i+1}`;const pl=fSlots[key];const isCap=fCaptain===key;
      if(pl){return `<div class="field-slot filled${isCap?' captain':''}" onclick="fToggleCaptain('${key}')" title="${isCap?'★ Capitán · click para quitar':'Click para hacer capitán'}">
        ${isCap?'<div class="fslot-cap">C</div>':''}
        <span class="fslot-pos fpos-${pos}">${pos}</span>
        <div class="fslot-name">${pl.short_name||pl.name.split(' ').pop()}</div>
        <div class="fslot-team">${pl.team_name}</div>
        <div class="fslot-edit" onclick="event.stopPropagation();fOpenPicker('${key}','${pos}')">✏️</div>
      </div>`;}
      return `<div class="field-slot" onclick="fOpenPicker('${key}','${pos}')"><span class="fslot-pos fpos-${pos}">${pos}</span><div class="fslot-add">+</div></div>`;
    }).join('');
    return `<div class="field-row">${slots}</div>`;
  };
  const form2=F_FORMATIONS[fFormation];
  const filled=Object.values(fSlots).filter(Boolean).length;
  const total=1+form2.DEF+form2.MID+form2.FWD;
  w.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.5rem;flex-wrap:wrap;gap:.3rem">
    <div style="font-size:.74rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;font-weight:600">Campo</div>
    <div style="font-size:.78rem;color:var(--muted)">${filled}/${total} jugadores</div>
  </div>
  <div class="fteam-summary">
    <div class="fts-stat"><div class="fts-num" id="fsum-p">${filled}</div><div class="fts-lbl">Jugadores</div></div>
    <div class="fts-stat"><div class="fts-num" id="fsum-c">${new Set(Object.values(fSlots).filter(Boolean).map(p=>p.country_code)).size}</div><div class="fts-lbl">Selecciones</div></div>
    <div class="fts-stat"><div class="fts-num" id="fsum-cap" style="font-size:.95rem;padding-top:.15rem">${fCaptain&&fSlots[fCaptain]?(fSlots[fCaptain].short_name||fSlots[fCaptain].name.split(' ').pop()):'—'}</div><div class="fts-lbl">Capitán</div></div>
  </div>
  <div class="fantasy-field" id="fantasy-field">
    <div class="field-center-circle"></div>
    ${makeRow('FWD',form.FWD)}${makeRow('MID',form.MID)}${makeRow('DEF',form.DEF)}${makeRow('GK',1)}
  </div>`;
}

function fToggleCaptain(key){fCaptain=fCaptain===key?null:key;fRenderField();fValidateTeam();}

function fOpenPicker(slotKey,pos){
  fPickerSlot=slotKey;fPickerPos=pos;fPickerFilter='ALL';
  document.getElementById('fpicker-overlay').classList.add('open');
  document.getElementById('fpicker-title').textContent=`Elige ${F_POS_LABELS[pos]}`;
  document.getElementById('fpicker-search').value='';
  const filled=Object.entries(fSlots).filter(([k,p])=>p&&k!==slotKey).length;
  const total=1+F_FORMATIONS[fFormation].DEF+F_FORMATIONS[fFormation].MID+F_FORMATIONS[fFormation].FWD;
  document.getElementById('fpicker-sub').textContent=`${filled}/${total} elegidos · Máx. 3 por selección`;
  const note=document.getElementById('fpicker-pos-note');
  if(pos==='MID'){note.textContent='⚠️ Posiciones según SofaScore — algunos extremos como Yamal o Nico Williams aparecen aquí como centrocampistas.';note.style.display='';}
  else note.style.display='none';
  document.getElementById('fpicker-filters').innerHTML=`
    <button class="fpos-filter active" onclick="fSetPickerFilter('ALL',this)">Todos los ${F_POS_LABELS[pos]}s</button>
    <button class="fpos-filter" onclick="fSetPickerFilter('country',this)">Por selección</button>`;
  fRenderPicker();
}

function fClosePicker(){document.getElementById('fpicker-overlay').classList.remove('open');fPickerSlot=null;fPickerPos=null;}
function fSetPickerFilter(f,btn){fPickerFilter=f;document.querySelectorAll('#fpicker-filters .fpos-filter').forEach(b=>b.classList.remove('active'));btn.classList.add('active');fRenderPicker();}

function fNorm(s){if(!s)return'';return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}

function fRenderPicker(){
  const grid=document.getElementById('fpicker-grid');
  const search=fNorm(document.getElementById('fpicker-search').value);
  const pos=fPickerPos;
  const pickedIds=new Set(Object.entries(fSlots).filter(([k,p])=>p&&k!==fPickerSlot).map(([,p])=>p.id));
  const cc={};Object.entries(fSlots).forEach(([k,p])=>{if(p&&k!==fPickerSlot)cc[p.country_code]=(cc[p.country_code]||0)+1;});
  let players=fPlayers.filter(p=>p.position===pos);
  if(fPickerFilter==='country')players=[...players].sort((a,b)=>a.team_name.localeCompare(b.team_name));
  if(search)players=players.filter(p=>fNorm(p.name).includes(search)||fNorm(p.short_name).includes(search)||fNorm(p.team_name).includes(search));
  if(!players.length){grid.innerHTML='<div style="text-align:center;padding:1.5rem;color:var(--muted);font-size:.82rem;grid-column:1/-1">No hay jugadores que coincidan</div>';return;}
  grid.innerHTML=players.slice(0,100).map(p=>{
    const isPicked=pickedIds.has(p.id);const maxC=!isPicked&&(cc[p.country_code]||0)>=3;
    const cls=isPicked?'fpicked':maxC?'fmaxc':'';const clickable=!isPicked&&!maxC;
    return `<div class="fplayer-card${cls?' '+cls:''}" title="${maxC?'Máx. 3 de '+p.team_name:isPicked?'Ya en tu equipo':p.name}" onclick="${clickable?`fPickPlayer('${p.id}')`:''}" >
      ${p.sofascore_player_id?`<img src="https://img.sofascore.com/api/v1/player/${p.sofascore_player_id}/image" alt="" width="32" height="32" referrerpolicy="no-referrer" style="border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--surf3)" onerror="this.style.display='none'">`:'' }
      <span class="fpcard-pos" style="${F_POS_COLORS[p.position]||''}">${p.position}</span>
      <div class="fpcard-info"><div class="fpcard-name">${p.short_name||p.name}</div><div class="fpcard-team">${p.team_name}</div></div>
    </div>`;
  }).join('');
}

function fPickPlayer(playerId){
  const p=fPlayers.find(p=>p.id===playerId);if(!p||!fPickerSlot)return;
  fSlots[fPickerSlot]=p;fClosePicker();fRenderField();fValidateTeam();
}

function fValidateTeam(){
  const form=F_FORMATIONS[fFormation];const total=1+form.DEF+form.MID+form.FWD;
  const players=Object.values(fSlots).filter(Boolean);const errors=[];
  if(players.length<total)errors.push(`Faltan ${total-players.length} jugador${total-players.length>1?'es':''}`);
  const cc={};players.forEach(p=>{cc[p.country_code]=(cc[p.country_code]||0)+1;});
  Object.entries(cc).forEach(([c,n])=>{if(n>3)errors.push(`Máx. 3 jugadores de la misma selección (${c}: ${n})`);});
  if(!fCaptain||!fSlots[fCaptain])errors.push('Pulsa sobre un jugador en el campo para designar capitán');
  const msg=document.getElementById('fvalidation-msg');const btn=document.getElementById('fbtn-save');
  if(msg)msg.innerHTML=errors.length?`<div class="alert awarn">${errors.map(e=>`• ${e}`).join('<br>')}</div>`:'<div class="alert aok">✅ Equipo completo y válido</div>';
  if(btn)btn.disabled=errors.length>0;
  return errors.length===0;
}

async function fSaveTeam(){
  if(new Date()>=F_LOCK_DATE){showMsg('fsave-msg','🔒 El plazo para guardar el equipo ha cerrado.','err');return;}
  if(!fValidateTeam())return;if(!currentUser){openAuthModal();return;}
  const btn=document.getElementById('fbtn-save');const spin=document.getElementById('fsave-spin');const msg=document.getElementById('fsave-msg');
  btn.disabled=true;btn.textContent='Guardando...';spin.style.display='';msg.innerHTML='';
  try{
    let teamId=fTeam?.id;
    if(!teamId){
      const{data,error}=await dbq(c=>c.from('fantasy_teams').insert({user_id:currentUser.id,season_id:F_SEASON_ID,formation:fFormation,total_points:0,locked:false}).select().single(),true);
      if(error)throw new Error(error.message);
      teamId=data.id;fTeam=data;
    }else{
      await dbq(c=>c.from('fantasy_teams').update({formation:fFormation}).eq('id',teamId),true);
    }
    await dbq(c=>c.from('fantasy_team_players').delete().eq('fantasy_team_id',teamId),true);
    const inserts=Object.entries(fSlots).filter(([,p])=>p).map(([slot,p])=>({fantasy_team_id:teamId,player_id:p.id,position_slot:slot,is_captain:slot===fCaptain}));
    const{error:e2}=await dbq(c=>c.from('fantasy_team_players').insert(inserts),true);
    if(e2)throw new Error(e2.message);
    fEditMode=false;btn.disabled=false;btn.innerHTML='✅ Guardar equipo';spin.style.display='none';
    msg.innerHTML='<div class="alert aok">✅ Equipo guardado correctamente</div>';
    setTimeout(()=>fLoadMyTeam(),1000);
  }catch(e){
    msg.innerHTML=`<div class="alert aerr">❌ Error: ${e.message}</div>`;
    btn.disabled=false;btn.innerHTML='✅ Guardar equipo';spin.style.display='none';
  }
}

// ── Clasificación ──
async function fLoadRanking(){
  const c=document.getElementById('fantasy-ranking-container');if(!c)return;
  c.innerHTML='<div style="text-align:center;padding:1.5rem"><div class="spin"></div></div>';
  const mundialStarted=deadlinePassed();
  const simMode=localStorage.getItem('debug_started')==='1';
  const showTeams=mundialStarted||simMode;
  const{data}=await dbq(c=>c.from('fantasy_teams').select('id,total_points,formation,user_id').eq('season_id',F_SEASON_ID).order('total_points',{ascending:false}));
  if(!data||!data.length){c.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)">Aún no hay equipos registrados.</div>';return;}
  const uids=data.map(t=>t.user_id);
  const{data:porras}=await dbq(c=>c.from('porras').select('user_id,nombre').in('user_id',uids));
  const nm={};porras?.forEach(p=>{nm[p.user_id]=p.nombre;});
  if(!showTeams){
    c.innerHTML='<div class="alert ainfo" style="margin-bottom:.75rem">🔒 Los equipos de los demás participantes se revelarán cuando comience el Mundial.</div>'+
      data.map((t,i)=>{
        const pos=i+1;const pc=pos<=3?` g${pos}`:'';const me=currentUser&&t.user_id===currentUser.id;
        const name=me?(nm[t.user_id]||'Tú'):'—';
        return `<div class="frank-row${me?' frank-me':''}">
          <div class="frank-pos${pc}">${pos}</div>
          <div><div style="font-weight:500">${me?esc(name):'<span style="color:var(--muted)">Participante</span>'}</div><div style="font-size:.7rem;color:var(--muted)">${me?t.formation:'?-?-?'}</div></div>
          <div class="frank-pts">${me?t.total_points||0+'  pts':'— pts'}</div>
        </div>`;
      }).join('');
    return;
  }
  window._fRankTeams={};
  c.innerHTML=data.map((t,i)=>{
    const pos=i+1;const pc=pos<=3?` g${pos}`:'';const me=currentUser&&t.user_id===currentUser.id;
    const name=nm[t.user_id]||'Anónimo';
    window._fRankTeams[t.id]={name,formation:t.formation,total_points:t.total_points||0};
    return `<div class="frank-row${me?' frank-me':''}" style="cursor:pointer" onclick="fShowTeamModal('${t.id}')" title="Ver equipo">
      <div class="frank-pos${pc}">${pos}</div>
      <div><div style="font-weight:500">${esc(name)}</div><div style="font-size:.7rem;color:var(--muted)">${t.formation}</div></div>
      <div class="frank-pts">${t.total_points||0} pts</div>
    </div>`;
  }).join('');
}

// ── Clasificación de Jugadores ──
let _fPRankAll=[];   // datos completos cacheados
let _fPRankSort='pts';  // 'pts' | 'avg'
let _fPRankPos='ALL';
let _fPRankTeam='ALL';
let _fPRankSearch='';

async function fLoadPlayersRanking(){
  const c=document.getElementById('fantasy-players-ranking-container');
  if(!c)return;

  // Si ya tenemos datos cacheados solo rerenderizamos
  if(_fPRankAll.length){fRenderPlayersRanking();return;}

  c.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted)"><div class="spin"></div></div>';

  await fLoadPlayers();
  if(!fPlayers.length){
    c.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">No hay jugadores cargados.</div>';
    return;
  }

  const plMap={};
  fPlayers.forEach(p=>{plMap[p.id]=p;});
  const ids=fPlayers.map(p=>p.id);

  // Fetch en bloques de 500 para evitar límites de URL
  let allScores=[];
  for(let i=0;i<ids.length;i+=500){
    const{data:chunk,error}=await dbq(c=>c
      .from('fantasy_player_scores')
      .select('player_id,points_base')
      .in('player_id',ids.slice(i,i+500)));
    if(error)break;
    if(chunk)allScores=allScores.concat(chunk);
  }

  if(!allScores.length){
    c.innerHTML='<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">Aún no hay puntuaciones registradas.</div>';
    return;
  }

  const map={};
  for(const row of allScores){
    const pid=row.player_id;
    const pl=plMap[pid];
    if(!pl)continue;
    if(!map[pid])map[pid]={pid,name:pl.short_name||pl.name,position:pl.position,team:pl.team_name,active:pl.active,ssid:pl.sofascore_player_id,pts:0,matches:0};
    map[pid].pts+=(row.points_base||0);
    map[pid].matches++;
  }
  _fPRankAll=Object.values(map);
  fRenderPlayersRanking();
}

function fRenderPlayersRanking(){
  const c=document.getElementById('fantasy-players-ranking-container');
  if(!c)return;
  const posColor={GK:'var(--gold)',DEF:'#93c5fd',MID:'#86efac',FWD:'#c4b5fd'};
  const teams=[...new Set(_fPRankAll.map(p=>p.team))].sort();

  // Filtrar
  const search=_fPRankSearch.toLowerCase();
  let list=_fPRankAll.filter(p=>{
    if(_fPRankPos!=='ALL'&&p.position!==_fPRankPos)return false;
    if(_fPRankTeam!=='ALL'&&p.team!==_fPRankTeam)return false;
    if(search&&!p.name.toLowerCase().includes(search))return false;
    return true;
  });

  // Ordenar
  if(_fPRankSort==='avg'){
    list.sort((a,b)=>(b.pts/b.matches)-(a.pts/a.matches));
  }else{
    list.sort((a,b)=>b.pts-a.pts);
  }

  const tabStyle=`display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .75rem;border-radius:20px;border:1px solid var(--border);font-size:.75rem;cursor:pointer;background:var(--surf2);color:var(--muted);font-family:inherit;transition:all .15s`;
  const tabActiveStyle=`display:inline-flex;align-items:center;gap:.3rem;padding:.3rem .75rem;border-radius:20px;border:1px solid var(--gold);font-size:.75rem;cursor:pointer;background:rgba(245,158,11,.12);color:var(--gold);font-weight:700;font-family:inherit;transition:all .15s`;

  const posFilters=['ALL','GK','DEF','MID','FWD'].map(pos=>`
    <button style="${_fPRankPos===pos?tabActiveStyle:tabStyle}" onclick="_fPRankPos='${pos}';fRenderPlayersRanking()">
      ${pos==='ALL'?'Todos':pos}
    </button>`).join('');

  c.innerHTML=`
    <div style="display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;margin-bottom:.75rem">
      <input id="fpr-search" type="text" placeholder="🔍 Buscar jugador..." value="${esc(_fPRankSearch)}"
        oninput="_fPRankSearch=this.value;fRenderPlayersRanking()"
        style="flex:1;min-width:160px;padding:.35rem .7rem;border-radius:6px;border:1px solid var(--border);background:var(--surf2);color:var(--fg);font-size:.8rem;font-family:inherit;outline:none"/>
      <select id="fpr-team" onchange="_fPRankTeam=this.value;fRenderPlayersRanking()"
        style="padding:.35rem .6rem;border-radius:6px;border:1px solid var(--border);background:var(--surf2);color:var(--fg);font-size:.78rem;font-family:inherit;outline:none;cursor:pointer">
        <option value="ALL" ${_fPRankTeam==='ALL'?'selected':''}>Todas las selecciones</option>
        ${teams.map(t=>`<option value="${esc(t)}" ${_fPRankTeam===t?'selected':''}>${esc(t)}</option>`).join('')}
      </select>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.75rem">
      ${posFilters}
      <div style="flex:1"></div>
      <button style="${_fPRankSort==='pts'?tabActiveStyle:tabStyle}" onclick="_fPRankSort='pts';fRenderPlayersRanking()">Pts totales</button>
      <button style="${_fPRankSort==='avg'?tabActiveStyle:tabStyle}" onclick="_fPRankSort='avg';fRenderPlayersRanking()">Media/partido</button>
    </div>
    ${list.length===0
      ?'<div style="text-align:center;padding:2rem;color:var(--muted);font-size:.85rem">No hay jugadores que coincidan.</div>'
      :`<table style="width:100%;border-collapse:collapse;font-size:.82rem">
        <thead><tr style="font-size:.65rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">
          <th style="padding:.4rem .5rem;text-align:left;border-bottom:1px solid var(--border)">#</th>
          <th style="padding:.4rem .5rem;text-align:left;border-bottom:1px solid var(--border)">Jugador</th>
          <th style="padding:.4rem .5rem;text-align:left;border-bottom:1px solid var(--border)">Pos</th>
          <th style="padding:.4rem .5rem;text-align:left;border-bottom:1px solid var(--border)" class="fpr-hide-mobile">Selección</th>
          <th style="padding:.4rem .5rem;text-align:right;border-bottom:1px solid var(--border)">PJ</th>
          <th style="padding:.4rem .5rem;text-align:right;border-bottom:1px solid var(--border);color:var(--gold)" class="${_fPRankSort==='pts'?'fpr-hide-mobile':''}">Media</th>
          <th style="padding:.4rem .5rem;text-align:right;border-bottom:1px solid var(--border);color:var(--gold)" class="${_fPRankSort==='avg'?'fpr-hide-mobile':''}">Pts</th>
        </tr></thead>
        <tbody>${list.map((p,i)=>{
          const avg=p.matches?+(p.pts/p.matches).toFixed(1):0;
          return `<tr style="cursor:pointer;${!p.active?'opacity:.45;':''}" onclick="fShowPlayerModal('${p.pid}')" title="Ver detalle de ${esc(p.name)}">
            <td style="padding:.38rem .5rem;color:var(--muted);border-bottom:1px solid var(--border);font-size:.75rem">${i+1}</td>
            <td style="padding:.38rem .5rem;border-bottom:1px solid var(--border);font-weight:500">
              <div style="display:flex;align-items:center;gap:.5rem">
                ${p.ssid?`<img src="https://img.sofascore.com/api/v1/player/${p.ssid}/image" alt="" width="28" height="28" referrerpolicy="no-referrer" style="border-radius:50%;object-fit:cover;background:var(--surf2);flex-shrink:0" onerror="this.style.display='none'">`:''}
                <span>${esc(p.name)}${!p.active?'<span style="font-size:.6rem;color:#ef4444;margin-left:.3rem">● elim.</span>':''}</span>
              </div>
            </td>
            <td style="padding:.38rem .5rem;border-bottom:1px solid var(--border)">
              <span style="font-size:.68rem;font-weight:700;color:${posColor[p.position]||'var(--muted)'}">${p.position}</span>
            </td>
            <td style="padding:.38rem .5rem;border-bottom:1px solid var(--border);color:var(--muted);font-size:.76rem" class="fpr-hide-mobile">${esc(p.team)}</td>
            <td style="padding:.38rem .5rem;border-bottom:1px solid var(--border);text-align:right;color:var(--muted)">${p.matches}</td>
            <td style="padding:.38rem .5rem;border-bottom:1px solid var(--border);text-align:right;color:var(--fg)" class="${_fPRankSort==='pts'?'fpr-hide-mobile':''}">${avg}</td>
            <td style="padding:.38rem .5rem;border-bottom:1px solid var(--border);text-align:right;font-weight:700;color:${!p.active?'#ef4444':'var(--green)'}" class="${_fPRankSort==='avg'?'fpr-hide-mobile':''}">${p.pts}</td>
          </tr>`;
        }).join('')}
        </tbody>
      </table>`
    }`;
}

// ── Modal: ficha detalle de jugador ──
async function fShowPlayerModal(playerId){
  const titleEl=document.getElementById('detail-title');
  const contentEl=document.getElementById('detail-content');
  const modal=document.getElementById('detail-modal');

  // Buscar datos del jugador en fPlayers
  const pl=fPlayers.find(p=>p.id===playerId);
  if(!pl)return;

  titleEl.innerHTML=`<div style="display:flex;align-items:center;gap:.75rem">
    ${pl.sofascore_player_id?`<img src="https://img.sofascore.com/api/v1/player/${pl.sofascore_player_id}/image" alt="" width="48" height="48" referrerpolicy="no-referrer" style="border-radius:50%;object-fit:cover;background:var(--surf2)" onerror="this.style.display='none'">`:'' }
    <div>
      <div>${esc(pl.short_name||pl.name)}</div>
      <div style="font-size:.75rem;font-family:'DM Sans',sans-serif;color:var(--muted);font-weight:400;letter-spacing:0">${esc(pl.team_name)} · ${pl.position}${!pl.active?' · <span style="color:#ef4444">eliminado</span>':''}</div>
    </div>
  </div>`;
  contentEl.innerHTML='<div style="text-align:center;padding:2rem"><div class="spin"></div></div>';
  modal.style.display='flex';

  // Cargar scores con datos del partido
  const{data,error}=await dbq(c=>c
    .from('fantasy_player_scores')
    .select('points_base,minutes_played,goals,assists,yellow_cards,red_cards,saves,clean_sheet,sofascore_rating,fantasy_matches!inner(home_team,away_team,home_score,away_score,match_date,round)')
    .eq('player_id',playerId)
    .order('fantasy_matches(match_date)',{ascending:true}));

  if(error||!data||!data.length){
    contentEl.innerHTML='<div style="color:var(--muted);padding:1rem;text-align:center;font-size:.85rem">Sin partidos registrados.</div>';
    return;
  }

  const totalPts=data.reduce((s,r)=>s+r.points_base,0);
  const posColor={GK:'var(--gold)',DEF:'#93c5fd',MID:'#86efac',FWD:'#c4b5fd'};

  let h=`<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:1.25rem">
    <div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1.25rem;text-align:center;min-width:80px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--gold);line-height:1">${totalPts}</div>
      <div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Pts totales</div>
    </div>
    <div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1.25rem;text-align:center;min-width:80px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--fg);line-height:1">${data.length}</div>
      <div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Partidos</div>
    </div>
    <div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1.25rem;text-align:center;min-width:80px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:var(--fg);line-height:1">${data.length?+(totalPts/data.length).toFixed(1):0}</div>
      <div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Media/PJ</div>
    </div>
    <div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1.25rem;text-align:center;min-width:80px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#86efac;line-height:1">${data.reduce((s,r)=>s+r.goals,0)}</div>
      <div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Goles</div>
    </div>
    <div style="background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:.75rem 1.25rem;text-align:center;min-width:80px">
      <div style="font-family:'Bebas Neue',sans-serif;font-size:2rem;color:#93c5fd;line-height:1">${data.reduce((s,r)=>s+r.assists,0)}</div>
      <div style="font-size:.65rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px">Asistencias</div>
    </div>
  </div>
  <div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.5rem">Partidos</div>
  <table style="width:100%;border-collapse:collapse;font-size:.8rem">
    <thead><tr style="font-size:.62rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)">
      <th style="padding:.35rem .5rem;text-align:left;border-bottom:1px solid var(--border)">Partido</th>
      <th style="padding:.35rem .5rem;text-align:right;border-bottom:1px solid var(--border)">Min</th>
      <th style="padding:.35rem .5rem;text-align:right;border-bottom:1px solid var(--border)">⚽</th>
      <th style="padding:.35rem .5rem;text-align:right;border-bottom:1px solid var(--border)">🅰️</th>
      <th style="padding:.35rem .5rem;text-align:right;border-bottom:1px solid var(--border)" class="fpr-hide-mobile">🟨</th>
      <th style="padding:.35rem .5rem;text-align:right;border-bottom:1px solid var(--border)" class="fpr-hide-mobile">CS</th>
      <th style="padding:.35rem .5rem;text-align:right;border-bottom:1px solid var(--border)" class="fpr-hide-mobile">Rating</th>
      <th style="padding:.35rem .5rem;text-align:right;border-bottom:1px solid var(--border)">Pts</th>
    </tr></thead>
    <tbody>${data.map(r=>{
      const m=r.fantasy_matches;
      const date=new Date(m.match_date).toLocaleDateString('es',{day:'numeric',month:'short'});
      const rival=pl.team_name===m.home_team
        ?`vs ${m.away_team} (${m.home_score}-${m.away_score})`
        :`vs ${m.home_team} (${m.away_score}-${m.home_score})`;
      const cards=r.yellow_cards>0||r.red_cards>0
        ?`${r.yellow_cards>0?'🟨'.repeat(r.yellow_cards):''}${r.red_cards>0?'🟥':''}`
        :'—';
      return `<tr>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border)">
          <div style="font-weight:500;font-size:.78rem">${rival}</div>
          <div style="font-size:.65rem;color:var(--muted)">${date} · ${m.round}</div>
        </td>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border);text-align:right;color:var(--muted)">${r.minutes_played}'</td>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border);text-align:right;color:${r.goals>0?'#86efac':'var(--muted)'};font-weight:${r.goals>0?'700':'400'}">${r.goals||'—'}</td>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border);text-align:right;color:${r.assists>0?'#93c5fd':'var(--muted)'};font-weight:${r.assists>0?'700':'400'}">${r.assists||'—'}</td>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border);text-align:right" class="fpr-hide-mobile">${cards}</td>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border);text-align:right;color:${r.clean_sheet?'var(--gold)':'var(--muted)'}" class="fpr-hide-mobile">${r.clean_sheet?'✓':'—'}</td>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border);text-align:right;color:var(--muted)" class="fpr-hide-mobile">${r.sofascore_rating??'—'}</td>
        <td style="padding:.35rem .5rem;border-bottom:1px solid var(--border);text-align:right;font-weight:700;color:var(--green)">${r.points_base}</td>
      </tr>`;
    }).join('')}
    </tbody>
  </table>`;

  contentEl.innerHTML=h;
}

// ── Modal: equipo fantasy de un participante ──
async function fShowTeamModal(teamId){
  const meta=(window._fRankTeams||{})[teamId]||{};
  const titleEl=document.getElementById('detail-title');
  const contentEl=document.getElementById('detail-content');
  const modal=document.getElementById('detail-modal');
  titleEl.textContent='⚽ '+(meta.name||'Equipo');
  contentEl.innerHTML='<div style="text-align:center;padding:2rem"><div class="spin"></div></div>';
  modal.style.display='flex';
  const{data:tps}=await dbq(c=>c.from('fantasy_team_players')
    .select('*,fantasy_players(*)').eq('fantasy_team_id',teamId));
  if(!tps||!tps.length){contentEl.innerHTML='<div style="color:var(--muted);padding:1.5rem;text-align:center">No se pudo cargar el equipo.</div>';return;}
  const pids=tps.map(tp=>tp.player_id);
  const scoreMap={};
  if(pids.length){
    const{data:scores}=await dbq(c=>c.from('fantasy_player_scores').select('player_id,points_base').in('player_id',pids));
    scores?.forEach(s=>{
      if(!scoreMap[s.player_id])scoreMap[s.player_id]={pts:0,matches:0};
      scoreMap[s.player_id].pts+=s.points_base;
      scoreMap[s.player_id].matches++;
    });
  }
  const byPos={GK:[],DEF:[],MID:[],FWD:[]};
  tps.forEach(tp=>{const pos=tp.fantasy_players?.position;if(byPos[pos])byPos[pos].push(tp);});
  let h=`<div style="font-size:.78rem;color:var(--muted);margin-bottom:.85rem">Formación: <strong style="color:var(--gold)">${esc(meta.formation||'')}</strong> · <strong style="color:var(--gold)">${meta.total_points||0}</strong> pts</div>`;
  ['GK','DEF','MID','FWD'].forEach(pos=>{
    if(!byPos[pos].length)return;
    const lbl={GK:'Portero',DEF:'Defensas',MID:'Centrocampistas',FWD:'Delanteros'}[pos];
    h+=`<div style="font-size:.7rem;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin:.5rem 0 .25rem">${lbl}</div>`;
    byPos[pos].forEach(tp=>{
      const pl=tp.fantasy_players;const sm=scoreMap[tp.player_id]||{pts:0,matches:0};
      const pts=sm.pts;const capPts=tp.is_captain?pts*2:pts;const inactive=pl&&!pl.active;
      h+=`<div class="mytp-row${inactive?' mytp-inactive':''}">
        <span class="mytp-pos fpos-${pos}" style="${F_POS_COLORS[pos]}">${pos}</span>
        ${pl?.sofascore_player_id?`<img src="https://img.sofascore.com/api/v1/player/${pl.sofascore_player_id}/image" alt="" width="26" height="26" referrerpolicy="no-referrer" style="border-radius:50%;object-fit:cover;flex-shrink:0;background:var(--surf3)" onerror="this.style.display='none'">`:'' }
        <span class="mytp-name">${esc(pl?.name||'—')}${inactive?' <span style="font-size:.65rem;color:var(--muted)">(eliminado)</span>':''}</span>
        <span class="mytp-team">${esc(pl?.team_name||'')}</span>
        ${tp.is_captain?'<span class="mytp-cap">C</span>':''}
        ${sm.matches?`<span style="font-size:.68rem;color:var(--muted);flex-shrink:0">${sm.matches}PJ</span>`:''}
        <span class="mytp-pts">${capPts} pts</span>
      </div>`;
    });
  });
  contentEl.innerHTML=h;
}

// ── Admin: panel fantasy ──
function fBuildAdminHTML(){
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;flex-wrap:wrap;gap:.5rem">
    <div><div style="font-weight:600;margin-bottom:.18rem">Sincronización de partidos</div>
    <div style="font-size:.78rem;color:var(--muted)">Sincroniza los partidos acabados con SofaScore y recalcula los puntos de todos los equipos.</div></div>
    <button class="btn btn-success" onclick="fSyncAll()" id="fbtn-sync">🔄 Sincronizar pendientes</button>
  </div>
  <div id="fsync-log" style="background:var(--surf2);border:1px solid var(--border);border-radius:8px;padding:.75rem;font-family:monospace;font-size:.72rem;color:#86efac;max-height:200px;overflow-y:auto;display:none;margin-bottom:1rem;white-space:pre-wrap"></div>
  <div style="font-size:.78rem;color:var(--muted);margin-bottom:.5rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Partidos pendientes</div>
  <div id="fadm-matches"><div style="text-align:center;padding:1.5rem"><div class="spin"></div></div></div>
  <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
    <div style="font-size:.78rem;color:var(--muted);margin-bottom:.5rem;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Gestión</div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      <button class="btn btn-ghost" onclick="fLockTeams()" style="font-size:.8rem">🔒 Cerrar equipos</button>
    </div>
  </div>`;
}

async function fLoadAdminMatches(){
  const c=document.getElementById('fadm-matches');if(!c)return;
  const now=new Date().toISOString();
  const{data}=await dbq(c=>c.from('fantasy_matches').select('*').eq('season_id',F_SEASON_ID).neq('status','synced').lt('match_date',now).order('match_date',{ascending:false}).limit(20));
  if(!data||!data.length){c.innerHTML='<div style="color:var(--muted);font-size:.82rem;padding:.5rem 0">No hay partidos pendientes.</div>';return;}
  c.innerHTML=data.map(m=>`<div style="display:flex;align-items:center;justify-content:space-between;padding:.5rem .75rem;border-bottom:1px solid var(--border);gap:.5rem;flex-wrap:wrap">
    <div><div style="font-size:.83rem;font-weight:500">${esc(m.home_team)} vs ${esc(m.away_team)}</div>
    <div style="font-size:.72rem;color:var(--muted)">${new Date(m.match_date).toLocaleDateString('es')} · ${m.round}</div></div>
    <span style="font-size:.72rem;padding:.15rem .5rem;border-radius:20px;background:rgba(244,162,97,.15);color:var(--gold)">⏳ Pendiente</span>
  </div>`).join('');
}

function fSyncLog(msg){
  const log=document.getElementById('fsync-log');if(!log)return;
  log.style.display='';log.textContent+=msg+'\n';log.scrollTop=log.scrollHeight;
}

async function fSyncAll(){
  const btn=document.getElementById('fbtn-sync');const log=document.getElementById('fsync-log');
  if(log){log.textContent='';log.style.display='';}
  if(btn){btn.disabled=true;btn.textContent='⏳ Sincronizando...';}
  fSyncLog('=== Iniciando sincronización ===');
  await fLoadPlayers();
  const now=new Date().toISOString();
  const{data:matches}=await dbq(c=>c.from('fantasy_matches').select('*').eq('season_id',F_SEASON_ID).neq('status','synced').lt('match_date',now).order('match_date'));
  if(!matches||!matches.length){fSyncLog('No hay partidos pendientes.');if(btn){btn.disabled=false;btn.textContent='🔄 Sincronizar pendientes';}return;}
  fSyncLog(`Partidos pendientes: ${matches.length}`);
  let synced=0;
  for(const m of matches){
    fSyncLog(`\n▶ ${m.home_team} vs ${m.away_team}`);
    const ok=await fSyncMatch(m);
    if(ok){synced++;fSyncLog('  ✓ Sincronizado');}else fSyncLog('  ⚠ No finalizado aún');
    await new Promise(r=>setTimeout(r,1200));
  }
  if(synced>0){fSyncLog('\n⚡ Recalculando puntos...');await fRecalcPoints();fSyncLog('✓ Puntos actualizados');}
  fSyncLog(`\n=== Fin: ${synced} sincronizados ===`);
  if(btn){btn.disabled=false;btn.textContent='🔄 Sincronizar pendientes';}
  fLoadAdminMatches();
}

async function fSyncMatch(match){
  const mid=match.sofascore_match_id;
  const ev=await fSsGet(`/event/${mid}`);
  if(!ev?.event||ev.event.status?.type!=='finished')return false;
  const homeScore=ev.event.homeScore?.current??0,awayScore=ev.event.awayScore?.current??0;
  const lineups=await fSsGet(`/event/${mid}/lineups`);if(!lineups)return false;
  const incData=await fSsGet(`/event/${mid}/incidents`);
  const incs=incData?.incidents||[];
  const cards={};
  incs.forEach(inc=>{if(inc.incidentType==='card'&&inc.player?.id){const pid=inc.player.id;if(!cards[pid])cards[pid]={y:0,r:0};if(inc.incidentClass==='yellow')cards[pid].y++;if(inc.incidentClass==='red')cards[pid].r++;if(inc.incidentClass==='yellowRed'){cards[pid].y++;cards[pid].r++;}}});
  const og={};incs.forEach(inc=>{if(inc.incidentType==='goal'&&inc.incidentClass==='ownGoal'&&inc.player?.id)og[inc.player.id]=(og[inc.player.id]||0)+1;});
  const all=[...(lineups.home?.players||[]).map(p=>({...p,side:'home'})),...(lineups.away?.players||[]).map(p=>({...p,side:'away'}))];
  const scores=[];
  for(const e of all){
    const pl=e.player,stats=e.statistics;
    if(!pl?.id||!stats||stats.minutesPlayed===undefined)continue;
    const dbPl=fPlayers.find(p=>p.sofascore_player_id===pl.id);if(!dbPl)continue;
    const min=stats.minutesPlayed||0,goals=stats.goals||0,assists=stats.goalAssist||0,saves=stats.saves||0;
    const yc=cards[pl.id]?.y||0,rc=cards[pl.id]?.r||0,ownG=og[pl.id]||0;
    const rivalScore=e.side==='home'?awayScore:homeScore;
    const cleanSheet=rivalScore===0&&min>=90;
    scores.push({player_id:dbPl.id,match_id:match.id,sofascore_rating:stats.rating||null,minutes_played:min,goals,assists,yellow_cards:yc,red_cards:rc,saves,clean_sheet:cleanSheet,own_goals:ownG,points_base:fCalcPts(dbPl.position,{min,goals,assists,saves,yc,rc,ownG,cleanSheet})});
  }
  fSyncLog(`  Jugadores: ${scores.length}`);
  for(let i=0;i<scores.length;i+=50)await dbq(c=>c.from('fantasy_player_scores').upsert(scores.slice(i,i+50),{onConflict:'player_id,match_id'}),true);
  await dbq(c=>c.from('fantasy_matches').update({status:'synced',home_score:homeScore,away_score:awayScore}).eq('id',match.id),true);
  return true;
}

function fCalcPts(pos,s){
  let pts=0;
  if(s.min>=60)pts+=2;else if(s.min>0)pts+=1;
  if(s.goals>0)pts+=s.goals*({GK:8,DEF:7,MID:6,FWD:4}[pos]||4);
  if(s.assists>0)pts+=s.assists*({GK:4,DEF:4,MID:4,FWD:3}[pos]||3);
  if(s.cleanSheet)pts+=({GK:5,DEF:3,MID:1,FWD:0}[pos]||0);
  if(pos==='GK'&&s.saves>0)pts+=Math.floor(s.saves/3);
  pts-=s.yc*1;pts-=s.rc*3;pts-=s.ownG*3;
  return Math.max(pts,0);
}

async function fRecalcPoints(){await dbq(c=>c.rpc('recalculate_fantasy_points',{p_season_id:F_SEASON_ID}),true);}
async function fLockTeams(){if(!confirm('¿Cerrar todos los equipos fantasy?'))return;await dbq(c=>c.rpc('lock_fantasy_teams',{p_season_id:F_SEASON_ID}),true);alert('✅ Equipos cerrados.');}
async function fSsGet(path){try{const r=await fetch(F_SS_BASE+path);if(!r.ok)return null;return await r.json();}catch(e){return null;}}

// Cerrar picker al pulsar fuera
document.getElementById('fpicker-overlay')?.addEventListener('click',e=>{if(e.target===document.getElementById('fpicker-overlay'))fClosePicker();});

// Pre-cargar jugadores en background
setTimeout(()=>{if(fPlayers.length===0)fLoadPlayers();},4000);

