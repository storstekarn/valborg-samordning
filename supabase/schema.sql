-- ============================================================
-- VALBORG INFRA 2026 – Kanonisk schema-referens
-- Speglar det aktuella databas-tillståndet.
-- Använd supabase/migrations/001_init.sql för idempotent
-- setup (med teardown) i en ny miljö.
-- ============================================================

-- ------------------------------------------------------------
-- TABELLER
-- ------------------------------------------------------------

-- profiles.id är uuid primary key UTAN FK mot auth.users.
-- (profiles_id_fkey har tagits bort – se STACK.md för förklaring.)
create table if not exists profiles (
  id    uuid primary key,
  name  text,
  email text unique,
  phone text,
  role  text default 'volunteer' check (role in ('admin', 'volunteer'))
);

create table if not exists tasks (
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

create table if not exists task_assignments (
  task_id    uuid references tasks(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key (task_id, profile_id)
);

create table if not exists incidents (
  id            uuid default gen_random_uuid() primary key,
  reported_by   uuid references profiles(id),
  category      text not null check (category in ('brand', 'el', 'logistik', 'övrigt')),
  message       text not null,
  status        text default 'ny' check (status in ('ny', 'hanteras', 'löst')),
  admin_comment text,
  created_at    timestamptz default now()
);

create table if not exists messages (
  id         uuid default gen_random_uuid() primary key,
  from_id    uuid references profiles(id),
  to_id      uuid references profiles(id),
  message    text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

-- Hjälptabell: e-post → uppgiftstitel + personinfo + roll
-- Seedas i seed.sql. Läses av triggern när en profil skapas.
-- Ingen RLS-policy → enbart security definer-triggern når tabellen.
create table if not exists pending_assignments (
  email      text,
  task_title text,
  name       text,
  phone      text,
  role       text default 'volunteer' check (role in ('admin', 'volunteer')),
  primary key (email, task_title)
);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------

alter table profiles          enable row level security;
alter table tasks             enable row level security;
alter table task_assignments  enable row level security;
alter table incidents         enable row level security;
alter table messages          enable row level security;
alter table pending_assignments enable row level security;

-- Profiles: alla kan läsa
create policy "profiles_select" on profiles
  for select using (true);

-- Profiles: uppdatera bara sin egen rad
create policy "profiles_update_own" on profiles
  for update to authenticated
  using (auth.uid() = id);

-- Tasks: alla läser; tilldelade + admin uppdaterar
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

-- Incidents: inloggade skapar; volontär ser sina, admin ser alla
create policy "incidents_insert" on incidents
  for insert to authenticated
  with check (auth.uid() = reported_by);

create policy "incidents_select" on incidents
  for select to authenticated
  using (
    reported_by = auth.uid() or
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "incidents_update_admin" on incidents
  for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Messages: avsändare + mottagare ser sina meddelanden
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
-- ------------------------------------------------------------

alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table messages;

-- ------------------------------------------------------------
-- TRIGGER: skapa profil + task_assignments vid inloggning
--
-- Flöde:
--   1. Användaren klickar magic link → auth.users ny rad
--   2. Triggern skapar profil med name, phone, role från
--      pending_assignments
--   3. Triggern skapar task_assignments för alla matchande rader
--   4. Wrappad i EXCEPTION WHEN OTHERS THEN NULL – ett fel i
--      triggern blockerar aldrig inloggning
-- ------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  begin
    insert into profiles (id, email, name, phone, role)
    select
      new.id,
      new.email,
      (select name  from pending_assignments where lower(email) = lower(new.email) and name  is not null limit 1),
      (select phone from pending_assignments where lower(email) = lower(new.email) and phone is not null limit 1),
      coalesce(
        (select role from pending_assignments where lower(email) = lower(new.email) and role is not null limit 1),
        'volunteer'
      )
    on conflict (email) do nothing;

    insert into task_assignments (task_id, profile_id)
    select t.id, new.id
    from pending_assignments pa
    join tasks t on lower(t.title) = lower(pa.task_title)
    where lower(pa.email) = lower(new.email)
    on conflict do nothing;
  exception when others then
    null;
  end;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
