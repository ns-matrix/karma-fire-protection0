begin;

create or replace function private.can_manage_website_content()
returns boolean language sql stable security definer set search_path = ''
as $$ select coalesce((select public.resolve_current_role()) in ('admin','super_admin','website_editor'),false); $$;
revoke all on function private.can_manage_website_content() from public,anon,authenticated;
grant execute on function private.can_manage_website_content() to authenticated;

alter table public.team_members add column if not exists is_demo boolean not null default false;
alter table public.products add column if not exists is_demo boolean not null default false;
alter table public.services add column if not exists is_demo boolean not null default false;
alter table public.public_portfolio_projects add column if not exists is_demo boolean not null default false;
alter table public.public_testimonials add column if not exists is_demo boolean not null default false;
alter table public.public_testimonials add column if not exists moderation_status text not null default 'approved';
alter table public.public_testimonials add column if not exists admin_reply text;
alter table public.public_testimonials drop constraint if exists public_testimonials_moderation_status_check;
alter table public.public_testimonials add constraint public_testimonials_moderation_status_check check (moderation_status in ('pending','approved','rejected'));

create table if not exists public.website_site_settings(
 id integer primary key default 1 check(id=1),
 business_name text not null default 'Karma Fire Protection LLP',
 phone text not null default '+91 95949 67751',
 email text not null default 'karmafireprotectionllp@gmail.com',
 address text not null default 'Police Station, 04, near Surya Nagar, Suryanagar No. 2, Surya Nagar, HMPL Surya Nagar, Vikhroli West, Mumbai, Maharashtra 400083',
 map_embed_url text,map_directions_url text,latitude numeric(10,7),longitude numeric(10,7),
 opening_hours jsonb not null default '{"days":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"note":"Available Mon - Sat for enquiries"}'::jsonb,
 social_dock_enabled boolean not null default true,updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id) on delete set null
);
alter table public.website_site_settings enable row level security;
grant select on public.website_site_settings to anon,authenticated;
grant insert,update,delete on public.website_site_settings to authenticated;
drop policy if exists website_site_settings_public_read on public.website_site_settings;
create policy website_site_settings_public_read on public.website_site_settings for select to anon,authenticated using(true);
drop policy if exists website_site_settings_content_admin on public.website_site_settings;
create policy website_site_settings_content_admin on public.website_site_settings for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));

drop policy if exists "Admins manage team" on public.team_members;
create policy "Website roles manage team" on public.team_members for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));
drop policy if exists "Admins manage products" on public.products;
create policy "Website roles manage products" on public.products for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));
drop policy if exists "Admins manage services" on public.services;
create policy "Website roles manage services" on public.services for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));
drop policy if exists "Admins manage social links" on public.social_links;
create policy "Website roles manage social links" on public.social_links for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));
drop policy if exists "Admins manage public portfolio projects" on public.public_portfolio_projects;
create policy "Website roles manage public portfolio projects" on public.public_portfolio_projects for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));
drop policy if exists "Admins manage public testimonials" on public.public_testimonials;
create policy "Website roles manage public testimonials" on public.public_testimonials for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));

grant insert on public.leads to anon,authenticated;
grant insert on public.public_testimonials to anon,authenticated;
drop policy if exists "Public can submit pending testimonials" on public.public_testimonials;
create policy "Public can submit pending testimonials" on public.public_testimonials for insert to anon,authenticated
 with check(moderation_status='pending' and is_active=false
  and char_length(trim(reviewer_name)) between 2 and 100
  and char_length(trim(review_text)) between 10 and 2000
  and (rating is null or rating between 1 and 5));

create or replace function public.cms_save_draft(p_slug text,p_content jsonb)
returns void language plpgsql security definer set search_path='public','private'
as $function$
begin
 if not private.can_manage_website_content() then raise exception 'Access denied'; end if;
 if p_slug not in('home','about','services','projects','contact','privacy') then raise exception 'Invalid page'; end if;
 if jsonb_typeof(p_content)<>'object' or coalesce(length(p_content->>'title'),0)>180
 or coalesce(length(p_content->>'intro'),0)>5000
 or jsonb_typeof(coalesce(p_content->'sections','[]'::jsonb))<>'array'
 or jsonb_array_length(coalesce(p_content->'sections','[]'::jsonb))>30 then raise exception 'Invalid CMS content'; end if;
 insert into public.website_cms_drafts(slug,content,updated_by,updated_at)
 values(p_slug,p_content,auth.uid(),now())
 on conflict(slug) do update set content=excluded.content,updated_by=excluded.updated_by,updated_at=now();
