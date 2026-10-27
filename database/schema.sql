begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;
create table public.warehouses (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name)) between 1 and 100),
 width numeric not null default 24 check(width between 5 and 200), depth numeric not null default 18 check(depth between 5 and 200),
 owner_id uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create index warehouses_owner_idx on public.warehouses(owner_id);
create table public.warehouse_members (
 warehouse_id uuid not null references public.warehouses(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','operator','viewer')), primary key(warehouse_id,user_id)
);
create index warehouse_members_user_idx on public.warehouse_members(user_id,warehouse_id);
create table public.categories (
 id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id),
 name text not null check(length(trim(name)) between 1 and 80), unique(warehouse_id,name), unique(id,warehouse_id)
);
create table public.racks (
 id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id),
 code text not null check(length(trim(code)) between 1 and 40), zone text not null default 'A' check(zone in ('A','B','C')),
 x numeric not null default 0, z numeric not null default 0, width numeric not null default 3.2 check(width between .5 and 20),
 depth numeric not null default 1.6 check(depth between .5 and 20), height numeric not null default 3.4 check(height between 1 and 12),
 rotation integer not null default 0 check(rotation in(0,90,180,270)), capacity integer not null default 700 check(capacity>0),
 updated_at timestamptz not null default now(), unique(warehouse_id,code), unique(id,warehouse_id)
);
create table public.products (
 id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id),
 sku text not null check(length(trim(sku)) between 1 and 40), name text not null check(length(trim(name)) between 1 and 150),
 category_id uuid, unit text not null default 'cái' check(length(trim(unit)) between 1 and 30), min_qty integer not null default 0 check(min_qty>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(category_id,warehouse_id) references public.categories(id,warehouse_id),
 unique(warehouse_id,sku), unique(id,warehouse_id)
);
create index products_category_idx on public.products(category_id,warehouse_id);
create table public.stock_balances (
 warehouse_id uuid not null references public.warehouses(id), product_id uuid not null, rack_id uuid not null,
 qty integer not null default 0 check(qty>=0), updated_at timestamptz not null default now(),
 primary key(product_id,rack_id),
 foreign key(product_id,warehouse_id) references public.products(id,warehouse_id),
 foreign key(rack_id,warehouse_id) references public.racks(id,warehouse_id)
);
create index stock_balances_product_warehouse_idx on public.stock_balances(product_id,warehouse_id);
create index stock_balances_warehouse_idx on public.stock_balances(warehouse_id);
create index stock_balances_rack_idx on public.stock_balances(rack_id,warehouse_id);
create table public.stock_movements (
 id uuid primary key default gen_random_uuid(), warehouse_id uuid not null references public.warehouses(id),
 product_id uuid not null, kind text not null check(kind in ('in','out','transfer')), qty integer not null check(qty>0),
 from_rack_id uuid, to_rack_id uuid, note text not null default '' check(length(note)<=500),
 request_id uuid not null, created_by uuid not null references auth.users(id), created_at timestamptz not null default now(),
 unique(warehouse_id,request_id), foreign key(product_id,warehouse_id) references public.products(id,warehouse_id),
 foreign key(from_rack_id,warehouse_id) references public.racks(id,warehouse_id),
 foreign key(to_rack_id,warehouse_id) references public.racks(id,warehouse_id),
 check((kind='in' and from_rack_id is null and to_rack_id is not null) or
 (kind='out' and from_rack_id is not null and to_rack_id is null) or
 (kind='transfer' and from_rack_id is not null and to_rack_id is not null and from_rack_id<>to_rack_id))
);
create index stock_movements_warehouse_date_idx on public.stock_movements(warehouse_id,created_at desc);
create index stock_movements_product_idx on public.stock_movements(product_id,warehouse_id);
create index stock_movements_from_idx on public.stock_movements(from_rack_id,warehouse_id);
create index stock_movements_to_idx on public.stock_movements(to_rack_id,warehouse_id);
create index stock_movements_creator_idx on public.stock_movements(created_by);
create function private.is_member(w uuid, writing boolean default false) returns boolean
 language sql stable security definer set search_path='' as $$
 select (select auth.uid()) is not null and exists(select 1 from public.warehouse_members m
 where m.warehouse_id=w and m.user_id=(select auth.uid()) and (not writing or m.role in('owner','operator')));
