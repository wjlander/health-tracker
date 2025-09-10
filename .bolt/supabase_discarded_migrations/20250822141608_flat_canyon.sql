/*
  # Complete Health Tracker Database Schema

  1. New Tables
    - `users` - User profiles with patient/caregiver roles
    - `health_entries` - Daily health tracking data
    - `food_entries` - Food and meal tracking
    - `activity_entries` - Exercise and activity tracking
    - `user_integrations` - Third-party service connections (Fitbit)
    - `fitbit_activities` - Synced Fitbit activity data
    - `fitbit_weights` - Synced Fitbit weight data
    - `fitbit_foods` - Synced Fitbit food data
    - `fitbit_sleep` - Synced Fitbit sleep data

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for caregivers to read patient data

  3. Functions and Triggers
    - Auto-update timestamps
    - Handle new user registration
*/

-- Create custom types
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('patient', 'caregiver');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE meal_category AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_intensity AS ENUM ('low', 'moderate', 'high');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create health_entries table
CREATE TABLE IF NOT EXISTS health_entries (
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

-- Create food_entries table
CREATE TABLE IF NOT EXISTS food_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_entry_id uuid REFERENCES health_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  time time DEFAULT CURRENT_TIME,
  category meal_category NOT NULL DEFAULT 'snack',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create activity_entries table
CREATE TABLE IF NOT EXISTS activity_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  health_entry_id uuid REFERENCES health_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration integer NOT NULL CHECK (duration > 0),
  intensity activity_intensity NOT NULL DEFAULT 'moderate',
  time time DEFAULT CURRENT_TIME,
  created_at timestamptz DEFAULT now()
);

-- Create user_integrations table
CREATE TABLE IF NOT EXISTS user_integrations (
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

-- Create fitbit_activities table
CREATE TABLE IF NOT EXISTS fitbit_activities (
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

-- Create fitbit_weights table
CREATE TABLE IF NOT EXISTS fitbit_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight numeric(6,2) NOT NULL,
  bmi numeric(5,2),
  fat_percentage numeric(5,2),
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create fitbit_foods table
CREATE TABLE IF NOT EXISTS fitbit_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  calories integer DEFAULT 0,
  foods jsonb DEFAULT '[]',
  water numeric(8,2) DEFAULT 0,
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create fitbit_sleep table
CREATE TABLE IF NOT EXISTS fitbit_sleep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  duration integer NOT NULL, -- in minutes
  efficiency integer DEFAULT 0,
  start_time timestamptz,
  end_time timestamptz,
  stages jsonb DEFAULT '{}',
  synced_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_entries_user_date ON health_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_entries_date ON health_entries(date DESC);
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_health_entry_id ON food_entries(health_entry_id);
CREATE INDEX IF NOT EXISTS idx_activity_entries_user_id ON activity_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entries_health_entry_id ON activity_entries(health_entry_id);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_sleep ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Caregivers can read patient data"
  ON users FOR SELECT
  TO authenticated
  USING (
    role = 'patient' AND 
    EXISTS (
      SELECT 1 FROM users caregivers 
      WHERE caregivers.id = auth.uid() AND caregivers.role = 'caregiver'
    )
  );

CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Health entries policies
CREATE POLICY "Users can manage own health entries"
  ON health_entries FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient health entries"
  ON health_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'caregiver'
    )
  );

-- Food entries policies
CREATE POLICY "Users can manage own food entries"
  ON food_entries FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient food entries"
  ON food_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'caregiver'
    )
  );

-- Activity entries policies
CREATE POLICY "Users can manage own activity entries"
  ON activity_entries FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient activity entries"
  ON activity_entries FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'caregiver'
    )
  );

-- User integrations policies
CREATE POLICY "Users can manage own integrations"
  ON user_integrations FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Fitbit tables policies
CREATE POLICY "Users can manage own fitbit activities"
  ON fitbit_activities FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit activities"
  ON fitbit_activities FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'caregiver'
    )
  );

CREATE POLICY "Users can manage own fitbit weights"
  ON fitbit_weights FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit weights"
  ON fitbit_weights FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'caregiver'
    )
  );

CREATE POLICY "Users can manage own fitbit foods"
  ON fitbit_foods FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit foods"
  ON fitbit_foods FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'caregiver'
    )
  );

CREATE POLICY "Users can manage own fitbit sleep"
  ON fitbit_sleep FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit sleep"
  ON fitbit_sleep FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() AND users.role = 'caregiver'
    )
  );

-- Create updated_at triggers
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_health_entries_updated_at
  BEFORE UPDATE ON health_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();