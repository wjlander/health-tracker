/*
  # Add heartburn tracking and fix report templates

  1. New Tables
    - `heartburn_entries` - Track heartburn episodes with severity and triggers
    - `heartburn_food_correlations` - Link heartburn episodes to specific foods

  2. Report Templates Fix
    - Ensure proper template structure
    - Add template management functions

  3. Heartburn Features
    - Track severity, timing, and duration
    - Automatic food correlation detection
    - Pattern analysis for trigger identification
*/

-- Create heartburn entries table
CREATE TABLE IF NOT EXISTS heartburn_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  severity integer NOT NULL CHECK (severity >= 1 AND severity <= 10),
  duration_minutes integer DEFAULT 0,
  triggers text[] DEFAULT '{}',
  relief_methods text[] DEFAULT '{}',
  medication_taken text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create heartburn-food correlation table
CREATE TABLE IF NOT EXISTS heartburn_food_correlations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  heartburn_entry_id uuid NOT NULL REFERENCES heartburn_entries(id) ON DELETE CASCADE,
  food_entry_id uuid NOT NULL REFERENCES food_entries(id) ON DELETE CASCADE,
  time_between_hours numeric(4,2), -- Hours between eating and heartburn
  correlation_strength numeric(3,2) DEFAULT 0.5, -- 0-1 scale
  created_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_heartburn_user_date ON heartburn_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_heartburn_correlations_user ON heartburn_food_correlations(user_id);
CREATE INDEX IF NOT EXISTS idx_heartburn_correlations_heartburn ON heartburn_food_correlations(heartburn_entry_id);

-- Enable RLS
ALTER TABLE heartburn_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE heartburn_food_correlations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own heartburn entries"
ON heartburn_entries FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own heartburn correlations"
ON heartburn_food_correlations FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Function to automatically detect food correlations when heartburn is logged
CREATE OR REPLACE FUNCTION detect_heartburn_food_correlations(p_heartburn_id uuid)
RETURNS void AS $$
DECLARE
    v_heartburn_record heartburn_entries%ROWTYPE;
    v_food_record RECORD;
    v_time_diff numeric;
