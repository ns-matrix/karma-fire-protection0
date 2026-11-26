-- Public, approved website portfolio content. These are intentionally separate
-- from internal CRM projects, which contain private assignment/customer data.
create table if not exists public.public_portfolio_projects (
 id uuid primary key default gen_random_uuid(),
 title text not null,
 client_name text,
 location text,
 category text,
 description text,
 image_url text,
 project_url text,
 completion_date date,
 sort_order integer not null default 0,
 is_active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create table if not exists public.public_testimonials (
 id uuid primary key default gen_random_uuid(),
 reviewer_name text not null,
 company_name text,
 review_text text not null,
 rating integer check (rating between 1 and 5),
 sort_order integer not null default 0,
 is_active boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.public_portfolio_projects enable row level security;
alter table public.public_testimonials enable row level security;
drop policy if exists "Public reads published portfolio projects" on public.public_portfolio_projects;
create policy "Public reads published portfolio projects" on public.public_portfolio_projects for select to anon,authenticated using (is_active=true);
drop policy if exists "Admins manage public portfolio projects" on public.public_portfolio_projects;
create policy "Admins manage public portfolio projects" on public.public_portfolio_projects for all to authenticated using ((select private.is_karma_admin())) with check ((select private.is_karma_admin()));
drop policy if exists "Public reads published testimonials" on public.public_testimonials;
create policy "Public reads published testimonials" on public.public_testimonials for select to anon,authenticated using (is_active=true);
drop policy if exists "Admins manage public testimonials" on public.public_testimonials;
create policy "Admins manage public testimonials" on public.public_testimonials for all to authenticated using ((select private.is_karma_admin())) with check ((select private.is_karma_admin()));
grant select on public.public_portfolio_projects,public.public_testimonials to anon,authenticated;
grant insert,update,delete on public.public_portfolio_projects,public.public_testimonials to authenticated;
drop trigger if exists public_portfolio_projects_updated_at on public.public_portfolio_projects;
create trigger public_portfolio_projects_updated_at before update on public.public_portfolio_projects for each row execute function public.set_updated_at();
drop trigger if exists public_testimonials_updated_at on public.public_testimonials;
create trigger public_testimonials_updated_at before update on public.public_testimonials for each row execute function public.set_updated_at();
