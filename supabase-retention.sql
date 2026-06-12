-- Datenaufzeichnung/Arbeitsnachweise (activities) müssen erhalten bleiben,
-- auch wenn der Betreuer oder Klient später gelöscht wird.
-- Im Supabase SQL-Editor ausführen.

-- Namen zum Zeitpunkt der Erfassung als Snapshot speichern
alter table activities add column if not exists caregiver_name text;
alter table activities add column if not exists client_name text;

-- bestehende Einträge einmalig mit aktuellen Namen befüllen
update activities a set caregiver_name = c.name from caregivers c where a.caregiver_id = c.id and a.caregiver_name is null;
update activities a set client_name = c.name from clients c where a.client_id = c.id and a.client_name is null;

-- FK-Constraints so ändern, dass beim Löschen von Betreuer/Klient die
-- activities-Zeile bestehen bleibt (caregiver_id/client_id wird nur auf NULL gesetzt)
alter table activities drop constraint if exists activities_caregiver_id_fkey;
alter table activities add constraint activities_caregiver_id_fkey
  foreign key (caregiver_id) references caregivers(id) on delete set null;

alter table activities drop constraint if exists activities_client_id_fkey;
alter table activities add constraint activities_client_id_fkey
  foreign key (client_id) references clients(id) on delete set null;