BEGIN
    -- Get the heartburn entry
    SELECT * INTO v_heartburn_record
    FROM heartburn_entries
    WHERE id = p_heartburn_id;
    
    -- Find food entries from the same day and previous day
    FOR v_food_record IN
        SELECT fe.*, 
               EXTRACT(EPOCH FROM (
                   (v_heartburn_record.date + v_heartburn_record.time) - 
                   (fe.created_at::date + COALESCE(fe.time, '12:00'::time))
               )) / 3600 as hours_diff
        FROM food_entries fe
        WHERE fe.user_id = v_heartburn_record.user_id
        AND fe.created_at::date >= v_heartburn_record.date - INTERVAL '1 day'
        AND fe.created_at::date <= v_heartburn_record.date
        AND EXTRACT(EPOCH FROM (
            (v_heartburn_record.date + v_heartburn_record.time) - 
            (fe.created_at::date + COALESCE(fe.time, '12:00'::time))
        )) / 3600 BETWEEN 0 AND 6 -- Within 6 hours before heartburn
    LOOP
        v_time_diff := v_food_record.hours_diff;
        
        -- Calculate correlation strength based on time proximity
        -- Closer in time = higher correlation
        INSERT INTO heartburn_food_correlations (
            user_id,
            heartburn_entry_id,
            food_entry_id,
            time_between_hours,
            correlation_strength
        ) VALUES (
            v_heartburn_record.user_id,
            p_heartburn_id,
            v_food_record.id,
            v_time_diff,
            GREATEST(0.1, 1.0 - (v_time_diff / 6.0)) -- Higher correlation for foods eaten closer to heartburn
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically detect correlations when heartburn is logged
CREATE OR REPLACE FUNCTION trigger_heartburn_correlation_detection()
RETURNS trigger AS $$
BEGIN
    PERFORM detect_heartburn_food_correlations(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS heartburn_correlation_trigger ON heartburn_entries;
CREATE TRIGGER heartburn_correlation_trigger
    AFTER INSERT ON heartburn_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_heartburn_correlation_detection();

-- Fix the nutrition calculation function to properly aggregate Fitbit data
CREATE OR REPLACE FUNCTION calculate_daily_nutrition_summary(p_user_id uuid, p_date date)
RETURNS void AS $$
DECLARE
    v_total_calories numeric := 0;
    v_total_carbs numeric := 0;
    v_total_protein numeric := 0;
    v_total_fat numeric := 0;
    v_total_fiber numeric := 0;
    v_total_sugar numeric := 0;
    v_total_sodium numeric := 0;
    v_fitbit_calories numeric := 0;
BEGIN
    -- Calculate totals from manual food entries
    SELECT 
        COALESCE(SUM(calories), 0),
        COALESCE(SUM(carbs), 0),
        COALESCE(SUM(protein), 0),
        COALESCE(SUM(fat), 0),
        COALESCE(SUM(fiber), 0),
        COALESCE(SUM(sugar), 0),
        COALESCE(SUM(sodium), 0)
    INTO 
        v_total_calories,
        v_total_carbs,
        v_total_protein,
        v_total_fat,
        v_total_fiber,
        v_total_sugar,
        v_total_sodium
    FROM food_nutrition fn
    JOIN food_entries fe ON fn.food_entry_id = fe.id
    WHERE fe.user_id = p_user_id 
    AND fe.created_at::date = p_date;

    -- Add Fitbit food data
    SELECT COALESCE(calories, 0)
    INTO v_fitbit_calories
    FROM fitbit_foods
    WHERE user_id = p_user_id AND date = p_date;
    
    -- Combine totals
    v_total_calories := v_total_calories + v_fitbit_calories;

    -- Upsert the daily summary
    INSERT INTO daily_nutrition_summary (
        user_id, date, 
        total_calories, total_carbs, total_protein, total_fat,
        total_fiber, total_sugar, total_sodium,
        last_updated
    ) VALUES (
        p_user_id, p_date,
        v_total_calories, v_total_carbs, v_total_protein, v_total_fat,
        v_total_fiber, v_total_sugar, v_total_sodium,
        now()
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

-- Ensure report_templates table exists with proper structure
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  report_type text NOT NULL CHECK (report_type IN ('doctor', 'mental_health', 'specialist', 'emergency', 'routine_checkup')),
  template_content jsonb DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on report_templates
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for report_templates
DROP POLICY IF EXISTS "Users can manage own report templates" ON report_templates;
CREATE POLICY "Users can manage own report templates"
ON report_templates FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add index for report templates
CREATE INDEX IF NOT EXISTS idx_report_templates_user_type ON report_templates(user_id, report_type);

-- Create default report templates for all users
INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  u.id,
  'Standard Doctor Visit',
  'doctor',
  '{"sections": ["patient_info", "health_summary", "medications", "diagnoses", "seizures", "mental_health", "blood_pressure", "weight_trends", "questions"], "include_charts": true, "include_raw_data": false}',
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = u.id AND rt.template_name = 'Standard Doctor Visit'
);

INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  u.id,
  'Mental Health Check-in',
  'mental_health',
  '{"sections": ["patient_info", "mental_health", "medications", "mood_patterns", "coping_strategies", "crisis_episodes", "support_systems"], "include_charts": true, "include_raw_data": false}',
  false
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = u.id AND rt.template_name = 'Mental Health Check-in'
);

INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  u.id,
  'Neurologist Visit',
  'specialist',
  '{"sections": ["patient_info", "seizures", "medications", "triggers", "sleep_patterns", "mood_correlation", "emergency_episodes"], "include_charts": true, "include_raw_data": true}',
  false
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = u.id AND rt.template_name = 'Neurologist Visit'
);

INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  u.id,
  'Emergency Room Summary',
  'emergency',
  '{"sections": ["patient_info", "medications", "diagnoses", "recent_seizures", "mental_health_alerts", "emergency_contacts"], "include_charts": false, "include_raw_data": true}',
  false
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = u.id AND rt.template_name = 'Emergency Room Summary'
);