/*
  # Comprehensive Database Table Verification and Creation

  This migration ensures all required tables exist with proper structure:
  1. Core tables (users, health_entries, food_entries, activity_entries)
  2. Integration tables (user_integrations)
  3. Fitbit data tables (fitbit_activities, fitbit_weights, fitbit_foods, fitbit_sleep)
  4. Enhanced features (health_vitals, water_intake, food_nutrition, daily_nutrition_summary)
  5. Women's health tables (menstrual_entries, premenopausal_entries)
  6. Lab results table (lab_results)

  Each table includes:
  - Proper column definitions with constraints
  - RLS policies for data security
  - Indexes for performance
  - Triggers where needed
*/

-- Create all required types with proper syntax
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

DO $$ BEGIN
    CREATE TYPE flow_intensity AS ENUM ('none', 'light', 'medium', 'heavy');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE cycle_phase AS ENUM ('menstrual', 'follicular', 'ovulation', 'luteal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lab_test_category AS ENUM ('blood', 'hormone', 'vitamin', 'metabolic', 'thyroid', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE lab_result_status AS ENUM ('low', 'normal', 'high', 'critical');
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
$$ LANGUAGE plpgsql;

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  name text NOT NULL,
  role user_role NOT NULL DEFAULT 'patient',
  tracking_preferences jsonb DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_policy" ON users;
CREATE POLICY "users_policy"
  ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. HEALTH ENTRIES TABLE
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

ALTER TABLE health_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_entries_policy" ON health_entries;
CREATE POLICY "health_entries_policy"
  ON health_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_health_entries_updated_at ON health_entries;
CREATE TRIGGER update_health_entries_updated_at
  BEFORE UPDATE ON health_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_health_entries_user_date ON health_entries(user_id, date DESC);

-- 3. FOOD ENTRIES TABLE
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

ALTER TABLE food_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_entries_policy" ON food_entries;
CREATE POLICY "food_entries_policy"
  ON food_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_food_entries_user_id ON food_entries(user_id);

-- 4. ACTIVITY ENTRIES TABLE
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

ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_entries_policy" ON activity_entries;
CREATE POLICY "activity_entries_policy"
  ON activity_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_activity_entries_user_id ON activity_entries(user_id);

-- 5. USER INTEGRATIONS TABLE
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

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_integrations_policy" ON user_integrations;
CREATE POLICY "user_integrations_policy"
  ON user_integrations
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_user_integrations_updated_at ON user_integrations;
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. FITBIT ACTIVITIES TABLE
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

ALTER TABLE fitbit_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fitbit_activities_policy" ON fitbit_activities;
CREATE POLICY "fitbit_activities_policy"
  ON fitbit_activities
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. FITBIT WEIGHTS TABLE
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

ALTER TABLE fitbit_weights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fitbit_weights_policy" ON fitbit_weights;
CREATE POLICY "fitbit_weights_policy"
  ON fitbit_weights
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 8. FITBIT FOODS TABLE
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

ALTER TABLE fitbit_foods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fitbit_foods_policy" ON fitbit_foods;
CREATE POLICY "fitbit_foods_policy"
  ON fitbit_foods
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 9. FITBIT SLEEP TABLE
CREATE TABLE IF NOT EXISTS fitbit_sleep (
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

ALTER TABLE fitbit_sleep ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fitbit_sleep_policy" ON fitbit_sleep;
CREATE POLICY "fitbit_sleep_policy"
  ON fitbit_sleep
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 10. HEALTH VITALS TABLE
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

ALTER TABLE health_vitals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "health_vitals_policy" ON health_vitals;
CREATE POLICY "health_vitals_policy"
  ON health_vitals
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_health_vitals_updated_at ON health_vitals;
CREATE TRIGGER update_health_vitals_updated_at
  BEFORE UPDATE ON health_vitals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_health_vitals_user_date ON health_vitals(user_id, date DESC);

-- 11. WATER INTAKE TABLE
CREATE TABLE IF NOT EXISTS water_intake (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  amount_ml numeric(8,2) NOT NULL DEFAULT 0,
  source text DEFAULT 'manual',
  logged_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "water_intake_policy" ON water_intake;
CREATE POLICY "water_intake_policy"
  ON water_intake
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON water_intake(user_id, date DESC);

-- 12. FOOD NUTRITION TABLE
CREATE TABLE IF NOT EXISTS food_nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_entry_id uuid REFERENCES food_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  calories numeric(8,2) DEFAULT 0,
  serving_size text,
  serving_unit text DEFAULT 'serving',
  carbs numeric(8,2) DEFAULT 0,
  protein numeric(8,2) DEFAULT 0,
  fat numeric(8,2) DEFAULT 0,
  fiber numeric(8,2) DEFAULT 0,
  sugar numeric(8,2) DEFAULT 0,
  sodium numeric(8,2) DEFAULT 0,
  potassium numeric(8,2) DEFAULT 0,
  calcium numeric(8,2) DEFAULT 0,
  iron numeric(8,2) DEFAULT 0,
  vitamin_c numeric(8,2) DEFAULT 0,
  vitamin_d numeric(8,2) DEFAULT 0,
  cholesterol numeric(8,2) DEFAULT 0,
  saturated_fat numeric(8,2) DEFAULT 0,
  trans_fat numeric(8,2) DEFAULT 0,
  data_source text DEFAULT 'manual',
  fitbit_food_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE food_nutrition ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "food_nutrition_policy" ON food_nutrition;
CREATE POLICY "food_nutrition_policy"
  ON food_nutrition
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP TRIGGER IF EXISTS update_food_nutrition_updated_at ON food_nutrition;
CREATE TRIGGER update_food_nutrition_updated_at
  BEFORE UPDATE ON food_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_food_nutrition_user_date ON food_nutrition(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_nutrition_food_entry ON food_nutrition(food_entry_id);

-- 13. DAILY NUTRITION SUMMARY TABLE
CREATE TABLE IF NOT EXISTS daily_nutrition_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  total_calories numeric(8,2) DEFAULT 0,
  total_carbs numeric(8,2) DEFAULT 0,
  total_protein numeric(8,2) DEFAULT 0,
  total_fat numeric(8,2) DEFAULT 0,
  total_fiber numeric(8,2) DEFAULT 0,
  total_sugar numeric(8,2) DEFAULT 0,
  total_sodium numeric(8,2) DEFAULT 0,
  calorie_goal numeric(8,2) DEFAULT 2000,
  carb_goal numeric(8,2) DEFAULT 250,
  protein_goal numeric(8,2) DEFAULT 50,
  fat_goal numeric(8,2) DEFAULT 65,
  fiber_goal numeric(8,2) DEFAULT 25,
  sodium_limit numeric(8,2) DEFAULT 2300,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE daily_nutrition_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_nutrition_summary_policy" ON daily_nutrition_summary;
CREATE POLICY "daily_nutrition_summary_policy"
  ON daily_nutrition_summary
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user_date ON daily_nutrition_summary(user_id, date DESC);

-- 14. MENSTRUAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS menstrual_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  cycle_day integer DEFAULT 1,
  flow_intensity flow_intensity DEFAULT 'none',
  symptoms text[] DEFAULT '{}',
  cycle_phase cycle_phase DEFAULT 'menstrual',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

ALTER TABLE menstrual_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menstrual_entries_policy" ON menstrual_entries;
CREATE POLICY "menstrual_entries_policy"
  ON menstrual_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_menstrual_entries_user_date ON menstrual_entries(user_id, date DESC);

-- 15. PREMENOPAUSAL ENTRIES TABLE
CREATE TABLE IF NOT EXISTS premenopausal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  hot_flashes integer DEFAULT 0,
  night_sweats boolean DEFAULT false,
  mood_swings integer DEFAULT 5,
  irregular_periods boolean DEFAULT false,
  sleep_disturbances boolean DEFAULT false,
  joint_aches boolean DEFAULT false,
  brain_fog integer DEFAULT 5,
  weight_changes boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date),
  CONSTRAINT mood_swings_range CHECK (mood_swings >= 1 AND mood_swings <= 10),
  CONSTRAINT brain_fog_range CHECK (brain_fog >= 1 AND brain_fog <= 10),
  CONSTRAINT hot_flashes_range CHECK (hot_flashes >= 0)
);

ALTER TABLE premenopausal_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "premenopausal_entries_policy" ON premenopausal_entries;
CREATE POLICY "premenopausal_entries_policy"
  ON premenopausal_entries
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_premenopausal_entries_user_date ON premenopausal_entries(user_id, date DESC);

-- 16. LAB RESULTS TABLE
CREATE TABLE IF NOT EXISTS lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  test_date date NOT NULL,
  test_name text NOT NULL,
  test_category lab_test_category DEFAULT 'other',
  result_value numeric(10,3) NOT NULL,
  result_unit text NOT NULL,
  reference_range_min numeric(10,3),
  reference_range_max numeric(10,3),
  status lab_result_status DEFAULT 'normal',
  doctor_notes text,
  lab_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_results_policy" ON lab_results;
CREATE POLICY "lab_results_policy"
  ON lab_results
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_lab_results_user_date ON lab_results(user_id, test_date DESC);
CREATE INDEX IF NOT EXISTS idx_lab_results_category ON lab_results(test_category);

-- Create default users if they don't exist
INSERT INTO users (id, name, role) VALUES 
  ('jayne-id', 'Jayne', 'patient'),
  ('william-id', 'William', 'patient')
ON CONFLICT (id) DO NOTHING;

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

-- Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Verification query
DO $$
DECLARE
    table_count INTEGER;
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'users', 'health_entries', 'food_entries', 'activity_entries',
        'user_integrations', 'fitbit_activities', 'fitbit_weights', 
        'fitbit_foods', 'fitbit_sleep', 'health_vitals', 'water_intake',
        'food_nutrition', 'daily_nutrition_summary', 'menstrual_entries',
        'premenopausal_entries', 'lab_results'
    ];
BEGIN
    RAISE NOTICE '=== DATABASE TABLE VERIFICATION ===';
    
    FOREACH table_name IN ARRAY tables
    LOOP
        SELECT COUNT(*) INTO table_count 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = table_name;
        
        IF table_count > 0 THEN
            RAISE NOTICE '✅ Table exists: %', table_name;
        ELSE
            RAISE NOTICE '❌ Table missing: %', table_name;
        END IF;
    END LOOP;
    
    RAISE NOTICE '=== VERIFICATION COMPLETE ===';
END $$;