-- Markiert stornierte Einsätze, damit sie in der Admin-Übersicht auffallen.
-- Im Supabase SQL-Editor ausführen.

alter table schedule add column if not exists cancelled_by text;
alter table schedule add column if not exists cancelled_at timestamptz;
