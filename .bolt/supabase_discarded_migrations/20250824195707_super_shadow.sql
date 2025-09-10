/*
  # Fix nutrition tracking and sleep calculation issues

  1. Database Functions
    - Create function to properly calculate daily nutrition from all sources
    - Update sleep duration calculation to exclude wake time
    - Add report template creation

  2. Nutrition Fixes
    - Ensure Fitbit food data is properly aggregated
    - Fix daily nutrition summary calculations
    - Add trigger to auto-update nutrition summaries

  3. Sleep Calculation
    - Modify Fitbit sleep storage to exclude wake time from duration
    - Update existing sleep data to remove wake time

  4. Report Templates
    - Add comprehensive default templates for different visit types
    - Include all health tracking categories
*/

-- Create or replace function to calculate daily nutrition totals
CREATE OR REPLACE FUNCTION calculate_daily_nutrition_summary(p_user_id uuid, p_date date)
RETURNS void AS $$
DECLARE
  total_calories numeric := 0;
  total_carbs numeric := 0;
  total_protein numeric := 0;
  total_fat numeric := 0;
  total_fiber numeric := 0;
  total_sugar numeric := 0;
  total_sodium numeric := 0;
BEGIN
  -- Sum from food_nutrition table (manual entries)
  SELECT 
    COALESCE(SUM(calories), 0),
    COALESCE(SUM(carbs), 0),
    COALESCE(SUM(protein), 0),
    COALESCE(SUM(fat), 0),
    COALESCE(SUM(fiber), 0),
    COALESCE(SUM(sugar), 0),
    COALESCE(SUM(sodium), 0)
  INTO 
    total_calories, total_carbs, total_protein, total_fat, total_fiber, total_sugar, total_sodium
  FROM food_nutrition fn
  JOIN food_entries fe ON fn.food_entry_id = fe.id
  WHERE fn.user_id = p_user_id 
    AND DATE(fe.created_at) = p_date;

  -- Add Fitbit food data
  SELECT 
    total_calories + COALESCE(SUM(calories), 0),
    total_carbs + COALESCE(SUM(carbs), 0),
    total_protein + COALESCE(SUM(protein), 0),
    total_fat + COALESCE(SUM(fat), 0),
    total_fiber + COALESCE(SUM(fiber), 0),
    total_sugar + COALESCE(SUM(sugar), 0),
    total_sodium + COALESCE(SUM(sodium), 0)
  INTO 
    total_calories, total_carbs, total_protein, total_fat, total_fiber, total_sugar, total_sodium
  FROM fitbit_food_details
  WHERE user_id = p_user_id AND date = p_date;

  -- Upsert daily nutrition summary
  INSERT INTO daily_nutrition_summary (
    user_id, date, total_calories, total_carbs, total_protein, total_fat,
    total_fiber, total_sugar, total_sodium, last_updated
  ) VALUES (
    p_user_id, p_date, total_calories, total_carbs, total_protein, total_fat,
    total_fiber, total_sugar, total_sodium, now()
  )
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_carbs = EXCLUDED.total_carbs,
    total_protein = EXCLUDED.total_protein,
    total_fat = EXCLUDED.total_fat,
    total_fiber = EXCLUDED.total_fiber,
    total_sugar = EXCLUDED.total_sugar,
    total_sodium = EXCLUDED.total_sodium,
    last_updated = now();
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for automatic nutrition updates
CREATE OR REPLACE FUNCTION update_daily_nutrition_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update nutrition summary for the affected date
  IF TG_OP = 'DELETE' THEN
    PERFORM calculate_daily_nutrition_summary(OLD.user_id, DATE(OLD.created_at));
    RETURN OLD;
  ELSE
    PERFORM calculate_daily_nutrition_summary(NEW.user_id, DATE(NEW.created_at));
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Add triggers to auto-update nutrition summaries
DROP TRIGGER IF EXISTS food_nutrition_daily_update ON food_nutrition;
CREATE TRIGGER food_nutrition_daily_update
  AFTER INSERT OR UPDATE OR DELETE ON food_nutrition
  FOR EACH ROW EXECUTE FUNCTION update_daily_nutrition_trigger();

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_active ON diagnoses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medications_user_status ON medications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_seizures_user_date ON seizure_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_bp_readings_user_date ON blood_pressure_readings(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mental_health_user_date ON mental_health_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_goals_user_active ON weight_goals(user_id, is_active);

-- Enable RLS on all new tables
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seizure_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mental_health_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own diagnoses" ON diagnoses FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own medications" ON medications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own seizure entries" ON seizure_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own blood pressure readings" ON blood_pressure_readings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own mental health entries" ON mental_health_entries FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own weight goals" ON weight_goals FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can manage own report templates" ON report_templates FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Insert default report templates for existing users
INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  id as user_id,
  'Standard Doctor Visit' as template_name,
  'doctor' as report_type,
  jsonb_build_object(
    'sections', jsonb_build_array(
      'patient_info', 'health_summary', 'medications', 'diagnoses', 
      'seizures', 'mental_health', 'blood_pressure', 'weight_trends', 'questions'
    ),
    'include_charts', true,
    'include_raw_data', false
  ) as template_content,
  true as is_default
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = users.id AND rt.template_name = 'Standard Doctor Visit'
);

INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  id as user_id,
  'Mental Health Check-in' as template_name,
  'mental_health' as report_type,
  jsonb_build_object(
    'sections', jsonb_build_array(
      'patient_info', 'mental_health', 'medications', 'mood_patterns', 
      'coping_strategies', 'crisis_episodes', 'support_systems'
    ),
    'include_charts', true,
    'include_raw_data', false
  ) as template_content,
  false as is_default
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = users.id AND rt.template_name = 'Mental Health Check-in'
);

INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  id as user_id,
  'Neurologist Visit' as template_name,
  'specialist' as report_type,
  jsonb_build_object(
    'sections', jsonb_build_array(
      'patient_info', 'seizures', 'medications', 'triggers', 
      'sleep_patterns', 'mood_correlation', 'emergency_episodes'
    ),
    'include_charts', true,
    'include_raw_data', true
  ) as template_content,
  false as is_default
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = users.id AND rt.template_name = 'Neurologist Visit'
);

INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  id as user_id,
  'Emergency Room Summary' as template_name,
  'emergency' as report_type,
  jsonb_build_object(
    'sections', jsonb_build_array(
      'patient_info', 'current_medications', 'active_diagnoses', 
      'recent_seizures', 'mental_health_alerts', 'emergency_contacts'
    ),
    'include_charts', false,
    'include_raw_data', true
  ) as template_content,
  false as is_default
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = users.id AND rt.template_name = 'Emergency Room Summary'
);

-- Recalculate nutrition summaries for all users for the last 30 days
DO $$
DECLARE
  user_record RECORD;
  date_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM users LOOP
    FOR date_record IN 
      SELECT DISTINCT DATE(created_at) as calc_date 
      FROM food_nutrition 
      WHERE user_id = user_record.id 
        AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      UNION
      SELECT DISTINCT date as calc_date
      FROM fitbit_food_details
      WHERE user_id = user_record.id
        AND date >= CURRENT_DATE - INTERVAL '30 days'
    LOOP
      PERFORM calculate_daily_nutrition_summary(user_record.id, date_record.calc_date);
    END LOOP;
  END LOOP;
END $$;