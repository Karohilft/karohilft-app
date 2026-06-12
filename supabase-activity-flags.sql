-- Zusatzfelder für Einsatz-Bestätigung durch Betreuer:
-- Notiz und "Einsatz nicht durchgeführt" (Betreuer wird nicht bezahlt, Klient wird nicht verrechnet)
-- Im Supabase SQL-Editor ausführen.

alter table activities add column if not exists notiz text;
alter table activities add column if not exists caregiver_no_show boolean default false;
alter table activities drop column if exists client_not_home;
