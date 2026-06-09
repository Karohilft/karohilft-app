-- ═══════════════════════════════════════════════
-- KAROHILFT APP – Komplettes Datenbank-Setup
-- Ausführen im Supabase SQL-Editor:
-- supabase.com → Projekt → SQL Editor → New Query → Einfügen → Run
-- ═══════════════════════════════════════════════

-- ── 1. REGIONS ────────────────────────────────────
CREATE TABLE IF NOT EXISTS regions (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL
);

INSERT INTO regions (name) VALUES
  ('Wien 1–9'),
  ('Wien 10–19'),
  ('Wien 20–23'),
  ('Niederösterreich'),
  ('Burgenland')
ON CONFLICT DO NOTHING;

-- ── 2. CAREGIVERS (Betreuer) ─────────────────────
CREATE TABLE IF NOT EXISTS caregivers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text,
  email           text,
  phone           text,
  street          text,
  zip             text,
  city            text,
  type            text CHECK (type IN ('stunden','24h','beides')),
  role            text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  languages       text[],
  drivers_license boolean,
  status          text DEFAULT 'verfügbar',
  skills          text[],
  created_at      timestamptz DEFAULT now()
);

-- ── 3. CAREGIVERS_REGIONS (Betreuer ↔ Regionen) ──
CREATE TABLE IF NOT EXISTS caregivers_regions (
  caregiver_id uuid REFERENCES caregivers(id) ON DELETE CASCADE,
  region_id    uuid REFERENCES regions(id) ON DELETE CASCADE,
  PRIMARY KEY (caregiver_id, region_id)
);

-- ── 4. CLIENTS (Klienten / zu betreuende Personen) ─
CREATE TABLE IF NOT EXISTS clients (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  street            text,
  zip               text,
  city              text,
  region_id         uuid REFERENCES regions(id),
  needs             text CHECK (needs IN ('stunden','24h','beides')),
  preferred_languages text[],
  car_required      boolean DEFAULT false,
  diagnoses         text[],
  notes             text,
  contact_name      text,
  contact_relation  text,
  contact_phone     text,
  contact_email     text,
  doctor_name       text,
  doctor_phone      text,
  created_at        timestamptz DEFAULT now()
);

-- ── 5. ACTIVITIES (Tätigkeitsberichte) ───────────
CREATE TABLE IF NOT EXISTS activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text,
  datum       date,
  zeit_von    time,
  zeit_bis    time,
  unterschrift text,
  client_id   uuid REFERENCES clients(id),
  created_at  timestamptz DEFAULT now()
);

-- ── 6. ASSIGNMENTS_HOURS (Stundeneinsätze) ───────
CREATE TABLE IF NOT EXISTS assignments_hours (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid REFERENCES caregivers(id),
  client_id    uuid REFERENCES clients(id),
  date_from    date,
  date_to      date,
  hours        numeric,
  notes        text,
  created_at   timestamptz DEFAULT now()
);

-- ── 7. KAROHILFT_USERS (App-Benutzer / Rollen) ───
CREATE TABLE IF NOT EXISTS karohilft_users (
  id         uuid PRIMARY KEY,
  email      text,
  full_name  text,
  role       text NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  uid        uuid,
  created_at timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════
-- ADMIN-USER EINTRAGEN
-- Führe diesen Teil NACH dem ersten Login aus.
-- Ersetze die E-Mail-Adresse mit deiner eigenen!
-- ═══════════════════════════════════════════════

-- INSERT INTO karohilft_users (id, email, full_name, role)
-- SELECT id, email, raw_user_meta_data->>'full_name', 'admin'
-- FROM auth.users
-- WHERE email = 'deine@email.at'
-- ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- INSERT INTO caregivers (name, email, role)
-- VALUES ('Roland', 'deine@email.at', 'admin')
-- ON CONFLICT DO NOTHING;
