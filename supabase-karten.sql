-- Klienten- & Betreuerkarten: Mitgliedsnummer + Geburtsdatum
-- Im Supabase SQL-Editor ausführen.

ALTER TABLE clients ADD COLUMN IF NOT EXISTS birthdate date;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS birthdate date;

CREATE SEQUENCE IF NOT EXISTS clients_card_number_seq;
CREATE SEQUENCE IF NOT EXISTS caregivers_card_number_seq;

ALTER TABLE clients ADD COLUMN IF NOT EXISTS card_number integer UNIQUE DEFAULT nextval('clients_card_number_seq');
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS card_number integer UNIQUE DEFAULT nextval('caregivers_card_number_seq');

UPDATE clients SET card_number = nextval('clients_card_number_seq') WHERE card_number IS NULL;
UPDATE caregivers SET card_number = nextval('caregivers_card_number_seq') WHERE card_number IS NULL;
