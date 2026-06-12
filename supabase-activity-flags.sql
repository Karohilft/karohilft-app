-- Zusatzfelder für Einsatz-Bestätigung durch Betreuer:
-- Notiz, "Klient nicht angetroffen" (Betreuer wird bezahlt, Klient wird nicht verrechnet)
-- und "Einsatz nicht durchgeführt" (Betreuer wird nicht bezahlt, Klient wird nicht verrechnet)
-- Im Supabase SQL-Editor ausführen.

alter table activities add column if not exists notiz text;
alter table activities add column if not exists client_not_home boolean default false;
alter table activities add column if not exists caregiver_no_show boolean default false;
