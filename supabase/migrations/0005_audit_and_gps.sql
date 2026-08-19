-- ============================================================
-- REV BUMI OS — Fase 1: Audit read RPC + GPS verification
-- ============================================================

-- ------------------------------------------------------------
-- 1) RPC get_audit_logs — read audit append-only (insert-only RLS)
-- Hanya SUPER_ADMIN & MANAGEMENT boleh baca. Fungsi SECURITY DEFINER
-- membypass RLS audit_logs (yang tidak punya select policy).
-- ------------------------------------------------------------
create or replace function public.get_audit_logs(
  p_limit int default 100,
  p_offset int default 0,
  p_table text default null
)
returns setof public.audit_logs
language plpgsql security definer
set search_path = public
as $$
begin
  if public.current_user_role() not in ('SUPER_ADMIN','MANAGEMENT') then
    raise exception 'forbidden: only SUPER_ADMIN/MANAGEMENT can read audit logs (current=%)', public.current_user_role();
  end if;
  return query
    select * from public.audit_logs
    where (p_table is null or table_name = p_table)
    order by timestamp desc
    limit p_limit offset p_offset;
end;
$$;

grant execute on function public.get_audit_logs(int,int,text) to authenticated;

-- ------------------------------------------------------------
-- 2) Helper: haversine distance (meter) antara dua koordinat
-- ------------------------------------------------------------
create or replace function public.haversine_m(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
)
returns double precision
language sql immutable
as $$
  select 6371000 * 2 * asin(
    sqrt(
      pow(sin(radians(lat2 - lat1) / 2), 2)
      + cos(radians(lat1)) * cos(radians(lat2)) * pow(sin(radians(lng2 - lng1) / 2), 2)
    )
  );
$$;

-- ------------------------------------------------------------
-- 3) RPC verify_delivery_gps — cek GPS dalam radius quarry/site
-- p_context: 'QUARRY' → cek terhadap quarries.gps
--            'SITE'   → cek terhadap projects.gps via contracts.project_id
-- Allowed radius: QUARRY 500m, SITE 1000m (tunable tanpa ubah kode app).
-- Return: within_radius bool, distance_m, allowed_radius_m
-- ------------------------------------------------------------
create or replace function public.verify_delivery_gps(
  p_delivery_id text,
  p_lat double precision,
  p_lng double precision,
  p_context text
)
returns table (within_radius boolean, distance_m double precision, allowed_radius_m int)
language plpgsql security definer
set search_path = public
as $$
declare
  v_lat double precision;
  v_lng double precision;
  v_allowed int;
  v_dist double precision;
begin
  if p_context = 'QUARRY' then
    select q.gps_lat, q.gps_lng into v_lat, v_lng
    from public.deliveries d join public.quarries q on q.id = d.quarry_id
    where d.id = p_delivery_id;
    v_allowed := 500;
  elsif p_context = 'SITE' then
    select p.gps_lat, p.gps_lng into v_lat, v_lng
    from public.deliveries d
      join public.contracts c on c.id = d.contract_id
      join public.projects p on p.id = c.project_id
    where d.id = p_delivery_id;
    v_allowed := 1000;
  else
    raise exception 'invalid p_context %, expected QUARRY or SITE', p_context;
  end if;

  if v_lat is null or v_lng is null then
    -- quarry/project belum punya GPS → anggap within (tidak bisa validasi)
    return query select true::boolean, 0::double precision, v_allowed;
    return;
  end if;

  v_dist := public.haversine_m(v_lat, v_lng, p_lat, p_lng);
  return query select (v_dist <= v_allowed)::boolean, v_dist, v_allowed;
end;
$$;

grant execute on function public.haversine_m(double precision,double precision,double precision,double precision) to authenticated;
grant execute on function public.verify_delivery_gps(text,double precision,double precision,text) to authenticated;
