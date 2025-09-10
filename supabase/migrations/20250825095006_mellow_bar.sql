/*
  # Fix Weight Goals RLS Policy

  1. Security
    - Enable RLS on weight_goals table
    - Add proper policies for authenticated users to manage their own weight goals

  2. Changes
    - Users can insert their own weight goals
    - Users can read their own weight goals
    - Users can update their own weight goals
    - Users can delete their own weight goals
*/

-- Enable RLS on weight_goals table
ALTER TABLE weight_goals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own weight goals" ON weight_goals;

-- Create comprehensive RLS policies
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