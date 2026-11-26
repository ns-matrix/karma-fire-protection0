
-- Stock movements are a ledger: inserts are allowed, edits/deletes are not.
drop policy if exists stock_movements_update on public.stock_movements;
drop policy if exists stock_movements_delete on public.stock_movements;
revoke update,delete on public.stock_movements from authenticated;
grant select,insert on public.stock_movements to authenticated;

alter table public.stock_movements
  add column if not exists adjustment_direction text not null default 'increase'
  check (adjustment_direction in ('increase','decrease'));

create or replace view public.inventory_balances
with (security_invoker=true) as
select
  inventory_item_id,
  warehouse_id,
  sum(case
    when movement_type in ('opening','receipt','transfer_in','return') then quantity
    when movement_type='issue' or movement_type='transfer_out' then -quantity
    when movement_type='adjustment' and adjustment_direction='increase' then quantity
    when movement_type='adjustment' and adjustment_direction='decrease' then -quantity
    else 0
  end) as quantity_on_hand
from public.stock_movements
group by inventory_item_id,warehouse_id;
grant select on public.inventory_balances to authenticated;

create or replace function private.guard_issued_quotation()
returns trigger language plpgsql set search_path='' as $$
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
revoke all on function private.guard_issued_quotation() from public,anon,authenticated;
drop trigger if exists quotation_items_immutable_guard on public.quotation_items;
create trigger quotation_items_immutable_guard
before update or delete on public.quotation_items
for each row execute function private.guard_issued_quotation();

create or replace function private.guard_issued_quotation_header()
returns trigger language plpgsql set search_path='' as $$
begin
  if old.status in ('sent','accepted','rejected','expired','superseded')
     and (to_jsonb(new)-array['status','updated_at','approved_by','approved_at'])
         is distinct from
         (to_jsonb(old)-array['status','updated_at','approved_by','approved_at']) then
    raise exception 'Issued quotation details are immutable; create a new revision.';
  end if;
  return new;
end
$$;
revoke all on function private.guard_issued_quotation_header() from public,anon,authenticated;
drop trigger if exists quotation_header_immutable_guard on public.quotations;
create trigger quotation_header_immutable_guard
before update on public.quotations
for each row execute function private.guard_issued_quotation_header();
