-- Relations Hub — initial schema.
-- Run once on an empty database (local Docker or Render). No demo data:
-- the first visit to the app opens /setup to create the first admin account.
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE employee_relations_user_role AS ENUM ('ADMIN', 'ER', 'HR', 'MANAGER');
CREATE TYPE employee_relations_employee_status AS ENUM ('Active', 'Inactive');
CREATE TYPE employee_relations_meeting_type AS ENUM ('Individual', 'Group');
CREATE TYPE employee_relations_meeting_channel AS ENUM ('Face-to-Face', 'Online', 'Phone');
CREATE TYPE employee_relations_followup_status AS ENUM ('Open', 'Closed');
CREATE TYPE employee_relations_feedback_status AS ENUM ('Pending', 'Draft', 'Submitted');
CREATE TYPE employee_relations_feedback_mode AS ENUM ('written', 'voice');

CREATE TABLE employee_relations_users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          employee_relations_user_role NOT NULL,
  manager_code  TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_relations_managers (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  title      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE employee_relations_employees (
  code       TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  title      TEXT NOT NULL,
  department TEXT NOT NULL,
  unit       TEXT NOT NULL,
  team       TEXT NOT NULL,
  manager_code TEXT NOT NULL REFERENCES employee_relations_managers(code),
  status     employee_relations_employee_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX employee_relations_employees_dept_idx ON employee_relations_employees(department);
CREATE INDEX employee_relations_employees_manager_idx ON employee_relations_employees(manager_code);
CREATE INDEX employee_relations_employees_name_idx ON employee_relations_employees(name);

CREATE TABLE employee_relations_meetings (
  id            TEXT PRIMARY KEY,
  meeting_date  DATE NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meeting_type  employee_relations_meeting_type NOT NULL,
  channel       employee_relations_meeting_channel NOT NULL,
  department    TEXT NOT NULL,
  unit          TEXT NOT NULL,
  team          TEXT NOT NULL,
  positive      TEXT NOT NULL DEFAULT '',
  risk          TEXT NOT NULL DEFAULT '',
  negative      TEXT NOT NULL DEFAULT '',
  recommendation TEXT NOT NULL DEFAULT '',
  follow_up_note TEXT NOT NULL DEFAULT '',
  pulse         JSONB,
  pulse_note    TEXT NOT NULL DEFAULT '',
  ai_summary    TEXT NOT NULL DEFAULT '',
  created_by    UUID REFERENCES employee_relations_users(id)
);

CREATE TABLE employee_relations_meeting_employees (
  meeting_id    TEXT NOT NULL REFERENCES employee_relations_meetings(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL REFERENCES employee_relations_employees(code),
  PRIMARY KEY (meeting_id, employee_code)
);

CREATE TABLE employee_relations_followups (
  id            TEXT PRIMARY KEY,
  meeting_id    TEXT NOT NULL REFERENCES employee_relations_meetings(id) ON DELETE CASCADE,
  item          TEXT NOT NULL,
  target_date   DATE NOT NULL,
  status        employee_relations_followup_status NOT NULL DEFAULT 'Open',
  note          TEXT NOT NULL DEFAULT '',
  created_at    DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at     DATE,
  created_by    UUID REFERENCES employee_relations_users(id)
);

CREATE TABLE employee_relations_followup_employees (
  followup_id   TEXT NOT NULL REFERENCES employee_relations_followups(id) ON DELETE CASCADE,
  employee_code TEXT NOT NULL REFERENCES employee_relations_employees(code),
  PRIMARY KEY (followup_id, employee_code)
);

CREATE TABLE employee_relations_manager_feedback (
  id            TEXT PRIMARY KEY,
  employee_code TEXT NOT NULL REFERENCES employee_relations_employees(code),
  manager_code  TEXT NOT NULL REFERENCES employee_relations_managers(code),
  cycle         TEXT NOT NULL,
  mode          employee_relations_feedback_mode NOT NULL DEFAULT 'written',
  body          TEXT NOT NULL DEFAULT '',
  language      TEXT,
  has_audio     BOOLEAN NOT NULL DEFAULT FALSE,
  status        employee_relations_feedback_status NOT NULL DEFAULT 'Draft',
  ai_summary    JSONB,
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX employee_relations_feedback_employee_idx ON employee_relations_manager_feedback(employee_code);
CREATE INDEX employee_relations_feedback_manager_idx ON employee_relations_manager_feedback(manager_code);
CREATE INDEX employee_relations_meetings_date_idx ON employee_relations_meetings(meeting_date DESC);
CREATE INDEX employee_relations_followups_status_idx ON employee_relations_followups(status, target_date);

CREATE TABLE employee_relations_id_sequences (
  name  TEXT PRIMARY KEY,
  value INTEGER NOT NULL DEFAULT 0
);

INSERT INTO employee_relations_id_sequences (name, value) VALUES
  ('meeting', 0),
  ('followup', 0),
  ('feedback', 0);

-- Cache of AI responses (OpenAI or the local engine), keyed by a hash of the
-- request, so the same notes or the same analytics selection never cost twice.
CREATE TABLE employee_relations_ai_cache (
  key        TEXT PRIMARY KEY,
  kind       TEXT NOT NULL,
  model      TEXT NOT NULL,
  result     JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
