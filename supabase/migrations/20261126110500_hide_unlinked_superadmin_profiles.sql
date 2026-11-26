
-- Hide privileged identity even if a Super Admin profile was imported without auth_user_id.
drop policy if exists employee_profiles_admin_insert on public.employee_profiles;
drop policy if exists employee_profiles_admin_update on public.employee_profiles;
drop policy if exists employee_profiles_admin_delete on public.employee_profiles;
drop policy if exists employee_profiles_authorized_read on public.employee_profiles;

create policy employee_profiles_admin_insert on public.employee_profiles
for insert to authenticated
with check (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.role='super_admin'
      and (a.user_id=employee_profiles.auth_user_id
        or lower(a.email)=lower(employee_profiles.work_email))
  )
);
create policy employee_profiles_admin_update on public.employee_profiles
for update to authenticated
using (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.role='super_admin'
      and (a.user_id=employee_profiles.auth_user_id
        or lower(a.email)=lower(employee_profiles.work_email))
  )
)
with check (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.role='super_admin'
      and (a.user_id=employee_profiles.auth_user_id
        or lower(a.email)=lower(employee_profiles.work_email))
  )
);
create policy employee_profiles_admin_delete on public.employee_profiles
for delete to authenticated
using (
  (select private.can_access_module('employees','update'))
  and not exists (
    select 1 from public.admin_users a
    where a.role='super_admin'
      and (a.user_id=employee_profiles.auth_user_id
        or lower(a.email)=lower(employee_profiles.work_email))
  )
);
create policy employee_profiles_authorized_read on public.employee_profiles
for select to authenticated
using (
  (
    (select private.can_access_module('employees','read'))
    and not exists (
      select 1 from public.admin_users a
      where a.role='super_admin'
        and (a.user_id=employee_profiles.auth_user_id
          or lower(a.email)=lower(employee_profiles.work_email))
    )
  )
  or
  (
    auth_user_id=(select auth.uid())
    and not exists (
      select 1 from public.admin_users a
      where a.user_id=(select auth.uid()) and a.role='super_admin'
    )
  )
);
