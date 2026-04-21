-- ============================================================
-- VALBORG INFRA 2026 – SEED DATA
-- Kör i Supabase SQL Editor efter att 001_init.sql körts
-- ============================================================
-- Profiler skapas INTE här. De skapas automatiskt av triggern
-- handle_new_user() när en användare loggar in via magic link.
-- Triggern läser pending_assignments och skapar task_assignments
-- direkt vid inloggning – inget manuellt steg behövs.
-- ============================================================


-- --------------------------------------------
-- 1. TASKS (körschema)
-- --------------------------------------------

TRUNCATE tasks CASCADE;  -- rensar även task_assignments

INSERT INTO tasks (id, title, area, description, event_date, start_time, end_time, status) VALUES
-- FÖRE VALBORG
  (gen_random_uuid(), 'Sätta upp formulär + QR',   'Ris',       'Skapa Google/Microsoft Form för risinsamling + QR-kod',             'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Planera rutter',             'Ris',       'Planera upphämtning av ris baserat på inkommande bokningar',        'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Kontakta elfirma',           'El',        'Säkra behörig elektriker för anslutning',                          'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Ellevio anmälan',            'El',        'Göra anmälan för elanslutning',                                    'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Hämta brandpostnyckel',      'Brand',     'Hämta nyckel + brandposthuvud från Högdalen',                      'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Säkerställa tält',           'Tält',      'Samla tält från förråd, spons och privata',                        'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Säkerställa släp',           'Logistik',  'Organisera släp och bilar',                                        'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Risinsamling team 1',        'Ris',       'Hämta ris hos boende (bil + släp)',                                'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Risinsamling team 2',        'Ris',       'Hämta ris hos boende (bil + släp)',                                'fore',    NULL,    NULL,    'ej_startad'),
  (gen_random_uuid(), 'Risinsamling team 3',        'Ris',       'Hämta ris hos boende',                                            'fore',    NULL,    NULL,    'ej_startad'),

-- VALBORG – dagtid
  (gen_random_uuid(), 'Driftledning',               'Drift',     'Övervaka hela eventet',                                            'valborg', '08:00', NULL,    'ej_startad'),
  (gen_random_uuid(), 'Hämta material',             'Logistik',  'Hämta bord, stolar, bänkar från förrådet/Enskede trädgårdsförening','valborg', '08:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Hämta belysning',            'El',        'Hämta lampor och kablar från förrådet',                           'valborg', '09:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Hämta släckningsutrustning', 'Eld/Vatten','Hämta hinkar mm från förrådet',                                   'valborg', '09:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Sätta upp tält',             'Tält',      'Montera tält och stationer, montera ner fotbollsmål',              'valborg', '09:00', '11:00', 'ej_startad'),
  (gen_random_uuid(), 'Öppna brandpost',            'Eld/Vatten','Koppla slang och vattna område',                                  'valborg', '09:00', '11:00', 'ej_startad'),
  (gen_random_uuid(), 'Ta emot ris och bygga eld',  'Eld/Vatten','Ta emot ris vid ängen, bygga rishög',                             'valborg', '09:00', '13:00', 'ej_startad'),
  (gen_random_uuid(), 'Risinsamling bil 1',         'Ris',       'Hämta ris hos de som föranmält (bil 1 med släp)',                  'valborg', '09:00', '14:00', 'ej_startad'),
  (gen_random_uuid(), 'Risinsamling bil 2',         'Ris',       'Hämta ris hos de som föranmält (bil 2 med släp)',                  'valborg', '09:00', '14:00', 'ej_startad'),
  (gen_random_uuid(), 'Risinsamling bil 3',         'Ris',       'Hämta ris hos de som föranmält (bil 3 med släp)',                  'valborg', '09:00', '14:00', 'ej_startad'),
  (gen_random_uuid(), 'Avspärrning runt eld',       'Eld/Vatten','Avspärrning runt eld och för fackeltågets infart',                'valborg', '11:00', '13:00', 'ej_startad'),
  (gen_random_uuid(), 'Avspärrning Livlandsgatan',  'Eld/Vatten','Avspärrning vid infart Livlandsgatan och brandpost',              'valborg', '11:00', '13:00', 'ej_startad'),
  (gen_random_uuid(), 'Elinstallation',             'El',        'Installera och testa el',                                         'valborg', '15:00', '17:00', 'ej_startad'),
  (gen_random_uuid(), 'Bevaka avspärrning 13-15',   'Eld/Vatten','Bevaka avspärrning, säkerställ att inget mer ris läggs på',       'valborg', '13:00', '15:00', 'ej_startad'),
  (gen_random_uuid(), 'Bevaka avspärrning 15-16:30','Eld/Vatten','Bevaka avspärrning, säkerställ att inget mer ris läggs på',       'valborg', '15:00', '16:30', 'ej_startad'),
  (gen_random_uuid(), 'Bevaka avspärrning 16:30-18','Eld/Vatten','Bevaka avspärrning, säkerställ att inget mer ris läggs på',       'valborg', '16:30', '18:00', 'ej_startad'),

