-- Kartentyp für Betreuer: 'team' (Betreuungsteam) oder 'geschaeftsfuehrung'
-- Im Supabase SQL-Editor ausführen.

ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS card_type text NOT NULL DEFAULT 'team';
