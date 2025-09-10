/*
  # Fix Data Isolation and Permissions Issues

  1. Data Cleanup
    - Remove all demo/sample data that doesn't belong to real authenticated users
    - Ensure clean slate for proper user data isolation

  2. RLS Policy Fixes
    - Drop and recreate all RLS policies with proper user isolation
    - Ensure users can only see their own data
    - Add proper INSERT/UPDATE/DELETE permissions
    - Fix policies that might be allowing cross-user data access

  3. User Management
    - Ensure user records exist for all authenticated users
    - Add validation to prevent foreign key constraint violations
    - Improve user creation process

  4. Integration Fixes
    - Add proper validation for user_integrations table
    - Ensure Fitbit integration works with proper user isolation
*/

-- Step 1: Clean up all existing data that doesn't belong to real authenticated users
-- This ensures a clean slate for proper user data isolation

DELETE FROM fitbit_sleep WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM fitbit_foods WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM fitbit_weights WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM fitbit_activities WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM user_integrations WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM activity_entries WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM food_entries WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM health_entries WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 2: Ensure user records exist for all authenticated users
CREATE OR REPLACE FUNCTION ensure_user_records_exist()
RETURNS void AS $$
DECLARE
    auth_user RECORD;
BEGIN
    FOR auth_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN users u ON au.id = u.id
        WHERE u.id IS NULL
    LOOP
        INSERT INTO users (id, email, name, role)
        VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.email),
            COALESCE((auth_user.raw_user_meta_data->>'role')::user_role, 'patient')
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = COALESCE(EXCLUDED.name, users.name),
            role = COALESCE(EXCLUDED.role, users.role),
            updated_at = now();
        
        RAISE NOTICE 'Ensured user record exists for: %', auth_user.email;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT ensure_user_records_exist();

-- Step 3: Drop all existing RLS policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Caregivers can read patient data" ON users;

DROP POLICY IF EXISTS "Users can manage own health entries" ON health_entries;
DROP POLICY IF EXISTS "Caregivers can read patient health entries" ON health_entries;

DROP POLICY IF EXISTS "Users can manage own food entries" ON food_entries;
DROP POLICY IF EXISTS "Caregivers can read patient food entries" ON food_entries;

DROP POLICY IF EXISTS "Users can manage own activity entries" ON activity_entries;
DROP POLICY IF EXISTS "Caregivers can read patient activity entries" ON activity_entries;

DROP POLICY IF EXISTS "Users can manage own integrations" ON user_integrations;

DROP POLICY IF EXISTS "Users can manage own fitbit activities" ON fitbit_activities;
DROP POLICY IF EXISTS "Users can manage own fitbit weights" ON fitbit_weights;
DROP POLICY IF EXISTS "Users can manage own fitbit foods" ON fitbit_foods;
DROP POLICY IF EXISTS "Users can manage own fitbit sleep" ON fitbit_sleep;

-- Step 4: Create new, simple RLS policies with proper user isolation

-- Users table policies
CREATE POLICY "users_select_own"
  ON users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_update_own"
  ON users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Health entries policies
CREATE POLICY "health_entries_all_own"
  ON health_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Food entries policies
CREATE POLICY "food_entries_all_own"
  ON food_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Activity entries policies
CREATE POLICY "activity_entries_all_own"
  ON activity_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User integrations policies
CREATE POLICY "user_integrations_all_own"
  ON user_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fitbit data policies
CREATE POLICY "fitbit_activities_all_own"
  ON fitbit_activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fitbit_weights_all_own"
  ON fitbit_weights
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fitbit_foods_all_own"
  ON fitbit_foods
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "fitbit_sleep_all_own"
  ON fitbit_sleep
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 5: Update user creation trigger to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user record with proper conflict handling
    INSERT INTO users (id, email, name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
        COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'patient')
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, users.name),
        role = COALESCE(EXCLUDED.role, users.role),
        updated_at = now();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error but don't fail the auth process
        RAISE WARNING 'Failed to create user record for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Step 6: Add validation function to ensure user exists before creating related records
CREATE OR REPLACE FUNCTION ensure_user_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user exists in users table
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
        -- Try to create the user record from auth.users
        INSERT INTO users (id, email, name, role)
        SELECT 
            au.id, 
            au.email, 
            COALESCE(au.raw_user_meta_data->>'name', au.email),
            COALESCE((au.raw_user_meta_data->>'role')::user_role, 'patient')
        FROM auth.users au 
        WHERE au.id = NEW.user_id
        ON CONFLICT (id) DO NOTHING;
        
        -- If still doesn't exist, raise an error
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
            RAISE EXCEPTION 'User record does not exist and could not be created for user_id: %', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add validation triggers to all tables that reference users
DROP TRIGGER IF EXISTS ensure_user_before_integration ON user_integrations;
CREATE TRIGGER ensure_user_before_integration
    BEFORE INSERT OR UPDATE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

DROP TRIGGER IF EXISTS ensure_user_before_health_entry ON health_entries;
CREATE TRIGGER ensure_user_before_health_entry
    BEFORE INSERT OR UPDATE ON health_entries
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

DROP TRIGGER IF EXISTS ensure_user_before_food_entry ON food_entries;
CREATE TRIGGER ensure_user_before_food_entry
    BEFORE INSERT OR UPDATE ON food_entries
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

DROP TRIGGER IF EXISTS ensure_user_before_activity_entry ON activity_entries;
CREATE TRIGGER ensure_user_before_activity_entry
    BEFORE INSERT OR UPDATE ON activity_entries
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

-- Add triggers for Fitbit data tables
DROP TRIGGER IF EXISTS ensure_user_before_fitbit_activity ON fitbit_activities;
CREATE TRIGGER ensure_user_before_fitbit_activity
    BEFORE INSERT OR UPDATE ON fitbit_activities
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

DROP TRIGGER IF EXISTS ensure_user_before_fitbit_weight ON fitbit_weights;
CREATE TRIGGER ensure_user_before_fitbit_weight
    BEFORE INSERT OR UPDATE ON fitbit_weights
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

DROP TRIGGER IF EXISTS ensure_user_before_fitbit_food ON fitbit_foods;
CREATE TRIGGER ensure_user_before_fitbit_food
    BEFORE INSERT OR UPDATE ON fitbit_foods
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

DROP TRIGGER IF EXISTS ensure_user_before_fitbit_sleep ON fitbit_sleep;
CREATE TRIGGER ensure_user_before_fitbit_sleep
    BEFORE INSERT OR UPDATE ON fitbit_sleep
    FOR EACH ROW
    EXECUTE FUNCTION ensure_user_exists();

-- Step 7: Clean up the helper function
DROP FUNCTION IF EXISTS ensure_user_records_exist();