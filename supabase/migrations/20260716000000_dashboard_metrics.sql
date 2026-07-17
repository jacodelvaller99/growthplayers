-- Tablero personalizable (Comando): las métricas elegidas siguen al usuario
-- entre dispositivos. Owner-only por las políticas RLS existentes de profiles.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_metrics jsonb;

COMMENT ON COLUMN public.profiles.dashboard_metrics IS
  'Ids de métricas del tablero de Comando elegidas por el usuario (orden = render). NULL = defaults.';
