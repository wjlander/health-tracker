/*
  # Create Fitbit integration tables

  1. New Tables
    - `user_integrations` - Store OAuth tokens and integration status
    - `fitbit_activities` - Store synced Fitbit activity data
    - `fitbit_weights` - Store synced Fitbit weight data
    - `fitbit_foods` - Store synced Fitbit food data
    - `fitbit_sleep` - Store synced Fitbit sleep data

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage own integration data
    - Add policies for caregivers to read patient integration data

  3. Indexes
    - Indexes on user_id and date for fast queries
    - Index on provider for integration lookups
*/

-- Create user integrations table for OAuth tokens
CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'fitbit', 'github', etc.
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  last_sync timestamptz,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Create Fitbit activity data table
CREATE TABLE IF NOT EXISTS fitbit_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  steps integer DEFAULT 0,
  distance numeric(8,2) DEFAULT 0, -- miles
  calories integer DEFAULT 0,
  active_minutes integer DEFAULT 0,
  activities jsonb DEFAULT '[]', -- array of activity objects
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create Fitbit weight data table
CREATE TABLE IF NOT EXISTS fitbit_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  weight numeric(6,2) NOT NULL,
  bmi numeric(4,1),
  fat_percentage numeric(4,1),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create Fitbit food data table
CREATE TABLE IF NOT EXISTS fitbit_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  calories integer DEFAULT 0,
  foods jsonb DEFAULT '[]', -- array of food objects
  water numeric(6,2) DEFAULT 0, -- ounces
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Create Fitbit sleep data table
CREATE TABLE IF NOT EXISTS fitbit_sleep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  duration integer, -- minutes
  efficiency integer, -- percentage
  start_time timestamptz,
  end_time timestamptz,
  stages jsonb, -- sleep stages data
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on all tables
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE fitbit_sleep ENABLE ROW LEVEL SECURITY;

-- Create policies for user_integrations
CREATE POLICY "Users can manage own integrations"
  ON user_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient integrations"
  ON user_integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create policies for fitbit_activities
CREATE POLICY "Users can manage own fitbit activities"
  ON fitbit_activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit activities"
  ON fitbit_activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create policies for fitbit_weights
CREATE POLICY "Users can manage own fitbit weights"
  ON fitbit_weights
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit weights"
  ON fitbit_weights
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create policies for fitbit_foods
CREATE POLICY "Users can manage own fitbit foods"
  ON fitbit_foods
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit foods"
  ON fitbit_foods
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create policies for fitbit_sleep
CREATE POLICY "Users can manage own fitbit sleep"
  ON fitbit_sleep
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient fitbit sleep"
  ON fitbit_sleep
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'caregiver'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_integrations_user_provider 
  ON user_integrations(user_id, provider);

CREATE INDEX IF NOT EXISTS idx_fitbit_activities_user_date 
  ON fitbit_activities(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_fitbit_weights_user_date 
  ON fitbit_weights(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_fitbit_foods_user_date 
  ON fitbit_foods(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_fitbit_sleep_user_date 
  ON fitbit_sleep(user_id, date DESC);

-- Create updated_at trigger for user_integrations
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();