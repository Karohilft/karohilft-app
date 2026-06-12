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
