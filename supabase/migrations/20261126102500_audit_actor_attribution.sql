
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
  actor := (select auth.uid());
  -- Service-role automation records its own explicit audit event; avoid anonymous duplicate rows.
  if actor is null then
    if tg_op='DELETE' then return old; else return new; end if;
  end if;
  begin h := coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb; exception when others then h := '{}'::jsonb; end;
  begin c := coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb; exception when others then c := '{}'::jsonb; end;
  row_data := case when tg_op='DELETE' then to_jsonb(old) else to_jsonb(new) end;
  begin target := coalesce(row_data->>'id',row_data->>'user_id')::uuid; exception when others then target := null; end;
  begin sid := (c->>'session_id')::uuid; exception when others then sid := null; end;
  ip_text := split_part(coalesce(h->>'x-forwarded-for',h->>'x-real-ip',''),',',1);
  ua := left(coalesce(h->>'user-agent',''),500);
  if ua ~* '(android|iphone|ipad|mobile)' then device := 'mobile';
  elsif ua ~* '(windows|macintosh|linux|x11)' then device := 'desktop';
  elsif ua <> '' then device := 'other';
  end if;
  insert into public.audit_events(actor_user_id,action,module,target_type,target_id,outcome,ip_address,user_agent,device_category,session_id,metadata)
  values(actor,op,tg_argv[0],tg_table_name,target,'success',
    case when ip_text ~ '^[0-9a-fA-F:.]+$' then ip_text::inet else null end,
    ua,device,sid,jsonb_build_object('source','database_trigger'));
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;
