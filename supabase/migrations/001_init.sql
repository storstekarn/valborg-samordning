-- ============================================================
-- VALBORG INFRA 2026 – Migration 001
-- Kör i Supabase SQL Editor
-- Idempotent: kan köras om utan fel – allt rivs ned och byggs upp
-- ============================================================
-- MÖNSTER:
--   Profiler skapas automatiskt via trigger när en användare
--   loggar in via magic link (auth.users INSERT → handle_new_user).
--
--   Triggern matchar även användarens e-post mot tabellen
--   pending_assignments och skapar task_assignments direkt –
--   ingen manuell uppföljning krävs efter inloggning.
--
--   pending_assignments seedas i seed.sql och lämnas kvar i
--   databasen som en permanent mappningstabell.
-- ============================================================

-- ------------------------------------------------------------
-- TEARDOWN – riv ned allt innan uppbyggnad
-- ------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists handle_new_user();

drop table if exists pending_assignments cascade;
drop table if exists messages           cascade;
drop table if exists incidents          cascade;
drop table if exists task_assignments   cascade;
drop table if exists tasks              cascade;
drop table if exists profiles           cascade;

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
  status        text default 'ny' check (status in ('ny', 'hanteras', 'löst')),
  admin_comment text,
  created_at    timestamptz default now()
);

create table messages (
  id         uuid default gen_random_uuid() primary key,
  from_id    uuid references profiles(id),
  to_id      uuid references profiles(id),
  message    text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

-- Hjälptabell: e-post → uppgiftstitel + personinfo
-- Seedas i seed.sql. Läses av triggern när en profil skapas.
create table pending_assignments (
  email      text,
  task_title text,
  name       text,
  phone      text,
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
-- pending_assignments: inga policies → enbart triggern (security definer) når tabellen

-- Profiles: alla kan läsa (anon för publik sida + onboarding)
create policy "profiles_select" on profiles
  for select using (true);

-- Profiles: uppdatera bara sin egen rad
create policy "profiles_update_own" on profiles
  for update to authenticated
  using (auth.uid() = id);

-- OBS: ingen profiles_insert_own – triggern (security definer) skapar
--      profilen och kringgår RLS.

-- Tasks: alla läser (anon för publik körschema), tilldelade + admin uppdaterar
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
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

create policy "incidents_update_admin" on incidents
  for update to authenticated
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Messages: användare ser bara meddelanden där de är avsändare eller mottagare
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
--   1. Användaren klickar magic link → auth.users får en ny rad
--   2. Triggern skapar en profil (id = auth user id, email)
--   3. Triggern matchar e-posten mot pending_assignments och
--      skapar task_assignments för alla matchande uppgifter
--   4. Inget manuellt steg krävs efter inloggning
-- ------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  -- Skapa profil med namn och telefon från pending_assignments
  insert into profiles (id, email, name, phone)
  select
    new.id,
    new.email,
    (select name  from pending_assignments where lower(email) = lower(new.email) and name  is not null limit 1),
    (select phone from pending_assignments where lower(email) = lower(new.email) and phone is not null limit 1)
  on conflict (email) do nothing;

  -- Skapa task_assignments baserat på pending_assignments
  insert into task_assignments (task_id, profile_id)
  select t.id, new.id
  from pending_assignments pa
  join tasks t on lower(t.title) = lower(pa.task_title)
  where lower(pa.email) = lower(new.email)
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
