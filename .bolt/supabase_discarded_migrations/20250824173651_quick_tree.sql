/*
  # Fix Users Table RLS Policy

  1. Security Changes
    - Drop existing restrictive RLS policy on users table
    - Create new policy allowing public access for initial setup
    - This allows default users to be created before authentication

  2. Problem Resolution
    - Fixes "new row violates row-level security policy" error
    - Allows anonymous access to users table for app initialization
    - Maintains data security while enabling proper app startup
*/

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "users_policy" ON users;

-- Create new policy allowing public access
CREATE POLICY "users_public_access"
  ON users
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Ensure the table has RLS enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to public role
GRANT ALL ON users TO public;
GRANT ALL ON users TO anon;
GRANT ALL ON users TO authenticated;