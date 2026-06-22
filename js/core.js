// ══ STATE ══
let sb=null,currentStep=0,isAdmin=false,isEditing=false,currentUser=null;
const N_STEPS=6,STEP_KEYS=['step_you','group_phase','r32','oct','qf','sf_fin'];

// ══ INIT ══
// ══ HARDCODED CONFIG ══
const SB_URL='https://ygwoznvyadxbfzhtgowd.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlnd296bnZ5YWR4YmZ6aHRnb3dkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyMzM0OTMsImV4cCI6MjA5MzgwOTQ5M30.7zp-fSk8Jphd-0OwIgAP7YmUsUmPMfFq8aa8NzRUslg';
// Admin access is controlled by the 'admins' table in Supabase (server-side)

window.onload=()=>{
  // Fix double ## caused by GitHub Pages trailing # + OAuth hash
  if(window.location.hash.startsWith('##')){
    const fixed=window.location.hash.substring(1);
    history.replaceState(null,'',window.location.pathname+fixed);
  }
  // Clean any trailing # left by Supabase auth redirect
  if(window.location.hash&&!window.location.hash.includes('access_token'))
    history.replaceState(null,'',window.location.pathname);

  LANG=localStorage.getItem('lang')||'es';
  document.getElementById('lang-sel').value=LANG;
  setLang(LANG);renderDeadline();renderStep(0);
  waitAndLoad(0);
  setTimeout(renderNormas,0);
  setTimeout(showBannerIfNeeded,500);
};
function waitAndLoad(attempts){
  // Keep for compatibility — delegates to initSupabase
  initSupabase();
  loadJugadors();
}

