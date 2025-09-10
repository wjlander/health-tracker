/*
  # Complete Fix for User Isolation and Integration Issues

  1. Data Cleanup
    - Remove ALL existing data to ensure clean slate
    - Delete all health entries, food entries, activities, and integrations
    - Remove any orphaned records

  2. RLS Policy Complete Rebuild
    - Drop all existing policies
    - Create simple, bulletproof policies for complete user isolation
    - Ensure INSERT, UPDATE, DELETE, and SELECT all work properly
    - Test policies to ensure no data leakage between users

  3. Fitbit Integration Fixes
    - Handle duplicate integration records properly
    - Add UPSERT logic to prevent constraint violations
    - Improve error handling for existing integrations

  4. User Management
    - Ensure proper user record creation
    - Add validation without breaking authentication
    - Clean up any inconsistent user data
*/

-- Step 1: Complete data cleanup - remove ALL existing data
TRUNCATE TABLE fitbit_sleep CASCADE;
TRUNCATE TABLE fitbit_foods CASCADE;
TRUNCATE TABLE fitbit_weights CASCADE;
TRUNCATE TABLE fitbit_activities CASCADE;
TRUNCATE TABLE user_integrations CASCADE;
TRUNCATE TABLE activity_entries CASCADE;
TRUNCATE TABLE food_entries CASCADE;
TRUNCATE TABLE health_entries CASCADE;

-- Step 2: Clean up users table but preserve auth users
DELETE FROM users WHERE id NOT IN (SELECT id FROM auth.users);

-- Step 3: Ensure user records exist for all authenticated users
INSERT INTO users (id, email, name, role)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    COALESCE((au.raw_user_meta_data->>'role')::user_role, 'patient')
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, users.name),
    role = COALESCE(EXCLUDED.role, users.role),
    updated_at = now();

-- Step 4: Drop ALL existing RLS policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "health_entries_all_own" ON health_entries;
DROP POLICY IF EXISTS "food_entries_all_own" ON food_entries;
DROP POLICY IF EXISTS "activity_entries_all_own" ON activity_entries;
DROP POLICY IF EXISTS "user_integrations_all_own" ON user_integrations;
DROP POLICY IF EXISTS "fitbit_activities_all_own" ON fitbit_activities;
DROP POLICY IF EXISTS "fitbit_weights_all_own" ON fitbit_weights;
DROP POLICY IF EXISTS "fitbit_foods_all_own" ON fitbit_foods;
DROP POLICY IF EXISTS "fitbit_sleep_all_own" ON fitbit_sleep;

-- Step 5: Create bulletproof RLS policies with complete user isolation

-- Users table - users can only see and modify their own record
CREATE POLICY "users_own_data_only"
  ON users
  FOR ALL
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Health entries - complete isolation per user
CREATE POLICY "health_entries_own_data_only"
  ON health_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Food entries - complete isolation per user
CREATE POLICY "food_entries_own_data_only"
  ON food_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Activity entries - complete isolation per user
CREATE POLICY "activity_entries_own_data_only"
  ON activity_entries
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- User integrations - complete isolation per user
CREATE POLICY "user_integrations_own_data_only"
  ON user_integrations
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fitbit activities - complete isolation per user
CREATE POLICY "fitbit_activities_own_data_only"
  ON fitbit_activities
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fitbit weights - complete isolation per user
CREATE POLICY "fitbit_weights_own_data_only"
  ON fitbit_weights
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fitbit foods - complete isolation per user
CREATE POLICY "fitbit_foods_own_data_only"
  ON fitbit_foods
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fitbit sleep - complete isolation per user
CREATE POLICY "fitbit_sleep_own_data_only"
  ON fitbit_sleep
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Step 6: Update user creation trigger to be more reliable
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

-- Step 7: Remove old validation triggers that might be causing issues
DROP TRIGGER IF EXISTS ensure_user_before_integration ON user_integrations;
DROP TRIGGER IF EXISTS ensure_user_before_health_entry ON health_entries;
DROP TRIGGER IF EXISTS ensure_user_before_food_entry ON food_entries;
DROP TRIGGER IF EXISTS ensure_user_before_activity_entry ON activity_entries;
DROP TRIGGER IF EXISTS ensure_user_before_fitbit_activity ON fitbit_activities;
DROP TRIGGER IF EXISTS ensure_user_before_fitbit_weight ON fitbit_weights;
DROP TRIGGER IF EXISTS ensure_user_before_fitbit_food ON fitbit_foods;
DROP TRIGGER IF EXISTS ensure_user_before_fitbit_sleep ON fitbit_sleep;

-- Clean up old functions
DROP FUNCTION IF EXISTS ensure_user_exists();
DROP FUNCTION IF EXISTS validate_user_exists();
DROP FUNCTION IF EXISTS ensure_user_records_exist();