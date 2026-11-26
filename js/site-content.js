import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.KARMA_SUPABASE||{};
if(!cfg.url||!cfg.anonKey)return;
const supabase=createClient(cfg.url,cfg.anonKey);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function render(table,target,kind){
 const host=document.getElementById(target);if(!host)return;
 const {data,error}=await supabase.from(table).select('*').eq('is_active',true).order('sort_order',{ascending:true});
 if(error){host.textContent='Content is temporarily unavailable.';return}
 if(!data?.length){host.innerHTML='<p class="muted">Information will be updated soon.</p>';return}
 host.innerHTML=data.map(item=>{
  const title=item.name||'';
  const image=item.image_url?'<img loading="lazy" src="'+esc(item.image_url)+'" alt="'+esc(title)+'">':'';
  const role=kind==='team'?'<div class="managed-role">'+esc(item.role_title)+'</div>':'';
  const description=kind==='product'?item.description:(kind==='service'?(item.short_description||item.description):item.bio);
  return '<article class="managed-card">'+image+'<div class="managed-body"><h3>'+esc(title)+'</h3>'+role+'<p>'+esc(description||'')+'</p></div></article>';
 }).join('');
}
Promise.all([
 render('services','managed-services','service'),
 render('products','managed-products','product'),
 render('team_members','managed-team','team')
]);
