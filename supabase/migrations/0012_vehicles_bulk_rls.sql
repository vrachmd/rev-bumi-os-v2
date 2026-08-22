-- Patch: izinkan QUARRY_CHECKER + DISPATCHER upsert kendaraan untuk bulk 10 di lapangan
-- Sebelumnya: vehicles_write_ops hanya SUPER_ADMIN/OPERATIONS/COMMERCIAL → quarry bulk plat baru blocked (E2E 6a)
drop policy if exists vehicles_write_ops on public.vehicles;
create policy vehicles_write_ops on public.vehicles
  for all using (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL','DISPATCHER','QUARRY_CHECKER'))
  with check (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL','DISPATCHER','QUARRY_CHECKER'));

-- juga drivers (supir baru via bulk)
drop policy if exists drivers_write_ops on public.drivers;
create policy drivers_write_ops on public.drivers
  for all using (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL','DISPATCHER','QUARRY_CHECKER'))
  with check (public.current_user_role() in ('SUPER_ADMIN','OPERATIONS','COMMERCIAL','DISPATCHER','QUARRY_CHECKER'));
