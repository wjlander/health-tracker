-- Step 1: Create function to safely create missing user records
CREATE OR REPLACE FUNCTION create_missing_user_records()
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
        ON CONFLICT (id) DO NOTHING;
        
        RAISE NOTICE 'Created user record for: %', auth_user.email;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Execute the function
SELECT create_missing_user_records();

-- Step 3: Update user creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
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
        RAISE WARNING 'Failed to create user record for %: %', NEW.email, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- Step 5: Clean up demo data
DELETE FROM health_entries WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM food_entries WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM activity_entries WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM user_integrations WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM fitbit_activities WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM fitbit_weights WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM fitbit_foods WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM fitbit_sleep WHERE user_id NOT IN (SELECT id FROM auth.users);

-- Step 6: Add validation function
CREATE OR REPLACE FUNCTION validate_user_exists()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
        INSERT INTO users (id, email, name, role)
        SELECT 
            au.id, 
            au.email, 
            COALESCE(au.raw_user_meta_data->>'name', au.email),
            COALESCE((au.raw_user_meta_data->>'role')::user_role, 'patient')
        FROM auth.users au 
        WHERE au.id = NEW.user_id
        ON CONFLICT (id) DO NOTHING;
        
        IF NOT EXISTS (SELECT 1 FROM users WHERE id = NEW.user_id) THEN
            RAISE EXCEPTION 'User record does not exist for user_id: %', NEW.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Add validation triggers
DROP TRIGGER IF EXISTS validate_user_before_integration ON user_integrations;
CREATE TRIGGER validate_user_before_integration
    BEFORE INSERT OR UPDATE ON user_integrations
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

DROP TRIGGER IF EXISTS validate_user_before_health_entry ON health_entries;
CREATE TRIGGER validate_user_before_health_entry
    BEFORE INSERT OR UPDATE ON health_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

DROP TRIGGER IF EXISTS validate_user_before_food_entry ON food_entries;
CREATE TRIGGER validate_user_before_food_entry
    BEFORE INSERT OR UPDATE ON food_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

DROP TRIGGER IF EXISTS validate_user_before_activity_entry ON activity_entries;
CREATE TRIGGER validate_user_before_activity_entry
    BEFORE INSERT OR UPDATE ON activity_entries
    FOR EACH ROW
    EXECUTE FUNCTION validate_user_exists();

-- Step 8: Clean up
DROP FUNCTION IF EXISTS create_missing_user_records();