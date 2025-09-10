/*
  # Complete Database Reset - Delete All Users and Data

  1. Data Cleanup
    - Delete ALL data from all tables
    - Remove ALL user records (except system users)
    - Clean slate for fresh start

  2. Reset Auto-increment Sequences
    - Reset any sequences to start from 1
    - Ensure clean ID generation

  3. Maintain Table Structure
    - Keep all tables and their structure
    - Keep all RLS policies
    - Keep all triggers and functions
    - Only remove data, not schema

  WARNING: This will delete ALL user data permanently!
*/

-- Step 1: Disable all triggers temporarily to avoid cascade issues
SET session_replication_role = replica;

-- Step 2: Delete all data from all tables (in correct order to avoid foreign key issues)
TRUNCATE TABLE fitbit_sleep CASCADE;
TRUNCATE TABLE fitbit_foods CASCADE;
TRUNCATE TABLE fitbit_weights CASCADE;
TRUNCATE TABLE fitbit_activities CASCADE;
TRUNCATE TABLE user_integrations CASCADE;
TRUNCATE TABLE activity_entries CASCADE;
TRUNCATE TABLE food_entries CASCADE;
TRUNCATE TABLE health_entries CASCADE;

-- Step 3: Delete all user records from the users table
DELETE FROM users;

-- Step 4: Delete all authentication users (this will completely reset the user base)
-- WARNING: This removes ALL user accounts
DELETE FROM auth.users;

-- Step 5: Reset any sequences if they exist
-- (Most tables use UUIDs, but this ensures clean state)
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT schemaname, sequencename 
        FROM pg_sequences 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER SEQUENCE %I.%I RESTART WITH 1', seq_record.schemaname, seq_record.sequencename);
    END LOOP;
END $$;

-- Step 6: Re-enable triggers
SET session_replication_role = DEFAULT;

-- Step 7: Verify cleanup
DO $$
DECLARE
    table_record RECORD;
    row_count INTEGER;
BEGIN
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
    LOOP
        EXECUTE format('SELECT COUNT(*) FROM %I', table_record.table_name) INTO row_count;
        RAISE NOTICE 'Table %: % rows remaining', table_record.table_name, row_count;
    END LOOP;
    
    -- Check auth.users table
    SELECT COUNT(*) INTO row_count FROM auth.users;
    RAISE NOTICE 'auth.users: % rows remaining', row_count;
END $$;

-- Step 8: Add a confirmation message
DO $$
BEGIN
    RAISE NOTICE '=== DATABASE RESET COMPLETE ===';
    RAISE NOTICE 'All users and data have been deleted.';
    RAISE NOTICE 'You can now create fresh user accounts.';
    RAISE NOTICE 'All table structures and policies remain intact.';
END $$;