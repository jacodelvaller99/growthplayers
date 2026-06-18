-- ─────────────────────────────────────────────────────────────────────────────
-- ml_consent → OPT-IN explícito (RGPD).
--
-- Antes: profiles.ml_consent DEFAULT true → todos los usuarios quedaban inscritos
-- por defecto en el procesamiento de comportamiento (opt-out). La minimización de
-- datos del RGPD espera opt-in explícito. El onboarding ahora ofrece un checkbox
-- OPCIONAL separado; aquí cambiamos el default a false para las filas nuevas.
--
-- No toca filas existentes (su valor ya está fijado por el flujo anterior). Solo
-- cambia el DEFAULT para futuros inserts. Idempotente. Aplicar vía SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ALTER COLUMN ml_consent SET DEFAULT false;
