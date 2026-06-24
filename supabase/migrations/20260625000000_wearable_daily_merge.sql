-- ─────────────────────────────────────────────────────────────────────────────
-- merge_wearable_daily — upsert por-columna race-free para el agregador.
--
-- Un agregador (Open Wearables, Terra) puede mandar CADA métrica del día en su
-- propio webhook (sueño, HRV, pasos…). Un upsert que reemplaza la fila borraría
-- las métricas llegadas en eventos anteriores. Un read-modify-write en la edge
-- function tendría una race condition (dos eventos concurrentes del mismo día
-- leen la misma base y el segundo pisa al primero).
--
-- Esta función lo resuelve en UNA sola sentencia atómica: INSERT … ON CONFLICT
-- DO UPDATE con COALESCE(excluded.col, wd.col). El UPDATE toma un row-lock, así
-- que eventos concurrentes del mismo (user, provider, date) se serializan y cada
-- uno conserva los campos non-null del otro. Race-free por diseño.
--
-- SECURITY DEFINER + grant solo a service_role: la llaman las edge functions con
-- la service-role key; nunca el cliente.
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.merge_wearable_daily(p_rows jsonb)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.wearable_daily as wd (
    user_id, provider, source_device, date,
    sleep_score, sleep_duration_min, sleep_efficiency, rem_min, deep_min, light_min, awake_min,
    recovery_score, hrv_ms, resting_hr, respiratory_rate, spo2_avg, body_temp_delta,
    activity_score, strain_score, calories_active, steps, active_min, stress_score
  )
  select
    x.user_id, x.provider, x.source_device, x.date,
    x.sleep_score, x.sleep_duration_min, x.sleep_efficiency, x.rem_min, x.deep_min, x.light_min, x.awake_min,
    x.recovery_score, x.hrv_ms, x.resting_hr, x.respiratory_rate, x.spo2_avg, x.body_temp_delta,
    x.activity_score, x.strain_score, x.calories_active, x.steps, x.active_min, x.stress_score
  from jsonb_to_recordset(p_rows) as x(
    user_id uuid, provider text, source_device text, date date,
    sleep_score int, sleep_duration_min int, sleep_efficiency numeric, rem_min int, deep_min int, light_min int, awake_min int,
    recovery_score int, hrv_ms numeric, resting_hr int, respiratory_rate numeric, spo2_avg numeric, body_temp_delta numeric,
    activity_score int, strain_score numeric, calories_active int, steps int, active_min int, stress_score int
  )
  on conflict (user_id, provider, date) do update set
    source_device      = coalesce(excluded.source_device, wd.source_device),
    sleep_score        = coalesce(excluded.sleep_score, wd.sleep_score),
    sleep_duration_min = coalesce(excluded.sleep_duration_min, wd.sleep_duration_min),
    sleep_efficiency   = coalesce(excluded.sleep_efficiency, wd.sleep_efficiency),
    rem_min            = coalesce(excluded.rem_min, wd.rem_min),
    deep_min           = coalesce(excluded.deep_min, wd.deep_min),
    light_min          = coalesce(excluded.light_min, wd.light_min),
    awake_min          = coalesce(excluded.awake_min, wd.awake_min),
    recovery_score     = coalesce(excluded.recovery_score, wd.recovery_score),
    hrv_ms             = coalesce(excluded.hrv_ms, wd.hrv_ms),
    resting_hr         = coalesce(excluded.resting_hr, wd.resting_hr),
    respiratory_rate   = coalesce(excluded.respiratory_rate, wd.respiratory_rate),
    spo2_avg           = coalesce(excluded.spo2_avg, wd.spo2_avg),
    body_temp_delta    = coalesce(excluded.body_temp_delta, wd.body_temp_delta),
    activity_score     = coalesce(excluded.activity_score, wd.activity_score),
    strain_score       = coalesce(excluded.strain_score, wd.strain_score),
    calories_active    = coalesce(excluded.calories_active, wd.calories_active),
    steps              = coalesce(excluded.steps, wd.steps),
    active_min         = coalesce(excluded.active_min, wd.active_min),
    stress_score       = coalesce(excluded.stress_score, wd.stress_score),
    synced_at          = now();
$$;

revoke all on function public.merge_wearable_daily(jsonb) from public;
grant execute on function public.merge_wearable_daily(jsonb) to service_role;
