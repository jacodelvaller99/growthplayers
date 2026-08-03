-- ─── El Umbral — el camino del héroe empieza donde empieza la persona ────────
--
-- Dos arreglos de captura del punto de partida:
--
-- (1) `user_profiles.role` — el onboarding SIEMPRE preguntó el rol y SIEMPRE
--     lo descartó: `completeOnboarding` no lo incluía en el upsert y
--     `mapFromSupabase` lo rellenaba con el default ('Empresario' hasta hoy),
--     así que lo tecleado se perdía en el primer refresh. Con la columna, el
--     dato del usuario por fin sobrevive.
--
-- (2) La historia de origen se siembra desde el cliente en tablas que YA
--     existen (`user_memory_profile.transformation_goal` — columna presente
--     desde 20260615000000 y sin ningún escritor hasta ahora — y
--     `memory_summaries` con source_type 'manual', presente en el CHECK y
--     también sin escritor). No requieren cambios de esquema: esta migración
--     solo documenta que dejan de ser columnas fantasma.
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

alter table public.user_profiles
  add column if not exists role text;

comment on column public.user_profiles.role is
  'Rol declarado en el onboarding (ej. "Fundador", "CEO"). Capturado desde 2026-08 — antes se preguntaba y se descartaba.';
