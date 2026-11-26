
-- Privileged identity boundary and RBAC anti-escalation hardening.
-- Normal admins can manage staff and standard admins, but cannot manufacture
-- privileged roles or rewrite the role/permission catalogue.

create or replace function public.resolve_current_role()
returns text
language sql
stable
security invoker
set search_path=''
as $$
  select case
    when (select private.current_karma_role()) in ('admin','super_admin')
      then (select private.current_karma_role())
    else (
      select ar.code
      from public.user_roles ur
      join public.app_roles ar on ar.id=ur.role_id
      where ur.user_id=(select auth.uid())
        and ar.code not in ('admin','super_admin','business_admin')
        and not exists (
          select 1 from public.admin_users a
          where a.user_id=ur.user_id and a.role='super_admin'
        )
      order by ur.created_at
      limit 1
    )
  end
$$;
revoke all on function public.resolve_current_role() from public,anon;
grant execute on function public.resolve_current_role() to authenticated;

-- Only the true Super Admin (stored in admin_users, not a user_roles label)
-- can alter the role catalogue or permission grants.
drop policy if exists app_roles_admin_insert on public.app_roles;
drop policy if exists app_roles_admin_update on public.app_roles;
drop policy if exists app_roles_admin_delete on public.app_roles;
create policy app_roles_superadmin_insert on public.app_roles
for insert to authenticated
with check ((select private.is_karma_super_admin()));
create policy app_roles_superadmin_update on public.app_roles
for update to authenticated
using ((select private.is_karma_super_admin()))
with check ((select private.is_karma_super_admin()));
create policy app_roles_superadmin_delete on public.app_roles
for delete to authenticated
using ((select private.is_karma_super_admin()));

drop policy if exists app_permissions_admin_insert on public.app_permissions;
drop policy if exists app_permissions_admin_update on public.app_permissions;
drop policy if exists app_permissions_admin_delete on public.app_permissions;
create policy app_permissions_superadmin_insert on public.app_permissions
for insert to authenticated
with check ((select private.is_karma_super_admin()));
create policy app_permissions_superadmin_update on public.app_permissions
for update to authenticated
using ((select private.is_karma_super_admin()))
with check ((select private.is_karma_super_admin()));
create policy app_permissions_superadmin_delete on public.app_permissions
for delete to authenticated
using ((select private.is_karma_super_admin()));

drop policy if exists role_permissions_admin_insert on public.role_permissions;
drop policy if exists role_permissions_admin_update on public.role_permissions;
drop policy if exists role_permissions_admin_delete on public.role_permissions;
create policy role_permissions_superadmin_insert on public.role_permissions
for insert to authenticated
with check ((select private.is_karma_super_admin()));
create policy role_permissions_superadmin_update on public.role_permissions
for update to authenticated
using ((select private.is_karma_super_admin()))
with check ((select private.is_karma_super_admin()));
create policy role_permissions_superadmin_delete on public.role_permissions
for delete to authenticated
using ((select private.is_karma_super_admin()));

-- A standard Admin may assign a standard operational role to an employee,
-- but cannot assign a privileged/business-admin role through user_roles.
drop policy if exists user_roles_admin_insert on public.user_roles;
drop policy if exists user_roles_admin_update on public.user_roles;
drop policy if exists user_roles_admin_delete on public.user_roles;
create policy user_roles_admin_insert on public.user_roles
for insert to authenticated
with check (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.user_id=user_roles.user_id and a.role='super_admin'
  )
  and exists (
    select 1 from public.app_roles ar
    where ar.id=user_roles.role_id
      and ar.code not in ('admin','super_admin','business_admin')
  )
);
create policy user_roles_admin_update on public.user_roles
for update to authenticated
using (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.user_id=user_roles.user_id and a.role='super_admin'
  )
)
with check (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.user_id=user_roles.user_id and a.role='super_admin'
  )
  and exists (
    select 1 from public.app_roles ar
    where ar.id=user_roles.role_id
      and ar.code not in ('admin','super_admin','business_admin')
  )
);
create policy user_roles_admin_delete on public.user_roles
for delete to authenticated
using (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.user_id=user_roles.user_id and a.role='super_admin'
  )
  and exists (
    select 1 from public.app_roles ar
    where ar.id=user_roles.role_id
      and ar.code not in ('admin','super_admin','business_admin')
  )
);
