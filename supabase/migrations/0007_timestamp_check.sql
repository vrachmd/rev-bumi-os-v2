-- F1-2: server timestamp enforcement — flag bila loaded_at/unloaded_at selisih >5 menit dari now()
-- Tidak block offline queue (bisa jam-an), hanya insert audit warning bila >5 menit.

create or replace function public.check_delivery_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_diff integer;
begin
  -- cek loaded_at
  if new.loaded_at is not null then
    v_diff := abs(extract(epoch from (new.loaded_at - now()))::int);
    if v_diff > 300 then
      insert into public.audit_logs (table_name, record_id, record_identifier, action, changed_by, user_role, new_values, reason)
      values ('deliveries', new.id, new.delivery_number, 'STATUS_CHANGE', auth.uid(), public.current_user_role(),
              jsonb_build_object('loaded_at', new.loaded_at, 'server_now', now(), 'diff_sec', v_diff),
              'Warning: loaded_at selisih >5 menit dari jam server (mungkin foto lama / offline)');
    end if;
  end if;
  -- cek unloaded_at
  if new.unloaded_at is not null and (old.unloaded_at is distinct from new.unloaded_at) then
    v_diff := abs(extract(epoch from (new.unloaded_at - now()))::int);
    if v_diff > 300 then
      insert into public.audit_logs (table_name, record_id, record_identifier, action, changed_by, user_role, new_values, reason)
      values ('deliveries', new.id, new.delivery_number, 'STATUS_CHANGE', auth.uid(), public.current_user_role(),
              jsonb_build_object('unloaded_at', new.unloaded_at, 'server_now', now(), 'diff_sec', v_diff),
              'Warning: unloaded_at selisih >5 menit dari jam server');
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_check_delivery_timestamp on public.deliveries;
create trigger trg_check_delivery_timestamp
  after insert or update of loaded_at, unloaded_at on public.deliveries
  for each row execute function public.check_delivery_timestamp();
