
-- Return only a role code; do not expose the Super Admin identity row to its owner.
create or replace function public.resolve_current_role()
returns text
language sql
stable
security definer
set search_path=''
as $$
  select case
    when exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='super_admin') then 'super_admin'
    when exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='admin') then 'admin'
    else (
      select ar.code
      from public.user_roles ur
      join public.app_roles ar on ar.id=ur.role_id
      where ur.user_id=(select auth.uid())
      order by ur.created_at
      limit 1
    )
  end
$$;
revoke all on function public.resolve_current_role() from public,anon;
grant execute on function public.resolve_current_role() to authenticated;

drop policy if exists "Users read own admin mapping and admins see standard admins" on public.admin_users;
create policy "Admins can see standard admin directory only"
on public.admin_users for select to authenticated
using (role='admin' and (select private.is_karma_admin()));

drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
for select to authenticated
using (
  user_id=(select auth.uid())
  and not exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='super_admin')
);

drop policy if exists employee_profiles_self_read on public.employee_profiles;
create policy employee_profiles_self_read on public.employee_profiles
for select to authenticated
using (
  auth_user_id=(select auth.uid())
  and not exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='super_admin')
);
