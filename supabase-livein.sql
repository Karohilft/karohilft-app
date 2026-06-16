-- 24h-Betreuung: Live-In Schichten
-- Im Supabase SQL-Editor ausführen.

ALTER TABLE caregivers ADD COLUMN IF NOT EXISTS live_in boolean NOT NULL DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS live_in boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS live_in_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid REFERENCES caregivers(id) ON DELETE SET NULL,
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  start_date date NOT NULL,
  end_date date,
  notiz text,
  created_at timestamptz DEFAULT now()
);