end $function$;

create or replace function public.cms_publish_page(p_slug text)
returns integer language plpgsql security definer set search_path='public','private'
as $function$
declare c jsonb;v int;
begin
 if not private.can_manage_website_content() then raise exception 'Access denied'; end if;
 select content into c from public.website_cms_drafts where slug=p_slug;
 if c is null then raise exception 'Draft not found'; end if;
 select coalesce(max(version_no),0)+1 into v from public.website_cms_versions where slug=p_slug;
 insert into public.website_cms_versions(slug,version_no,content,published_by) values(p_slug,v,c,auth.uid());
 insert into public.website_cms_published(slug,version_no,content,published_at)
 values(p_slug,v,c,now()) on conflict(slug) do update set version_no=excluded.version_no,content=excluded.content,published_at=now();
 return v;
end $function$;

create or replace function public.cms_restore_version(p_slug text,p_version integer)
returns void language plpgsql security definer set search_path='public','private'
as $function$
declare c jsonb;
begin
 if not private.can_manage_website_content() then raise exception 'Access denied'; end if;
 select content into c from public.website_cms_versions where slug=p_slug and version_no=p_version;
 if c is null then raise exception 'Version not found'; end if;
 insert into public.website_cms_drafts(slug,content,updated_by,updated_at)
 values(p_slug,c,auth.uid(),now())
 on conflict(slug) do update set content=excluded.content,updated_by=excluded.updated_by,updated_at=now();
end $function$;

revoke all on function public.cms_save_draft(text,jsonb) from public,anon;
revoke all on function public.cms_publish_page(text) from public,anon;
revoke all on function public.cms_restore_version(text,integer) from public,anon;
grant execute on function public.cms_save_draft(text,jsonb) to authenticated;
grant execute on function public.cms_publish_page(text) to authenticated;
grant execute on function public.cms_restore_version(text,integer) to authenticated;
drop policy if exists cms_admin_drafts on public.website_cms_drafts;
create policy cms_website_roles_drafts on public.website_cms_drafts for all to authenticated
 using((select private.can_manage_website_content())) with check((select private.can_manage_website_content()));
drop policy if exists cms_admin_versions on public.website_cms_versions;
create policy cms_website_roles_versions on public.website_cms_versions for select to authenticated
 using((select private.can_manage_website_content()));

insert into public.website_site_settings(id,business_name,phone,email,address,map_embed_url,map_directions_url,latitude,longitude,opening_hours,social_dock_enabled)
values(1,'Karma Fire Protection LLP','+91 95949 67751','karmafireprotectionllp@gmail.com',
'Police Station, 04, near Surya Nagar, Suryanagar No. 2, Surya Nagar, HMPL Surya Nagar, Vikhroli West, Mumbai, Maharashtra 400083',
'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3148.8652760042996!2d72.92270215289905!3d19.119104982994685!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7c7e58e35e8f7%3A0x442632f48fc315fb!2sKarma%20Fire%20Protection%20LLP!5e0!3m2!1sen!2sin!4v1795347881465!5m2!1sen!2sin',
'https://www.google.com/maps/search/?api=1&query=Police+Station+04+near+Surya+Nagar+Suryanagar+No+2+Surya+Nagar+HMPL+Surya+Nagar+Vikhroli+West+Mumbai+Maharashtra+400083',
19.119104982994685,72.92270215289905,
'{"days":["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],"opens":"09:00","closes":"19:00"}'::jsonb,true)
on conflict(id) do update set business_name=excluded.business_name,phone=excluded.phone,email=excluded.email,address=excluded.address,
 map_embed_url=excluded.map_embed_url,map_directions_url=excluded.map_directions_url,latitude=excluded.latitude,longitude=excluded.longitude,
 opening_hours=excluded.opening_hours,social_dock_enabled=excluded.social_dock_enabled,updated_at=now();

-- Remove only the two verified placeholder records; preserve enquiries, users and visitor/audit history.
delete from public.products where id='4a7bc6ff-1994-40cf-adf1-02f07a1e32e8'::uuid and name='Sample' and slug='Slug sample';
delete from public.public_testimonials where id='b35a25ed-8309-41f8-aa99-c160ea131b49'::uuid and reviewer_name='Sample review' and review_text='Sample test review text';