$$;
revoke all on function private.is_member(uuid,boolean) from public,anon;
grant execute on function private.is_member(uuid,boolean) to authenticated;
alter table public.warehouses enable row level security;
alter table public.warehouse_members enable row level security;
alter table public.categories enable row level security;
alter table public.racks enable row level security;
alter table public.products enable row level security;
alter table public.stock_balances enable row level security;
alter table public.stock_movements enable row level security;
create policy warehouses_read on public.warehouses for select to authenticated using(private.is_member(id));
create policy members_read on public.warehouse_members for select to authenticated using(private.is_member(warehouse_id));
create policy categories_read on public.categories for select to authenticated using(private.is_member(warehouse_id));
create policy categories_insert on public.categories for insert to authenticated with check(private.is_member(warehouse_id,true));
create policy categories_update on public.categories for update to authenticated using(private.is_member(warehouse_id,true)) with check(private.is_member(warehouse_id,true));
create policy racks_read on public.racks for select to authenticated using(private.is_member(warehouse_id));
create policy racks_insert on public.racks for insert to authenticated with check(private.is_member(warehouse_id,true));
create policy racks_update on public.racks for update to authenticated using(private.is_member(warehouse_id,true)) with check(private.is_member(warehouse_id,true));
create policy products_read on public.products for select to authenticated using(private.is_member(warehouse_id));
create policy products_insert on public.products for insert to authenticated with check(private.is_member(warehouse_id,true));
create policy products_update on public.products for update to authenticated using(private.is_member(warehouse_id,true)) with check(private.is_member(warehouse_id,true));
create policy balances_read on public.stock_balances for select to authenticated using(private.is_member(warehouse_id));
create policy movements_read on public.stock_movements for select to authenticated using(private.is_member(warehouse_id));
revoke all on public.warehouses,public.warehouse_members,public.categories,public.racks,public.products,public.stock_balances,public.stock_movements from anon,authenticated;
grant select on public.warehouses,public.warehouse_members,public.categories,public.racks,public.products,public.stock_balances,public.stock_movements to authenticated;
grant insert on public.categories,public.racks,public.products to authenticated;
grant update(name) on public.categories to authenticated;
grant update(code,zone,x,z,width,depth,height,rotation,capacity) on public.racks to authenticated;
grant update(sku,name,category_id,unit,min_qty) on public.products to authenticated;
create function private.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=clock_timestamp(); return new; end; $$;
create trigger product_timestamp before update on public.products for each row execute function private.touch_updated_at();
create trigger rack_timestamp before update on public.racks for each row execute function private.touch_updated_at();
create function private.check_rack_bounds() returns trigger language plpgsql set search_path='' as $$
declare w public.warehouses; rw numeric; rd numeric;
begin
 select * into w from public.warehouses where id=new.warehouse_id;
 rw=case when new.rotation in(90,270) then new.depth else new.width end;
 rd=case when new.rotation in(90,270) then new.width else new.depth end;
 if abs(new.x)+rw/2>w.width/2 or abs(new.z)+rd/2>w.depth/2 then raise exception 'Kệ vượt ra ngoài mặt bằng kho.'; end if;
 return new;
end;$$;
create trigger rack_bounds before insert or update on public.racks for each row execute function private.check_rack_bounds();
create function private.create_warehouse(p_name text,p_width numeric,p_depth numeric) returns uuid
language plpgsql security definer set search_path='' as $$
declare w uuid; u uuid=(select auth.uid());
begin
 if u is null or coalesce((auth.jwt()->>'is_anonymous')::boolean,false) then raise exception 'Cần đăng nhập bằng tài khoản đã xác thực.'; end if;
 insert into public.warehouses(name,width,depth,owner_id) values(trim(p_name),p_width,p_depth,u) returning id into w;
 insert into public.warehouse_members values(w,u,'owner');
 return w;
