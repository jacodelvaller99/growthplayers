-- daily_checkins.zones — dónde lo siente, no solo cuánto.
--
-- Los cuatro deslizadores del check-in (energía, claridad, tensión, sueño) dan
-- la MAGNITUD y ocultan el LUGAR. "Tensión 8" no distingue una mandíbula
-- apretada de un estómago cerrado, y se regulan distinto.
--
-- Hasta esta migración el mapa corporal capturaba las zonas en la pantalla y
-- las tiraba: no llegaban a Supabase, así que Norman no podía verlas
-- (`lib/mentor.ts` solo mira stress/energy/sleep), el coach no las veía en el
-- dossier, y se perdían al reinstalar. Un gesto sin consecuencia es una demo.
--
-- Con la columna, el patrón se vuelve confrontable con dato — que es la
-- mecánica central que declara PRODUCT.md: "cuarta vez esta semana en la
-- mandíbula" en vez de "tu tensión sigue alta".
--
-- `text[]` y no una tabla aparte: son como mucho 7 valores de un enum cerrado
-- (`BODY_ZONES` en lib/bodyMapLogic.ts), siempre se leen junto al check-in y
-- nunca se consultan por sí solos. Una tabla hija sería un join sin ninguna
-- pregunta que lo justifique.
--
-- Nullable a propósito: señalar es opcional, y NULL ("no quiso decir") es
-- información distinta de '{}' ("miró y no marcó nada").
--
-- Idempotente. Aplicar en el SQL Editor del dashboard (sin CLI service-role).

alter table public.daily_checkins
  add column if not exists zones text[];

comment on column public.daily_checkins.zones is
  'Zonas del cuerpo donde el usuario ubicó la sensación (BODY_ZONES en lib/bodyMapLogic.ts). NULL = no señaló; array vacío = miró y no marcó.';
