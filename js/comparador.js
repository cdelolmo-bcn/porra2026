// ══ COMPARADOR DE PORRAS ══
let _compareTarget=null; // {nombre, data} de la porra rival

async function openCompare(nombreRival){
  if(!currentUser){openAuthModal();return;}
  // Cargar porra rival
  const{data:rival,error}=await dbq(c=>(window._sbAnon||sb).from('porras').select('nombre,puntos,data').eq('nombre',nombreRival).limit(1).maybeSingle());
  if(error||!rival)return;
  _compareTarget=rival;
  // Badge curioso: marcar que el usuario ha usado el comparador
  if(currentUser&&sb){
    sb.from('porras').select('logros').eq('user_id',currentUser.id).limit(1).maybeSingle().then(({data})=>{
      if(data){const l=new Set(data.logros||[]);l.add('curioso');
        sb.from('porras').update({logros:[...l]}).eq('user_id',currentUser.id);}
    });
  }
  // Cargar porras propias
  const{data:own}=await sb.from('porras').select('nombre,puntos,data').eq('user_id',currentUser.id).order('updated_at',{ascending:false});
  if(!own?.length){showConfirmModal('ℹ️','Necesitas tener una porra propia para comparar.',()=>{});return;}
  // Si solo tiene una, comparar directamente
  if(own.length===1){
    renderCompare(own[0],rival);
  }else{
    // Mostrar selector
    const sel=document.getElementById('compare-own-select');
    sel.innerHTML=own.map(p=>'<option value="'+esc(p.nombre)+'">'+esc(p.nombre)+' ('+p.puntos+' pts)</option>').join('');
    sel.dataset.ownData=JSON.stringify(own);
    document.getElementById('compare-selector').style.display='';
    // Render con la primera
    renderCompare(own[0],rival);
  }
  document.getElementById('compare-modal').classList.add('open');
}

function compareWithSelected(){
  const sel=document.getElementById('compare-own-select');
  const own=JSON.parse(sel.dataset.ownData||'[]');
  const chosen=own.find(p=>p.nombre===sel.value);
  if(chosen&&_compareTarget)renderCompare(chosen,_compareTarget);
}

function renderCompare(pA,pB){
  const allT=TNAMES[LANG]||TNAMES.es;
  const dA=JSON.parse(pA.data||'{}'),dB=JSON.parse(pB.data||'{}');
  document.getElementById('comp-name-a').textContent=pA.nombre;
  document.getElementById('comp-name-b').textContent=pB.nombre;
  document.getElementById('lbl-compare-title').textContent=t('compare_title')||'COMPARADOR DE PORRAS';

  // Stats: cuántas coinciden
  const fases=[{lbl:'R32',p:'r32_',n:16},{lbl:'Oct',p:'oct_',n:8},{lbl:'QF',p:'qf_',n:4},{lbl:'SF',p:'sf_',n:2},{lbl:'Final',p:'final_',n:1}];
  let totalMatch=0,totalDiff=0;
  fases.forEach(f=>{for(let i=1;i<=f.n;i++){const k=f.p+i,a=dA.ko?.[k],b=dB.ko?.[k];if(a!=null&&b!=null){a===b?totalMatch++:totalDiff++;}}});
  // Extras
  ['camp','esp'].forEach(k=>{const a=dA.extras?.[k],b=dB.extras?.[k];if(a&&b){a===b?totalMatch++:totalDiff++;}});
  ['gol','jug'].forEach(k=>{const a=dA.extras?.[k],b=dB.extras?.[k];if(a&&b){
    const match=a.toLowerCase()===b.toLowerCase()||a.toLowerCase().includes(b.toLowerCase())||b.toLowerCase().includes(a.toLowerCase());
    match?totalMatch++:totalDiff++;
  }});

  const statsEl=document.getElementById('compare-stats');
  statsEl.innerHTML=
    '<div class="compare-stat"><div class="cs-num" style="color:var(--green)">'+totalMatch+'</div><div class="cs-lbl">'+t('compare_same')+'</div></div>'+
    '<div class="compare-stat"><div class="cs-num" style="color:var(--accent)">'+totalDiff+'</div><div class="cs-lbl">'+t('compare_diff')+'</div></div>';

  let h='';
  // KO rounds
  fases.forEach(f=>{
    h+='<div class="compare-label">'+f.lbl+'</div>';
    for(let i=1;i<=f.n;i++){
      const k=f.p+i,a=dA.ko?.[k],b=dB.ko?.[k];
      if(a==null&&b==null)continue;
      const same=a===b,css=same?'match-ok':'match-diff',icon=same?'✅':'❌';
      h+='<div class="compare-row">';
      h+='<div class="comp-team '+css+'">'+(a!=null?fi(a,true)+'<span>'+esc(allT[a])+'</span>':'<span style="color:var(--muted)">—</span>')+'</div>';
      h+='<div style="text-align:center;font-size:.75rem">'+icon+'</div>';
      h+='<div class="comp-team comp-right '+css+'">'+(b!=null?'<span>'+esc(allT[b])+'</span>'+fi(b,true):'<span style="color:var(--muted)">—</span>')+'</div>';
      h+='</div>';
    }
  });
  // Extras
  h+='<div class="compare-label">Extras</div>';
  const extrasMap=[
    {lbl:'🥇 '+t('winner'),key:'camp',isTeam:true},
    {lbl:fi(28,true)+' '+t('spain_pos'),key:'esp',isTeam:false,fmt:fmtEsp},
    {lbl:'⚽ '+t('top_scorer'),key:'gol',isTeam:false},
    {lbl:'🌟 '+t('best_player'),key:'jug',isTeam:false},
  ];
  extrasMap.forEach(ex=>{
    const a=dA.extras?.[ex.key],b=dB.extras?.[ex.key];
    if(!a&&!b)return;
    let same;
    if(ex.key==='gol'||ex.key==='jug'){
      same=a&&b&&playerMatch(a,b);
    } else {
      same=a===b;
    }
    const css=same?'match-ok':'match-diff',icon=same?'✅':'❌';
    const fmtA=ex.isTeam&&a!=null?fi(a,true)+' '+(allT[a]||''):(ex.fmt?ex.fmt(a):esc(a||'—'));
    const fmtB=ex.isTeam&&b!=null?fi(b,true)+' '+(allT[b]||''):(ex.fmt?ex.fmt(b):esc(b||'—'));
    h+='<div class="compare-row">';
    h+='<div class="comp-team '+css+'"><span style="color:var(--muted);font-size:.7rem;margin-right:.3rem">'+ex.lbl+'</span>'+fmtA+'</div>';
    h+='<div style="text-align:center;font-size:.75rem">'+icon+'</div>';
    h+='<div class="comp-team comp-right '+css+'">'+fmtB+'<span style="color:var(--muted);font-size:.7rem;margin-left:.3rem">'+ex.lbl+'</span></div>';
    h+='</div>';
  });

  document.getElementById('compare-content').innerHTML=h;
}

function closeCompare(){
  document.getElementById('compare-modal').classList.remove('open');
  _compareTarget=null;
  document.getElementById('compare-selector').style.display='none';
}

