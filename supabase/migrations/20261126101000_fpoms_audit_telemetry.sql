
-- Capture authenticated administrative changes from the database boundary.
alter table public.audit_events
  add column if not exists retention_until timestamptz not null default (now() + interval '90 days');

create or replace function private.write_audit_event()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  h jsonb := '{}'::jsonb;
  c jsonb := '{}'::jsonb;
  actor uuid;
  target uuid;
  sid uuid;
  ip_text text;
  ua text;
  device text := 'unknown';
  op text := lower(tg_op);
  row_data jsonb;
begin
  begin h := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb; exception when others then h := '{}'::jsonb; end;
  begin c := coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb; exception when others then c := '{}'::jsonb; end;
  actor := (select auth.uid());
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  begin target := coalesce(row_data->>'id',row_data->>'user_id')::uuid; exception when others then target := null; end;
  begin sid := (c->>'session_id')::uuid; exception when others then sid := null; end;
  ip_text := split_part(coalesce(h->>'x-forwarded-for',h->>'x-real-ip',''),',',1);
  ua := left(coalesce(h->>'user-agent',''),500);
  if ua ~* '(android|iphone|ipad|mobile)' then device := 'mobile';
  elsif ua ~* '(windows|macintosh|linux|x11)' then device := 'desktop';
  elsif ua <> '' then device := 'other';
  end if;

  insert into public.audit_events(
    actor_user_id,action,module,target_type,target_id,outcome,ip_address,user_agent,device_category,session_id,metadata
  ) values (
    actor,op,tg_argv[0],tg_table_name,target,'success',
    case when ip_text ~ '^[0-9a-fA-F:.]+$' then ip_text::inet else null end,
    ua,device,sid,jsonb_build_object('source','database_trigger')
  );
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;

revoke all on function private.write_audit_event() from public,anon,authenticated;

do $$
declare x record;
begin
  for x in select * from (values
    ('admin_users','identity'),('customers','customers'),('customer_sites','customers'),
    ('customer_contacts','customers'),('site_surveys','surveys'),('survey_responses','surveys'),
    ('quotations','quotations'),('quotation_items','quotations'),('quotation_approvals','quotations'),
    ('projects','projects'),('project_milestones','projects'),('project_tasks','projects'),
    ('amc_contracts','service'),('service_visits','service'),('defects','service'),('assets','assets'),
    ('suppliers','inventory'),('warehouses','inventory'),('inventory_items','inventory'),
    ('stock_movements','inventory'),('purchase_orders','inventory'),('purchase_order_items','inventory'),
    ('compliance_documents','compliance'),('tasks','tasks'),('task_comments','tasks'),
    ('employee_profiles','employees')
  ) as v(tbl,module)
  loop
    execute format('drop trigger if exists audit_%I on public.%I',x.tbl,x.tbl);
    execute format('create trigger audit_%I after insert or update or delete on public.%I for each row execute function private.write_audit_event(%L)',x.tbl,x.tbl,x.module);
  end loop;
end
$$;

revoke insert,update,delete on public.audit_events from authenticated;
grant select on public.audit_events to authenticated;
