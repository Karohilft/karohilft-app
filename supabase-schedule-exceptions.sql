-- Tabelle für stornierte Einzeltermine aus wiederkehrenden Regeln (schedule_rules).
-- Verhindert, dass ein storniertes Datum weiterhin aus der Regel generiert wird.
-- Im Supabase SQL-Editor ausführen.

create table if not exists schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references schedule_rules(id) on delete cascade,
  datum date not null,
  created_at timestamptz default now(),
  unique (rule_id, datum)
);

alter table schedule_exceptions enable row level security;

drop policy if exists "Authenticated read schedule_exceptions" on schedule_exceptions;
create policy "Authenticated read schedule_exceptions" on schedule_exceptions
  for select using (auth.role() = 'authenticated');

drop policy if exists "Authenticated write schedule_exceptions" on schedule_exceptions;
create policy "Authenticated write schedule_exceptions" on schedule_exceptions
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