async function _anonQ(table, select, filters, order, limit, single=false){
  let url=`${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  Object.entries(filters).forEach(([k,v])=>{url+=`&${k}=eq.${encodeURIComponent(v)}`;});
  if(order)url+=`&order=${order.col}.${order.asc?'asc':'desc'}`;
  if(limit)url+=`&limit=${limit}`;
  const headers={'apikey':SB_KEY,'Authorization':'Bearer '+SB_KEY};
  if(single)headers['Accept']='application/vnd.pgrst.object+json';
  try{
    const r=await fetch(url,{headers});
    if(!r.ok){const e=await r.json().catch(()=>({}));return{data:null,error:{message:e.message||r.statusText,code:r.status}};}
    const data=await r.json();
    return{data,error:null};
  }catch(e){return{data:null,error:{message:e.message,code:'NETWORK'}};}
}
let _sbInitialized=false;
function normStr(s){
  if(!s)return'';
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[-_.]/g,' ').trim();
}

function playerMatch(a, b){
  if(!a||!b)return false;
  const na=normStr(a), nb=normStr(b);
  if(na===nb||na.includes(nb)||nb.includes(na))return true;
  // Word-level match: any word in common (min 4 chars to avoid false positives)
  const wa=na.split(/\s+/).filter(w=>w.length>=4);
  const wb=nb.split(/\s+/).filter(w=>w.length>=4);
  return wa.some(w=>wb.includes(w));
}

async function loadJugadors(){
  try{
    const{data}=await dbq(c=>(window._sbAnon||sb).from('jugadors').select('nom').order('nom'));
    if(data&&data.length)window._PLAYERS=data.map(r=>r.nom);
    else window._PLAYERS=[...PLAYERS];
  }catch(e){window._PLAYERS=[...PLAYERS];}
}

function initSupabase(){
  if(window._sbLoadFailed){
    const rc=document.getElementById('rank-container');
    if(rc)rc.innerHTML='<div class="alert aerr">❌ Sin conexión. Conéctate y recarga.<br><button class="btn btn-ghost" style="margin-top:.5rem" onclick="location.reload()">🔄 Recargar</button></div>';
    return;
  }
  if(_sbInitialized)return;
  if(!window._sbLoaded||typeof window.supabase==='undefined'||!window.supabase.createClient){
    setTimeout(initSupabase,250);return;
  }
  _sbInitialized=true;
  try{
    // ── Punto único de creación del cliente ──
    sb=window.supabase.createClient(SB_URL,SB_KEY,{
      auth:{detectSessionInUrl:true,persistSession:true,autoRefreshToken:true}
    });
    // Cliente anónimo para queries públicas (warning "multiple clients" es solo aviso)
    window._sbAnon=window.supabase.createClient(SB_URL,SB_KEY,{
      auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false,
        storage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}}}
    });
    window._sbReady=true;
    // ── Escuchador global de sesión ──
    // No usamos lock — cada evento se procesa independientemente.
    // onAuthChange es idempotente (solo actualiza UI), no hay riesgo de carrera real.
    sb.auth.onAuthStateChange(async(event,session)=>{
      const user=session?.user||null;
      if(event==='TOKEN_REFRESHED'){const ap=document.querySelector('.page.active');if(ap){const pid=ap.id.replace('page-','');if(pid==='ranking')loadRanking();if(pid==='muro')cargarMuro();}}
      if(event==='SIGNED_IN'||event==='TOKEN_REFRESHED'||event==='USER_UPDATED'){
        currentUser=user;
        if(window.location.hash.includes('access_token'))
          history.replaceState(null,'',window.location.pathname);
        await onAuthChange(currentUser);
      }else if(event==='INITIAL_SESSION'){
        // Solo procesar INITIAL_SESSION si hay usuario (sesión persistida)
        if(user){currentUser=user;await onAuthChange(currentUser);}
      }else if(event==='SIGNED_OUT'){
        currentUser=null;
        await onAuthChange(null);
      }
    });
    // getSession como fallback fiable
    // Si hay access_token en el hash (OAuth redirect), el SDK necesita tiempo para procesarlo
    // Esperamos al evento SIGNED_IN con un fallback de getSession cada segundo
    if(window.location.hash.includes('access_token')){
      // Poll getSession hasta que tengamos usuario o pasen 10s
      let _oauthTries=0;
      const _oauthPoll=setInterval(async()=>{
        _oauthTries++;
        const{data:{session}}=await sb.auth.getSession();
        if(session?.user){
          clearInterval(_oauthPoll);
          if(!currentUser){currentUser=session.user;await onAuthChange(currentUser);}
        } else if(_oauthTries>=10){
          clearInterval(_oauthPoll);
          console.warn('[AUTH] OAuth session not found after 10s');
        }
      },1000);
    } else {
      sb.auth.getSession().then(async({data:{session}})=>{
        if(session?.user&&!currentUser){
          currentUser=session.user;
          await onAuthChange(currentUser);
        }
      });
    }
    // Recover from blocked sb client when tab regains focus
    let _lastVisible=Date.now();
    document.addEventListener('visibilitychange',async()=>{
      if(document.visibilityState!=='visible'){_lastVisible=Date.now();return;}
      if(!currentUser)return;
      const away=Date.now()-_lastVisible;
      // If away less than 55 minutes, session should still be valid
      // Only reload data if away more than 2 minutes to avoid blocking sb during token refresh
      if(away<55*60*1000){
        if(away>2*60*1000){
          const ap=document.querySelector('.page.active');
          if(ap){
            const pid=ap.id.replace('page-','');
            if(pid==='ranking')loadRanking();
            if(pid==='muro')cargarMuro();
          }
        }
        return;
      }
      // Away more than 55 min — token may have expired, try to refresh
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('timeout')),8000));
      try{
        const{data:{session}}=await Promise.race([sb.auth.getSession(),timeout]);
        if(session?.user){
          currentUser=session.user;
          const ap=document.querySelector('.page.active');
          if(ap){
            const pid=ap.id.replace('page-','');
            if(pid==='ranking')loadRanking();
            if(pid==='muro')cargarMuro();
            if(pid==='porras')loadAllMyBets();
          }
        }else{
          currentUser=null;isAdmin=false;
          await onAuthChange(null);
        }
      }catch(e){
        console.warn('[AUTH] token refresh timeout — reloading');
        window.location.reload();
      }
    });
    // loadRanking e initMuro son públicos — no esperan a la sesión
    loadRanking();
    initMuro();
  }catch(e){console.error('Supabase init error:',e);}
}


// ── dbq: safe query wrapper with timeout ──────────────────────────────────
// Always use this for Supabase queries. Picks anon client for reads,
// auth client for writes. Times out after 10s instead of hanging forever.
async function dbq(queryFn, requiresAuth=false){
  const client = requiresAuth ? sb : (window._sbAnon||sb);
  return new Promise((resolve)=>{
    const timer = setTimeout(()=>{
      console.error('[DBQ] TIMEOUT after 10s — sb may be blocked. requiresAuth:', requiresAuth, 'currentUser:', currentUser?.email||null);
      resolve({data:null, error:{message:'Timeout — recarga la página', code:'TIMEOUT'}});
    }, 10000);
    queryFn(client).then(result=>{
      clearTimeout(timer);
      resolve(result);
    }).catch(err=>{
      clearTimeout(timer);
      console.error('[DBQ] caught error:', err.message);
      resolve({data:null, error:{message:err.message||'Error desconocido', code:'ERR'}});
    });
  });
}
async function onAuthChange(user){
  isAdmin=false;
  if(user){
    // Check admin role
    try{
      const{data,error}=await dbq(c=>c.from('admins').select('user_id').eq('user_id',user.id).maybeSingle(),true);
      isAdmin=!error&&!!data;
    }catch(e){console.error('[AUTH] admin check threw:',e.message);isAdmin=false;}
    // Update UI
    const nav=document.getElementById('user-nav');
    const loginBtn=document.getElementById('btn-login-nav');
    if(nav)nav.style.display='';
    if(loginBtn)loginBtn.style.display='none';
    const nameEl=document.getElementById('user-name-nav');
    const avatarEl=document.getElementById('user-avatar');
    const displayName=user.user_metadata?.full_name||user.user_metadata?.name||user.email?.split('@')[0]||'Usuario';
    if(nameEl)nameEl.textContent=displayName;
    if(avatarEl&&user.user_metadata?.avatar_url){avatarEl.src=user.user_metadata.avatar_url;avatarEl.style.display='';}
    const menuEmail=document.getElementById('user-menu-email');
    if(menuEmail)menuEmail.textContent=user.email;

    const tabAdmin=document.getElementById('tab-admin');
    if(tabAdmin)tabAdmin.style.display=(isAdmin||localStorage.getItem('debug_started')==='1')?'':'none';
    updateDebugBar();
    closeAuthModal();
    // Reload current page if it's porras
    const activePage=document.querySelector('.page.active');
    if(activePage?.id==='page-porras')loadAllMyBets();
  }else{
    // Not logged in
    const nav=document.getElementById('user-nav');
    const loginBtn=document.getElementById('btn-login-nav');
    if(nav)nav.style.display='none';
    if(loginBtn)loginBtn.style.display='';
    const tabAdmin=document.getElementById('tab-admin');
    if(tabAdmin)tabAdmin.style.display='none';
  }
}


// ── Mensajes de estado ──
function showMsg(id,msg,type){
  const el=document.getElementById(id);if(!el)return;
  const cls=type==='ok'?'aok':type==='err'?'aerr':'ainfo';
  el.innerHTML='<div class="alert '+cls+'" style="font-weight:600">'+msg+'</div>';
  el.scrollIntoView({behavior:'smooth',block:'center'});
  if(type==='ok'||type==='info')setTimeout(()=>{if(el)el.innerHTML='';},5000);
}



