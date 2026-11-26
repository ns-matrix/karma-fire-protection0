/* Social links are managed in the Supabase CRM. */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cfg=window.KARMA_SUPABASE||{};
if(cfg.url&&cfg.anonKey){
 const db=createClient(cfg.url,cfg.anonKey);
 const container=document.querySelector('.float-actions');
 if(container){
  db.from('social_links').select('platform,label,url,icon_url,is_active,sort_order').eq('is_active',true).order('sort_order').then(({data,error})=>{
   if(error||!data?.length)return;
   const top=container.querySelector('.float-top');
   container.querySelectorAll('.float-btn:not(.float-top)').forEach(el=>el.remove());
   data.forEach(item=>{
    const a=document.createElement('a');
    const platform=String(item.platform||'social').toLowerCase().replace(/[^a-z0-9-]/g,'-');
    a.className='float-btn float-'+platform;
    let safeUrl='';
    try { const parsed=new URL(item.url,window.location.href); if(['https:','http:','mailto:','tel:'].includes(parsed.protocol))safeUrl=parsed.href; } catch (_) {}
    if(!safeUrl)return;
    a.href=safeUrl;
    a.target=/^(mailto:|tel:)/i.test(item.url)?'_self':'_blank';
    if(a.target==='_blank')a.rel='noopener noreferrer';
    a.setAttribute('aria-label',item.label||item.platform);
    a.dataset.tip=item.label||item.platform;
    if(item.icon_url){
      const img=document.createElement('img');img.src=item.icon_url;img.alt='';img.width=22;img.height=22;img.loading='lazy';img.style.objectFit='contain';a.appendChild(img);
    }else{
      a.textContent=(item.label||item.platform||'Link').slice(0,2).toUpperCase();
      a.style.fontWeight='800';a.style.fontSize='12px';
    }
    a.style.textDecoration='none';
    if(top)top.insertAdjacentElement('beforebegin',a);else container.appendChild(a);
   });
  });
 }
}
