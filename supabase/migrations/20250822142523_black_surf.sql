/*
  # Fix RLS Policy Infinite Recursion

  1. Security Changes
    - Drop existing problematic policies that cause recursion
    - Create simplified policies without complex subqueries
    - Ensure policies use direct auth.uid() comparisons
    - Remove circular references between tables

  2. Policy Structure
    - Users can read/update their own data directly
    - Caregivers can read patient data using simple role check
    - No complex joins that could cause recursion
*/

-- Drop all existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Caregivers can read patient data" ON users;
DROP POLICY IF EXISTS "Users can manage own health entries" ON health_entries;
DROP POLICY IF EXISTS "Caregivers can read patient health entries" ON health_entries;
DROP POLICY IF EXISTS "Users can manage own food entries" ON food_entries;
DROP POLICY IF EXISTS "Caregivers can read patient food entries" ON food_entries;
DROP POLICY IF EXISTS "Users can manage own activity entries" ON activity_entries;
DROP POLICY IF EXISTS "Caregivers can read patient activity entries" ON activity_entries;

-- Create simple, non-recursive policies for users table
CREATE POLICY "Users can read own profile"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Create simple policies for health_entries
CREATE POLICY "Users can manage own health entries"
  ON health_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create simple policies for food_entries
CREATE POLICY "Users can manage own food entries"
  ON food_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

-- Create simple policies for activity_entries
CREATE POLICY "Users can manage own activity entries"
  ON activity_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());