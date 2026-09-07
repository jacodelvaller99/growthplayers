-- ════════════════════════════════════════════════════════════════════════════
-- Backfill de user_profiles.email
--
-- La columna existe desde el esquema inicial, pero solo la escribían dos
-- caminos: la edge function `create-user` (alta por admin) y
-- `clickup-onboarding` (alta automática al firmar). Quien se registraba solo
-- desde la app dejaba la columna NULL.
--
-- Consecuencias que esto cierra:
--   · el panel de admin mostraba email vacío para esos clientes,
--   · su búsqueda por email nunca podía encontrarlos,
--   · el admin no podía dispararles un enlace de recuperación de contraseña.
--
-- De aquí en adelante el email se escribe al completar el onboarding
-- (hooks/use-lifeflow.tsx, completeOnboarding). Esta migración solo cubre a
-- los usuarios que ya existían.
--
-- Idempotente: solo toca filas sin email. Se puede correr varias veces.
-- ════════════════════════════════════════════════════════════════════════════

UPDATE public.user_profiles up
SET    email = au.email
FROM   auth.users au
WHERE  au.id = up.user_id
  AND  au.email IS NOT NULL
  AND  (up.email IS NULL OR btrim(up.email) = '');

-- Verificación: debe devolver 0 filas pendientes con email en auth.
-- SELECT count(*) FROM public.user_profiles up
--   JOIN auth.users au ON au.id = up.user_id
--   WHERE au.email IS NOT NULL AND (up.email IS NULL OR btrim(up.email) = '');
