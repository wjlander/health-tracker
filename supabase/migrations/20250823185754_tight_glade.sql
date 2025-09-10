/*
  # Single Login System with User Switching

  This migration creates a simplified system with:
  1. Single login (landers/Caroline1260!)
  2. Two predefined users: Jayne (patient) and Will (caregiver)
  3. User switching via dropdown
  4. Shared data access between users
*/

-- Step 1: Drop all existing tables and start fresh
DROP TABLE IF EXISTS fitbit_sleep CASCADE;
DROP TABLE IF EXISTS fitbit_foods CASCADE;
DROP TABLE IF EXISTS fitbit_weights CASCADE;
DROP TABLE IF EXISTS fitbit_activities CASCADE;
DROP TABLE IF EXISTS user_integrations CASCADE;
DROP TABLE IF EXISTS activity_entries CASCADE;
DROP TABLE IF EXISTS food_entries CASCADE;
DROP TABLE IF EXISTS health_entries CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop all existing functions and triggers
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_user_update() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Drop existing types and recreate them
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS meal_category CASCADE;
DROP TYPE IF EXISTS activity_intensity CASCADE;

-- Step 2: Create custom types
CREATE TYPE user_role AS ENUM ('patient', 'caregiver');
CREATE TYPE meal_category AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE activity_intensity AS ENUM ('low', 'moderate', 'high');

-- Step 3: Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create simplified users table (not tied to auth.users)
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role user_role NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Step 5: Insert the two predefined users
INSERT INTO users (name, role) VALUES 
  ('Jayne', 'patient'),
  ('Will', 'caregiver');

-- Step 6: Create health_entries table
CREATE TABLE health_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  mood integer CHECK (mood >= 1 AND mood <= 10),
  energy integer CHECK (energy >= 1 AND energy <= 10),
  anxiety_level integer CHECK (anxiety_level >= 1 AND anxiety_level <= 10),
  sleep_hours numeric(4,2) CHECK (sleep_hours >= 0 AND sleep_hours <= 24),
  sleep_quality integer CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
  weight numeric(6,2) CHECK (weight >= 0),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TRIGGER update_health_entries_updated_at
  BEFORE UPDATE ON health_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_health_entries_user_date ON health_entries(user_id, date DESC);

-- Step 7: Create food_entries table
CREATE TABLE food_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_entry_id uuid REFERENCES health_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  time time DEFAULT CURRENT_TIME,
  category meal_category NOT NULL DEFAULT 'snack',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_food_entries_user_id ON food_entries(user_id);

-- Step 8: Create activity_entries table
CREATE TABLE activity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_entry_id uuid REFERENCES health_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  intensity activity_intensity NOT NULL DEFAULT 'moderate',
  time time DEFAULT CURRENT_TIME,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_activity_entries_user_id ON activity_entries(user_id);

-- Step 9: Create user_integrations table
CREATE TABLE user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  last_sync timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Step 10: Create Fitbit data tables
CREATE TABLE fitbit_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps integer DEFAULT 0,
  distance numeric(8,2) DEFAULT 0,
  calories integer DEFAULT 0,
  active_minutes integer DEFAULT 0,
  activities jsonb DEFAULT '[]',
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE fitbit_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight numeric(6,2) NOT NULL,
  bmi numeric(5,2),
  fat_percentage numeric(5,2),
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE fitbit_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  calories integer DEFAULT 0,
  foods jsonb DEFAULT '[]',
  water numeric(8,2) DEFAULT 0,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

CREATE TABLE fitbit_sleep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  duration integer NOT NULL,
  efficiency integer DEFAULT 0,
  start_time timestamptz,
  end_time timestamptz,
  stages jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Step 11: Since we're not using RLS (single login), grant full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Step 12: Add some sample data for testing
DO $$
DECLARE
    jayne_id uuid;
    will_id uuid;
BEGIN
    -- Get user IDs
    SELECT id INTO jayne_id FROM users WHERE name = 'Jayne';
    SELECT id INTO will_id FROM users WHERE name = 'Will';
    
    -- Add sample health entry for Jayne
    INSERT INTO health_entries (user_id, date, mood, energy, anxiety_level, sleep_hours, sleep_quality, weight, notes)
    VALUES (jayne_id, CURRENT_DATE, 7, 6, 4, 7.5, 8, 150.0, 'Feeling good today!');
    
    -- Add sample health entry for Will
    INSERT INTO health_entries (user_id, date, mood, energy, anxiety_level, sleep_hours, sleep_quality, weight, notes)
    VALUES (will_id, CURRENT_DATE, 8, 7, 3, 8.0, 9, 180.0, 'Great sleep last night');
    
    RAISE NOTICE 'Sample data created for Jayne and Will';
END $$;

-- Step 13: Success message
DO $$
BEGIN
    RAISE NOTICE '=== SINGLE LOGIN SYSTEM CREATED ===';
    RAISE NOTICE 'Login: landers / Caroline1260!';
    RAISE NOTICE 'Users: Jayne (patient) and Will (caregiver)';
    RAISE NOTICE 'Database ready for simplified authentication';
END $$;