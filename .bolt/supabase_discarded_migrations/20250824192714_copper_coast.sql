/*
  # Comprehensive Health Tracking Schema

  1. New Tables
    - `diagnoses` - Medical diagnoses with ICD codes and severity
    - `medications` - Medication tracking with effectiveness and side effects
    - `seizure_entries` - Detailed seizure logging with triggers and effects
    - `blood_pressure_readings` - BP readings with position and timing details
    - `mental_health_entries` - Suicidal thoughts and coping mechanism tracking
    - `outdoor_time_entries` - Time spent outside with mood correlation
    - `weight_goals` - Weight management goals with progress tracking
    - `report_templates` - Customizable medical report templates
    - `generated_reports` - Generated reports for doctor visits

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data

  3. Enums
    - Add severity levels, medication status, seizure types
    - Blood pressure positions and mental health scales
*/

-- Create enum types for new features
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_level') THEN
    CREATE TYPE severity_level AS ENUM ('mild', 'moderate', 'severe', 'critical');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medication_status') THEN
    CREATE TYPE medication_status AS ENUM ('active', 'discontinued', 'paused', 'as_needed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seizure_type') THEN
    CREATE TYPE seizure_type AS ENUM ('focal', 'generalized', 'absence', 'tonic_clonic', 'myoclonic', 'atonic', 'unknown');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'goal_type') THEN
    CREATE TYPE goal_type AS ENUM ('loss', 'gain', 'maintain');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
    CREATE TYPE report_type AS ENUM ('doctor', 'mental_health', 'specialist', 'emergency', 'routine_checkup');
  END IF;
END $$;

-- Diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diagnosis_name text NOT NULL,
  diagnosis_code text,
  diagnosed_date date,
  diagnosed_by text,
  severity severity_level DEFAULT 'moderate',
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  prescribed_by text,
  prescribed_date date,
  status medication_status DEFAULT 'active',
  start_date date,
  end_date date,
  side_effects text[] DEFAULT '{}',
  effectiveness_rating integer CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seizure entries table
CREATE TABLE IF NOT EXISTS seizure_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  seizure_type seizure_type DEFAULT 'unknown',
  duration_seconds integer DEFAULT 0,
  severity severity_level DEFAULT 'moderate',
  triggers text[] DEFAULT '{}',
  warning_signs text[] DEFAULT '{}',
  post_seizure_effects text[] DEFAULT '{}',
  location text,
  witnesses text[] DEFAULT '{}',
  emergency_services_called boolean DEFAULT false,
  medication_taken text,
  recovery_time_minutes integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Blood pressure readings table
CREATE TABLE IF NOT EXISTS blood_pressure_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  systolic integer NOT NULL CHECK (systolic > 0 AND systolic < 300),
  diastolic integer NOT NULL CHECK (diastolic > 0 AND diastolic < 200),
  heart_rate integer CHECK (heart_rate > 0 AND heart_rate < 250),
  position text DEFAULT 'sitting',
  arm text DEFAULT 'left',
  cuff_size text DEFAULT 'standard',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Mental health entries table
CREATE TABLE IF NOT EXISTS mental_health_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  suicidal_thoughts boolean DEFAULT false,
  thoughts_intensity integer CHECK (thoughts_intensity >= 1 AND thoughts_intensity <= 10),
  thoughts_duration text,
  triggers text[] DEFAULT '{}',
  coping_mechanisms_used text[] DEFAULT '{}',
  support_contacted boolean DEFAULT false,
  support_person text,
  safety_plan_followed boolean DEFAULT false,
  mood_before integer CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after integer CHECK (mood_after >= 1 AND mood_after <= 10),
  notes text DEFAULT '',
  is_crisis boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Outdoor time entries table
CREATE TABLE IF NOT EXISTS outdoor_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_logged time DEFAULT CURRENT_TIME,
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  activity_type text DEFAULT 'general',
  weather_conditions text,
  mood_before integer CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after integer CHECK (mood_after >= 1 AND mood_after <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Weight goals table
CREATE TABLE IF NOT EXISTS weight_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type goal_type NOT NULL,
  start_weight numeric(6,2) NOT NULL CHECK (start_weight > 0),
  target_weight numeric(6,2) NOT NULL CHECK (target_weight > 0),
  target_date date,
  weekly_goal numeric(4,2) CHECK (weekly_goal > 0),
  start_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report templates table
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  report_type report_type NOT NULL,
  template_content jsonb DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generated reports table
CREATE TABLE IF NOT EXISTS generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_name text NOT NULL,
  report_type report_type NOT NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  report_data jsonb DEFAULT '{}',
  generated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_active ON diagnoses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medications_user_status ON medications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_seizures_user_date ON seizure_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_blood_pressure_user_date ON blood_pressure_readings(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_mental_health_user_date ON mental_health_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_outdoor_time_user_date ON outdoor_time_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_goals_user_active ON weight_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_report_templates_user_type ON report_templates(user_id, report_type);

-- Enable Row Level Security
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seizure_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mental_health_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outdoor_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for diagnoses
CREATE POLICY "Users can manage own diagnoses"
  ON diagnoses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for medications
CREATE POLICY "Users can manage own medications"
  ON medications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for seizure entries
CREATE POLICY "Users can manage own seizure entries"
  ON seizure_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for blood pressure readings
CREATE POLICY "Users can manage own blood pressure readings"
  ON blood_pressure_readings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for mental health entries
CREATE POLICY "Users can manage own mental health entries"
  ON mental_health_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for outdoor time entries
CREATE POLICY "Users can manage own outdoor time entries"
  ON outdoor_time_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for weight goals
CREATE POLICY "Users can manage own weight goals"
  ON weight_goals
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for report templates
CREATE POLICY "Users can manage own report templates"
  ON report_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create RLS policies for generated reports
CREATE POLICY "Users can manage own generated reports"
  ON generated_reports
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for tables that need updated_at
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_diagnoses_updated_at') THEN
    CREATE TRIGGER update_diagnoses_updated_at
      BEFORE UPDATE ON diagnoses
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_medications_updated_at') THEN
    CREATE TRIGGER update_medications_updated_at
      BEFORE UPDATE ON medications
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_weight_goals_updated_at') THEN
    CREATE TRIGGER update_weight_goals_updated_at
      BEFORE UPDATE ON weight_goals
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_report_templates_updated_at') THEN
    CREATE TRIGGER update_report_templates_updated_at
      BEFORE UPDATE ON report_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Insert default report templates
INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  u.id,
  'Standard Doctor Visit',
  'doctor',
  '{"sections": ["health_summary", "medications", "diagnoses", "recent_symptoms", "questions"]}',
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
  '{"sections": ["mental_health_summary", "medications", "coping_strategies", "crisis_episodes", "goals"]}',
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = u.id AND rt.template_name = 'Mental Health Check-in'
);

INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  u.id,
  'Seizure Specialist Report',
  'specialist',
  '{"sections": ["seizure_summary", "medications", "triggers", "patterns", "emergency_episodes"]}',
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = u.id AND rt.template_name = 'Seizure Specialist Report'
);