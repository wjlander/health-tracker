/*
  # Create Weight Goals Table

  1. New Tables
    - `weight_goals` - Weight goal tracking with start/target weights and timeline
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `goal_type` (enum: loss, gain, maintain)
      - `start_weight` (numeric)
      - `target_weight` (numeric)
      - `target_date` (date, optional)
      - `weekly_goal` (numeric)
      - `start_date` (date)
      - `is_active` (boolean)
      - `notes` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on weight_goals table
    - Add policies for authenticated users to manage their own weight goals

  3. Constraints
    - Only one active goal per user
    - Positive weight values
    - Reasonable weekly goals
*/

-- Create goal type enum
DO $$ BEGIN
    CREATE TYPE goal_type AS ENUM ('loss', 'gain', 'maintain');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create weight_goals table
CREATE TABLE IF NOT EXISTS weight_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type goal_type NOT NULL DEFAULT 'loss',
  start_weight numeric(6,2) NOT NULL CHECK (start_weight > 0),
  target_weight numeric(6,2) NOT NULL CHECK (target_weight > 0),
  target_date date,
  weekly_goal numeric(4,2) NOT NULL DEFAULT 1.0 CHECK (weekly_goal > 0 AND weekly_goal <= 10),
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  is_active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on weight_goals table
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for weight_goals
CREATE POLICY "Users can insert own weight goals"
  ON weight_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own weight goals"
  ON weight_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own weight goals"
  ON weight_goals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weight goals"
  ON weight_goals
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_weight_goals_user_active ON weight_goals(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_weight_goals_user_date ON weight_goals(user_id, created_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_weight_goals_updated_at
  BEFORE UPDATE ON weight_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add constraint to ensure only one active goal per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_goals_one_active_per_user 
  ON weight_goals(user_id) 
  WHERE is_active = true;