
create or replace function private.guard_issued_quotation()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare st text;
begin
  if tg_op='DELETE' then
    select status into st from public.quotations where id=old.quotation_id;
    if st in ('sent','accepted','rejected','expired','superseded') then
      raise exception 'Issued quotation line items are immutable; create a new revision.';
    end if;
    return old;
  end if;
  select status into st from public.quotations where id=new.quotation_id;
  if st in ('sent','accepted','rejected','expired','superseded') then
    raise exception 'Issued quotation line items are immutable; create a new revision.';
  end if;
  return new;
end
$$;

create or replace function private.compute_quotation_line_total()
returns trigger language plpgsql set search_path='' as $$
declare base numeric(14,2);
begin
  base := greatest(0,(new.quantity*new.unit_rate)-new.discount_amount);
  new.line_total := round(base + (base*new.tax_rate/100),2);
  return new;
end
$$;

create or replace function private.refresh_quotation_totals()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare qid uuid;
begin
  qid := case when tg_op='DELETE' then old.quotation_id else new.quotation_id end;
  update public.quotations q
  set subtotal = coalesce((select sum(greatest(0,(i.quantity*i.unit_rate)-i.discount_amount)) from public.quotation_items i where i.quotation_id=qid),0),
      discount_total = coalesce((select sum(i.discount_amount) from public.quotation_items i where i.quotation_id=qid),0),
      tax_total = coalesce((select sum(round(greatest(0,(i.quantity*i.unit_rate)-i.discount_amount)*i.tax_rate/100,2)) from public.quotation_items i where i.quotation_id=qid),0),
      grand_total = coalesce((select sum(i.line_total) from public.quotation_items i where i.quotation_id=qid),0),
      updated_at=now()
  where q.id=qid and q.status in ('draft','internal_review');
  if tg_op='DELETE' then return old; else return new; end if;
end
$$;

revoke all on function private.guard_issued_quotation() from public,anon,authenticated;
revoke all on function private.compute_quotation_line_total() from public,anon,authenticated;
revoke all on function private.refresh_quotation_totals() from public,anon,authenticated;

drop trigger if exists quotation_items_total_compute on public.quotation_items;
create trigger quotation_items_total_compute
before insert or update on public.quotation_items
for each row execute function private.compute_quotation_line_total();

drop trigger if exists quotation_items_totals_refresh on public.quotation_items;
create trigger quotation_items_totals_refresh
after insert or update or delete on public.quotation_items
for each row execute function private.refresh_quotation_totals();
