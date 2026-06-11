-- Klienten- & Betreuerkarten: gemeinsame fortlaufende Mitgliedsnummer (KH-0001, KH-0002, ...)
-- Im Supabase SQL-Editor ausführen.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthdate date;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS birthdate date;

-- Eine gemeinsame Sequenz für Klienten UND Betreuer
CREATE SEQUENCE IF NOT EXISTS kh_card_number_seq;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS card_number integer UNIQUE;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS card_number integer UNIQUE;

ALTER TABLE clients ALTER COLUMN card_number SET DEFAULT nextval('kh_card_number_seq');
ALTER TABLE caregivers ALTER COLUMN card_number SET DEFAULT nextval('kh_card_number_seq');

-- Falls vorher schon eine alte (separate) Nummerierung existierte: zurücksetzen
UPDATE clients SET card_number = NULL;
UPDATE caregivers SET card_number = NULL;

-- Bestehende Zeilen fortlaufend nummerieren (Klienten zuerst, dann Betreuer, nach Erstellungsdatum)
UPDATE clients SET card_number = nextval('kh_card_number_seq')
WHERE id IN (SELECT id FROM clients ORDER BY created_at);

UPDATE caregivers SET card_number = nextval('kh_card_number_seq')
WHERE id IN (SELECT id FROM caregivers ORDER BY created_at);
