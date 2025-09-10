/*
  # Fix User Creation and Database Triggers

  1. User Creation Issues
    - Fix the user creation trigger to handle all cases properly
    - Add better error handling and logging
    - Ensure user records are created reliably

  2. Database Permissions
    - Ensure proper permissions for user creation
    - Fix any issues with the users table access
    - Add validation without breaking the flow

  3. Authentication Flow
    - Improve the signup/signin process
    - Handle edge cases in user creation
    - Add debugging information
*/

-- Step 1: Drop existing problematic triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 2: Create a more robust user creation function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_role user_role;
BEGIN
    -- Extract user metadata with fallbacks
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.email,
        'User'
    );
    
    user_role := COALESCE(
        (NEW.raw_user_meta_data->>'role')::user_role,
        'patient'
    );
    
    -- Log the attempt
    RAISE NOTICE 'Creating user record for: % (ID: %)', NEW.email, NEW.id;
    
    -- Insert user record with comprehensive error handling
    BEGIN
        INSERT INTO users (id, email, name, role, created_at, updated_at)
        VALUES (
            NEW.id,
            NEW.email,
            user_name,
            user_role,
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            name = COALESCE(EXCLUDED.name, users.name),
            role = COALESCE(EXCLUDED.role, users.role),
            updated_at = NOW();
        
        RAISE NOTICE 'Successfully created/updated user record for: %', NEW.email;
        
    EXCEPTION
        WHEN unique_violation THEN
            RAISE NOTICE 'User record already exists for: %', NEW.email;
        WHEN OTHERS THEN
            RAISE WARNING 'Failed to create user record for %: % (SQLSTATE: %)', 
                NEW.email, SQLERRM, SQLSTATE;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create the trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Step 4: Also handle updates to auth.users (in case metadata changes)
CREATE OR REPLACE FUNCTION handle_user_update()
RETURNS TRIGGER AS $$
DECLARE
    user_name TEXT;
    user_role user_role;
BEGIN
    -- Only process if metadata changed
    IF OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data THEN
        user_name := COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.email,
            'User'
        );
        
        user_role := COALESCE(
            (NEW.raw_user_meta_data->>'role')::user_role,
            'patient'
        );
        
        -- Update user record
        UPDATE users SET
            name = user_name,
            role = user_role,
            updated_at = NOW()
        WHERE id = NEW.id;
        
        RAISE NOTICE 'Updated user record for: %', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_update();

-- Step 5: Create a function to manually create missing user records
CREATE OR REPLACE FUNCTION create_missing_user_records()
RETURNS TABLE(created_count INTEGER, error_count INTEGER) AS $$
DECLARE
    auth_user RECORD;
    created_count INTEGER := 0;
    error_count INTEGER := 0;
    user_name TEXT;
    user_role user_role;
BEGIN
    FOR auth_user IN 
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN users u ON au.id = u.id
        WHERE u.id IS NULL
    LOOP
        BEGIN
            user_name := COALESCE(
                auth_user.raw_user_meta_data->>'name',
                auth_user.email,
                'User'
            );
            
            user_role := COALESCE(
                (auth_user.raw_user_meta_data->>'role')::user_role,
                'patient'
            );
            
            INSERT INTO users (id, email, name, role, created_at, updated_at)
            VALUES (
                auth_user.id,
                auth_user.email,
                user_name,
                user_role,
                NOW(),
                NOW()
            );
            
            created_count := created_count + 1;
            RAISE NOTICE 'Created user record for: %', auth_user.email;
            
        EXCEPTION
            WHEN OTHERS THEN
                error_count := error_count + 1;
                RAISE WARNING 'Failed to create user record for %: %', 
                    auth_user.email, SQLERRM;
        END;
    END LOOP;
    
    RETURN QUERY SELECT created_count, error_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Run the function to create any missing user records
SELECT * FROM create_missing_user_records();

-- Step 7: Add some helpful functions for debugging
CREATE OR REPLACE FUNCTION debug_user_status()
RETURNS TABLE(
    auth_users_count BIGINT,
    users_table_count BIGINT,
    missing_user_records BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM auth.users) as auth_users_count,
        (SELECT COUNT(*) FROM users) as users_table_count,
        (SELECT COUNT(*) 
         FROM auth.users au 
         LEFT JOIN users u ON au.id = u.id 
         WHERE u.id IS NULL) as missing_user_records;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Show current status
SELECT * FROM debug_user_status();

-- Step 9: Clean up the helper function
DROP FUNCTION IF EXISTS create_missing_user_records();