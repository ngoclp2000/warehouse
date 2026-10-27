begin;
-- Preserve rack totals for existing clients; location balances are the detailed ledger.
lock table public.racks, public.stock_balances, public.stock_movements in share row exclusive mode;
alter table public.racks add column bins_per_shelf integer not null default 1 check(bins_per_shelf between 1 and 20);
grant update(bins_per_shelf) on public.racks to authenticated;
create table public.stock_locations (
 id uuid primary key default gen_random_uuid(), warehouse_id uuid not null,
 rack_id uuid not null, tier integer not null, bin integer not null,
 check((tier=0 and bin=0) or (tier between 1 and 20 and bin between 1 and 20)),
 foreign key(rack_id,warehouse_id) references public.racks(id,warehouse_id) on delete cascade,
 unique(rack_id,tier,bin), unique(id,warehouse_id), unique(id,rack_id,warehouse_id)
);
create index stock_locations_warehouse_idx on public.stock_locations(warehouse_id);
create table public.location_balances (
 warehouse_id uuid not null, product_id uuid not null, rack_id uuid not null, location_id uuid not null,
 qty integer not null default 0 check(qty>=0), updated_at timestamptz not null default now(),
 primary key(product_id,location_id),
 foreign key(product_id,warehouse_id) references public.products(id,warehouse_id) on delete cascade,
 foreign key(location_id,rack_id,warehouse_id) references public.stock_locations(id,rack_id,warehouse_id) on delete cascade
);
create index location_balances_warehouse_idx on public.location_balances(warehouse_id);
create index location_balances_location_idx on public.location_balances(location_id,rack_id,warehouse_id);
create index location_balances_rack_idx on public.location_balances(rack_id,warehouse_id);
alter table public.stock_locations enable row level security;
alter table public.location_balances enable row level security;
revoke all on public.stock_locations,public.location_balances from public,anon,authenticated;
grant select on public.stock_locations,public.location_balances to authenticated;
create policy locations_read on public.stock_locations for select to authenticated using(private.is_member(warehouse_id));
create policy location_balances_read on public.location_balances for select to authenticated using(private.is_member(warehouse_id));
insert into public.stock_locations(warehouse_id,rack_id,tier,bin) select warehouse_id,id,0,0 from public.racks;
insert into public.stock_locations(warehouse_id,rack_id,tier,bin)
 select r.warehouse_id,r.id,t,b from public.racks r cross join lateral generate_series(1,r.shelf_count) t cross join lateral generate_series(1,r.bins_per_shelf) b;
insert into public.location_balances(warehouse_id,product_id,rack_id,location_id,qty,updated_at)
 select b.warehouse_id,b.product_id,b.rack_id,l.id,b.qty,b.updated_at from public.stock_balances b join public.stock_locations l on l.rack_id=b.rack_id and l.tier=0;
alter table public.stock_movements add column from_location_id uuid, add column to_location_id uuid;
alter table public.stock_movements add constraint movement_from_location_fk foreign key(from_location_id,from_rack_id,warehouse_id) references public.stock_locations(id,rack_id,warehouse_id),
 add constraint movement_to_location_fk foreign key(to_location_id,to_rack_id,warehouse_id) references public.stock_locations(id,rack_id,warehouse_id);
create index movements_from_location_idx on public.stock_movements(from_location_id,from_rack_id,warehouse_id);
create index movements_to_location_idx on public.stock_movements(to_location_id,to_rack_id,warehouse_id);
-- Backfill the known rack only, never invent a historical tier/bin.
update public.stock_movements m set from_location_id=l.id from public.stock_locations l where l.rack_id=m.from_rack_id and l.tier=0;
update public.stock_movements m set to_location_id=l.id from public.stock_locations l where l.rack_id=m.to_rack_id and l.tier=0;
alter table public.stock_movements drop constraint stock_movements_check;
alter table public.stock_movements add constraint stock_movements_check check(
 (kind='in' and from_rack_id is null and from_location_id is null and to_rack_id is not null and to_location_id is not null) or
 (kind='out' and from_rack_id is not null and from_location_id is not null and to_rack_id is null and to_location_id is null) or
 (kind='transfer' and from_rack_id is not null and to_rack_id is not null and from_location_id is not null and to_location_id is not null and from_location_id<>to_location_id));
-- Rack writes already take the warehouse advisory lock in rack_bounds.
create function private.guard_rack_locations() returns trigger language plpgsql security definer set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.warehouse_id::text,0));
 if exists(select 1 from public.location_balances b join public.stock_locations l on l.id=b.location_id
  where l.rack_id=new.id and b.qty>0 and (l.tier>new.shelf_count or l.bin>new.bins_per_shelf)) then
  raise exception 'Còn hàng tại tầng/ô bị bỏ. Hãy chuyển hết hàng trước khi giảm tầng hoặc ô.';
 end if;
 return new;
end;$$;
create function private.sync_rack_locations() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.stock_locations(warehouse_id,rack_id,tier,bin) values(new.warehouse_id,new.id,0,0) on conflict do nothing;
 insert into public.stock_locations(warehouse_id,rack_id,tier,bin)
 select new.warehouse_id,new.id,t,b from generate_series(1,new.shelf_count) t cross join generate_series(1,new.bins_per_shelf) b on conflict do nothing;
 -- Retain inactive empty locations for history and stable IDs when re-expanded.
 return new;
