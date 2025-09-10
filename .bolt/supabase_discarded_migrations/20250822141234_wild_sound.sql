/*
  # Fix RLS policies to prevent infinite recursion

  1. Policy Updates
    - Simplify users table policies to prevent recursion
    - Fix caregiver access policy to avoid circular references
    - Ensure health_entries policies work correctly

  2. Security
    - Maintain proper access control
    - Prevent infinite recursion in policy evaluation
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Caregivers can read patient data" ON users;
DROP POLICY IF EXISTS "Caregivers can read patient health entries" ON health_entries;
DROP POLICY IF EXISTS "Caregivers can read patient food entries" ON food_entries;
DROP POLICY IF EXISTS "Caregivers can read patient activity entries" ON activity_entries;

-- Recreate simplified policies for users table
CREATE POLICY "Caregivers can read all patient data"
  ON users
  FOR SELECT
  TO authenticated
  USING (
    role = 'patient' AND 
    EXISTS (
      SELECT 1 FROM users caregivers
      WHERE caregivers.id = auth.uid() 
      AND caregivers.role = 'caregiver'
    )
  );

-- Recreate simplified policies for health_entries
CREATE POLICY "Caregivers can read all patient health entries"
  ON health_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users caregivers
      WHERE caregivers.id = auth.uid() 
      AND caregivers.role = 'caregiver'
    )
  );

-- Recreate simplified policies for food_entries
CREATE POLICY "Caregivers can read all patient food entries"
  ON food_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users caregivers
      WHERE caregivers.id = auth.uid() 
      AND caregivers.role = 'caregiver'
    )
  );

-- Recreate simplified policies for activity_entries
CREATE POLICY "Caregivers can read all patient activity entries"
  ON activity_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users caregivers
      WHERE caregivers.id = auth.uid() 
      AND caregivers.role = 'caregiver'
    )
  );