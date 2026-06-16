-- Abrechnungsstatus für erfasste Tätigkeitsnachweise
-- Im Supabase SQL-Editor ausführen.

ALTER TABLE activities ADD COLUMN IF NOT EXISTS abgerechnet boolean NOT NULL DEFAULT false;
