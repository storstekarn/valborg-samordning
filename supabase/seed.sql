-- ============================================
-- VALBORG INFRA 2026 – SEED DATA
-- Kör i Supabase SQL Editor
-- ============================================

-- --------------------------------------------
-- 1. PROFILES (volontärer)
-- OBS: Supabase Auth-användare måste skapas separat via
-- admin API eller magic link. Detta skapar profiler
-- som länkas till auth.users via e-post.
-- --------------------------------------------

-- Hjälptabell för att mappa e-post → profil
CREATE TEMP TABLE volunteer_emails (
  name       text,
  email      text,
  phone      text,
  role       text
);

INSERT INTO volunteer_emails (name, email, phone, role) VALUES
  ('Max Ringi',              'max.angervall@gmail.com',          '0707-994085', 'admin'),
  ('Patrik Strandberg',      'patrikstrandberg72@gmail.com',     '0709-852392', 'admin'),
  ('Sebastian Reed',         'sebastianreed@icloud.com',         NULL,          'volunteer'),
  ('Fredrik Juhlin',         'f.c.juhlin@gmail.com',             NULL,          'volunteer'),
  ('Erik P Wikström',        'Erikwikstrom@yahoo.se',            NULL,          'volunteer'),
  ('Alexandra Sewerin',      'p.alexandra.sewerin@gmail.com',    NULL,          'volunteer'),
  ('Petter Thorson',         'Petter@rotakta.se',                '0739-051212', 'volunteer'),
  ('Jonas Nyquist',          'jonas@jonapp.com',                 NULL,          'volunteer'),
  ('Philip Farkas',          'philip.farkas@outlook.com',        NULL,          'volunteer'),
  ('Erik Fornberg',          'famfornberg@outlook.com',          NULL,          'volunteer'),
  ('Niklas Lindholm',        'Lindholm.niklas@icloud.com',       NULL,          'volunteer'),
  ('Harald Söderbäck',       'harald.soderback@gmail.com',       NULL,          'volunteer'),
  ('Elin Söderbäck',         'harald.soderback@gmail.com',       NULL,          'volunteer'),
  ('Anders Westerholm',      'westerholmanders@hotmail.com',     NULL,          'volunteer'),
  ('Oleksandr Sakhno',       'sahno.alexander@gmail.com',        NULL,          'volunteer'),
  ('Patrik Hammarsten',      'patrik.hammarsten@gmail.com',      NULL,          'volunteer'),
  ('Pelle Fransson',         'Pelle.fransson@gmail.com',         NULL,          'volunteer'),
  ('Mikael Kerovirta',       'Mikaelkerovirta@gmail.com',        NULL,          'volunteer'),
  ('Andreas Tuvesson',       'tuvesson.andreas@gmail.com',       NULL,          'volunteer'),
  ('Cecilia Fararos',        'cecilia_fagerlund@yahoo.se',       NULL,          'volunteer'),
  ('Vahid Fararos',          'vahid.fararos@gmail.com',          NULL,          'volunteer'),
  ('Christophe Rémy',        'Remychris@gmail.com',              NULL,          'volunteer'),
  ('Elin Lillerud',          'elin.lillerud@gmail.com',          NULL,          'volunteer'),
  ('Robert Lillerud',        'robert.lillerud@gmail.com',        '7355206948',  'volunteer'),
  ('Rebecka Frej',           'rebecka.frej@me.com',              NULL,          'volunteer'),
  ('Fabian Ekenstam',        'fabian.ekenstam@gmail.com',        NULL,          'volunteer'),
  ('Sabrina Gunnarsson',     'sabrina.gunnarsson@gmail.com',     NULL,          'volunteer'),
  ('Dan Gunnarsson',         'dan.gunnarsson@gmail.com',         NULL,          'volunteer'),
  ('Lemon L',                'miao1416li@gmail.com',             NULL,          'volunteer'),
  ('Jon Öhman',              'jonohman@gmail.com',               NULL,          'volunteer'),
  ('Michaela Hellström',     'michaela_hellstrom@yahoo.se',      NULL,          'volunteer');

-- Infoga i profiles (matchar mot auth.users via email)
INSERT INTO profiles (id, name, email, phone, role)
SELECT
  gen_random_uuid(),
  v.name,
  lower(v.email),
  v.phone,
  v.role
