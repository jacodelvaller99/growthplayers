-- USERS PROFILE
create table if not exists public.profiles (
  id uuid references auth.users primary key,
  full_name text,
  archetype_id text check (archetype_id in
    ('guerrero','pontifice','mercader','guardian')),
  program_type text check (program_type in
    ('polaris','growth_players')),
  norte text,
  sovereignty_score numeric(3,1) default 5.0,
  current_module_id integer default 0,
  streak integer default 0,
  total_days integer default 0,
  last_checkin_at timestamptz,
  enrollment_date timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PILARES (Rueda de la Vida)
create table if not exists public.pilares (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id)
    on delete cascade,
  pilar text check (pilar in (
    'fe','finanzas','salud','familia',
    'mente','negocio','impacto','legado')),
  score integer check (score between 0 and 10)
    default 5,
  updated_at timestamptz default now(),
  unique(user_id, pilar)
);

-- MÓDULOS PROGRESO
create table if not exists public.module_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id)
    on delete cascade,
  module_id integer not null,
  program_type text not null,
  status text check (status in (
    'available','in_progress','completed'))
    default 'available',
  progress integer default 0
    check (progress between 0 and 100),
  notes text[] default '{}',
  started_at timestamptz,
  completed_at timestamptz,
  unique(user_id, module_id, program_type)
);

-- BITÁCORA
create table if not exists public.bitacora (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id)
    on delete cascade,
  content text not null,
  mood integer check (mood between 1 and 5),
  energy integer check (energy between 1 and 5),
  tags text[] default '{}',
  created_at timestamptz default now()
);

-- CHAT MESSAGES
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id)
    on delete cascade,
  role text check (role in ('user','assistant')),
  content text not null,
  module_context integer,
  created_at timestamptz default now()
);

-- CHECK-INS DIARIOS
create table if not exists public.checkins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id)
    on delete cascade,
  energy integer check (energy between 1 and 5),
  focus integer check (focus between 1 and 5),
  mood integer check (mood between 1 and 5),
  intention text,
  reflection text,
  created_at timestamptz default now(),
  unique(user_id, (created_at::date))
);

-- RLS POLICIES
alter table public.profiles enable row level security;
alter table public.pilares enable row level security;
alter table public.module_progress enable row level security;
alter table public.bitacora enable row level security;
alter table public.chat_messages enable row level security;
alter table public.checkins enable row level security;

create policy "Users own data" on public.profiles
  for all using (auth.uid() = id);
create policy "Users own pilares" on public.pilares
  for all using (auth.uid() = user_id);
create policy "Users own modules" on public.module_progress
  for all using (auth.uid() = user_id);
create policy "Users own bitacora" on public.bitacora
  for all using (auth.uid() = user_id);
create policy "Users own chat" on public.chat_messages
  for all using (auth.uid() = user_id);
create policy "Users own checkins" on public.checkins
  for all using (auth.uid() = user_id);

-- TRIGGER: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
