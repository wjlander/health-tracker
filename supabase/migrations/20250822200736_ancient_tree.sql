/*
  # Fix User Integration and Demo Data Issues

  1. Data Cleanup
    - Remove any demo/sample data that shouldn't be in production
    - Ensure proper user records exist for authenticated users
    - Fix foreign key constraint issues

  2. User Management
    - Create missing user records for existing auth users
    - Update user creation trigger to be more robust
    - Add data validation and error handling

  3. Integration Fixes
    - Ensure user_integrations table can properly reference users
    - Add proper error handling for missing user records
*/

-- First, let's create a function to safely create missing user records
CREATE OR REPLACE FUNCTION create_missing_user_records()
RETURNS void AS $$
DECLARE
    auth_user RECORD;
BEGIN
    -- Loop through auth.users that don't have corresponding records in users table
    FOR auth_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN users u ON au.id = u.id
        WHERE u.id IS NULL
    LOOP
        -- Insert missing user record
        INSERT INTO users (id, email, name, role)
        VALUES (
            auth_user.id,
            auth_user.email,
            COALESCE(auth_user.raw_user_meta_data->>'name', auth_user.email),
            COALESCE((auth_user.raw_user_meta_data->>'role')::user_role, 'patient')
        )
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created user record for: %', auth_user.email;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function to create missing user records
SELECT create_missing_user_records();

-- Update the user creation trigger to be more robust
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert new user record with better error handling
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

-- Clean up any demo data that might be causing issues
-- Remove sample health entries that don't belong to real users
DELETE FROM health_entries 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove sample food entries that don't belong to real users
DELETE FROM food_entries 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove sample activity entries that don't belong to real users
DELETE FROM activity_entries 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove sample integrations that don't belong to real users
DELETE FROM user_integrations 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Remove sample Fitbit data that doesn't belong to real users
DELETE FROM fitbit_activities 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM fitbit_weights 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM fitbit_foods 
WHERE user_id NOT IN (SELECT id FROM auth.users);

DELETE FROM fitbit_sleep 
WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Add a function to validate user exists before creating integrations
CREATE OR REPLACE FUNCTION validate_user_exists()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user exists in users table
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
        -- Try to create the user record if it doesn't exist
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
            RAISE EXCEPTION 'User record does not exist for user_id: %', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger to validate user exists before creating integrations
DROP TRIGGER IF EXISTS validate_user_before_integration ON user_integrations;
CREATE TRIGGER validate_user_before_integration
    BEFORE INSERT OR UPDATE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

-- Add similar validation for health entries
DROP TRIGGER IF EXISTS validate_user_before_health_entry ON health_entries;
CREATE TRIGGER validate_user_before_health_entry
    BEFORE INSERT OR UPDATE ON health_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

-- Add validation for food entries
DROP TRIGGER IF EXISTS validate_user_before_food_entry ON food_entries;
CREATE TRIGGER validate_user_before_food_entry
    BEFORE INSERT OR UPDATE ON food_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

-- Add validation for activity entries
DROP TRIGGER IF EXISTS validate_user_before_activity_entry ON activity_entries;
CREATE TRIGGER validate_user_before_activity_entry
    BEFORE INSERT OR UPDATE ON activity_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

-- Clean up the helper function
DROP FUNCTION IF EXISTS create_missing_user_records();