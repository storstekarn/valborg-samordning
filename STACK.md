# Valborg Infra 2026 – Tech stack och lärdomar

## Stack

| Lager | Teknik |
|---|---|
| Framework | Next.js (App Router, server + client components) |
| Auth (volontärer) | Supabase Auth – magic link via Resend SMTP |
| Auth (admin) | JWT-cookie via `jose` – ingen Supabase-session |
| Databas | Supabase (PostgreSQL) med Row Level Security |
| Realtime | Supabase Realtime (`postgres_changes`) |
| E-post | Resend (`resend` npm) |
| Deployment | Railway |
| Styling | Tailwind CSS v4 (CSS-baserad, ingen config-fil) |

---

## Supabase-klienter

Tre klienter med tydliga roller – blanda dem inte:

| Klient | Fil | Användning |
|---|---|---|
| `createClient()` | `lib/supabase/client.ts` | Client components (browser), använder anon key |
| `createClient()` | `lib/supabase/server.ts` | Server components, läser cookies för session |
| `createAdminClient()` | `lib/supabase/admin.ts` | API-routes med service role key, kringgår RLS |

**Viktigt:** `createServiceClient()` i `server.ts` (SSR + service role) kan vara opålitlig för
mutations eftersom SSR-cookielagret kan interferera med service role-nyckeln. Använd alltid
`createAdminClient()` för admin-operationer i API-routes.

---

## Admin-autentisering

Admin loggar in med e-post + lösenord (env-variabler `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`).
En JWT-cookie (`admin_token`, signerad med `SESSION_SECRET`) sätts på 24h.

`proxy.ts` (Next.js middleware-ekvivalent) skyddar alla `/admin/**`-routes utom `/admin/login`
genom att verifiera JWT-cookien.

Eftersom admin-JWT inte är en Supabase-session finns **ingen `auth.uid()`** i admin-kontext.
Alla admin-databas-operationer måste ske via `createAdminClient()` i API-routes.

---

## Auth-flöde för volontärer (magic link)

1. Volontär anger e-post på `/auth/login`
2. `POST /api/auth/send-magic-link` verifierar att e-posten finns i `pending_assignments`,
   anropar `supabase.auth.signInWithOtp({ ..., options: { shouldCreateUser: false } })`
3. Supabase skickar magic link via Resend SMTP
4. Volontären klickar länken → Supabase redirectar till `/auth/callback#access_token=...`
5. `/auth/callback/page.tsx` (client component) parsar fragmentet manuellt:
   ```ts
   const params = new URLSearchParams(window.location.hash.substring(1))
   await supabase.auth.setSession({ access_token, refresh_token })
   ```
6. Vid lyckat `setSession` → `router.push('/dashboard')`

**Varför client-side:** URL-fragment (`#...`) skickas aldrig till servern. En `route.ts`
på samma path som `page.tsx` blockerar rendering – de kan inte samexistera i App Router.

**`shouldCreateUser: false`:** Förhindrar att Supabase skapar nya auth-användare vid
inloggningsförsök. Användare skapas första gången de klickar en inbjudningslänk, inte vid
varje inloggning.

---

## Supabase SMTP (Resend)

Konfigurera i Supabase Dashboard → Settings → Auth → SMTP:

| Fält | Värde |
|---|---|
| Host | `smtp.resend.com` |
| Port | `465` |
| User | `resend` |
| Password | Resend API-nyckel |

---

## Databas-gotchas

### Foreign key profiles_id_fkey
`profiles.id` hade en FK mot `auth.users`. Denna orsakade problem med trigger-flödet och
måste tas bort:
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
```
Se `supabase/schema.sql` – profiles.id definieras nu som `uuid primary key` utan FK.

### Trigger handle_new_user
Triggern skapar profil + task_assignments när en auth-användare skapas. Den måste wrappas
i `EXCEPTION WHEN OTHERS THEN NULL` så att ett triggerfel aldrig blockerar inloggning:
```sql
begin
  begin
    -- ... insert into profiles, task_assignments ...
  exception when others then
    null;
  end;
  return new;
end;
```

### pending_assignments och RLS
`pending_assignments` har RLS aktiverat men inga policies → enbart `security definer`-triggern
når tabellen. För att läsa från pending_assignments i appkod måste `createAdminClient()`
(service role) användas. SSR-klienten med service role key (`createServiceClient`) är
opålitlig här pga cookie-interferens.

### Supabase realtime och fragments
Realtime-subscriptions använder `postgres_changes`. INSERT + UPDATE-events täcker de
vanligaste scenarierna (ny incident, statusändring). DELETE-events hanteras inte – tabeller
töms inte i drift.

---

## Miljövariabler

| Variabel | Beskrivning |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (publik) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (hemlig, bara server) |
| `NEXT_PUBLIC_SITE_URL` | Publik bas-URL, t.ex. `https://valborg.app` |
| `SESSION_SECRET` | Hemlig nyckel för admin JWT-signering |
| `SUPERADMIN_EMAIL` | Admin-inloggnings-e-post |
| `SUPERADMIN_PASSWORD` | Admin-inloggningslösenord |
| `SUPERADMIN_PROFILE_ID` | UUID för superadminens profil-rad i `profiles`-tabellen |
| `RESEND_API_KEY` | Resend API-nyckel |
| `EMAIL_FROM` | Avsändar-adress, t.ex. `noreply@valborg.app` |
