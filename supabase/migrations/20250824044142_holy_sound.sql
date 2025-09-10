/*
  # Enhanced Health Tracking Features

  1. New Tables
    - `health_vitals` - Blood pressure, blood sugar, and other vital signs
    - `fitbit_food_details` - Detailed food entries with macros from Fitbit
    - `water_intake` - Water consumption tracking

  2. Table Updates
    - Add water intake to existing tables
    - Add macro tracking fields

  3. Security
    - Enable RLS on all new tables
    - Add policies for user data isolation
*/

-- Create health vitals table for blood pressure, blood sugar, etc.
CREATE TABLE IF NOT EXISTS health_vitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  blood_sugar numeric(5,1),
  heart_rate integer,
  temperature numeric(4,1),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on health_vitals
ALTER TABLE health_vitals ENABLE ROW LEVEL SECURITY;

-- Create policy for health_vitals
CREATE POLICY "health_vitals_own_data"
  ON health_vitals
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create detailed Fitbit food table with macros
CREATE TABLE IF NOT EXISTS fitbit_food_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  food_name text NOT NULL,
  brand text,
  calories numeric(8,2) DEFAULT 0,
  carbs numeric(8,2) DEFAULT 0,
  protein numeric(8,2) DEFAULT 0,
  fat numeric(8,2) DEFAULT 0,
  fiber numeric(8,2) DEFAULT 0,
  sugar numeric(8,2) DEFAULT 0,
  sodium numeric(8,2) DEFAULT 0,
  meal_type text DEFAULT 'snack',
  serving_size text,
  logged_time timestamptz,
  fitbit_food_id text,
  synced_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on fitbit_food_details
ALTER TABLE fitbit_food_details ENABLE ROW LEVEL SECURITY;

-- Create policy for fitbit_food_details
CREATE POLICY "fitbit_food_details_own_data"
  ON fitbit_food_details
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create water intake table
CREATE TABLE IF NOT EXISTS water_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount_ml numeric(8,2) NOT NULL DEFAULT 0,
  source text DEFAULT 'manual', -- 'manual' or 'fitbit'
  logged_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on water_intake
ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;

-- Create policy for water_intake
CREATE POLICY "water_intake_own_data"
  ON water_intake
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_vitals_user_date ON health_vitals(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fitbit_food_details_user_date ON fitbit_food_details(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON water_intake(user_id, date DESC);

-- Add updated_at trigger for health_vitals
CREATE TRIGGER update_health_vitals_updated_at
  BEFORE UPDATE ON health_vitals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();