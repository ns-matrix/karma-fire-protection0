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
  if (!supabase) { unavailable(host, 'Content is not available right now.'); return []; }
  // Keep page requests bounded so a slow connection never leaves a spinner forever.
  host.innerHTML='<p class="managed-loading">Loading…</p>';
  const request = supabase.from(table).select(columns).eq('is_active',true).order(orderColumn,{ascending:true});
  let timer;
  const timeout = new Promise(resolve => { timer=setTimeout(()=>resolve({data:null,error:{message:'Request timed out'}}),3500); });
  const result = await Promise.race([request,timeout]);
  clearTimeout(timer);
  const {data,error}=result;
  if(error){console.warn('[website-content] '+table,error.message||error);unavailable(host,'Content is temporarily unavailable. Please try again later.');return [];}
  if(!data?.length){unavailable(host,'No published content yet.');return [];}
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
  // Render only the content for the current page. Homepage has no CMS calls.
  const jobs=[];
  if(document.getElementById('managed-team')) jobs.push(renderTeam());
  if(document.getElementById('managed-services')) jobs.push(renderServices());
  if(document.getElementById('managed-products')) jobs.push(renderProducts());
  if(document.getElementById('managed-projects')) jobs.push(renderProjects());
  if(document.getElementById('managed-reviews')) jobs.push(renderTestimonials());
  if(document.getElementById('managed-projects-page')) jobs.push(renderProjectPage());
  Promise.allSettled(jobs);
}
start();
