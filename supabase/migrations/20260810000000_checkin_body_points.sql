-- Coordenadas precisas sobre el cuerpo frontal del check-in.
--
-- `zones` conserva el resumen semántico para recomendaciones y patrones.
-- `body_points` guarda hasta seis toques normalizados (0..1), con región y
-- lado, para rehidratar exactamente los marcadores en cualquier pantalla.
-- No es diagnóstico ni historia clínica: es la ubicación declarada por la
-- persona dentro del mismo registro voluntario del check-in.

alter table public.daily_checkins
  add column if not exists body_points jsonb;

alter table public.daily_checkins
  drop constraint if exists daily_checkins_body_points_array;

alter table public.daily_checkins
  add constraint daily_checkins_body_points_array
  check (
    body_points is null
    or (jsonb_typeof(body_points) = 'array' and jsonb_array_length(body_points) <= 6)
  );

comment on column public.daily_checkins.body_points is
  'Hasta 6 puntos normalizados sobre el escaneo frontal: x, y, region, side y zone. NULL = no señaló un punto exacto.';
