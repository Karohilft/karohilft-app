-- 24h-Betreuung: Erweiterte Felder
-- Im Supabase SQL-Editor ausführen.

-- Klienten: Adresse + Notizen
ALTER TABLE clients ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes text;

-- Betreuer: Adresse + Notizen + Qualifikationen
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS street text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS sprache text;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS fuehrerschein boolean NOT NULL DEFAULT false;
ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS raucher boolean NOT NULL DEFAULT false;

-- Live-In Schichten: Abrechnung
ALTER TABLE live_in_shifts ADD COLUMN IF NOT EXISTS abgerechnet boolean NOT NULL DEFAULT false;

-- Supabase Storage Bucket für Dokumente:
-- Bitte im Supabase Dashboard unter Storage einen neuen Bucket "live-in-docs" anlegen (public).
