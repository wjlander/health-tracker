/*
  # Disable RLS for report_templates table
  
  Since the application uses custom authentication instead of Supabase Auth,
  we need to disable RLS and rely on application-level security.
  
  1. Security Changes
    - Disable RLS on report_templates table
    - Remove all existing policies
    - Application will handle user isolation through WHERE clauses
*/

-- Remove all existing policies
DROP POLICY IF EXISTS "Users can manage their own report templates" ON report_templates;
DROP POLICY IF EXISTS "report_templates_policy" ON report_templates;

-- Disable RLS since we're using custom auth
ALTER TABLE report_templates DISABLE ROW LEVEL SECURITY;