/*
  # Fix Weight Goals RLS Policies

  1. Security Updates
    - Drop existing problematic policies
    - Create new working RLS policies for weight_goals table
    - Ensure authenticated users can manage their own weight goals

  2. Policy Details
    - SELECT: Users can read their own weight goals
    - INSERT: Users can create weight goals for themselves
    - UPDATE: Users can update their own weight goals
    - DELETE: Users can delete their own weight goals
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own weight goals" ON weight_goals;
DROP POLICY IF EXISTS "Users can insert own weight goals" ON weight_goals;
DROP POLICY IF EXISTS "Users can update own weight goals" ON weight_goals;
DROP POLICY IF EXISTS "Users can delete own weight goals" ON weight_goals;

-- Create new working policies
CREATE POLICY "Users can read own weight goals"
  ON weight_goals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weight goals"
  ON weight_goals
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

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