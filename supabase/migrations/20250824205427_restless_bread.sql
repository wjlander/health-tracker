/*
  # Add tracking_preferences column to users table

  1. Schema Changes
    - Add `tracking_preferences` column to `users` table
    - Column type: jsonb with default empty object
    - Allows storing user preferences for tracking settings, units, and caregiver section visibility

  2. Purpose
    - Store user-specific preferences like weight units, temperature units
    - Store caregiver section visibility preferences
    - Store notification and theme preferences
    - Maintain backward compatibility with existing users
*/

-- Add tracking_preferences column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'tracking_preferences'
  ) THEN
    ALTER TABLE public.users 
    ADD COLUMN tracking_preferences jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update existing users to have default preferences if they don't have any
UPDATE public.users 
SET tracking_preferences = '{
  "weight_unit": "lbs",
  "temperature_unit": "fahrenheit",
  "notifications_enabled": true,
  "data_sharing": false,
  "theme": "light",
  "language": "en"
}'::jsonb
WHERE tracking_preferences IS NULL OR tracking_preferences = '{}'::jsonb;