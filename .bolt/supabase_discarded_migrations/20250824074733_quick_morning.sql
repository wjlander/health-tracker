/*
  # Add Missing Tables for Enhanced Health Tracker

  1. New Tables
    - `health_vitals` - Blood pressure, blood sugar, heart rate, temperature
    - `water_intake` - Daily water consumption tracking
    - `food_nutrition` - Detailed nutritional information for food entries
    - `daily_nutrition_summary` - Daily nutrition totals and goals
    - `menstrual_entries` - Menstrual cycle tracking with phases and symptoms
    - `premenopausal_entries` - Pre-menopausal symptom tracking
    - `lab_results` - Medical test results and lab work

  2. Security
    - Enable RLS on all new tables
    - Add policies for user data isolation

  3. Functions
    - Add nutrition calculation functions
    - Add triggers for automatic daily nutrition updates
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

-- Create food nutrition details table
CREATE TABLE IF NOT EXISTS food_nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_entry_id uuid REFERENCES food_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic nutrition info
  calories numeric(8,2) DEFAULT 0,
  serving_size text,
  serving_unit text DEFAULT 'serving',
  
  -- Macronutrients (in grams)
  carbs numeric(8,2) DEFAULT 0,
  protein numeric(8,2) DEFAULT 0,
  fat numeric(8,2) DEFAULT 0,
  fiber numeric(8,2) DEFAULT 0,
  sugar numeric(8,2) DEFAULT 0,
  
  -- Micronutrients (in mg unless specified)
  sodium numeric(8,2) DEFAULT 0,
  potassium numeric(8,2) DEFAULT 0,
  calcium numeric(8,2) DEFAULT 0,
  iron numeric(8,2) DEFAULT 0,
  vitamin_c numeric(8,2) DEFAULT 0,
  vitamin_d numeric(8,2) DEFAULT 0, -- in IU
  
  -- Additional tracking
  cholesterol numeric(8,2) DEFAULT 0, -- in mg
  saturated_fat numeric(8,2) DEFAULT 0,
  trans_fat numeric(8,2) DEFAULT 0,
  
  -- Source tracking
  data_source text DEFAULT 'manual', -- 'manual', 'fitbit', 'usda', etc.
  fitbit_food_id text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on food_nutrition
ALTER TABLE food_nutrition ENABLE ROW LEVEL SECURITY;

-- Create policy for food_nutrition
CREATE POLICY "food_nutrition_own_data"
  ON food_nutrition
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create daily nutrition summary table
CREATE TABLE IF NOT EXISTS daily_nutrition_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  
  -- Daily totals
  total_calories numeric(8,2) DEFAULT 0,
  total_carbs numeric(8,2) DEFAULT 0,
  total_protein numeric(8,2) DEFAULT 0,
  total_fat numeric(8,2) DEFAULT 0,
  total_fiber numeric(8,2) DEFAULT 0,
  total_sugar numeric(8,2) DEFAULT 0,
  total_sodium numeric(8,2) DEFAULT 0,
  
  -- Goals (can be customized per user)
  calorie_goal numeric(8,2) DEFAULT 2000,
  carb_goal numeric(8,2) DEFAULT 250,
  protein_goal numeric(8,2) DEFAULT 50,
  fat_goal numeric(8,2) DEFAULT 65,
  fiber_goal numeric(8,2) DEFAULT 25,
  sodium_limit numeric(8,2) DEFAULT 2300,
  
  -- Tracking
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- Enable RLS on daily_nutrition_summary
ALTER TABLE daily_nutrition_summary ENABLE ROW LEVEL SECURITY;

-- Create policy for daily_nutrition_summary
CREATE POLICY "daily_nutrition_summary_own_data"
  ON daily_nutrition_summary
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create menstrual cycle tracking table
CREATE TABLE IF NOT EXISTS menstrual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  cycle_day integer CHECK (cycle_day >= 1 AND cycle_day <= 50),
  flow_intensity text CHECK (flow_intensity IN ('none', 'light', 'medium', 'heavy')),
  symptoms text[] DEFAULT '{}',
  cycle_phase text CHECK (cycle_phase IN ('menstrual', 'follicular', 'ovulation', 'luteal')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on menstrual_entries
ALTER TABLE menstrual_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for menstrual_entries
CREATE POLICY "menstrual_entries_own_data"
  ON menstrual_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create premenopausal tracking table
CREATE TABLE IF NOT EXISTS premenopausal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  hot_flashes integer DEFAULT 0,
  night_sweats boolean DEFAULT false,
  mood_swings integer CHECK (mood_swings >= 1 AND mood_swings <= 10),
  irregular_periods boolean DEFAULT false,
  sleep_disturbances boolean DEFAULT false,
  joint_aches boolean DEFAULT false,
  brain_fog integer CHECK (brain_fog >= 1 AND brain_fog <= 10),
  weight_changes boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS on premenopausal_entries
ALTER TABLE premenopausal_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for premenopausal_entries
CREATE POLICY "premenopausal_entries_own_data"
  ON premenopausal_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create lab results table
CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_date date NOT NULL,
  test_name text NOT NULL,
  test_category text CHECK (test_category IN ('blood', 'hormone', 'vitamin', 'metabolic', 'thyroid', 'other')),
  result_value numeric(10,3) NOT NULL,
  result_unit text NOT NULL,
  reference_range_min numeric(10,3),
  reference_range_max numeric(10,3),
  status text CHECK (status IN ('low', 'normal', 'high', 'critical')),
  doctor_notes text,
  lab_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on lab_results
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

-- Create policy for lab_results
CREATE POLICY "lab_results_own_data"
  ON lab_results
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_vitals_user_date ON health_vitals(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON water_intake(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_food_nutrition_user_date ON food_nutrition(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_nutrition_food_entry ON food_nutrition(food_entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user_date ON daily_nutrition_summary(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_menstrual_entries_user_date ON menstrual_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_premenopausal_entries_user_date ON premenopausal_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_user_date ON lab_results(user_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_category ON lab_results(user_id, test_category, test_date DESC);

-- Add updated_at triggers
CREATE TRIGGER update_health_vitals_updated_at
  BEFORE UPDATE ON health_vitals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_food_nutrition_updated_at
  BEFORE UPDATE ON food_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at
  BEFORE UPDATE ON lab_results
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate daily nutrition totals
CREATE OR REPLACE FUNCTION calculate_daily_nutrition(p_user_id uuid, p_date date)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_nutrition_summary (
    user_id, 
    date, 
    total_calories, 
    total_carbs, 
    total_protein, 
    total_fat, 
    total_fiber, 
    total_sugar, 
    total_sodium,
    last_updated
  )
  SELECT 
    p_user_id,
    p_date,
    COALESCE(SUM(fn.calories), 0),
    COALESCE(SUM(fn.carbs), 0),
    COALESCE(SUM(fn.protein), 0),
    COALESCE(SUM(fn.fat), 0),
    COALESCE(SUM(fn.fiber), 0),
    COALESCE(SUM(fn.sugar), 0),
    COALESCE(SUM(fn.sodium), 0),
    NOW()
  FROM food_entries fe
  LEFT JOIN food_nutrition fn ON fe.id = fn.food_entry_id
  WHERE fe.user_id = p_user_id 
    AND fe.created_at::date = p_date
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_carbs = EXCLUDED.total_carbs,
    total_protein = EXCLUDED.total_protein,
    total_fat = EXCLUDED.total_fat,
    total_fiber = EXCLUDED.total_fiber,
    total_sugar = EXCLUDED.total_sugar,
    total_sodium = EXCLUDED.total_sodium,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update daily nutrition when food nutrition changes
CREATE OR REPLACE FUNCTION update_daily_nutrition_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update for the date of the food entry
  PERFORM calculate_daily_nutrition(
    NEW.user_id, 
    (SELECT created_at::date FROM food_entries WHERE id = NEW.food_entry_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_nutrition_daily_update
  AFTER INSERT OR UPDATE OR DELETE ON food_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_nutrition_trigger();

-- Add tracking_preferences column to users table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tracking_preferences'
  ) THEN
    ALTER TABLE users ADD COLUMN tracking_preferences jsonb DEFAULT '{
      "mood": true,
      "energy": true,
      "anxiety": true,
      "sleep": true,
      "weight": true,
      "menstrual_cycle": true,
      "premenopausal_symptoms": true,
      "lab_results": true,
      "blood_pressure": true,
      "blood_sugar": true,
      "heart_rate": true,
      "temperature": true,
      "nutrition_tracking": true,
      "water_intake": true,
      "activity_tracking": true,
      "fitbit_integration": true
    }'::jsonb;
  END IF;
END $$;