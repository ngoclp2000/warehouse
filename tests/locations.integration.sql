-- Transactional fixture only: no production stock is changed. Run with SQL admin.
begin;
select set_config('request.jwt.claims',json_build_object('sub',(select owner_id from public.warehouses order by created_at limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare w uuid; r uuid; r2 uuid; p uuid; a uuid; b uuid; legacy uuid; req uuid=gen_random_uuid(); mid uuid; dummy uuid; old_total bigint;
begin
 w=public.create_warehouse('QA location transaction',24,14);
 perform set_config('test.location_warehouse',w::text,true);
 insert into public.racks(warehouse_id,code,x,z,width,depth,height,shelf_count,bins_per_shelf) values(w,'QA-R1',-4,0,3,1,2,3,2) returning id into r;
 insert into public.racks(warehouse_id,code,x,z,width,depth,height,shelf_count,bins_per_shelf) values(w,'QA-R2',4,0,3,1,2,3,2) returning id into r2;
 insert into public.products(warehouse_id,sku,name) values(w,'QA-P','QA item') returning id into p;
 select id into legacy from public.stock_locations where rack_id=r and tier=0;
 select id into a from public.stock_locations where rack_id=r and tier=3 and bin=2;
 select id into b from public.stock_locations where rack_id=r2 and tier=2 and bin=1;
 if (select count(*) from public.stock_locations where warehouse_id=w)<>14 then raise exception 'locations not generated'; end if;
 perform public.record_movement(w,p,'in',10,null,r,'legacy fixture',gen_random_uuid());
 mid=public.record_location_movement(w,p,'transfer',6,legacy,a,'allocate',req);
 if public.record_location_movement(w,p,'transfer',6,legacy,a,'allocate',req)<>mid then raise exception 'idempotency failed'; end if;
 if (select qty from public.stock_balances where product_id=p and rack_id=r)<>10 then raise exception 'same rack transfer changed total'; end if;
 if (select qty from public.location_balances where product_id=p and location_id=legacy)<>4 then raise exception 'legacy allocation incorrect'; end if;
 begin
  perform public.record_location_movement(w,p,'transfer',5,legacy,a,'allocate',req);
  raise exception 'Expected rejection';
 exception when others then if SQLERRM='Expected rejection' then raise; end if; end;
 begin
  perform public.record_location_movement(w,p,'out',7,a,null,'overdraw',gen_random_uuid());
  raise exception 'Expected rejection';
 exception when others then if SQLERRM='Expected rejection' then raise; end if; end;
 begin
  perform public.record_movement(w,p,'out',5,r,null,'old client cannot take assigned',gen_random_uuid());
  raise exception 'Expected rejection';
 exception when others then if SQLERRM='Expected rejection' then raise; end if; end;
 begin
  update public.racks set shelf_count=2 where id=r;
  raise exception 'Expected rejection';
 exception when others then if SQLERRM='Expected rejection' then raise; end if; end;
 begin
  update public.racks set bins_per_shelf=1 where id=r;
  raise exception 'Expected rejection';
 exception when others then if SQLERRM='Expected rejection' then raise; end if; end;
 perform public.record_location_movement(w,p,'transfer',6,a,b,'cross rack',gen_random_uuid());
 update public.racks set shelf_count=2,bins_per_shelf=1 where id=r;
 begin
  perform public.record_location_movement(w,p,'in',1,null,a,'inactive',gen_random_uuid());
  raise exception 'Expected rejection';
 exception when others then if SQLERRM='Expected rejection' then raise; end if; end;
 update public.racks set shelf_count=3,bins_per_shelf=2 where id=r;
 if not exists(select 1 from public.stock_locations where id=a and rack_id=r) then raise exception 'stable ID lost'; end if;
 perform public.record_location_movement(w,p,'out',2,b,null,'out',gen_random_uuid());
 if (select sum(qty) from public.stock_balances where product_id=p)<>8 or (select sum(qty) from public.location_balances where product_id=p)<>8 then raise exception 'totals diverged'; end if;
 if exists(select 1 from public.stock_balances s where s.warehouse_id=w and s.qty<>(select coalesce(sum(qty),0) from public.location_balances l where l.product_id=s.product_id and l.rack_id=s.rack_id)) then raise exception 'rack totals diverged'; end if;
 if has_table_privilege('authenticated','public.location_balances','INSERT') or has_table_privilege('authenticated','public.location_balances','UPDATE') or has_table_privilege('authenticated','public.stock_locations','INSERT') then raise exception 'direct writes allowed'; end if;
 -- Whole warehouse delete must still work with occupied locations and history.
 perform public.delete_warehouse(w,'QA location transaction',(select updated_at from public.warehouses where id=w));
 if exists(select 1 from public.stock_locations where warehouse_id=w) or exists(select 1 from public.location_balances where warehouse_id=w) then raise exception 'delete did not cascade'; end if;
end;$$;
reset role;
select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-000000000123","role":"authenticated"}',true);
set local role authenticated;
do $$begin
 if exists(select 1 from public.stock_locations) or exists(select 1 from public.location_balances) then raise exception 'RLS leaked locations'; end if;
 begin
  perform public.record_location_movement(current_setting('test.location_warehouse')::uuid,gen_random_uuid(),'in',1,null,gen_random_uuid(),'',gen_random_uuid());
  raise exception 'Expected rejection';
 exception when others then if SQLERRM='Expected rejection' then raise; end if; end;
end;$$;
reset role;
select 'location business checks passed; fixture rolled back' as result;
rollback;
