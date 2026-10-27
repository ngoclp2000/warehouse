alter table public.layout_objects drop constraint layout_objects_kind_check;
alter table public.layout_objects add constraint layout_objects_kind_check check (kind in ('wall','door','table','machine','area','bin'));
