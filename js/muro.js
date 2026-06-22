// ══ MURO DE MENSAJES ══
let _muroChannel=null;
function initMuro(){
  if(!sb)return;
  cargarMuro();
  // Realtime subscription
  if(_muroChannel){sb.removeChannel(_muroChannel);_muroChannel=null;}
  _muroChannel=sb.channel('muro_realtime')
    .on('postgres_changes',{event:'INSERT',schema:'public',table:'muro_mensajes'},()=>{cargarMuro();})
    .subscribe();
}
async function cargarMuro(){
  const c=document.getElementById('muro-container');if(!c)return;
  const{data,error}=await dbq(c=>(window._sbAnon||sb).from('muro_mensajes').select('user_id,nombre,mensaje,created_at').order('created_at',{ascending:true}).limit(80));
  if(error){
    // If RLS error (not authenticated), show empty state not error
    if(error.code==='PGRST301'||error.message?.includes('JWT')||error.message?.includes('permission')){
      c.innerHTML='<div class="muro-empty">'+t('muro_empty')+'</div>';
    }else{
      c.innerHTML='<div class="muro-empty">'+t('muro_error')+'</div>';
    }
    return;
  }
  if(!data?.length){c.innerHTML='<div class="muro-empty">'+t('muro_empty')+'</div>';return;}
  c.innerHTML=data.map(m=>{
    const own=currentUser&&m.user_id===currentUser.id;
    const time=new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    return '<div class="chat-msg'+(own?' own':'')+'">'
      +'<b>'+esc(m.nombre)+'</b>'
      +'<span>'+esc(m.mensaje)+'</span>'
      +'<small>'+time+'</small>'
      +'</div>';
  }).join('');
  c.scrollTop=c.scrollHeight;
  // Mostrar/ocultar input según sesión
  const wrap=document.getElementById('muro-input-wrap');
  const hint=document.getElementById('muro-login-hint');
  if(currentUser){if(wrap)wrap.style.display='flex';if(hint)hint.style.display='none';}
  else{if(wrap)wrap.style.display='none';if(hint)hint.style.display='';}
}
let _muroLastSend=0;
async function enviarMensaje(){
  if(!currentUser){openAuthModal();return;}
  const now=Date.now();
  if(now-_muroLastSend<8000){showConfirmModal('⏳ Espera','Por favor espera unos segundos antes de enviar otro mensaje.',()=>{});return;}
  const inp=document.getElementById('muro-input');
  const msg=inp?.value.trim();
  if(!msg)return;
  const nombre=currentUser.user_metadata?.full_name||currentUser.user_metadata?.name||currentUser.email?.split('@')[0]||'Anónimo';
  const btn=document.getElementById('muro-send-btn');
  if(btn)btn.disabled=true;
  const{error}=await sb.from('muro_mensajes').insert({user_id:currentUser.id,nombre,mensaje:msg});
  if(btn)btn.disabled=false;
  if(!error){inp.value='';_muroLastSend=Date.now();}
  else showConfirmModal('❌ Error','No se pudo enviar el mensaje: '+error.message,()=>{});
}



async function loadAdmMuro(container){
  if(!sb)return;
  const{data,error}=await sb.from('muro_mensajes').select('id,nombre,mensaje,created_at').order('created_at',{ascending:false}).limit(100);
  if(error){container.innerHTML='<div class="alert aerr">'+error.message+'</div>';return;}
  if(!data?.length){container.innerHTML='<div class="alert ainfo">No hay mensajes.</div>';return;}
  let h='<div style="display:flex;flex-direction:column;gap:.5rem">';
  data.forEach(m=>{
    const ts=new Date(m.created_at).toLocaleString('es-ES',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});
    h+='<div id="muro-row-'+m.id+'" style="display:flex;align-items:flex-start;gap:.75rem;background:var(--surf2);border:1px solid var(--border);border-radius:10px;padding:.6rem .8rem">'
      +'<div style="flex:1;min-width:0"><span style="color:var(--gold);font-size:.75rem;font-weight:700">'+esc(m.nombre)+'</span>'
      +' <span style="color:var(--muted);font-size:.68rem">'+ts+'</span>'
      +'<div style="font-size:.85rem;margin-top:.2rem;word-break:break-word">'+esc(m.mensaje)+'</div></div>'
      +'<button class="btn btn-ghost" style="flex-shrink:0;padding:.2rem .5rem;font-size:.8rem;color:#f87171" data-msgid="'+m.id+'" onclick="admDeleteMuroMsg(this)">🗑</button>'
      +'</div>';
  });
  container.innerHTML=h+'</div>';
}
async function admDeleteMuroMsg(btn){
  const id=btn.getAttribute('data-msgid');
  showConfirmModal(t('muro_delete_confirm'),'',async()=>{
    const{error}=await sb.from('muro_mensajes').delete().eq('id',id);
    if(error){showConfirmModal('❌ Error',error.message,()=>{});return;}
    const row=document.getElementById('muro-row-'+id);
    if(row)row.remove();
  });
}
function showBannerIfNeeded(){
  if(!localStorage.getItem('banner_dismissed')){var b=document.getElementById('session-banner');if(b)b.style.display='flex';}
}
function dismissBanner(){
  localStorage.setItem('banner_dismissed','1');var b=document.getElementById('session-banner');if(b)b.style.display='none';
}
// ── SIMULADOR ──────────────────────────────────────────────────────────────
