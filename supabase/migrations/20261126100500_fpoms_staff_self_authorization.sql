
-- Staff must be able to resolve their own role and permissions during shared login.
drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_self_read on public.user_roles
for select to authenticated
using (user_id=(select auth.uid()));

drop policy if exists employee_profiles_self_read on public.employee_profiles;
create policy employee_profiles_self_read on public.employee_profiles
for select to authenticated
using (auth_user_id=(select auth.uid()));

drop policy if exists app_roles_authenticated_read on public.app_roles;
create policy app_roles_authenticated_read on public.app_roles
for select to authenticated using (true);

drop policy if exists app_permissions_authenticated_read on public.app_permissions;
create policy app_permissions_authenticated_read on public.app_permissions
for select to authenticated using (true);

drop policy if exists role_permissions_authenticated_read on public.role_permissions;
create policy role_permissions_authenticated_read on public.role_permissions
for select to authenticated using (
  exists(select 1 from public.user_roles ur where ur.user_id=(select auth.uid()) and ur.role_id=role_permissions.role_id)
  or (select private.is_karma_admin())
);
