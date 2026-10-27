alter table public.racks add column shelf_count integer not null default 3 check (shelf_count between 1 and 20);
grant update(shelf_count) on public.racks to authenticated;
