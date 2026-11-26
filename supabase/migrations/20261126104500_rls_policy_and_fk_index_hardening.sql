
-- Keep the public RPC as invoker; only the private role resolver is privileged.
create or replace function public.resolve_current_role()
returns text language sql stable security invoker set search_path=''
as $$
  select case
    when (select private.current_karma_role()) in ('admin','super_admin')
      then (select private.current_karma_role())
    else (
      select ar.code from public.user_roles ur
      join public.app_roles ar on ar.id=ur.role_id
      where ur.user_id=(select auth.uid())
      order by ur.created_at limit 1
    )
  end
$$;
revoke all on function public.resolve_current_role() from public,anon;
grant execute on function public.resolve_current_role() to authenticated;

-- Replace broad FOR ALL policies with operation-specific policies.
do $$
declare t text;
begin
  foreach t in array array['app_roles','app_permissions','role_permissions','departments','employee_profiles','user_roles'] loop
    execute format('drop policy if exists %I on public.%I',t||'_admin_manage',t);
    execute format('drop policy if exists %I on public.%I',t||'_admin_read',t);
  end loop;
end
$$;

create policy app_roles_admin_insert on public.app_roles for insert to authenticated
with check ((select private.can_access_module('employees','update')));
create policy app_roles_admin_update on public.app_roles for update to authenticated
using ((select private.can_access_module('employees','update')))
with check ((select private.can_access_module('employees','update')));
create policy app_roles_admin_delete on public.app_roles for delete to authenticated
using ((select private.can_access_module('employees','update')));

create policy app_permissions_admin_insert on public.app_permissions for insert to authenticated
with check ((select private.can_access_module('employees','update')));
create policy app_permissions_admin_update on public.app_permissions for update to authenticated
using ((select private.can_access_module('employees','update')))
with check ((select private.can_access_module('employees','update')));
create policy app_permissions_admin_delete on public.app_permissions for delete to authenticated
using ((select private.can_access_module('employees','update')));

create policy role_permissions_admin_insert on public.role_permissions for insert to authenticated
with check ((select private.can_access_module('employees','update')));
create policy role_permissions_admin_update on public.role_permissions for update to authenticated
using ((select private.can_access_module('employees','update')))
with check ((select private.can_access_module('employees','update')));
create policy role_permissions_admin_delete on public.role_permissions for delete to authenticated
using ((select private.can_access_module('employees','update')));

create policy departments_admin_insert on public.departments for insert to authenticated
with check ((select private.can_access_module('employees','update')));
create policy departments_admin_update on public.departments for update to authenticated
using ((select private.can_access_module('employees','update')))
with check ((select private.can_access_module('employees','update')));
create policy departments_admin_delete on public.departments for delete to authenticated
using ((select private.can_access_module('employees','update')));
create policy departments_admin_read on public.departments for select to authenticated
using ((select private.can_access_module('employees','read')));

create policy employee_profiles_admin_insert on public.employee_profiles for insert to authenticated
with check ((select private.can_access_module('employees','update')) and
 (auth_user_id is null or not exists(select 1 from public.admin_users a where a.user_id=employee_profiles.auth_user_id and a.role='super_admin')));
create policy employee_profiles_admin_update on public.employee_profiles for update to authenticated
using ((select private.can_access_module('employees','update')) and
 (auth_user_id is null or not exists(select 1 from public.admin_users a where a.user_id=employee_profiles.auth_user_id and a.role='super_admin')))
with check ((select private.can_access_module('employees','update')) and
 (auth_user_id is null or not exists(select 1 from public.admin_users a where a.user_id=employee_profiles.auth_user_id and a.role='super_admin')));
create policy employee_profiles_admin_delete on public.employee_profiles for delete to authenticated
using ((select private.can_access_module('employees','update')) and
 (auth_user_id is null or not exists(select 1 from public.admin_users a where a.user_id=employee_profiles.auth_user_id and a.role='super_admin')));
drop policy if exists employee_profiles_self_read on public.employee_profiles;
create policy employee_profiles_authorized_read on public.employee_profiles for select to authenticated
using (
  ((select private.can_access_module('employees','read')) and
   (auth_user_id is null or not exists(select 1 from public.admin_users a where a.user_id=employee_profiles.auth_user_id and a.role='super_admin')))
  or
  (auth_user_id=(select auth.uid()) and not exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='super_admin'))
);

create policy user_roles_admin_insert on public.user_roles for insert to authenticated
with check ((select private.can_access_module('employees','update')) and
 not exists(select 1 from public.admin_users a where a.user_id=user_roles.user_id and a.role='super_admin'));
create policy user_roles_admin_update on public.user_roles for update to authenticated
using ((select private.can_access_module('employees','update')) and
 not exists(select 1 from public.admin_users a where a.user_id=user_roles.user_id and a.role='super_admin'))
with check ((select private.can_access_module('employees','update')) and
 not exists(select 1 from public.admin_users a where a.user_id=user_roles.user_id and a.role='super_admin'));
create policy user_roles_admin_delete on public.user_roles for delete to authenticated
using ((select private.can_access_module('employees','update')) and
 not exists(select 1 from public.admin_users a where a.user_id=user_roles.user_id and a.role='super_admin'));
drop policy if exists user_roles_self_read on public.user_roles;
create policy user_roles_authorized_read on public.user_roles for select to authenticated
using (
  (user_id=(select auth.uid()) and not exists(select 1 from public.admin_users a where a.user_id=(select auth.uid()) and a.role='super_admin'))
  or
  ((select private.can_access_module('employees','read')) and
   not exists(select 1 from public.admin_users a where a.user_id=user_roles.user_id and a.role='super_admin'))
);

-- Cover every declared foreign key with an index for join and delete/update performance.
do $$
declare r record; idx text;
begin
  for r in
    select ns.nspname as schema_name, tbl.relname as table_name, att.attname as column_name
    from pg_constraint con
    join pg_class tbl on tbl.oid=con.conrelid
    join pg_namespace ns on ns.oid=tbl.relnamespace
    join unnest(con.conkey) with ordinality ck(attnum,ord) on true
    join pg_attribute att on att.attrelid=tbl.oid and att.attnum=ck.attnum
    where con.contype='f' and ns.nspname='public'
  loop
    idx:=left('idx_'||r.table_name||'_'||r.column_name,63);
    execute format('create index if not exists %I on %I.%I (%I)',idx,r.schema_name,r.table_name,r.column_name);
  end loop;
end
$$;
