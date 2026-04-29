# Valborg Infra 2026 – Tech stack och lärdomar

## Stack

| Lager | Teknik |
|---|---|
| Framework | Next.js 16 (App Router, server + client components) |
| Auth (volontärer) | Eget flöde: e-post + `VOLUNTEER_CODE` → signerad httpOnly-cookie |
| Auth (admin) | JWT-cookie via `jose` – ingen Supabase-session |
| Databas | Supabase (PostgreSQL) med Row Level Security |
| Realtime | Supabase Realtime (`postgres_changes` + Presence) |
| E-post | Resend (`resend` npm) |
| Deployment | Railway |
| Styling | Tailwind CSS v4 (CSS-baserad, ingen config-fil) |

---

## Supabase-klienter

Tre klienter med tydliga roller – blanda dem inte:

| Klient | Fil | Användning |
|---|---|---|
| `createClient()` | `lib/supabase/client.ts` | Client components: Realtime-prenumerationer och Presence |
| `createClient()` | `lib/supabase/server.ts` | Server components som inte behöver bypass RLS (t.ex. startsidan) |
| `createAdminClient()` | `lib/supabase/admin.ts` | Alla API-routes och skyddade server components – kringgår RLS |

**Viktigt:** Supabase Auth används **inte** för volontärers session. `createClient()` i browsern
är bara för Realtime/Presence. Alla databas-writes och auth-skyddade reads görs via
`createAdminClient()` (service role key).

---

## Admin-autentisering

Admin loggar in med e-post + lösenord (env-variabler `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD`).
En JWT-cookie (`admin_token`, signerad med `SESSION_SECRET`) sätts på 24h.

`proxy.ts` (Next.js middleware-ekvivalent) skyddar alla `/admin/**`-routes utom `/admin/login`
genom att verifiera JWT-cookien.

Eftersom admin-JWT inte är en Supabase-session finns **ingen `auth.uid()`** i admin-kontext.
Alla admin-databas-operationer måste ske via `createAdminClient()` i API-routes.

---

## Auth-flöde för volontärer (e-post + kod)

1. Volontär anger e-post och `VOLUNTEER_CODE` på `/auth/login`
2. `POST /api/auth/volunteer-login` validerar:
   - Koden mot env-variabeln `VOLUNTEER_CODE`
   - E-posten mot `pending_assignments` **eller** `profiles` (service role-klienten, kringgår RLS)
3. Om validering lyckas: hitta befintlig profil i `profiles` via e-post (case-insensitive)
4. Om ingen profil finns: skapa profil + `task_assignments` från `pending_assignments`
   (replikerar vad Supabase-triggern `handle_new_user` tidigare gjorde)
5. Signera JWT med `{ profileId, email }` → sätt `volunteer_token`-cookie (httpOnly, 30 dagar)
6. Redirect till `/dashboard`

`lib/volunteerAuth.ts` innehåller `signVolunteerToken`, `verifyVolunteerToken` och
`getVolunteerSession` – samma mönster som `lib/auth.ts` för superadmin.

**Utloggning:** `POST /api/auth/volunteer-logout` rensar cookien. Dashboard har en server action
som sätter `maxAge: 0` direkt.

---

## Middleware (proxy.ts)

Next.js 16 använder `proxy.ts` (inte `middleware.ts`) och exporterar `proxy` (inte `middleware`).

```
Publika routes (aldrig redirect): /, /auth/login
Admin-skyddade: /admin/** (utom /admin/login) → kräver admin_token-cookie
Volontär-skyddade: /dashboard, /messages, /incidents/** → kräver volunteer_token-cookie
```

---

## Databas-gotchas

### Foreign key profiles_id_fkey
`profiles.id` hade en FK mot `auth.users`. Denna orsakade problem och har tagits bort:
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
```
`profiles.id` definieras nu som `uuid primary key` utan FK – kan sättas fritt av applikationen.

### pending_assignments och RLS
`pending_assignments` har RLS aktiverat men inga SELECT-policies → enbart `security definer`-
triggern och `createAdminClient()` (service role) når tabellen.

### Trigger handle_new_user
Kvar i databasen men används inte längre för volontärers inloggning. Triggern körs vid insert
i `auth.users`, men vi skapar inte längre auth-användare. Profil + task_assignments skapas
istället i `volunteer-login`-routen. Triggern är wrappas i `EXCEPTION WHEN OTHERS THEN NULL`
och är ofarlig att lämna kvar.

### Supabase Realtime och RLS
`postgres_changes`-events filtreras av RLS om tabellen har policies. Med anon-klienten (ingen
session) når volontärer inte `messages`-events via Realtime. Tasks och incidents har öppnare
policies och fungerar. Meddelandeskrivning sker via `/api/messages` (server-side, adminClient).

---

## E-post (Resend)

- **From-adress** måste vara en verifierad domän i Resend. `noreply@synergyminds.se` är
  verifierad. Byt aldrig till en overifierad adress – mejl studsar tyst.
- **Rate limit:** Resend rate-limitar vid många parallella utskick. Lösning: sekventiell
  sändning med 500ms delay mellan varje mejl i `send-invites`-routen.
- **Inbjudningsmejlet** skickas manuellt av admin och förklarar inloggningsflödet:
  gå till URL, ange e-post, ange koden `VOLUNTEER_CODE`.

---

## Kända problem och lösningar

### Redirect-loop mellan /auth/login och /dashboard
**Problem:** `/auth/login` redirectade automatiskt inloggade användare till `/dashboard` via
`getSession()` (läser localStorage, ingen servervalidering). Om servern ändå inte accepterade
sessionen redirectade `/dashboard` tillbaka → oändlig loop i HTTP-loggarna.

**Lösning:** Ta bort all automatisk redirect från `/auth/login`. Sidan visar alltid formuläret.
Middleware och server components hanterar skyddet ensidigt.

### iOS/Android in-app browser
**Problem:** Gmail och andra appar öppnar länkar i en in-app browser som inte delar cookies
med Safari/Chrome. Magic links och OTP-koder som kräver cookie-sättning fungerade inte.

**Lösning:** Eget inloggningsflöde med statisk kod (inget externt redirect). Inbjudningsmejlet
instruerar användaren att trycka länge på knappen → "Öppna i Safari/Chrome".

### pending_assignments RLS blockerar login-check
**Problem:** RLS på `pending_assignments` utan SELECT-policy → anon-klienten får 0 rader
tillbaka utan felmeddelande, vilket tolkas som "inte registrerad".

**Lösning:** `volunteer-login`-routen använder `createAdminClient()` (service role) för alla
queries. Kontrollera också att `SUPABASE_SERVICE_ROLE_KEY` är satt på Railway.

---

## Miljövariabler

| Variabel | Beskrivning |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (publik) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (hemlig, bara server) |
| `NEXT_PUBLIC_SITE_URL` | Publik bas-URL, t.ex. `https://valborg.app` |
| `SESSION_SECRET` | Hemlig nyckel för JWT-signering (admin + volontär) |
| `VOLUNTEER_CODE` | Inloggningskod för volontärer, t.ex. `112233` |
| `SUPERADMIN_EMAIL` | Admin-inloggnings-e-post |
| `SUPERADMIN_PASSWORD` | Admin-inloggningslösenord |
| `SUPERADMIN_PROFILE_ID` | UUID för superadminens profil-rad i `profiles`-tabellen |
| `RESEND_API_KEY` | Resend API-nyckel |
| `EMAIL_FROM` | Avsändar-adress – måste vara verifierad i Resend, t.ex. `noreply@synergyminds.se` |
