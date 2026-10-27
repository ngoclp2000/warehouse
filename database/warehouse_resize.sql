begin;
alter table public.warehouses add column updated_at timestamptz not null default now();
create trigger warehouse_timestamp before update on public.warehouses for each row execute function private.touch_updated_at();
-- Serialize rack geometry edits with warehouse resizing, so concurrent edits cannot bypass bounds.
create or replace function private.check_rack_bounds() returns trigger language plpgsql set search_path='' as $$
declare w public.warehouses; rw numeric; rd numeric;
begin
 perform pg_advisory_xact_lock(hashtextextended(new.warehouse_id::text,0));
 select * into w from public.warehouses where id=new.warehouse_id;
 if not found then raise exception 'Không có quyền truy cập kho.'; end if;
 rw=case when new.rotation in(90,270) then new.depth else new.width end;
 rd=case when new.rotation in(90,270) then new.width else new.depth end;
 if abs(new.x)+rw/2>w.width/2 or abs(new.z)+rd/2>w.depth/2 then raise exception 'Kệ vượt ra ngoài mặt bằng kho.'; end if;
 return new;
end;$$;
create function private.resize_warehouse(p_warehouse uuid,p_name text,p_width numeric,p_depth numeric,p_expected timestamptz) returns public.warehouses
language plpgsql security definer set search_path='' as $$
declare w public.warehouses; outside_codes text;
begin
 if (select auth.uid()) is null then raise exception 'Cần đăng nhập.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_warehouse::text,0));
 select * into w from public.warehouses where id=p_warehouse for update;
 if not found or w.owner_id<>(select auth.uid()) then raise exception 'Chỉ chủ kho được chỉnh kích thước kho.'; end if;
 if p_expected is null or w.updated_at<>p_expected then raise exception 'Thông tin kho đã thay đổi trên thiết bị khác. Hãy tải lại trước khi lưu.'; end if;
 if p_width is null or p_depth is null or p_width<5 or p_width>200 or p_depth<5 or p_depth>200 then raise exception 'Chiều rộng và chiều sâu phải từ 5 đến 200 m.'; end if;
 select string_agg(code,', ' order by code) into outside_codes from public.racks
 where warehouse_id=p_warehouse and (abs(x)+(case when rotation in(90,270) then depth else width end)/2>p_width/2 or abs(z)+(case when rotation in(90,270) then width else depth end)/2>p_depth/2);
 if outside_codes is not null then raise exception 'Các kệ nằm ngoài kích thước mới: %. Di chuyển kệ trước khi thu nhỏ kho.',outside_codes; end if;
 update public.warehouses set name=trim(p_name),width=p_width,depth=p_depth where id=p_warehouse returning * into w;
 return w;
end;$$;
create function public.resize_warehouse(p_warehouse uuid,p_name text,p_width numeric,p_depth numeric,p_expected timestamptz) returns public.warehouses
language sql security invoker set search_path='' as $$ select private.resize_warehouse(p_warehouse,p_name,p_width,p_depth,p_expected); $$;
revoke all on function private.resize_warehouse(uuid,text,numeric,numeric,timestamptz),public.resize_warehouse(uuid,text,numeric,numeric,timestamptz) from public,anon;
grant execute on function private.resize_warehouse(uuid,text,numeric,numeric,timestamptz),public.resize_warehouse(uuid,text,numeric,numeric,timestamptz) to authenticated;
commit;
