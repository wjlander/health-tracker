/*
  # Health Tracker Database Schema

  1. New Tables
    - `users` - User profiles with patient/caregiver roles
    - `health_entries` - Daily health tracking data
    - `food_entries` - Food and meal tracking
    - `activity_entries` - Exercise and activity tracking
    - `user_integrations` - OAuth integrations (Fitbit)
    - `fitbit_activities` - Synced Fitbit activity data
    - `fitbit_weights` - Synced Fitbit weight data
    - `fitbit_foods` - Synced Fitbit food data
    - `fitbit_sleep` - Synced Fitbit sleep data

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Caregivers can read patient data

  3. Features
    - Automatic user creation on signup
    - Data validation with check constraints
    - Proper indexes for performance
    - Updated_at triggers
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

-- Enable RLS on users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create users policies
DROP POLICY IF EXISTS "Users can read own data" ON users;
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Caregivers can read patient data" ON users;
CREATE POLICY "Caregivers can read patient data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    role = 'patient' AND 
    EXISTS (
      SELECT 1 FROM users u2
      WHERE u2.id = auth.uid() AND u2.role = 'caregiver'
    )
  );

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Create updated_at trigger for users
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Enable RLS on health_entries
ALTER TABLE health_entries ENABLE ROW LEVEL SECURITY;

-- Create health_entries policies
DROP POLICY IF EXISTS "Users can manage own health entries" ON health_entries;
CREATE POLICY "Users can manage own health entries"
  ON health_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers can read patient health entries" ON health_entries;
CREATE POLICY "Caregivers can read patient health entries"
  ON health_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create updated_at trigger for health_entries
DROP TRIGGER IF EXISTS update_health_entries_updated_at ON health_entries;
CREATE TRIGGER update_health_entries_updated_at
  BEFORE UPDATE ON health_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for health_entries
CREATE INDEX IF NOT EXISTS idx_health_entries_user_date 
  ON health_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_health_entries_date 
  ON health_entries(date DESC);

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

-- Enable RLS on food_entries
ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

-- Create food_entries policies
DROP POLICY IF EXISTS "Users can manage own food entries" ON food_entries;
CREATE POLICY "Users can manage own food entries"
  ON food_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers can read patient food entries" ON food_entries;
CREATE POLICY "Caregivers can read patient food entries"
  ON food_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create indexes for food_entries
CREATE INDEX IF NOT EXISTS idx_food_entries_user_id 
  ON food_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_food_entries_health_entry_id 
  ON food_entries(health_entry_id);

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

-- Enable RLS on activity_entries
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;

-- Create activity_entries policies
DROP POLICY IF EXISTS "Users can manage own activity entries" ON activity_entries;
CREATE POLICY "Users can manage own activity entries"
  ON activity_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers can read patient activity entries" ON activity_entries;
CREATE POLICY "Caregivers can read patient activity entries"
  ON activity_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create indexes for activity_entries
CREATE INDEX IF NOT EXISTS idx_activity_entries_user_id 
  ON activity_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_entries_health_entry_id 
  ON activity_entries(health_entry_id);

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

-- Enable RLS on user_integrations
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Create user_integrations policies
DROP POLICY IF EXISTS "Users can manage own integrations" ON user_integrations;
CREATE POLICY "Users can manage own integrations"
  ON user_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create updated_at trigger for user_integrations
DROP TRIGGER IF EXISTS update_user_integrations_updated_at ON user_integrations;
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

-- Enable RLS on fitbit_activities
ALTER TABLE fitbit_activities ENABLE ROW LEVEL SECURITY;

-- Create fitbit_activities policies
DROP POLICY IF EXISTS "Users can manage own fitbit activities" ON fitbit_activities;
CREATE POLICY "Users can manage own fitbit activities"
  ON fitbit_activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

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

-- Enable RLS on fitbit_weights
ALTER TABLE fitbit_weights ENABLE ROW LEVEL SECURITY;

-- Create fitbit_weights policies
DROP POLICY IF EXISTS "Users can manage own fitbit weights" ON fitbit_weights;
CREATE POLICY "Users can manage own fitbit weights"
  ON fitbit_weights
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

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

-- Enable RLS on fitbit_foods
ALTER TABLE fitbit_foods ENABLE ROW LEVEL SECURITY;

-- Create fitbit_foods policies
DROP POLICY IF EXISTS "Users can manage own fitbit foods" ON fitbit_foods;
CREATE POLICY "Users can manage own fitbit foods"
  ON fitbit_foods
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

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

-- Enable RLS on fitbit_sleep
ALTER TABLE fitbit_sleep ENABLE ROW LEVEL SECURITY;

-- Create fitbit_sleep policies
DROP POLICY IF EXISTS "Users can manage own fitbit sleep" ON fitbit_sleep;
CREATE POLICY "Users can manage own fitbit sleep"
  ON fitbit_sleep
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

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