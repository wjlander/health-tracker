/*
  # Comprehensive Health Tracking Features

  1. New Tables
    - `diagnoses` - Medical diagnoses tracking
    - `medications` - Current and past medications
    - `seizure_entries` - Seizure tracking with triggers and effects
    - `blood_pressure_readings` - Multiple daily BP readings
    - `mental_health_entries` - Suicidal thoughts and coping mechanisms
    - `outdoor_time_entries` - Time spent outside tracking
    - `weight_goals` - Weight loss/gain goals and progress
    - `report_templates` - Doctor visit report templates
    - `generated_reports` - Generated reports for medical visits

  2. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users to manage their own data

  3. Enums
    - `seizure_type` - Different types of seizures
    - `medication_status` - Active, discontinued, etc.
    - `report_type` - Doctor, mental health, specialist visits
    - `weight_goal_type` - Loss, gain, maintain
*/

-- Create enum types for new features
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'seizure_type') THEN
    CREATE TYPE seizure_type AS ENUM ('focal', 'generalized', 'absence', 'tonic_clonic', 'myoclonic', 'atonic', 'unknown');
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
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
    CREATE TYPE report_type AS ENUM ('doctor', 'mental_health', 'specialist', 'emergency', 'routine_checkup');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'weight_goal_type') THEN
    CREATE TYPE weight_goal_type AS ENUM ('loss', 'gain', 'maintain');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'severity_level') THEN
    CREATE TYPE severity_level AS ENUM ('mild', 'moderate', 'severe', 'critical');
  END IF;
END $$;

-- Diagnoses table
CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  diagnosis_name text NOT NULL,
  diagnosis_code text, -- ICD-10 code
  diagnosed_date date,
  diagnosed_by text, -- Doctor/specialist name
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
  frequency text NOT NULL, -- e.g., "twice daily", "as needed"
  prescribed_by text,
  prescribed_date date,
  status medication_status DEFAULT 'active',
  start_date date,
  end_date date,
  side_effects text[],
  effectiveness_rating integer CHECK (effectiveness_rating >= 1 AND effectiveness_rating <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seizure tracking
CREATE TABLE IF NOT EXISTS seizure_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  seizure_type seizure_type DEFAULT 'unknown',
  duration_seconds integer, -- Duration in seconds
  severity severity_level DEFAULT 'moderate',
  triggers text[], -- Potential triggers
  warning_signs text[], -- Aura or warning signs
  post_seizure_effects text[], -- Effects after seizure
  location text, -- Where it happened
  witnesses text[], -- Who was present
  emergency_services_called boolean DEFAULT false,
  medication_taken text, -- Rescue medication
  recovery_time_minutes integer, -- Time to feel normal again
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Blood pressure readings (multiple per day)
CREATE TABLE IF NOT EXISTS blood_pressure_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL DEFAULT CURRENT_TIME,
  systolic integer NOT NULL CHECK (systolic > 0 AND systolic < 300),
  diastolic integer NOT NULL CHECK (diastolic > 0 AND diastolic < 200),
  heart_rate integer CHECK (heart_rate > 0 AND heart_rate < 300),
  position text DEFAULT 'sitting', -- sitting, standing, lying
  arm text DEFAULT 'left', -- left, right
  cuff_size text DEFAULT 'standard', -- standard, large, small
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Mental health and suicidal thoughts tracking
CREATE TABLE IF NOT EXISTS mental_health_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time DEFAULT CURRENT_TIME,
  suicidal_thoughts boolean DEFAULT false,
  thoughts_intensity integer CHECK (thoughts_intensity >= 1 AND thoughts_intensity <= 10),
  thoughts_duration text, -- "minutes", "hours", "all day"
  triggers text[], -- What triggered the thoughts
  coping_mechanisms_used text[], -- What helped
  support_contacted boolean DEFAULT false,
  support_person text, -- Who they contacted
  safety_plan_followed boolean DEFAULT false,
  mood_before integer CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after integer CHECK (mood_after >= 1 AND mood_after <= 10),
  notes text DEFAULT '',
  is_crisis boolean DEFAULT false, -- Mark as crisis situation
  created_at timestamptz DEFAULT now()
);

-- Outdoor time tracking
CREATE TABLE IF NOT EXISTS outdoor_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time_logged timestamptz DEFAULT now(),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  activity_type text DEFAULT 'general', -- walking, gardening, sports, etc.
  weather_conditions text,
  mood_before integer CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after integer CHECK (mood_after >= 1 AND mood_after <= 10),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Weight goals and tracking
CREATE TABLE IF NOT EXISTS weight_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type weight_goal_type NOT NULL,
  start_weight numeric(6,2) NOT NULL,
  target_weight numeric(6,2) NOT NULL,
  target_date date,
  weekly_goal numeric(4,2), -- lbs per week
  start_date date DEFAULT CURRENT_DATE,
  is_active boolean DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Report templates for doctor visits
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  template_name text NOT NULL,
  report_type report_type NOT NULL,
  template_content jsonb NOT NULL DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Generated reports
