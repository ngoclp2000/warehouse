create table public.layout_objects (
 id uuid primary key default gen_random_uuid(),
 warehouse_id uuid not null references public.warehouses(id),
 kind text not null check(kind in ('wall','door','table','machine','area')),
 name text not null check(length(trim(name)) between 1 and 80),
 x numeric not null,z numeric not null,
 width numeric not null check(width between .1 and 200),
 depth numeric not null check(depth between .1 and 200),
 height numeric not null check(height between .02 and 12),
 rotation numeric not null default 0 check(rotation>=0 and rotation<360),
 updated_at timestamptz not null default now()
);
create index layout_objects_warehouse_idx on public.layout_objects(warehouse_id);
alter table public.layout_objects enable row level security;
create policy layout_read on public.layout_objects for select to authenticated using(private.is_member(warehouse_id));
create policy layout_insert on public.layout_objects for insert to authenticated with check(private.is_member(warehouse_id,true));
create policy layout_update on public.layout_objects for update to authenticated using(private.is_member(warehouse_id,true)) with check(private.is_member(warehouse_id,true));
create policy layout_delete on public.layout_objects for delete to authenticated using(private.is_member(warehouse_id,true));
revoke all on public.layout_objects from anon,authenticated;
grant select,insert,delete on public.layout_objects to authenticated;
grant update(name,x,z,width,depth,height,rotation) on public.layout_objects to authenticated;
create trigger layout_timestamp before update on public.layout_objects for each row execute function private.touch_updated_at();
create function private.check_layout_bounds() returns trigger language plpgsql set search_path='' as $$
declare w public.warehouses; rw numeric; rd numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.warehouse_id::text,0));
 select * into w from public.warehouses where id=new.warehouse_id;
 rw=abs(cos(radians(new.rotation)))*new.width+abs(sin(radians(new.rotation)))*new.depth;
 rd=abs(sin(radians(new.rotation)))*new.width+abs(cos(radians(new.rotation)))*new.depth;
 if abs(new.x)+rw/2>w.width/2+.000001 or abs(new.z)+rd/2>w.depth/2+.000001 then raise exception 'Đối tượng nằm ngoài kho.'; end if;
 return new;
end;$$;
create trigger layout_bounds before insert or update on public.layout_objects for each row execute function private.check_layout_bounds();
create function private.guard_layout_resize() returns trigger language plpgsql set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended(new.id::text,0));
 if exists(select 1 from public.layout_objects o where o.warehouse_id=new.id and (
 abs(o.x)+(abs(cos(radians(o.rotation)))*o.width+abs(sin(radians(o.rotation)))*o.depth)/2>new.width/2+.000001
 or abs(o.z)+(abs(sin(radians(o.rotation)))*o.width+abs(cos(radians(o.rotation)))*o.depth)/2>new.depth/2+.000001))
 then raise exception 'Tường hoặc thiết bị nằm ngoài kích thước mới. Di chuyển chúng trước khi thu nhỏ kho.'; end if;
 return new;
end;$$;
create trigger layout_resize_guard before update of width,depth on public.warehouses for each row execute function private.guard_layout_resize();