insert into public.services(id,name,slug,short_description,description,image_url,sort_order,is_active,is_demo) values
('a0000000-0000-4000-8000-000000000001','Fire Hydrant System','fire-hydrant-system','Hydrant ring mains, pump rooms, landing valves and hose reels.','Design, installation, testing and maintenance of fire hydrant networks for industrial, commercial and residential facilities.','assets/images/service-hydrant.webp',1,true,false),
('a0000000-0000-4000-8000-000000000002','Fire Alarm System','fire-alarm-system','Addressable and conventional fire detection systems.','Fire alarm panels, smoke and heat detectors, manual call points, hooters and system testing for early warning and evacuation.','assets/images/service-alarm.webp',2,true,false),
('a0000000-0000-4000-8000-000000000003','Fire Sprinkler System','fire-sprinkler-system','Automatic sprinkler networks for building fire protection.','Sprinkler piping, heads, valves and testing for warehouses, offices and other protected occupancies.','assets/images/service-sprinkler.webp',3,true,false),
('a0000000-0000-4000-8000-000000000004','Fire Suppression System','fire-suppression-system','Specialised suppression solutions for critical areas.','Fire suppression solutions for electrical rooms, server rooms and other areas requiring application-specific protection.','assets/images/hero-2.webp',4,true,false),
('a0000000-0000-4000-8000-000000000005','Maintenance & Inspection','maintenance-inspection','Periodic inspection, testing and preventive maintenance.','Inspection, testing, preventive maintenance and service support for installed fire protection systems.','assets/images/about-1.webp',5,true,false)
on conflict(id) do update set name=excluded.name,slug=excluded.slug,short_description=excluded.short_description,description=excluded.description,
 image_url=excluded.image_url,sort_order=excluded.sort_order,is_active=excluded.is_active,is_demo=excluded.is_demo,updated_at=now();

insert into public.products(id,name,slug,category,description,specifications,image_url,price_label,sort_order,is_active,is_demo) values
('a1000000-0000-4000-8000-000000000001','Sample Fire Hydrant Landing Valve','sample-hydrant-landing-valve','Hydrant Equipment','DEMO CATALOGUE ITEM — replace with verified manufacturer, model and specifications before publishing.','{"status":"sample","notes":"Confirm approved make, size, pressure rating and certification before publication."}'::jsonb,'assets/images/service-hydrant.webp',null,1,false,true),
('a1000000-0000-4000-8000-000000000002','Sample Addressable Fire Alarm Panel','sample-addressable-fire-alarm-panel','Fire Alarm Equipment','DEMO CATALOGUE ITEM — replace with verified manufacturer, model and specifications before publishing.','{"status":"sample","notes":"Confirm loop capacity, compatibility and applicable certification before publication."}'::jsonb,'assets/images/service-alarm.webp',null,2,false,true),
('a1000000-0000-4000-8000-000000000003','Sample Automatic Sprinkler Head','sample-automatic-sprinkler-head','Sprinkler Equipment','DEMO CATALOGUE ITEM — replace with verified manufacturer, model and specifications before publishing.','{"status":"sample","notes":"Confirm K-factor, temperature rating, response type and certification before publication."}'::jsonb,'assets/images/service-sprinkler.webp',null,3,false,true)
on conflict(id) do update set name=excluded.name,slug=excluded.slug,category=excluded.category,description=excluded.description,
 specifications=excluded.specifications,image_url=excluded.image_url,price_label=excluded.price_label,sort_order=excluded.sort_order,is_active=excluded.is_active,is_demo=excluded.is_demo,updated_at=now();

insert into public.team_members(id,name,role_title,bio,image_url,sort_order,is_active,is_demo) values
('a2000000-0000-4000-8000-000000000001','Sample Operations Lead','Operations Lead','DEMO PROFILE — replace with verified team details before publishing.','assets/images/about-1.webp',1,false,true),
('a2000000-0000-4000-8000-000000000002','Sample Survey Engineer','Survey Engineer','DEMO PROFILE — replace with verified team details before publishing.','assets/images/about-2.webp',2,false,true),
('a2000000-0000-4000-8000-000000000003','Sample Service Technician','Service Technician','DEMO PROFILE — replace with verified team details before publishing.','assets/images/about-1.webp',3,false,true)
on conflict(id) do update set name=excluded.name,role_title=excluded.role_title,bio=excluded.bio,image_url=excluded.image_url,
 sort_order=excluded.sort_order,is_active=excluded.is_active,is_demo=excluded.is_demo,updated_at=now();