CREATE TABLE IF NOT EXISTS generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  report_name text NOT NULL,
  report_type report_type NOT NULL,
  date_range_start date NOT NULL,
  date_range_end date NOT NULL,
  report_data jsonb NOT NULL DEFAULT '{}',
  generated_at timestamptz DEFAULT now(),
  doctor_name text,
  appointment_date date,
  notes text DEFAULT ''
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_diagnoses_user_active ON diagnoses(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_medications_user_status ON medications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_seizure_entries_user_date ON seizure_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_blood_pressure_user_date ON blood_pressure_readings(user_id, date DESC, time DESC);
CREATE INDEX IF NOT EXISTS idx_mental_health_user_date ON mental_health_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_outdoor_time_user_date ON outdoor_time_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_weight_goals_user_active ON weight_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_report_templates_user_type ON report_templates(user_id, report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_user_date ON generated_reports(user_id, generated_at DESC);

-- Enable RLS on all new tables
ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE seizure_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_pressure_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mental_health_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE outdoor_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnoses
CREATE POLICY "Users can manage own diagnoses"
  ON diagnoses
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for medications
CREATE POLICY "Users can manage own medications"
  ON medications
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for seizure entries
CREATE POLICY "Users can manage own seizure entries"
  ON seizure_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for blood pressure readings
CREATE POLICY "Users can manage own blood pressure readings"
  ON blood_pressure_readings
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for mental health entries
CREATE POLICY "Users can manage own mental health entries"
  ON mental_health_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for outdoor time entries
CREATE POLICY "Users can manage own outdoor time entries"
  ON outdoor_time_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for weight goals
CREATE POLICY "Users can manage own weight goals"
  ON weight_goals
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for report templates
CREATE POLICY "Users can manage own report templates"
  ON report_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for generated reports
CREATE POLICY "Users can manage own generated reports"
  ON generated_reports
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create triggers for updated_at columns
CREATE TRIGGER update_diagnoses_updated_at
  BEFORE UPDATE ON diagnoses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weight_goals_updated_at
  BEFORE UPDATE ON weight_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_report_templates_updated_at
  BEFORE UPDATE ON report_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default report templates
INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
SELECT 
  u.id,
  'Standard Doctor Visit',
  'doctor',
  '{
    "sections": [
      {"title": "Current Symptoms", "type": "symptoms", "include_severity": true},
      {"title": "Medication Changes", "type": "medications", "include_effectiveness": true},
      {"title": "Mood & Energy Trends", "type": "mood_energy", "include_charts": true},
      {"title": "Sleep Patterns", "type": "sleep", "include_quality": true},
      {"title": "Seizure Activity", "type": "seizures", "include_triggers": true},
      {"title": "Blood Pressure Summary", "type": "blood_pressure", "include_averages": true},
      {"title": "Weight Progress", "type": "weight", "include_goals": true},
      {"title": "Questions for Doctor", "type": "questions", "editable": true}
    ]
  }',
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
  '{
    "sections": [
      {"title": "Mood Patterns", "type": "mood_detailed", "include_triggers": true},
      {"title": "Suicidal Thoughts", "type": "mental_health", "include_coping": true},
      {"title": "Medication Effectiveness", "type": "medications", "filter_mental_health": true},
      {"title": "Sleep Impact", "type": "sleep", "correlation_mood": true},
      {"title": "Outdoor Time Benefits", "type": "outdoor_time", "include_mood_impact": true},
      {"title": "Coping Strategies Used", "type": "coping_mechanisms", "effectiveness": true},
      {"title": "Safety Plan Review", "type": "safety_plan", "editable": true},
      {"title": "Goals for Next Visit", "type": "goals", "editable": true}
    ]
  }',
  true
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM report_templates rt 
  WHERE rt.user_id = u.id AND rt.template_name = 'Mental Health Check-in'
);

-- Create unique constraints
ALTER TABLE diagnoses ADD CONSTRAINT IF NOT EXISTS diagnoses_user_name_unique UNIQUE (user_id, diagnosis_name);
ALTER TABLE medications ADD CONSTRAINT IF NOT EXISTS medications_user_name_unique UNIQUE (user_id, medication_name, start_date);
ALTER TABLE weight_goals ADD CONSTRAINT IF NOT EXISTS weight_goals_user_active_unique UNIQUE (user_id, is_active) DEFERRABLE INITIALLY DEFERRED;

-- Add check constraints
ALTER TABLE seizure_entries ADD CONSTRAINT IF NOT EXISTS seizure_duration_positive CHECK (duration_seconds > 0);
ALTER TABLE outdoor_time_entries ADD CONSTRAINT IF NOT EXISTS outdoor_duration_positive CHECK (duration_minutes > 0);
ALTER TABLE weight_goals ADD CONSTRAINT IF NOT EXISTS weight_goals_valid_range CHECK (start_weight > 0 AND target_weight > 0);