-- VALBORG – kväll/natt
  (gen_random_uuid(), 'Fyll vattenhinkar',          'Fackeltåg', 'Fyll och placera ut 15 st vattenhinkar längs vägen',              'valborg', '18:00', '19:00', 'ej_startad'),
  (gen_random_uuid(), 'Risvakt innan fackeltåg',    'Eld/Vatten','Risvakt innan fackeltåg',                                         'valborg', '18:00', '19:15', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 1-2',   'Fackeltåg', 'Fackeltågsvakt, eldvakt kring avspärrning 1-2',                   'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 3-4',   'Fackeltåg', 'Fackeltågsvakt, eldvakt kring avspärrning 3-4',                   'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 5-6',   'Fackeltåg', 'Fackeltågsvakt, eldvakt kring avspärrning 5-6',                   'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 7-8',   'Fackeltåg', 'Fackeltågsvakt, eldvakt kring avspärrning 7-8',                   'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Fackeltågsvakter pos 9-10',  'Fackeltåg', 'Fackeltågsvakt, eldvakt kring avspärrning 9-10',                  'valborg', '19:00', '20:00', 'ej_startad'),
  (gen_random_uuid(), 'Tända brasa',                'Eld/Vatten','Tända elden säkert',                                              'valborg', '19:00', '19:15', 'ej_startad'),
  (gen_random_uuid(), 'Riva avspärrning',           'Logistik',  'Ta bort avspärrningar',                                           'valborg', '20:15', '20:30', 'ej_startad'),
  (gen_random_uuid(), 'Eldvakt 20-22',              'Eld/Vatten','Övervaka eld efter tändning',                                     'valborg', '20:00', '22:00', 'ej_startad'),
  (gen_random_uuid(), 'Riva tält',                  'Tält',      'Demontera tält',                                                  'valborg', '21:30', '23:00', 'ej_startad'),
  (gen_random_uuid(), 'Samla material',             'Logistik',  'Packa och samla utrustning',                                      'valborg', '21:30', '23:00', 'ej_startad'),
  (gen_random_uuid(), 'Montera ner elkablage',      'El',        'Montera ner elkablage',                                           'valborg', '22:00', '23:00', 'ej_startad'),
  (gen_random_uuid(), 'Eldvakt - släcka elden',     'Eld/Vatten','Övervaka och släcka elden',                                       'valborg', '22:00', '24:00', 'ej_startad'),
  (gen_random_uuid(), 'Städning',                   'Logistik',  'Städning av området',                                             'valborg', '22:00', '24:00', 'ej_startad'),

-- 1 MAJ
  (gen_random_uuid(), 'Transport skräp',            'Logistik',  'Forsla bort soporna till ÅVC Östberga (öppet 9-17), bil med släp', '1maj',   '09:00', '10:00', 'ej_startad'),
  (gen_random_uuid(), 'Återställa förråd',          'Logistik',  'Köra inventarier till nytt förråd (TBD)',                         '1maj',    '10:00', '11:00', 'ej_startad');


-- --------------------------------------------
-- 2. PENDING ASSIGNMENTS
--
-- Mappning e-post → uppgiftstitel.
-- Läses av triggern handle_new_user() vid inloggning:
-- task_assignments skapas automatiskt utan manuellt steg.
-- Tabellen lämnas kvar i databasen.
-- --------------------------------------------

TRUNCATE pending_assignments;

INSERT INTO pending_assignments (email, task_title) VALUES
  -- Driftledning
  ('max.angervall@gmail.com',       'Driftledning'),
  ('patrikstrandberg72@gmail.com',  'Driftledning'),

  -- Hämta material
  ('erikwikstrom@yahoo.se',         'Hämta material'),
  ('petter@rotakta.se',             'Hämta material'),
  ('harald.soderback@gmail.com',    'Hämta material'),
  ('f.c.juhlin@gmail.com',          'Hämta material'),
  ('sebastianreed@icloud.com',      'Hämta material'),
  ('famfornberg@outlook.com',       'Hämta material'),

  -- Hämta belysning
  ('pelle.fransson@gmail.com',      'Hämta belysning'),
  ('remychris@gmail.com',           'Hämta belysning'),

  -- Hämta släckningsutrustning
  ('patrik.hammarsten@gmail.com',   'Hämta släckningsutrustning'),
  ('tuvesson.andreas@gmail.com',    'Hämta släckningsutrustning'),

  -- Sätta upp tält
  ('sebastianreed@icloud.com',      'Sätta upp tält'),
  ('f.c.juhlin@gmail.com',          'Sätta upp tält'),
  ('lindholm.niklas@icloud.com',    'Sätta upp tält'),
  ('cecilia_fagerlund@yahoo.se',    'Sätta upp tält'),
  ('vahid.fararos@gmail.com',       'Sätta upp tält'),
  ('harald.soderback@gmail.com',    'Sätta upp tält'),  -- Harald/Elin Söderbäck (delad e-post)

  -- Öppna brandpost
  ('max.angervall@gmail.com',       'Öppna brandpost'),
  ('patrikstrandberg72@gmail.com',  'Öppna brandpost'),
  ('mikaelkerovirta@gmail.com',     'Öppna brandpost'),
  ('robert.lillerud@gmail.com',     'Öppna brandpost'),

  -- Ta emot ris och bygga eld
  ('mikaelkerovirta@gmail.com',     'Ta emot ris och bygga eld'),
  ('westerholmanders@hotmail.com',  'Ta emot ris och bygga eld'),
  ('famfornberg@outlook.com',       'Ta emot ris och bygga eld'),
  ('elin.lillerud@gmail.com',       'Ta emot ris och bygga eld'),

  -- Risinsamling bilar
  ('famfornberg@outlook.com',       'Risinsamling bil 1'),
  ('elin.lillerud@gmail.com',       'Risinsamling bil 1'),
  ('harald.soderback@gmail.com',    'Risinsamling bil 2'),
  ('petter@rotakta.se',             'Risinsamling bil 3'),
  ('jonas@jonapp.com',              'Risinsamling bil 3'),

  -- Avspärrning
  ('rebecka.frej@me.com',           'Avspärrning runt eld'),
  ('fabian.ekenstam@gmail.com',     'Avspärrning runt eld'),
  ('jonohman@gmail.com',            'Avspärrning Livlandsgatan'),
  ('pelle.fransson@gmail.com',      'Avspärrning Livlandsgatan'),

  -- Elinstallation
  ('max.angervall@gmail.com',       'Elinstallation'),
  ('robert.lillerud@gmail.com',     'Elinstallation'),
  ('patrikstrandberg72@gmail.com',  'Elinstallation'),

  -- Bevaka avspärrning
  ('sabrina.gunnarsson@gmail.com',  'Bevaka avspärrning 13-15'),
  ('dan.gunnarsson@gmail.com',      'Bevaka avspärrning 13-15'),
  ('philip.farkas@outlook.com',     'Bevaka avspärrning 15-16:30'),
  ('michaela_hellstrom@yahoo.se',   'Bevaka avspärrning 15-16:30'),
  ('miao1416li@gmail.com',          'Bevaka avspärrning 16:30-18'),
  ('pelle.fransson@gmail.com',      'Bevaka avspärrning 16:30-18'),

  -- Fyll vattenhinkar
  ('patrik.hammarsten@gmail.com',   'Fyll vattenhinkar'),
  ('tuvesson.andreas@gmail.com',    'Fyll vattenhinkar'),

  -- Risvakt
  ('mikaelkerovirta@gmail.com',     'Risvakt innan fackeltåg'),
  ('westerholmanders@hotmail.com',  'Risvakt innan fackeltåg'),

  -- Fackeltågsvakter
  ('p.alexandra.sewerin@gmail.com', 'Fackeltågsvakter pos 1-2'),
  ('lindholm.niklas@icloud.com',    'Fackeltågsvakter pos 1-2'),
  ('philip.farkas@outlook.com',     'Fackeltågsvakter pos 3-4'),
  ('dan.gunnarsson@gmail.com',      'Fackeltågsvakter pos 3-4'),
  ('pelle.fransson@gmail.com',      'Fackeltågsvakter pos 5-6'),
  ('rebecka.frej@me.com',           'Fackeltågsvakter pos 7-8'),
  ('fabian.ekenstam@gmail.com',     'Fackeltågsvakter pos 7-8'),
  ('patrik.hammarsten@gmail.com',   'Fackeltågsvakter pos 9-10'),
  ('tuvesson.andreas@gmail.com',    'Fackeltågsvakter pos 9-10'),

  -- Tända brasa
  ('mikaelkerovirta@gmail.com',     'Tända brasa'),
  ('westerholmanders@hotmail.com',  'Tända brasa'),

  -- Riva avspärrning
  ('rebecka.frej@me.com',           'Riva avspärrning'),
  ('fabian.ekenstam@gmail.com',     'Riva avspärrning'),

  -- Eldvakt 20-22
  ('mikaelkerovirta@gmail.com',     'Eldvakt 20-22'),
  ('westerholmanders@hotmail.com',  'Eldvakt 20-22'),
  ('philip.farkas@outlook.com',     'Eldvakt 20-22'),

  -- Riva tält
  ('sebastianreed@icloud.com',      'Riva tält'),
  ('f.c.juhlin@gmail.com',          'Riva tält'),
  ('lindholm.niklas@icloud.com',    'Riva tält'),
  ('sahno.alexander@gmail.com',     'Riva tält'),
  ('cecilia_fagerlund@yahoo.se',    'Riva tält'),
  ('vahid.fararos@gmail.com',       'Riva tält'),
  ('harald.soderback@gmail.com',    'Riva tält'),

  -- Samla material
  ('jonas@jonapp.com',              'Samla material'),
  ('pelle.fransson@gmail.com',      'Samla material'),
  ('remychris@gmail.com',           'Samla material'),

  -- Montera ner elkablage
  ('max.angervall@gmail.com',       'Montera ner elkablage'),
  ('robert.lillerud@gmail.com',     'Montera ner elkablage'),
  ('sahno.alexander@gmail.com',     'Montera ner elkablage'),

  -- Eldvakt - släcka elden
  ('mikaelkerovirta@gmail.com',     'Eldvakt - släcka elden'),
  ('michaela_hellstrom@yahoo.se',   'Eldvakt - släcka elden'),
  ('patrikstrandberg72@gmail.com',  'Eldvakt - släcka elden'),

  -- Städning
  ('jonas@jonapp.com',              'Städning'),
  ('pelle.fransson@gmail.com',      'Städning'),
  ('remychris@gmail.com',           'Städning'),
  ('rebecka.frej@me.com',           'Städning'),
  ('fabian.ekenstam@gmail.com',     'Städning'),
  ('sabrina.gunnarsson@gmail.com',  'Städning'),
  ('dan.gunnarsson@gmail.com',      'Städning'),
  ('miao1416li@gmail.com',          'Städning'),

  -- 1 maj
  ('jonas@jonapp.com',              'Transport skräp'),
  ('erikwikstrom@yahoo.se',         'Transport skräp'),
  ('max.angervall@gmail.com',       'Återställa förråd'),
  ('robert.lillerud@gmail.com',     'Återställa förråd'),
  ('patrikstrandberg72@gmail.com',  'Återställa förråd'),
  ('petter@rotakta.se',             'Återställa förråd');
