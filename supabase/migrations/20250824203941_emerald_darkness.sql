/*
  # Fix Row Level Security for report_templates table

  1. Security Changes
    - Enable RLS on report_templates table
    - Add policy for authenticated users to manage their own templates
    - Allow users to insert, select, update, and delete their own report templates

  2. Notes
    - Users can only access templates where user_id matches their auth.uid()
    - This ensures data isolation between users
*/

-- Enable RLS on report_templates table
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage own report templates" ON report_templates;
DROP POLICY IF EXISTS "report_templates_policy" ON report_templates;

-- Create comprehensive policy for authenticated users to manage their own templates
CREATE POLICY "Users can manage own report templates"
  ON report_templates
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());