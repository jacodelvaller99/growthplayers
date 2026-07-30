-- ─── LifeFlow: tipo de sesión "movement" ──────────────────────────────────────
--
-- El CHECK de wellness_sessions.type quedó fijado en
-- 20260501000000_auraos_extensions.sql con cinco valores
-- ('meditation','breathing','binaural','asmr','sleep').
--
-- Las prácticas de movimiento de LifeFlow (movilidad, flows, circuitos) no
-- entran en ninguno de esos: registrarlas hoy viola el constraint y la sesión
-- del usuario se pierde. Esta migración agrega 'movement'.
--
-- Idempotente: se puede correr sobre una base que ya la tenga aplicada.

ALTER TABLE wellness_sessions DROP CONSTRAINT IF EXISTS wellness_sessions_type_check;

ALTER TABLE wellness_sessions ADD CONSTRAINT wellness_sessions_type_check
  CHECK (type IN ('meditation','breathing','binaural','asmr','sleep','movement'));
