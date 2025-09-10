/*
  # Create user_integrations table

  1. New Tables
    - `user_integrations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `provider` (text, e.g., 'fitbit')
      - `access_token` (text, encrypted)
      - `refresh_token` (text, encrypted)
      - `expires_at` (timestamp)
      - `last_sync` (timestamp)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `user_integrations` table
    - Add policy for users to manage their own integrations
    - Add policy for caregivers to read patient integrations
*/

-- Create user_integrations table
CREATE TABLE IF NOT EXISTS user_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  last_sync timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider)
);

-- Enable RLS
ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage own integrations"
  ON user_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Caregivers can read patient integrations"
  ON user_integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'caregiver'
    )
  );

-- Create updated_at trigger
CREATE TRIGGER update_user_integrations_updated_at
  BEFORE UPDATE ON user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();