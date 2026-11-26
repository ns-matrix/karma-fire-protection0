
-- RLS predicates must not query admin_users under the caller's own RLS filter.
-- This SECURITY DEFINER predicate reads only the privileged identity mapping
-- and returns a boolean; the private schema is not exposed through PostgREST.
create or replace function private.is_superadmin_identity(p_user_id uuid,p_email text default null)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.role='super_admin'
      and (
        (p_user_id is not null and a.user_id=p_user_id)
        or
        (p_email is not null and lower(a.email)=lower(p_email))
      )
  )
$$;
revoke all on function private.is_superadmin_identity(uuid,text) from public,anon;
grant execute on function private.is_superadmin_identity(uuid,text) to authenticated;

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
        and not (select private.is_superadmin_identity(ur.user_id,null))
      order by ur.created_at
      limit 1
    )
  end
$$;
revoke all on function public.resolve_current_role() from public,anon;
grant execute on function public.resolve_current_role() to authenticated;

-- Employee records are hidden by either auth-user linkage OR matching work email.
drop policy if exists employee_profiles_admin_insert on public.employee_profiles;
drop policy if exists employee_profiles_admin_update on public.employee_profiles;
drop policy if exists employee_profiles_admin_delete on public.employee_profiles;
drop policy if exists employee_profiles_authorized_read on public.employee_profiles;
create policy employee_profiles_admin_insert on public.employee_profiles
for insert to authenticated
with check (
  (select private.can_access_module('employees','update'))
  and not (select private.is_superadmin_identity(auth_user_id,work_email))
);
create policy employee_profiles_admin_update on public.employee_profiles
for update to authenticated
using (
  (select private.can_access_module('employees','update'))
  and not (select private.is_superadmin_identity(auth_user_id,work_email))
)
with check (
  (select private.can_access_module('employees','update'))
  and not (select private.is_superadmin_identity(auth_user_id,work_email))
);
create policy employee_profiles_admin_delete on public.employee_profiles
for delete to authenticated
using (
  (select private.can_access_module('employees','update'))
  and not (select private.is_superadmin_identity(auth_user_id,work_email))
);
create policy employee_profiles_authorized_read on public.employee_profiles
for select to authenticated
using (
  (
    (select private.can_access_module('employees','read'))
    and not (select private.is_superadmin_identity(auth_user_id,work_email))
  )
  or
  (
    auth_user_id=(select auth.uid())
    and not (select private.is_superadmin_identity((select auth.uid()),null))
  )
);

-- Never expose or assign role mappings for a Super Admin identity.
drop policy if exists user_roles_admin_insert on public.user_roles;
drop policy if exists user_roles_admin_update on public.user_roles;
drop policy if exists user_roles_admin_delete on public.user_roles;
drop policy if exists user_roles_authorized_read on public.user_roles;
create policy user_roles_admin_insert on public.user_roles
for insert to authenticated
with check (
  (select private.can_access_module('employees','update'))
  and not (select private.is_superadmin_identity(user_id,null))
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
  and not (select private.is_superadmin_identity(user_id,null))
)
with check (
  (select private.can_access_module('employees','update'))
  and not (select private.is_superadmin_identity(user_id,null))
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
  and not (select private.is_superadmin_identity(user_id,null))
  and exists (
    select 1 from public.app_roles ar
    where ar.id=user_roles.role_id
      and ar.code not in ('admin','super_admin','business_admin')
  )
);
create policy user_roles_authorized_read on public.user_roles
for select to authenticated
using (
  (
    user_id=(select auth.uid())
    and not (select private.is_superadmin_identity((select auth.uid()),null))
  )
  or
  (
    (select private.can_access_module('employees','read'))
    and not (select private.is_superadmin_identity(user_id,null))
  )
);
