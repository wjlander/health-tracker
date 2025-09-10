/*
  # Fix Row Level Security for report_templates table

  1. Security Changes
    - Drop any existing conflicting policies
    - Create proper RLS policy for authenticated users
    - Allow users to manage only their own report templates
    - Enable all CRUD operations (SELECT, INSERT, UPDATE, DELETE)

  This migration fixes the 401 Unauthorized error when creating report templates.
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "authenticated_users_own_report_templates" ON report_templates;
DROP POLICY IF EXISTS "Users can manage own report templates" ON report_templates;
DROP POLICY IF EXISTS "report_templates_policy" ON report_templates;

-- Ensure RLS is enabled
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Create a comprehensive policy for authenticated users
CREATE POLICY "Users can manage their own report templates"
  ON report_templates
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);