insert into public.public_portfolio_projects(id,title,client_name,location,category,description,image_url,project_url,completion_date,sort_order,is_active,is_demo) values
('a3000000-0000-4000-8000-000000000001','Sample Commercial Fire Protection Project','Demo Client','Mumbai, Maharashtra','Fire Hydrant','DEMO PROJECT — replace with approved project details and client permission before publishing.','assets/images/hero-1.webp',null,null,1,false,true),
('a3000000-0000-4000-8000-000000000002','Sample Fire Alarm Upgrade','Demo Facility','Mumbai, Maharashtra','Fire Alarm','DEMO PROJECT — replace with verified project details and approved photographs before publishing.','assets/images/service-alarm.webp',null,null,2,false,true)
on conflict(id) do update set title=excluded.title,client_name=excluded.client_name,location=excluded.location,category=excluded.category,
 description=excluded.description,image_url=excluded.image_url,project_url=excluded.project_url,completion_date=excluded.completion_date,
 sort_order=excluded.sort_order,is_active=excluded.is_active,is_demo=excluded.is_demo,updated_at=now();

insert into public.public_testimonials(id,reviewer_name,company_name,review_text,rating,sort_order,is_active,is_demo,moderation_status,admin_reply) values
('a4000000-0000-4000-8000-000000000001','Sample Client','Demo Facility','DEMO REVIEW — replace with a genuine customer-approved testimonial before publishing.',5,1,false,true,'pending',null),
('a4000000-0000-4000-8000-000000000002','Sample Facility Manager','Demo Organisation','DEMO REVIEW — replace with a genuine customer-approved testimonial before publishing.',5,2,false,true,'pending',null)
on conflict(id) do update set reviewer_name=excluded.reviewer_name,company_name=excluded.company_name,review_text=excluded.review_text,
 rating=excluded.rating,sort_order=excluded.sort_order,is_active=excluded.is_active,is_demo=excluded.is_demo,
 moderation_status=excluded.moderation_status,admin_reply=excluded.admin_reply,updated_at=now();

insert into public.social_links(id,platform,label,url,icon_url,sort_order,is_active) values
('a5000000-0000-4000-8000-000000000001','WhatsApp','WhatsApp','https://wa.me/919594967751',null,1,true),
('a5000000-0000-4000-8000-000000000002','Phone','Call us','tel:+919594967751',null,2,true),
('a5000000-0000-4000-8000-000000000003','Email','Email','mailto:karmafireprotectionllp@gmail.com',null,3,true)
on conflict(id) do update set platform=excluded.platform,label=excluded.label,url=excluded.url,icon_url=excluded.icon_url,
 sort_order=excluded.sort_order,is_active=excluded.is_active,updated_at=now();

insert into public.website_cms_drafts(slug,content,updated_by,updated_at) values
('home','{"title":"Fire Protection Systems Built Around Your Site","intro":"Karma Fire Protection LLP provides fire hydrant, fire alarm, sprinkler, suppression, testing and maintenance solutions for safer buildings.","sections":[{"heading":"End-to-end fire safety","body":"From system planning and installation to inspection, testing and maintenance."},{"heading":"Serving Mumbai and surrounding areas","body":"Contact our team to discuss your site, compliance requirements and project scope."}]}'::jsonb,null,now()),
('about','{"title":"About Karma Fire Protection LLP","intro":"A fire protection solutions provider focused on installation, testing and maintenance of building fire safety systems.","sections":[{"heading":"Our approach","body":"Practical engineering, documented testing and ongoing service support."}]}'::jsonb,null,now()),
('services','{"title":"Fire Protection Services","intro":"Explore hydrant, alarm, sprinkler, suppression and maintenance services.","sections":[{"heading":"Site-specific solutions","body":"Final scope and system design are confirmed against site conditions and applicable standards."}]}'::jsonb,null,now()),
('projects','{"title":"Projects and Work","intro":"Project gallery content is managed here. Add only approved client projects and photographs before publishing.","sections":[{"heading":"Project showcase","body":"Demo project entries are intentionally unpublished until verified."}]}'::jsonb,null,now()),
('contact','{"title":"Request a Fire Safety Consultation","intro":"Share your site details and our team will contact you to discuss the next steps.","sections":[{"heading":"Visit or contact us","body":"Vikhroli West, Mumbai, Maharashtra 400083."}]}'::jsonb,null,now()),
('privacy','{"title":"Privacy Policy","intro":"How Karma Fire Protection LLP handles enquiry information and consent.","sections":[{"heading":"Enquiry information","body":"Information submitted through the contact form is used to respond to your enquiry and coordinate relevant services."}]}'::jsonb,null,now())
on conflict(slug) do update set content=excluded.content,updated_by=excluded.updated_by,updated_at=now();

commit;
