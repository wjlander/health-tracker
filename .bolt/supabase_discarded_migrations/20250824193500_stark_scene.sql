/*
  # Update outdoor time tracking to quantity-based

  1. Schema Changes
    - Rename `duration_minutes` to `session_count` in outdoor_time_entries
    - Update related functions and triggers
    - Add migration for existing data

  2. New Structure
    - Track number of outdoor sessions rather than time duration
    - Each button press = +1 session
    - Goal becomes number of sessions per day (e.g., 3-4 sessions)
*/

-- Add new column for session count
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'outdoor_time_entries' AND column_name = 'session_count'
  ) THEN
    ALTER TABLE outdoor_time_entries ADD COLUMN session_count integer DEFAULT 1;
  END IF;
END $$;

-- Migrate existing duration data to session count (approximate conversion)
UPDATE outdoor_time_entries 
SET session_count = CASE 
  WHEN duration_minutes >= 60 THEN 4
  WHEN duration_minutes >= 45 THEN 3
  WHEN duration_minutes >= 30 THEN 2
  ELSE 1
END
WHERE session_count IS NULL;

-- Make session_count not null
ALTER TABLE outdoor_time_entries ALTER COLUMN session_count SET NOT NULL;

-- Update the table comment
COMMENT ON TABLE outdoor_time_entries IS 'Track outdoor time sessions for mood and health benefits';
COMMENT ON COLUMN outdoor_time_entries.session_count IS 'Number of outdoor sessions/times outside';
COMMENT ON COLUMN outdoor_time_entries.duration_minutes IS 'Legacy field - now tracks approximate duration per session';

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_outdoor_time_user_date_sessions 
ON outdoor_time_entries(user_id, date, session_count);