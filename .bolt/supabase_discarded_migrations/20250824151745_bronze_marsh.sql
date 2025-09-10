/*
  # Women's Health Tracking Tables

  1. New Tables
    - `menstrual_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `date` (date)
      - `cycle_day` (integer, day in current cycle)
      - `flow_intensity` (enum: none, light, medium, heavy)
      - `symptoms` (text array for multiple symptoms)
      - `cycle_phase` (enum: menstrual, follicular, ovulation, luteal)
      - `notes` (text)
      - `created_at` (timestamp)

    - `premenopausal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `date` (date)
      - `hot_flashes` (integer, count per day)
      - `night_sweats` (boolean)
      - `mood_swings` (integer, 1-10 scale)
      - `irregular_periods` (boolean)
      - `sleep_disturbances` (boolean)
      - `joint_aches` (boolean)
      - `brain_fog` (integer, 1-10 scale)
      - `weight_changes` (boolean)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
</*/

-- Create flow intensity enum
CREATE TYPE IF NOT EXISTS flow_intensity AS ENUM ('none', 'light', 'medium', 'heavy');

-- Create cycle phase enum
CREATE TYPE IF NOT EXISTS cycle_phase AS ENUM ('menstrual', 'follicular', 'ovulation', 'luteal');

-- Create menstrual entries table
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

-- Create premenopausal entries table
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

-- Enable RLS
ALTER TABLE menstrual_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE premenopausal_entries ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own menstrual data"
  ON menstrual_entries
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own premenopausal data"
  ON premenopausal_entries
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_menstrual_entries_user_date ON menstrual_entries(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_premenopausal_entries_user_date ON premenopausal_entries(user_id, date DESC);