/*
  # Add Bowel Movement Tracking and Notifications

  1. New Tables
    - `bowel_movements` - Track bowel movement frequency, consistency, and symptoms
    - `notifications` - Store notification preferences and settings
    - `reminders` - Custom reminders for medications, appointments, etc.

  2. Security
    - Enable RLS on all new tables
    - Add policies for user data isolation

  3. Features
    - Bristol Stool Chart classification
    - Symptom tracking for digestive health
    - Custom reminder system
    - Notification preferences
*/

-- Create bowel movement tracking table
CREATE TABLE IF NOT EXISTS bowel_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  time time NOT NULL,
  bristol_scale integer CHECK (bristol_scale >= 1 AND bristol_scale <= 7),
  consistency text CHECK (consistency IN ('hard', 'normal', 'soft', 'loose', 'watery')),
  color text CHECK (color IN ('brown', 'green', 'yellow', 'black', 'red', 'pale')),
  urgency integer CHECK (urgency >= 1 AND urgency <= 10),
  completeness integer CHECK (completeness >= 1 AND completeness <= 10),
  pain_level integer CHECK (pain_level >= 0 AND pain_level <= 10),
  blood_present boolean DEFAULT false,
  mucus_present boolean DEFAULT false,
  symptoms text[] DEFAULT '{}',
  medications_taken text,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('reminder', 'alert', 'sync', 'goal', 'health_tip')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false,
  scheduled_for timestamptz,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL CHECK (reminder_type IN ('medication', 'appointment', 'exercise', 'water', 'custom')),
  title text NOT NULL,
  description text,
  frequency text NOT NULL CHECK (frequency IN ('once', 'daily', 'weekly', 'monthly', 'custom')),
  time_of_day time,
  days_of_week integer[] DEFAULT '{}', -- 0=Sunday, 1=Monday, etc.
  start_date date NOT NULL,
  end_date date,
  is_active boolean DEFAULT true,
  last_triggered timestamptz,
  next_trigger timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_bowel_movements_user_date ON bowel_movements(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_scheduled ON notifications(user_id, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_reminders_user_active ON reminders(user_id, is_active, next_trigger);

-- Enable RLS
ALTER TABLE bowel_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage own bowel movements"
ON bowel_movements FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own notifications"
ON notifications FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can manage own reminders"
ON reminders FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add updated_at trigger for reminders
CREATE TRIGGER update_reminders_updated_at
  BEFORE UPDATE ON reminders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate next reminder trigger time
CREATE OR REPLACE FUNCTION calculate_next_reminder_trigger(
  p_reminder_id uuid,
  p_frequency text,
  p_time_of_day time,
  p_days_of_week integer[],
  p_start_date date,
  p_last_triggered timestamptz
) RETURNS timestamptz AS $$
DECLARE
  next_trigger timestamptz;
  current_time timestamptz := now();
  target_date date;
  target_datetime timestamptz;
BEGIN
  CASE p_frequency
    WHEN 'once' THEN
      -- One-time reminder
      next_trigger := p_start_date::timestamp + p_time_of_day;
      IF next_trigger <= current_time THEN
        RETURN NULL; -- Already passed
      END IF;
      
    WHEN 'daily' THEN
      -- Daily reminder
      target_date := CURRENT_DATE;
      target_datetime := target_date::timestamp + p_time_of_day;
      
      IF target_datetime <= current_time THEN
        target_datetime := (target_date + INTERVAL '1 day')::timestamp + p_time_of_day;
      END IF;
      
      next_trigger := target_datetime;
      
    WHEN 'weekly' THEN
      -- Weekly reminder on specific days
      IF array_length(p_days_of_week, 1) IS NULL THEN
        RETURN NULL; -- No days specified
      END IF;
      
      -- Find next occurrence of any specified day
      FOR i IN 0..6 LOOP
        target_date := CURRENT_DATE + i;
        IF EXTRACT(DOW FROM target_date)::integer = ANY(p_days_of_week) THEN
          target_datetime := target_date::timestamp + p_time_of_day;
          IF target_datetime > current_time THEN
            next_trigger := target_datetime;
            EXIT;
          END IF;
        END IF;
      END LOOP;
      
    WHEN 'monthly' THEN
      -- Monthly reminder on the same day of month
      target_date := date_trunc('month', CURRENT_DATE)::date + (EXTRACT(DAY FROM p_start_date) - 1)::integer;
      target_datetime := target_date::timestamp + p_time_of_day;
      
      IF target_datetime <= current_time THEN
        target_date := (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::date + (EXTRACT(DAY FROM p_start_date) - 1)::integer;
        target_datetime := target_date::timestamp + p_time_of_day;
      END IF;
      
      next_trigger := target_datetime;
      
    ELSE
      RETURN NULL;
  END CASE;
  
  RETURN next_trigger;
END;
$$ LANGUAGE plpgsql;

-- Function to update reminder trigger times
CREATE OR REPLACE FUNCTION update_reminder_triggers()
RETURNS void AS $$
DECLARE
  reminder_record RECORD;
  next_trigger timestamptz;
BEGIN
  FOR reminder_record IN 
    SELECT * FROM reminders 
    WHERE is_active = true 
    AND (next_trigger IS NULL OR next_trigger <= now())
  LOOP
    next_trigger := calculate_next_reminder_trigger(
      reminder_record.id,
      reminder_record.frequency,
      reminder_record.time_of_day,
      reminder_record.days_of_week,
      reminder_record.start_date,
      reminder_record.last_triggered
    );
    
    UPDATE reminders 
    SET next_trigger = next_trigger
    WHERE id = reminder_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql;