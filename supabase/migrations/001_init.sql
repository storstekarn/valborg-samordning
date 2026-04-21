-- ============================================================
-- VALBORG INFRA 2026 – Migration 001
-- Kör i Supabase SQL Editor
-- ============================================================

-- ------------------------------------------------------------
-- TABELLER
-- ------------------------------------------------------------

create table profiles (
  id    uuid references auth.users on delete cascade primary key,
  name  text,
  email text unique,
  phone text,
  role  text default 'volunteer' check (role in ('admin', 'volunteer'))
);

create table tasks (
  id          uuid default gen_random_uuid() primary key,
  title       text not null,
  area        text not null,
  description text,
  event_date  text not null check (event_date in ('fore', 'valborg', '1maj')),
  start_time  text,
  end_time    text,
  status      text default 'ej_startad' check (status in ('ej_startad', 'pågår', 'klar')),
  updated_by  uuid references profiles(id),
  updated_at  timestamptz
);

create table task_assignments (
  task_id    uuid references tasks(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (task_id, profile_id)
);

create table incidents (
  id          uuid default gen_random_uuid() primary key,
  reported_by uuid references profiles(id),
  category    text not null check (category in ('brand', 'el', 'logistik', 'övrigt')),
  message     text not null,
  status      text default 'ny' check (status in ('ny', 'hanteras', 'löst')),
  created_at  timestamptz default now()
);

create table messages (
  id         uuid default gen_random_uuid() primary key,
  from_id    uuid references profiles(id),
  to_id      uuid references profiles(id),
  message    text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table profiles        enable row level security;
alter table tasks           enable row level security;
alter table task_assignments enable row level security;
alter table incidents       enable row level security;
alter table messages        enable row level security;

-- Profiles: alla inloggade läser, var och en uppdaterar sin egen
create policy "profiles_select" on profiles
  for select using (true);  -- även anon behöver se för magic link onboarding

create policy "profiles_update_own" on profiles
  for update to authenticated
  using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert to authenticated
  with check (auth.uid() = id);

-- Tasks: alla läser (inkl. anon för publik sida), tilldelade + admin uppdaterar
create policy "tasks_select_all" on tasks
  for select using (true);

create policy "tasks_update_assigned_or_admin" on tasks
  for update to authenticated
  using (
    exists (
      select 1 from task_assignments
      where task_id = tasks.id and profile_id = auth.uid()
    ) or
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Task assignments: alla inloggade läser
create policy "task_assignments_select" on task_assignments
  for select to authenticated
  using (true);

-- Incidents: alla inloggade skapar; volontär ser bara sina, admin ser alla
create policy "incidents_insert" on incidents
  for insert to authenticated
  with check (auth.uid() = reported_by);

create policy "incidents_select" on incidents
  for select to authenticated
  using (
    reported_by = auth.uid() or
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "incidents_update_admin" on incidents
  for update to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Messages: användare ser meddelanden där de är avsändare eller mottagare
create policy "messages_select" on messages
  for select to authenticated
  using (from_id = auth.uid() or to_id = auth.uid());

create policy "messages_insert" on messages
  for insert to authenticated
  with check (from_id = auth.uid());

create policy "messages_update_read" on messages
  for update to authenticated
  using (to_id = auth.uid());

-- ------------------------------------------------------------
-- REALTIME
-- Aktivera Supabase Realtime på tasks och incidents
-- ------------------------------------------------------------

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table messages;

-- ------------------------------------------------------------
-- TRIGGER: skapa profil automatiskt vid ny auth-användare
-- ------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email)
  values (new.id, new.email)
  on conflict (email) do update
    set id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
