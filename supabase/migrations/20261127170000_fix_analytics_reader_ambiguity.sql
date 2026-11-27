-- Fix output-column ambiguity in the role-aware analytics reader.
create or replace function public.read_website_analytics_events(
  p_since timestamptz default now()-interval '30 days',
  p_limit int default 10000
)
returns table(
  id uuid,event_name text,page_path text,page_title text,element_id text,
  element_label text,value numeric,visitor_uuid text,session_uuid text,
  device_category text,created_at timestamptz,unique_visitors bigint,unique_sessions bigint
)
language plpgsql
security definer
set search_path=public,private
as $$
declare
  is_super boolean;
  is_admin boolean;
begin
  is_super:=private.is_karma_super_admin();
  is_admin:=private.is_karma_admin();
  if not is_admin then
    raise exception 'Access denied';
  end if;

  return query
  with filtered_events as (
    select a.*
    from public.analytics_events a
    where a.created_at>=p_since
      and a.retention_until>now()
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit,10000),1),20000)
  ),
  totals as (
    select
      count(distinct filtered_events.visitor_uuid) as visitor_total,
      count(distinct filtered_events.session_uuid) as session_total
    from filtered_events
  )
  select
    filtered_events.id,
    filtered_events.event_name,
    filtered_events.page_path,
    filtered_events.page_title,
    filtered_events.element_id,
    filtered_events.element_label,
    filtered_events.value,
    case when is_super then filtered_events.visitor_uuid else null end,
    case when is_super then filtered_events.session_uuid else null end,
    filtered_events.device_category,
    filtered_events.created_at,
    totals.visitor_total,
    totals.session_total
  from filtered_events
  cross join totals
  order by filtered_events.created_at desc;
end;
$$;

revoke all on function public.read_website_analytics_events(timestamptz,int) from public,anon;
grant execute on function public.read_website_analytics_events(timestamptz,int) to authenticated;