FROM volunteer_emails v
ON CONFLICT (email) DO UPDATE
  SET name  = EXCLUDED.name,
      phone = EXCLUDED.phone,
      role  = EXCLUDED.role;

DROP TABLE volunteer_emails;


-- --------------------------------------------
-- 2. TASKS (körschema)
-- --------------------------------------------

TRUNCATE tasks CASCADE;

INSERT INTO tasks (id, title, area, description, event_date, start_time, end_time, status) VALUES
-- FÖRE VALBORG
  (gen_random_uuid(), 'Sätta upp formulär + QR',   'Ris',      'Skapa Google/Microsoft Form för risinsamling + QR-kod', 'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Planera rutter',             'Ris',      'Planera upphämtning av ris baserat på inkommande bokningar', 'fore', NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Kontakta elfirma',           'El',       'Säkra behörig elektriker för anslutning',               'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Ellevio anmälan',            'El',       'Göra anmälan för elanslutning',                         'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Hämta brandpostnyckel',      'Brand',    'Hämta nyckel + brandposthuvud från Högdalen',           'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Säkerställa tält',           'Tält',     'Samla tält från förråd, spons och privata',             'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Säkerställa släp',           'Logistik', 'Organisera släp och bilar',                             'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Risinsamling team 1',        'Ris',      'Hämta ris hos boende (bil + släp)',                     'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Risinsamling team 2',        'Ris',      'Hämta ris hos boende (bil + släp)',                     'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Risinsamling team 3',        'Ris',      'Hämta ris hos boende',                                  'fore',    NULL,    NULL,    'ej_startad'),

-- VALBORG – dagtid
  (gen_random_uuid(), 'Driftledning',               'Drift',    'Övervaka hela eventet',                                 'valborg', '08:00', NULL,    'ej_startad'),
  (gen_random_uuid(), 'Hämta material',             'Logistik', 'Hämta bord, stolar, bänkar från förrådet/Enskede trädgårdsförening', 'valborg', '08:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Hämta belysning',            'El',       'Hämta lampor och kablar från förrådet',                'valborg', '09:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Hämta släckningsutrustning', 'Eld/Vatten','Hämta hinkar mm från förrådet',                       'valborg', '09:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Sätta upp tält',             'Tält',     'Montera tält och stationer, montera ner fotbollsmål',   'valborg', '09:00', '11:00', 'ej_startad'),
  (gen_random_uuid(), 'Öppna brandpost',            'Eld/Vatten','Koppla slang och vattna område',                      'valborg', '09:00', '11:00', 'ej_startad'),
  (gen_random_uuid(), 'Ta emot ris och bygga eld',  'Eld/Vatten','Ta emot ris vid ängen, bygga rishög',                 'valborg', '09:00', '13:00', 'ej_startad'),
  (gen_random_uuid(), 'Risinsamling bil 1',         'Ris',      'Hämta ris hos de som föranmält (bil 1 med släp)',       'valborg', '09:00', '14:00', 'ej_startad'),
  (gen_random_uuid(), 'Risinsamling bil 2',         'Ris',      'Hämta ris hos de som föranmält (bil 2 med släp)',       'valborg', '09:00', '14:00', 'ej_startad'),
  (gen_random_uuid(), 'Risinsamling bil 3',         'Ris',      'Hämta ris hos de som föranmält (bil 3 med släp)',       'valborg', '09:00', '14:00', 'ej_startad'),
  (gen_random_uuid(), 'Avspärrning runt eld',       'Eld/Vatten','Avspärrning runt eld och för fackeltågets infart',    'valborg', '11:00', '13:00', 'ej_startad'),
  (gen_random_uuid(), 'Avspärrning Livlandsgatan',  'Eld/Vatten','Avspärrning vid infart Livlandsgatan och brandpost',  'valborg', '11:00', '13:00', 'ej_startad'),
  (gen_random_uuid(), 'Elinstallation',             'El',       'Installera och testa el',                               'valborg', '15:00', '17:00', 'ej_startad'),
  (gen_random_uuid(), 'Bevaka avspärrning 13-15',   'Eld/Vatten','Bevaka avspärrning, säkerställ att inget mer ris läggs på', 'valborg', '13:00', '15:00', 'ej_startad'),
  (gen_random_uuid(), 'Bevaka avspärrning 15-16:30','Eld/Vatten','Bevaka avspärrning, säkerställ att inget mer ris läggs på', 'valborg', '15:00', '16:30', 'ej_startad'),
  (gen_random_uuid(), 'Bevaka avspärrning 16:30-18','Eld/Vatten','Bevaka avspärrning, säkerställ att inget mer ris läggs på', 'valborg', '16:30', '18:00', 'ej_startad'),

-- VALBORG – kväll/natt
  (gen_random_uuid(), 'Fyll vattenhinkar',          'Fackeltåg','Fyll och placera ut 15 st vattenhinkar längs vägen',   'valborg', '18:00', '19:00', 'ej_startad'),
  (gen_random_uuid(), 'Risvakt innan fackeltåg',    'Eld/Vatten','Risvakt innan fackeltåg',                             'valborg', '18:00', '19:15', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 1-2',   'Fackeltåg','Fackeltågsvakt, eldvakt kring avspärrning 1-2',        'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 3-4',   'Fackeltåg','Fackeltågsvakt, eldvakt kring avspärrning 3-4',        'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 5-6',   'Fackeltåg','Fackeltågsvakt, eldvakt kring avspärrning 5-6',        'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 7-8',   'Fackeltåg','Fackeltågsvakt, eldvakt kring avspärrning 7-8',        'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 9-10',  'Fackeltåg','Fackeltågsvakt, eldvakt kring avspärrning 9-10',       'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Tända brasa',                'Eld/Vatten','Tända elden säkert',                                  'valborg', '19:00', '19:15', 'ej_startad'),
  (gen_random_uuid(), 'Riva avspärrning',           'Logistik', 'Ta bort avspärrningar',                                'valborg', '20:15', '20:30', 'ej_startad'),
  (gen_random_uuid(), 'Eldvakt 20-22',              'Eld/Vatten','Övervaka eld efter tändning',                         'valborg', '20:00', '22:00', 'ej_startad'),
  (gen_random_uuid(), 'Riva tält',                  'Tält',     'Demontera tält',                                        'valborg', '21:30', '23:00', 'ej_startad'),
  (gen_random_uuid(), 'Samla material',             'Logistik', 'Packa och samla utrustning',                            'valborg', '21:30', '23:00', 'ej_startad'),
  (gen_random_uuid(), 'Montera ner elkablage',      'El',       'Montera ner elkablage',                                 'valborg', '22:00', '23:00', 'ej_startad'),
  (gen_random_uuid(), 'Eldvakt - släcka elden',     'Eld/Vatten','Övervaka och släcka elden',                           'valborg', '22:00', '24:00', 'ej_startad'),
  (gen_random_uuid(), 'Städning',                   'Logistik', 'Städning av området',                                   'valborg', '22:00', '24:00', 'ej_startad'),

-- 1 MAJ
  (gen_random_uuid(), 'Transport skräp',            'Logistik', 'Forsla bort soporna till ÅVC Östberga (öppet 9-17), bil med släp', '1maj', '09:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Återställa förråd',          'Logistik', 'Köra inventarier till nytt förråd (TBD)',               '1maj',    '10:00', '11:00', 'ej_startad');


-- --------------------------------------------
-- 3. TASK_ASSIGNMENTS (vem gör vad)
-- Använder en hjälpfunktion för att slå upp profil-ID via e-post
-- --------------------------------------------

CREATE OR REPLACE FUNCTION assign(task_title text, vol_email text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  t_id uuid;
  p_id uuid;
BEGIN
  SELECT id INTO t_id FROM tasks WHERE title = task_title LIMIT 1;
  SELECT id INTO p_id FROM profiles WHERE lower(email) = lower(vol_email);
  IF t_id IS NOT NULL AND p_id IS NOT NULL THEN
    INSERT INTO task_assignments (task_id, profile_id)
    VALUES (t_id, p_id)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- Driftledning
SELECT assign('Driftledning', 'max.angervall@gmail.com');
SELECT assign('Driftledning', 'patrikstrandberg72@gmail.com');

-- Hämta material (tält, bord, stolar)
SELECT assign('Hämta material', 'Erikwikstrom@yahoo.se');
SELECT assign('Hämta material', 'Petter@rotakta.se');
SELECT assign('Hämta material', 'harold.soderback@gmail.com');
SELECT assign('Hämta material', 'f.c.juhlin@gmail.com');
SELECT assign('Hämta material', 'sebastianreed@icloud.com');
SELECT assign('Hämta material', 'famfornberg@outlook.com');

-- Hämta belysning
SELECT assign('Hämta belysning', 'Pelle.fransson@gmail.com');
SELECT assign('Hämta belysning', 'Remychris@gmail.com');

-- Hämta släckningsutrustning
SELECT assign('Hämta släckningsutrustning', 'patrik.hammarsten@gmail.com');
SELECT assign('Hämta släckningsutrustning', 'tuvesson.andreas@gmail.com');

-- Sätta upp tält
SELECT assign('Sätta upp tält', 'sebastianreed@icloud.com');
SELECT assign('Sätta upp tält', 'f.c.juhlin@gmail.com');
SELECT assign('Sätta upp tält', 'Lindholm.niklas@icloud.com');
SELECT assign('Sätta upp tält', 'cecilia_fagerlund@yahoo.se');
SELECT assign('Sätta upp tält', 'vahid.fararos@gmail.com');
SELECT assign('Sätta upp tält', 'harold.soderback@gmail.com');
SELECT assign('Sätta upp tält', 'elin.lillerud@gmail.com'); -- Elin Söderbäck i schemat

-- Öppna brandpost
SELECT assign('Öppna brandpost', 'max.angervall@gmail.com');
SELECT assign('Öppna brandpost', 'patrikstrandberg72@gmail.com');
SELECT assign('Öppna brandpost', 'Mikaelkerovirta@gmail.com');
SELECT assign('Öppna brandpost', 'robert.lillerud@gmail.com');

-- Ta emot ris och bygga eld
SELECT assign('Ta emot ris och bygga eld', 'Mikaelkerovirta@gmail.com');
SELECT assign('Ta emot ris och bygga eld', 'westerholmanders@hotmail.com');
SELECT assign('Ta emot ris och bygga eld', 'famfornberg@outlook.com');
SELECT assign('Ta emot ris och bygga eld', 'elin.lillerud@gmail.com');

-- Risinsamling bilar
SELECT assign('Risinsamling bil 1', 'famfornberg@outlook.com');
SELECT assign('Risinsamling bil 1', 'elin.lillerud@gmail.com');
SELECT assign('Risinsamling bil 2', 'harold.soderback@gmail.com');
SELECT assign('Risinsamling bil 3', 'Petter@rotakta.se');
SELECT assign('Risinsamling bil 3', 'jonas@jonapp.com');

-- Avspärrning
SELECT assign('Avspärrning runt eld', 'rebecka.frej@me.com');
SELECT assign('Avspärrning runt eld', 'fabian.ekenstam@gmail.com');
SELECT assign('Avspärrning Livlandsgatan', 'jonohman@gmail.com');
SELECT assign('Avspärrning Livlandsgatan', 'Pelle.fransson@gmail.com');

-- Elinstallation
SELECT assign('Elinstallation', 'max.angervall@gmail.com');
SELECT assign('Elinstallation', 'robert.lillerud@gmail.com');
SELECT assign('Elinstallation', 'patrikstrandberg72@gmail.com');

-- Bevaka avspärrning
SELECT assign('Bevaka avspärrning 13-15', 'sabrina.gunnarsson@gmail.com');
SELECT assign('Bevaka avspärrning 13-15', 'dan.gunnarsson@gmail.com');
SELECT assign('Bevaka avspärrning 15-16:30', 'philip.farkas@outlook.com');
SELECT assign('Bevaka avspärrning 15-16:30', 'michaela_hellstrom@yahoo.se');
SELECT assign('Bevaka avspärrning 16:30-18', 'miao1416li@gmail.com');
SELECT assign('Bevaka avspärrning 16:30-18', 'Pelle.fransson@gmail.com');

-- Fyll vattenhinkar
SELECT assign('Fyll vattenhinkar', 'patrik.hammarsten@gmail.com');
SELECT assign('Fyll vattenhinkar', 'tuvesson.andreas@gmail.com');

-- Risvakt
SELECT assign('Risvakt innan fackeltåg', 'Mikaelkerovirta@gmail.com');
SELECT assign('Risvakt innan fackeltåg', 'westerholmanders@hotmail.com');

-- Fackeltågsvakter
SELECT assign('Fackeltågsvakter pos 1-2', 'p.alexandra.sewerin@gmail.com');
SELECT assign('Fackeltågsvakter pos 1-2', 'Lindholm.niklas@icloud.com');
SELECT assign('Fackeltågsvakter pos 3-4', 'philip.farkas@outlook.com');
SELECT assign('Fackeltågsvakter pos 3-4', 'dan.gunnarsson@gmail.com');
SELECT assign('Fackeltågsvakter pos 5-6', 'Pelle.fransson@gmail.com');
SELECT assign('Fackeltågsvakter pos 7-8', 'rebecka.frej@me.com');
SELECT assign('Fackeltågsvakter pos 7-8', 'fabian.ekenstam@gmail.com');
SELECT assign('Fackeltågsvakter pos 9-10', 'patrik.hammarsten@gmail.com');
SELECT assign('Fackeltågsvakter pos 9-10', 'tuvesson.andreas@gmail.com');

-- Tända brasa
SELECT assign('Tända brasa', 'Mikaelkerovirta@gmail.com');
SELECT assign('Tända brasa', 'westerholmanders@hotmail.com');

-- Riva avspärrning
SELECT assign('Riva avspärrning', 'rebecka.frej@me.com');
SELECT assign('Riva avspärrning', 'fabian.ekenstam@gmail.com');

-- Eldvakt 20-22
SELECT assign('Eldvakt 20-22', 'Mikaelkerovirta@gmail.com');
SELECT assign('Eldvakt 20-22', 'westerholmanders@hotmail.com');
SELECT assign('Eldvakt 20-22', 'philip.farkas@outlook.com');

-- Riva tält
SELECT assign('Riva tält', 'sebastianreed@icloud.com');
SELECT assign('Riva tält', 'f.c.juhlin@gmail.com');
SELECT assign('Riva tält', 'Lindholm.niklas@icloud.com');
SELECT assign('Riva tält', 'sahno.alexander@gmail.com');
SELECT assign('Riva tält', 'cecilia_fagerlund@yahoo.se');
SELECT assign('Riva tält', 'vahid.fararos@gmail.com');
SELECT assign('Riva tält', 'harold.soderback@gmail.com');

-- Samla material
SELECT assign('Samla material', 'jonas@jonapp.com');
SELECT assign('Samla material', 'Pelle.fransson@gmail.com');
SELECT assign('Samla material', 'Remychris@gmail.com');

-- Montera ner elkablage
SELECT assign('Montera ner elkablage', 'max.angervall@gmail.com');
SELECT assign('Montera ner elkablage', 'robert.lillerud@gmail.com');
SELECT assign('Montera ner elkablage', 'sahno.alexander@gmail.com');

-- Eldvakt - släcka elden
SELECT assign('Eldvakt - släcka elden', 'Mikaelkerovirta@gmail.com');
SELECT assign('Eldvakt - släcka elden', 'michaela_hellstrom@yahoo.se');
SELECT assign('Eldvakt - släcka elden', 'patrikstrandberg72@gmail.com');

-- Städning
SELECT assign('Städning', 'jonas@jonapp.com');
SELECT assign('Städning', 'Pelle.fransson@gmail.com');
SELECT assign('Städning', 'Remychris@gmail.com');
SELECT assign('Städning', 'rebecka.frej@me.com');
SELECT assign('Städning', 'fabian.ekenstam@gmail.com');
SELECT assign('Städning', 'sabrina.gunnarsson@gmail.com');
SELECT assign('Städning', 'dan.gunnarsson@gmail.com');
SELECT assign('Städning', 'miao1416li@gmail.com');

-- 1 maj
SELECT assign('Transport skräp', 'jonas@jonapp.com');
SELECT assign('Transport skräp', 'Erikwikstrom@yahoo.se');
SELECT assign('Återställa förråd', 'max.angervall@gmail.com');
SELECT assign('Återställa förråd', 'robert.lillerud@gmail.com');
SELECT assign('Återställa förråd', 'patrikstrandberg72@gmail.com');
SELECT assign('Återställa förråd', 'Petter@rotakta.se');

-- Städa upp hjälpfunktion
DROP FUNCTION assign;
