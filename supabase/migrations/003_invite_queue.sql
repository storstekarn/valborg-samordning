-- invite_queue: håller koll på vilka som ska/har fått inbjudan via magic link
create table if not exists invite_queue (
  email      text primary key,
  name       text,
  created_at timestamptz default now(),
  sent_at    timestamptz
);

alter table invite_queue enable row level security;

-- Backfilla från befintliga pending_assignments för de som inte har en profil än
insert into invite_queue (email, name)
select distinct on (lower(pa.email)) lower(pa.email), pa.name
from pending_assignments pa
left join profiles p on lower(p.email) = lower(pa.email)
where p.email is null
on conflict (email) do nothing;
