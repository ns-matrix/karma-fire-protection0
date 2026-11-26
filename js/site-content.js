import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cfg = window.KARMA_SUPABASE || {};
const supabase = cfg.url && cfg.anonKey ? createClient(cfg.url, cfg.anonKey) : null;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeUrl = (value) => {
  if (!value) return '';
  try { const url = new URL(value, window.location.href); return ['https:','http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
};
function unavailable(host, message) { if (host) host.innerHTML = '<p class="managed-empty">'+esc(message)+'</p>'; }
async function fetchPublic(table, columns, host, orderColumn='sort_order') {
  if (!host) return [];
  if (!supabase) { unavailable(host, 'Website content could not connect.'); return []; }
  host.innerHTML='<p class="managed-loading">Loading content…</p>';
  const {data,error}=await supabase.from(table).select(columns).eq('is_active',true).order(orderColumn,{ascending:true});
  if(error){console.error('[website-content] '+table,error);unavailable(host,'This section is temporarily unavailable.');return []}
  if(!data?.length){unavailable(host,'Content will be updated soon.');return []}
  return data;
}
function card({title,image,subtitle,description,extra='',link=''}) {
  const src=safeUrl(image), href=safeUrl(link);
  return '<article class="managed-card">'+(src?'<img loading="lazy" src="'+esc(src)+'" alt="'+esc(title)+'">':'')+
    '<div class="managed-body"><h3>'+esc(title)+'</h3>'+(subtitle?'<div class="managed-role">'+esc(subtitle)+'</div>':'')+
    (description?'<p>'+esc(description)+'</p>':'')+extra+
    (href?'<a class="managed-link" href="'+esc(href)+'" target="_blank" rel="noopener noreferrer">Learn more ↗</a>':'')+'</div></article>';
}
async function renderTeam(){
 const host=document.getElementById('managed-team'); if(!host)return;
 const rows=await fetchPublic('team_members','id,name,role_title,bio,image_url,sort_order,is_active',host);
 if(rows.length)host.innerHTML=rows.map(x=>card({title:x.name,subtitle:x.role_title,description:x.bio,image:x.image_url})).join('');
}
async function renderServices(){
 const host=document.getElementById('managed-services');if(!host)return;
 const rows=await fetchPublic('services','id,name,short_description,description,image_url,slug,sort_order,is_active',host);
 if(rows.length)host.innerHTML=rows.map(x=>card({title:x.name,description:x.short_description||x.description,image:x.image_url,link:x.slug?window.location.origin+'/contact.html?service='+encodeURIComponent(x.name):''})).join('');
}
async function renderProducts(){
 const host=document.getElementById('managed-products');if(!host)return;
 const rows=await fetchPublic('products','id,name,category,description,specifications,image_url,price_label,sort_order,is_active',host);
 if(rows.length)host.innerHTML=rows.map(x=>{
  const specs=x.specifications&&typeof x.specifications==='object'?Object.entries(x.specifications).slice(0,5).map(([k,v])=>'<li>'+esc(k)+': '+esc(v)+'</li>').join(''):'';
  const extra=specs?'<ul class="managed-specs">'+specs+'</ul>':'';
  return card({title:x.name,subtitle:x.category||x.price_label,description:x.description,image:x.image_url,extra});
 }).join('');
}
async function renderProjects(){
 const host=document.getElementById('managed-projects');if(!host)return;
 const rows=await fetchPublic('public_portfolio_projects','id,title,client_name,location,category,description,image_url,project_url,completion_date,sort_order,is_active',host);
 if(rows.length)host.innerHTML=rows.map(x=>card({title:x.title,subtitle:[x.category,x.location,x.completion_date].filter(Boolean).join(' · '),description:x.description,image:x.image_url,link:x.project_url})).join('');
}
async function renderTestimonials(){
 const host=document.getElementById('managed-reviews');if(!host)return;
 const rows=await fetchPublic('public_testimonials','id,reviewer_name,company_name,review_text,rating,sort_order,is_active',host);
 if(rows.length)host.innerHTML=rows.map(x=>{
  const stars=Number(x.rating)||0;
  return '<article class="managed-card review-card"><div class="managed-body"><div class="review-stars" aria-label="'+esc(stars)+' out of 5 stars">'+('★'.repeat(Math.max(0,Math.min(5,stars))))+('☆'.repeat(Math.max(0,5-stars)))+'</div><p>“'+esc(x.review_text)+'”</p><h3>'+esc(x.reviewer_name)+'</h3><div class="managed-role">'+esc(x.company_name||'Client')+'</div></div></article>';
 }).join('');
}
async function renderProjectPage(){
 const host=document.getElementById('managed-projects-page');if(!host)return;
 const rows=await fetchPublic('public_portfolio_projects','id,title,client_name,location,category,description,image_url,project_url,completion_date,sort_order,is_active',host);
 if(rows.length)host.innerHTML=rows.map(x=>card({title:x.title,subtitle:[x.client_name,x.category,x.location,x.completion_date].filter(Boolean).join(' · '),description:x.description,image:x.image_url,link:x.project_url})).join('');
}
function start(){
 if(!supabase){document.querySelectorAll('[data-managed-content]').forEach(h=>unavailable(h,'Website content is not configured.'));return}
 renderTeam();renderServices();renderProducts();renderProjects();renderTestimonials();renderProjectPage();
}
start();
