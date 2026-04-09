-- Table: app_users
CREATE TABLE IF NOT EXISTS app_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  pin TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table: leads
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  phone TEXT NOT NULL,
  called_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  follow_up_date TEXT,
  notes TEXT,
  last_called TEXT,
  created_at TEXT
);

-- Optional: enable RLS and create public policies
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read_users" ON app_users FOR SELECT USING (true);
CREATE POLICY "public_insert_users" ON app_users FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_users" ON app_users FOR UPDATE USING (true);
CREATE POLICY "public_delete_users" ON app_users FOR DELETE USING (true);

CREATE POLICY "public_read_leads" ON leads FOR SELECT USING (true);
CREATE POLICY "public_insert_leads" ON leads FOR INSERT WITH CHECK (true);
CREATE POLICY "public_update_leads" ON leads FOR UPDATE USING (true);
CREATE POLICY "public_delete_leads" ON leads FOR DELETE USING (true);

-- Insert Default Users
INSERT INTO app_users (name, pin, is_admin)
VALUES 
  ('Ravi', '1111', false),
  ('Priya', '2222', false),
  ('Suresh', '3333', false),
  ('Ankita', '4444', false)
ON CONFLICT (name) DO NOTHING;