end;$$;
create trigger rack_locations_guard before update of shelf_count,bins_per_shelf on public.racks for each row execute function private.guard_rack_locations();
create trigger rack_locations_sync after insert or update of shelf_count,bins_per_shelf on public.racks for each row execute function private.sync_rack_locations();
revoke all on function private.guard_rack_locations(),private.sync_rack_locations() from public,anon,authenticated;
create function private.record_location_movement(p_warehouse uuid,p_product uuid,p_kind text,p_qty integer,p_from uuid,p_to uuid,p_note text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.stock_movements; src public.stock_locations; dst public.stock_locations; available integer; mid uuid;
begin
 if not private.is_member(p_warehouse,true) then raise exception 'Bạn không có quyền cập nhật kho này.'; end if;
 if p_request is null or p_qty is null or p_qty<=0 or p_kind is null or p_kind not in ('in','out','transfer') then raise exception 'Thông tin phiếu không hợp lệ.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_warehouse::text,0));
 select * into existing from public.stock_movements where warehouse_id=p_warehouse and request_id=p_request;
 if found then
  if existing.product_id<>p_product or existing.kind<>p_kind or existing.qty<>p_qty or existing.from_location_id is distinct from p_from or existing.to_location_id is distinct from p_to or existing.note<>coalesce(p_note,'') then raise exception 'Mã yêu cầu đã được dùng cho một phiếu khác.'; end if;
  return existing.id;
 end if;
 if not exists(select 1 from public.products where id=p_product and warehouse_id=p_warehouse) then raise exception 'Không tìm thấy hàng hóa trong kho.'; end if;
 if (p_kind='in' and (p_from is not null or p_to is null)) or (p_kind='out' and (p_from is null or p_to is not null)) or (p_kind='transfer' and (p_from is null or p_to is null or p_from=p_to)) then raise exception 'Vị trí nguồn / đích không hợp lệ.'; end if;
 if p_from is not null then
  select l.* into src from public.stock_locations l join public.racks r on r.id=l.rack_id where l.id=p_from and l.warehouse_id=p_warehouse and l.tier<=r.shelf_count and l.bin<=r.bins_per_shelf;
  if not found then raise exception 'Vị trí nguồn không thuộc kho hoặc đã ngừng sử dụng.'; end if;
  select qty into available from public.location_balances where product_id=p_product and location_id=p_from for update;
  if coalesce(available,0)<p_qty then raise exception 'Số lượng xuất vượt quá tồn tại tầng/ô nguồn.'; end if;
  update public.location_balances set qty=qty-p_qty,updated_at=now() where product_id=p_product and location_id=p_from;
  update public.stock_balances set qty=qty-p_qty,updated_at=now() where product_id=p_product and rack_id=src.rack_id;
 end if;
 if p_to is not null then
  select l.* into dst from public.stock_locations l join public.racks r on r.id=l.rack_id where l.id=p_to and l.warehouse_id=p_warehouse and l.tier<=r.shelf_count and l.bin<=r.bins_per_shelf;
  if not found then raise exception 'Vị trí đích không thuộc kho hoặc đã ngừng sử dụng.'; end if;
  -- tier=0 remains available only for legacy clients; the new UI requires a real destination.
  insert into public.location_balances(warehouse_id,product_id,rack_id,location_id,qty) values(p_warehouse,p_product,dst.rack_id,p_to,p_qty)
   on conflict(product_id,location_id) do update set qty=public.location_balances.qty+excluded.qty,updated_at=now();
  insert into public.stock_balances(warehouse_id,product_id,rack_id,qty) values(p_warehouse,p_product,dst.rack_id,p_qty)
   on conflict(product_id,rack_id) do update set qty=public.stock_balances.qty+excluded.qty,updated_at=now();
 end if;
 insert into public.stock_movements(warehouse_id,product_id,kind,qty,from_rack_id,to_rack_id,from_location_id,to_location_id,note,request_id,created_by)
 values(p_warehouse,p_product,p_kind,p_qty,src.rack_id,dst.rack_id,p_from,p_to,coalesce(p_note,''),p_request,(select auth.uid())) returning id into mid;
 return mid;
end;$$;
create function public.record_location_movement(p_warehouse uuid,p_product uuid,p_kind text,p_qty integer,p_from uuid,p_to uuid,p_note text,p_request uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.record_location_movement(p_warehouse,p_product,p_kind,p_qty,p_from,p_to,p_note,p_request); $$;
revoke all on function private.record_location_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid),public.record_location_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid) from public,anon;
grant execute on function private.record_location_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid),public.record_location_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid) to authenticated;
-- Old clients operate solely on unassigned stock; never take allocated stock silently.
create or replace function private.record_movement(p_warehouse uuid,p_product uuid,p_kind text,p_qty integer,p_from uuid,p_to uuid,p_note text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare src uuid; dst uuid;
begin
 if not private.is_member(p_warehouse,true) then raise exception 'Bạn không có quyền cập nhật kho này.'; end if;
 if p_from is not null then select id into src from public.stock_locations where rack_id=p_from and warehouse_id=p_warehouse and tier=0; if src is null then raise exception 'Kệ nguồn không hợp lệ.'; end if; end if;
 if p_to is not null then select id into dst from public.stock_locations where rack_id=p_to and warehouse_id=p_warehouse and tier=0; if dst is null then raise exception 'Kệ đích không hợp lệ.'; end if; end if;
 return private.record_location_movement(p_warehouse,p_product,p_kind,p_qty,src,dst,p_note,p_request);
end;$$;
commit;
