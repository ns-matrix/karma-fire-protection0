-- Public team profile grouping and internal employee biography.
-- Additive only: existing records and website content are preserved.
alter table public.team_members add column if not exists team_name text;
alter table public.employee_profiles add column if not exists biography text;
create index if not exists idx_team_members_public_group on public.team_members (is_active, team_name, sort_order);
comment on column public.team_members.team_name is 'Public-facing team or department heading used to group website team cards.';
comment on column public.employee_profiles.biography is 'Internal employee biography; not automatically exposed on the public website.';
