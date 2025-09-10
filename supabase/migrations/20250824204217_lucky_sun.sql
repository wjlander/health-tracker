/*
  # Fix report templates RLS policy

  1. Security Updates
    - Drop existing conflicting policies on report_templates table
    - Create proper RLS policy for authenticated users to manage their own templates
    - Ensure users can insert, select, update, and delete only their own report templates

  2. Changes
    - Remove any existing policies that might be causing conflicts
    - Add comprehensive policy for authenticated users based on user_id matching
*/

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Users can manage own report templates" ON report_templates;
DROP POLICY IF EXISTS "report_templates_policy" ON report_templates;

-- Ensure RLS is enabled
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Create a comprehensive policy for authenticated users
CREATE POLICY "authenticated_users_own_report_templates"
  ON report_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);