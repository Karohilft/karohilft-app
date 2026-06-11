-- Einsatzplanung: Zuteilung von Betreuern zu Klienten (Termine/Vorausplanung)
-- Im Supabase SQL-Editor ausführen.

CREATE TABLE IF NOT EXISTS schedule (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid references caregivers(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  datum date not null,
  zeit_von time not null,
  zeit_bis time not null,
  ort text,
  series_id uuid,
  created_at timestamptz default now()
);

-- Falls die Tabelle schon vorher (ohne series_id) existierte:
ALTER TABLE schedule ADD COLUMN IF NOT EXISTS series_id uuid;

-- Abwesenheit eines Betreuers (z.B. Urlaub, Krankheit) – wird bei der Einsatzplanung ausgeblendet
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS absent boolean DEFAULT false;

alter table schedule enable row level security;

drop policy if exists "Authenticated read schedule" on schedule;
create policy "Authenticated read schedule" on schedule
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated write schedule" on schedule;
create policy "Authenticated write schedule" on schedule
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Feste, dauerhafte Wiederholungen (z.B. Mo-Do 9-10 Uhr, ohne Enddatum, bis manuell beendet)
CREATE TABLE IF NOT EXISTS schedule_rules (
  id uuid primary key default gen_random_uuid(),
  caregiver_id uuid references caregivers(id) on delete cascade,
  client_id uuid references clients(id) on delete cascade,
  weekdays int[] not null,
  zeit_von time not null,
  zeit_bis time not null,
  ort text,
  start_date date not null,
  created_at timestamptz default now()
);

alter table schedule_rules enable row level security;

drop policy if exists "Authenticated read schedule_rules" on schedule_rules;
create policy "Authenticated read schedule_rules" on schedule_rules
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated write schedule_rules" on schedule_rules;
create policy "Authenticated write schedule_rules" on schedule_rules
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
