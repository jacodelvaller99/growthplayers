-- ─── Plaud → Polaris: importación automática de mentorías ────────────────────
--
-- Grabas la sesión en Plaud nombrándola con el nombre del cliente
-- ("Juan Pérez — sesión 3"); un cron horario llama a la edge function
-- `plaud-sync`, que baja las grabaciones nuevas, matchea el nombre contra
-- user_profiles y corre el mismo pipeline de resumen que una sesión de
-- mentoría manual. Lo que no matchea cae a una cola de revisión en admin —
-- nunca se pierde ni se adivina.
--
-- Privacidad (decisión del dueño): el TRANSCRIPT crudo vive solo aquí
-- (RLS admin-only). El cliente ve únicamente el resumen + plan de acción vía
-- memory_summaries / mentorship_sessions (que se crea con transcript = NULL).
--
-- Idempotente. Aplicar vía SQL Editor del dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── 1. Cola de imports ───────────────────────────────────────────────────────

create table if not exists public.plaud_imports (
  id              uuid primary key default gen_random_uuid(),
  plaud_file_id   text not null unique,           -- idempotencia: una fila por grabación
  recording_name  text,
  recorded_at     timestamptz,
  duration_sec    integer,
  transcript      text,                            -- crudo, SOLO admin
  plaud_summary   text,                            -- resumen nativo de Plaud (markdown)
  matched_user_id uuid references auth.users(id) on delete set null,
  status          text not null default 'pending_review'
                  check (status in ('pending_review','processing','imported','ignored','error')),
  error           text,
  session_id      uuid,                            -- mentorship_sessions.id cuando se procesa
  created_at      timestamptz not null default now(),
  processed_at    timestamptz
);

create index if not exists plaud_imports_status_idx on public.plaud_imports (status, created_at desc);

alter table public.plaud_imports enable row level security;

-- Admin-only (mismo patrón que admin_briefings): el cliente jamás ve esta
-- tabla — contiene el transcript crudo. Service role la salta para escribir.
drop policy if exists plaud_imports_admin on public.plaud_imports;
create policy plaud_imports_admin on public.plaud_imports
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin)
  );

-- ─── 1.bis Token de Plaud (rotación) ─────────────────────────────────────────
-- Plaud puede ROTAR el refresh_token en cada refresh (data.refresh_token nuevo).
-- Un secret estático moriría tras el primer uso; el token vivo se persiste aquí.
-- Fila única. SIN políticas RLS a propósito: con RLS activo y cero policies,
-- nadie salvo service role puede leerla — es una credencial, no un dato de app.
-- El secret PLAUD_REFRESH_TOKEN del dashboard solo siembra la primera fila.

create table if not exists public.plaud_tokens (
  id            integer primary key default 1 check (id = 1),
  refresh_token text not null,
  updated_at    timestamptz not null default now()
);

alter table public.plaud_tokens enable row level security;

-- ─── 2. Dedupe de resúmenes (cierra un hueco general, no solo de Plaud) ──────
-- insertSummary nunca deduplicó; con un cron re-procesando, esto es la red.
-- Parcial: las filas con source_id NULL (chat/manual histórico) no se tocan.

create unique index if not exists memory_summaries_source_dedupe
  on public.memory_summaries (user_id, source_type, source_id)
  where source_id is not null;

-- ─── 3. Cron horario ─────────────────────────────────────────────────────────
-- Requiere los secretos de Vault 'project_url' y 'service_role_key' YA creados
-- (mismo requisito previo documentado en 20260731000000_cron_reconciliation.sql).
-- Si aún no existen, crear primero desde el SQL Editor y re-correr esta sección.

do $$
begin
  if exists (select 1 from cron.job where jobname = 'plaud-sync-hourly') then
    perform cron.unschedule('plaud-sync-hourly');
  end if;
end $$;

select cron.schedule(
  'plaud-sync-hourly',
  '10 * * * *',   -- minuto 10 de cada hora (evita la estampida de jobs en :00)
  $job$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
           || '/functions/v1/plaud-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' ||
        (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{"batch":"all"}'::jsonb
  );
  $job$
);
