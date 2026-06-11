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
  created_at timestamptz default now()
);

alter table schedule enable row level security;

create policy "Authenticated read schedule" on schedule
  for select using (auth.role() = 'authenticated');

create policy "Authenticated write schedule" on schedule
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
