/*
  # Fix enum type creation syntax

  1. Enum Types
    - Create user_role enum safely
    - Create meal_category enum safely
    - Create activity_intensity enum safely
    - Create flow_intensity enum safely
    - Create cycle_phase enum safely
    - Create lab_test_category enum safely
    - Create lab_result_status enum safely

  2. Safety
    - Use DO blocks to check existence before creation
    - Handle existing types gracefully
*/

-- Create user_role enum type safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('patient', 'caregiver');
  END IF;
END $$;

-- Create meal_category enum type safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'meal_category') THEN
    CREATE TYPE meal_category AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
  END IF;
END $$;

-- Create activity_intensity enum type safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'activity_intensity') THEN
    CREATE TYPE activity_intensity AS ENUM ('low', 'moderate', 'high');
  END IF;
END $$;

-- Create flow_intensity enum type safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'flow_intensity') THEN
    CREATE TYPE flow_intensity AS ENUM ('none', 'light', 'medium', 'heavy');
  END IF;
END $$;

-- Create cycle_phase enum type safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cycle_phase') THEN
    CREATE TYPE cycle_phase AS ENUM ('menstrual', 'follicular', 'ovulation', 'luteal');
  END IF;
END $$;

-- Create lab_test_category enum type safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lab_test_category') THEN
    CREATE TYPE lab_test_category AS ENUM ('blood', 'hormone', 'vitamin', 'metabolic', 'thyroid', 'other');
  END IF;
END $$;

-- Create lab_result_status enum type safely
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lab_result_status') THEN
    CREATE TYPE lab_result_status AS ENUM ('low', 'normal', 'high', 'critical');
  END IF;
END $$;