end;$$;
create function public.create_warehouse(p_name text,p_width numeric default 24,p_depth numeric default 18) returns uuid
language sql security invoker set search_path='' as $$ select private.create_warehouse(p_name,p_width,p_depth); $$;
revoke all on function private.create_warehouse(text,numeric,numeric),public.create_warehouse(text,numeric,numeric) from public,anon;
grant execute on function private.create_warehouse(text,numeric,numeric),public.create_warehouse(text,numeric,numeric) to authenticated;
create function private.record_movement(p_warehouse uuid,p_product uuid,p_kind text,p_qty integer,p_from uuid,p_to uuid,p_note text,p_request uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare existing public.stock_movements; mid uuid; available integer;
begin
 if not private.is_member(p_warehouse,true) then raise exception 'Bạn không có quyền cập nhật kho này.'; end if;
 if p_request is null or p_qty is null or p_qty<=0 or p_kind is null or p_kind not in('in','out','transfer') then raise exception 'Thông tin phiếu không hợp lệ.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_warehouse::text,0));
 select * into existing from public.stock_movements where warehouse_id=p_warehouse and request_id=p_request;
 if found then
  if existing.product_id<>p_product or existing.kind<>p_kind or existing.qty<>p_qty or existing.from_rack_id is distinct from p_from or existing.to_rack_id is distinct from p_to or existing.note<>coalesce(p_note,'') then raise exception 'Mã yêu cầu đã được dùng cho một phiếu khác.'; end if;
  return existing.id;
 end if;
 if not exists(select 1 from public.products where id=p_product and warehouse_id=p_warehouse) then raise exception 'Không tìm thấy hàng hóa trong kho.'; end if;
 if (p_kind='in' and (p_from is not null or p_to is null)) or (p_kind='out' and(p_from is null or p_to is not null)) or (p_kind='transfer' and(p_from is null or p_to is null or p_from=p_to)) then raise exception 'Vị trí nguồn / đích không hợp lệ.'; end if;
 if p_from is not null then
  select qty into available from public.stock_balances where warehouse_id=p_warehouse and product_id=p_product and rack_id=p_from for update;
  if coalesce(available,0)<p_qty then raise exception 'Số lượng xuất vượt quá tồn tại kệ nguồn.'; end if;
  update public.stock_balances set qty=qty-p_qty,updated_at=now() where warehouse_id=p_warehouse and product_id=p_product and rack_id=p_from;
 end if;
 if p_to is not null then
  if not exists(select 1 from public.racks where id=p_to and warehouse_id=p_warehouse) then raise exception 'Kệ đích không thuộc kho này.'; end if;
  insert into public.stock_balances(warehouse_id,product_id,rack_id,qty) values(p_warehouse,p_product,p_to,p_qty)
  on conflict(product_id,rack_id) do update set qty=public.stock_balances.qty+excluded.qty,updated_at=now();
 end if;
 insert into public.stock_movements(warehouse_id,product_id,kind,qty,from_rack_id,to_rack_id,note,request_id,created_by)
 values(p_warehouse,p_product,p_kind,p_qty,p_from,p_to,coalesce(p_note,''),p_request,(select auth.uid())) returning id into mid;
 return mid;
end;$$;
create function public.record_movement(p_warehouse uuid,p_product uuid,p_kind text,p_qty integer,p_from uuid,p_to uuid,p_note text,p_request uuid) returns uuid
language sql security invoker set search_path='' as $$ select private.record_movement(p_warehouse,p_product,p_kind,p_qty,p_from,p_to,p_note,p_request); $$;
revoke all on function private.record_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid),public.record_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid) from public,anon;
grant execute on function private.record_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid),public.record_movement(uuid,uuid,text,integer,uuid,uuid,text,uuid) to authenticated;
revoke all on function private.touch_updated_at(),private.check_rack_bounds() from public,anon,authenticated;
commit;
