-- Cuestionario de experiencia de usuario (public/cuestionario.html, /cuestionario).
-- Cualquiera responde sin cuenta (anon INSERT); SOLO el dueño lee (SELECT por email del JWT).
-- Sin UPDATE/DELETE para nadie desde el cliente. Respuestas anónimas: sin user_id.
create table if not exists public.ux_survey_responses (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  answers    jsonb not null check (jsonb_typeof(answers) = 'object' and pg_column_size(answers) < 32000),
  sus        numeric check (sus between 0 and 100),
  nps        int check (nps between 0 and 10)
);

alter table public.ux_survey_responses enable row level security;

drop policy if exists ux_survey_insert_anyone on public.ux_survey_responses;
create policy ux_survey_insert_anyone on public.ux_survey_responses
  for insert to anon, authenticated with check (true);

drop policy if exists ux_survey_select_owner on public.ux_survey_responses;
create policy ux_survey_select_owner on public.ux_survey_responses
  for select to authenticated
  using (lower(auth.jwt() ->> 'email') = 'ncapuozzo@polarisgrowthinstitute.com');

revoke all on public.ux_survey_responses from anon, authenticated;
grant insert on public.ux_survey_responses to anon, authenticated;
grant select on public.ux_survey_responses to authenticated;
