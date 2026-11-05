-- Progreso de video por usuario (API del reproductor de Vimeo, components/SkoolVideo.tsx).
-- Una fila por (usuario, video): cuánto vio como máximo, segundos reproducidos,
-- si lo terminó (≥90 %). Base para logros y para el calendario del mentor.
create table if not exists public.video_progress (
  user_id         uuid not null references auth.users(id) on delete cascade,
  video_id        text not null,
  lesson_id       text,
  duration_s      numeric,
  max_percent     numeric not null default 0 check (max_percent between 0 and 1),
  watched_s       numeric not null default 0 check (watched_s >= 0),
  completed       boolean not null default false,
  completed_at    timestamptz,
  first_seen_at   timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index if not exists video_progress_updated_idx on public.video_progress (updated_at);

alter table public.video_progress enable row level security;

drop policy if exists video_progress_owner on public.video_progress;
create policy video_progress_owner on public.video_progress
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists video_progress_staff_read on public.video_progress;
create policy video_progress_staff_read on public.video_progress
  for select to authenticated
  using (public.is_current_user_admin() or public.is_mentor_of(user_id));

grant select, insert, update on public.video_progress to authenticated;
