create function private.delete_warehouse(p_warehouse uuid,p_confirmation text,p_expected timestamptz) returns boolean
language plpgsql security definer set search_path='' as $$
declare w public.warehouses; u uuid=(select auth.uid());
begin
 if u is null then raise exception 'Cần đăng nhập.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_warehouse::text,0));
 select * into w from public.warehouses where id=p_warehouse for update;
 if not found or w.owner_id is distinct from u then raise exception 'Chỉ chủ kho được xóa kho.'; end if;
 if p_confirmation is distinct from w.name then raise exception 'Tên xác nhận chưa khớp tên kho.'; end if;
 if p_expected is null or p_expected is distinct from w.updated_at then raise exception 'Thông tin kho đã thay đổi. Hãy tải lại trước khi xóa.'; end if;
 delete from public.stock_movements where warehouse_id=p_warehouse;
 delete from public.stock_balances where warehouse_id=p_warehouse;
 delete from public.products where warehouse_id=p_warehouse;
 delete from public.categories where warehouse_id=p_warehouse;
 delete from public.layout_objects where warehouse_id=p_warehouse;
 delete from public.racks where warehouse_id=p_warehouse;
 delete from public.warehouse_members where warehouse_id=p_warehouse;
 delete from public.warehouses where id=p_warehouse;
 return true;
end;$$;
create function public.delete_warehouse(p_warehouse uuid,p_confirmation text,p_expected timestamptz) returns boolean
language sql security invoker set search_path='' as $$ select private.delete_warehouse(p_warehouse,p_confirmation,p_expected); $$;
revoke all on function private.delete_warehouse(uuid,text,timestamptz),public.delete_warehouse(uuid,text,timestamptz) from public,anon;
grant execute on function private.delete_warehouse(uuid,text,timestamptz),public.delete_warehouse(uuid,text,timestamptz) to authenticated;
