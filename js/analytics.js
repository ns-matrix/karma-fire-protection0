/* Consent-gated first-party analytics; no form contents or keystrokes. */
(function(w,d){'use strict';
const C='karma_analytics_consent',V='karma_visitor_uuid',S='karma_session_uuid',L='karma_session_last_active',T=1800000;let visitor=null,session=null,dbp=null,opts={enabled:true,clicks:true,scroll:true,forms:true,heartbeat:true},active=!d.hidden,last=Date.now(),activeMs=0,exitSent=false,scrollMax=0,started=new WeakSet(),heart=null;
const consent=()=>{try{return localStorage.getItem(C)||'undecided'}catch{return'undecided'}};
const uuid=()=>w.crypto?.randomUUID?.()||'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:r&3|8).toString(16)});
function cookie(k,v,days){try{d.cookie=k+'='+encodeURIComponent(v)+'; Path=/; Max-Age='+(days*86400)+'; SameSite=Lax'+(location.protocol==='https:'?'; Secure':'')}catch{}}
function id(){if(!visitor)visitor=localStorage.getItem(V)||uuid();localStorage.setItem(V,visitor);cookie(V,visitor,365);const old=sessionStorage.getItem(S),time=+(sessionStorage.getItem(L)||0);session=old&&Date.now()-time<T?old:uuid();sessionStorage.setItem(S,session);sessionStorage.setItem(L,Date.now());cookie(S,session,1)}
function device(){return innerWidth<768?'mobile':innerWidth<1024?'tablet':'desktop'}
function client(){if(!dbp)dbp=import('https://esm.sh/@supabase/supabase-js@2').then(({createClient})=>{let c=w.KARMA_SUPABASE||{};return c.url&&c.anonKey?createClient(c.url,c.anonKey,{auth:{persistSession:false,autoRefreshToken:false}}):null}).catch(()=>null);return dbp}
function label(x){return String(x||'').replace(/[\u0000-\u001f]/g,' ').replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,'[email]').replace(/\+?\d[\d ()-]{7,}\d/g,'[phone]').replace(/\s+/g,' ').trim().slice(0,80)}
async function track(name,el={},value=null){if(consent()!=='granted'||!opts.enabled)return;id();let db=await client();if(!db)return;let row={event_name:name,page_path:location.pathname.slice(0,500),page_title:label(d.title).slice(0,160),element_id:(el.id||'').slice(0,100)||null,element_label:label(el.label)||null,value,device_category:device(),visitor_uuid:visitor,session_uuid:session,consent_state:'granted'};let{error}=await db.from('analytics_events').insert(row);if(error)console.warn('[Karma analytics]',error.message)}
async function consentLog(choice,previous='undecided'){if(choice==='granted')id();let db=await client();if(db)db.from('website_consent_records').insert({consent_uuid:uuid(),visitor_uuid:choice==='granted'?visitor:null,consent_state:choice,consent_version:'1',page_path:location.pathname,device_category:device(),withdrawn:choice==='withdrawn'||(choice==='necessary'&&previous==='granted')})}
function tick(){if(active&&consent()==='granted'){activeMs+=Date.now()-last;last=Date.now()}}
function exit(){if(exitSent||consent()!=='granted')return;exitSent=true;tick();track('page_exit',{label:'active time'},Math.round(activeMs/1000))}
function page(){if(consent()!=='granted'||!opts.enabled)return;id();exitSent=false;activeMs=0;last=Date.now();track('page_view',{label:'page'});track('heartbeat',{label:'active signal'},0);if(heart)clearInterval(heart);if(opts.heartbeat)heart=setInterval(()=>active&&!d.hidden&&track('heartbeat',{label:'active signal'},0),30000)}
let consentRetry=null;
async function setConsent(x){
 if(!['granted','necessary','withdrawn'].includes(x))return;
 const previous=consent();
 try{localStorage.setItem(C,x)}catch{}
 // The preference is stored locally; do not create a separate consent cookie.
 d.getElementById('karma-consent-banner')?.remove();
 if(consentRetry){clearTimeout(consentRetry);consentRetry=null}
 if(x!=='granted'){
  try{localStorage.removeItem(V);sessionStorage.removeItem(S)}catch{}
  visitor=session=null;if(heart)clearInterval(heart);
  consentRetry=setTimeout(()=>{consentRetry=null;if(consent()!=='granted')banner()},5000);
 }else{
  activeMs=0;last=Date.now();active=true;exitSent=false;page();
 }
 // Record the choice without delaying the visual dismissal.
 consentLog(x,previous).catch(()=>{});
}
function banner(){
 if(consent()==='granted'||d.getElementById('karma-consent-banner'))return;
 let b=d.createElement('section');b.id='karma-consent-banner';b.setAttribute('role','dialog');b.setAttribute('aria-modal','false');b.setAttribute('aria-labelledby','karma-consent-title');b.setAttribute('aria-describedby','karma-consent-copy');
 b.innerHTML='<div class="karma-consent-copy"><span class="karma-consent-mark" aria-hidden="true">K</span><div><strong id="karma-consent-title">Your privacy matters</strong><p id="karma-consent-copy">We use essential storage to run this website. Optional analytics helps us understand page visits and improve the experience. We never record form contents or keystrokes. <a href="/privacy-policy.html">Privacy policy</a></p></div></div><div class="karma-consent-actions"><button type="button" id="kdecline" class="karma-consent-secondary">Decline</button><button type="button" id="kaccept" class="karma-consent-primary">Accept</button></div>';
 b.style.cssText='position:fixed;left:20px;right:20px;bottom:20px;max-width:980px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap;padding:20px 22px;background:#fff;color:#172638;border:1px solid #dce4eb;border-radius:16px;box-shadow:0 18px 60px rgba(12,30,45,.22);z-index:999999;font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif';
 let style=d.getElementById('karma-consent-style');if(!style){style=d.createElement('style');style.id='karma-consent-style';style.textContent='#karma-consent-banner .karma-consent-copy{display:flex;align-items:flex-start;gap:14px;flex:1;min-width:260px}#karma-consent-banner .karma-consent-mark{display:grid;place-items:center;flex:0 0 38px;height:38px;border-radius:10px;background:#172f43;color:#fff;font-weight:800;font-size:19px}#karma-consent-banner strong{display:block;font-size:15px;margin:0 0 3px}#karma-consent-banner p{margin:0;color:#5e6d7b;font-size:12px;max-width:650px}#karma-consent-banner a{color:#a72c37;text-decoration:underline}#karma-consent-banner .karma-consent-actions{display:flex;gap:9px;align-items:center}#karma-consent-banner button{min-height:42px;padding:10px 19px;border-radius:9px;border:1px solid #d7e0e7;font:700 13px system-ui;cursor:pointer}#karma-consent-banner .karma-consent-secondary{background:#f3f6f8;color:#263a4d}#karma-consent-banner .karma-consent-primary{background:#b92835;border-color:#b92835;color:#fff}@media(max-width:600px){#karma-consent-banner{left:12px;right:12px;bottom:12px;padding:16px;gap:14px}#karma-consent-banner .karma-consent-actions{width:100%}#karma-consent-banner button{flex:1}}';d.head.appendChild(style)}
 d.body.appendChild(b);
 b.querySelector('#kaccept').onclick=()=>setConsent('granted');
 b.querySelector('#kdecline').onclick=()=>setConsent('necessary');
}
async function init(){let db=await client();if(db){let{data}=await db.from('website_analytics_settings').select('tracking_enabled,track_clicks,track_scroll,track_forms,live_heartbeat').eq('id',1).maybeSingle();if(data)opts={enabled:data.tracking_enabled,clicks:data.track_clicks,scroll:data.track_scroll,forms:data.track_forms,heartbeat:data.live_heartbeat}}
d.addEventListener('visibilitychange',()=>{tick();active=!d.hidden;last=Date.now()});w.addEventListener('pagehide',exit);w.addEventListener('blur',()=>{tick();active=false});w.addEventListener('focus',()=>{active=true;last=Date.now()});d.addEventListener('scroll',()=>{if(!opts.scroll||consent()!=='granted')return;let p=Math.round(scrollY/Math.max(1,d.documentElement.scrollHeight-innerHeight)*100);[25,50,75,90].forEach(n=>{if(scrollMax<n&&p>=n)track('scroll_depth',{id:'depth-'+n,label:n+'% scroll'},n)});scrollMax=Math.max(scrollMax,p)},{passive:true});d.addEventListener('click',e=>{if(!opts.clicks)return;let t=e.target.closest('a,button,[role=button]');if(!t)return;track('click',{id:t.id||t.dataset.trackId,label:label(t.dataset.trackName||t.getAttribute('aria-label')||t.textContent)});let href=t.getAttribute('href')||'';if(/^(tel:|mailto:)|wa\.me|whatsapp/i.test(href))track('contact_action',{id:t.id,label:href.split(':')[0]})});d.addEventListener('focusin',e=>{if(!opts.forms)return;let f=e.target.closest('form');if(f&&!started.has(f)){started.add(f);track('form_start',{id:f.id,label:f.id||'form'})}});d.addEventListener('submit',e=>{if(opts.forms&&e.target.matches('form'))track('form_submit',{id:e.target.id,label:e.target.id||'form'})},true);w.KarmaAnalytics={getConsent:consent,setConsent,track,visitorId:()=>visitor,sessionId:()=>session,getAttribution:()=>({landingPage:sessionStorage.getItem('karma_landing_page')||location.pathname,visitorUuid:visitor,sessionUuid:session,source:new URLSearchParams(location.search).get('utm_source')||'Direct',medium:new URLSearchParams(location.search).get('utm_medium')||null,campaign:new URLSearchParams(location.search).get('utm_campaign')||null})};if(!sessionStorage.getItem('karma_landing_page'))sessionStorage.setItem('karma_landing_page',location.pathname);banner();if(consent()==='granted')page()}
init().catch(e=>console.warn('Karma analytics init',e))
})(window,document);