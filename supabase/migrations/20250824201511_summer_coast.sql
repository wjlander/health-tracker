/*
  # Fix existing heartburn tracking and reports

  1. Functions
    - Add heartburn correlation detection function
    - Fix nutrition calculation function
    - Add report template functions

  2. Triggers
    - Add heartburn correlation trigger
    - Update nutrition calculation triggers

  3. Default Data
    - Add default report templates for existing users
*/

-- Create heartburn correlation detection function
CREATE OR REPLACE FUNCTION trigger_heartburn_correlation_detection()
RETURNS trigger AS $$
DECLARE
    food_record RECORD;
    time_diff_hours numeric;
    correlation_strength numeric;
BEGIN
    -- Find food entries within 6 hours before the heartburn episode
    FOR food_record IN 
        SELECT fe.id, fe.name, fe.created_at
        FROM food_entries fe
        WHERE fe.user_id = NEW.user_id
        AND fe.created_at::date = NEW.date
        AND fe.created_at <= (NEW.date::timestamp + NEW.time::time)
        AND fe.created_at >= (NEW.date::timestamp + NEW.time::time - interval '6 hours')
    LOOP
        -- Calculate time difference in hours
        time_diff_hours := EXTRACT(EPOCH FROM (
            (NEW.date::timestamp + NEW.time::time) - food_record.created_at
        )) / 3600;
        
        -- Calculate correlation strength (closer in time = higher correlation)
        correlation_strength := GREATEST(0.1, 1.0 - (time_diff_hours / 6.0));
        
        -- Insert correlation record
        INSERT INTO heartburn_food_correlations (
            user_id,
            heartburn_entry_id,
            food_entry_id,
            time_between_hours,
            correlation_strength
        ) VALUES (
            NEW.user_id,
            NEW.id,
            food_record.id,
            time_diff_hours,
            correlation_strength
        ) ON CONFLICT DO NOTHING;
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for heartburn correlation detection if it doesn't exist
DROP TRIGGER IF EXISTS heartburn_correlation_trigger ON heartburn_entries;
CREATE TRIGGER heartburn_correlation_trigger
    AFTER INSERT ON heartburn_entries
    FOR EACH ROW EXECUTE FUNCTION trigger_heartburn_correlation_detection();

-- Fix the nutrition calculation function
CREATE OR REPLACE FUNCTION calculate_daily_nutrition_summary(p_user_id uuid, p_date date)
RETURNS void AS $$
DECLARE
    v_total_calories numeric := 0;
    v_total_carbs numeric := 0;
    v_total_protein numeric := 0;
    v_total_fat numeric := 0;
    v_total_fiber numeric := 0;
    v_total_sugar numeric := 0;
    v_total_sodium numeric := 0;
    v_fitbit_calories numeric := 0;
BEGIN
    -- Calculate totals from food_nutrition table (manual entries)
    SELECT 
        COALESCE(SUM(calories), 0),
        COALESCE(SUM(carbs), 0),
        COALESCE(SUM(protein), 0),
        COALESCE(SUM(fat), 0),
        COALESCE(SUM(fiber), 0),
        COALESCE(SUM(sugar), 0),
        COALESCE(SUM(sodium), 0)
    INTO 
        v_total_calories,
        v_total_carbs,
        v_total_protein,
        v_total_fat,
        v_total_fiber,
        v_total_sugar,
        v_total_sodium
    FROM food_nutrition fn
    JOIN food_entries fe ON fn.food_entry_id = fe.id
    WHERE fe.user_id = p_user_id 
    AND fe.created_at::date = p_date;

    -- Add Fitbit food data if available
    SELECT COALESCE(calories, 0)
    INTO v_fitbit_calories
    FROM fitbit_foods
    WHERE user_id = p_user_id AND date = p_date;
    
    -- Add Fitbit calories to total
    v_total_calories := v_total_calories + v_fitbit_calories;

    -- Upsert the daily summary
    INSERT INTO daily_nutrition_summary (
        user_id, date, 
        total_calories, total_carbs, total_protein, total_fat,
        total_fiber, total_sugar, total_sodium,
        last_updated
    ) VALUES (
        p_user_id, p_date,
        v_total_calories, v_total_carbs, v_total_protein, v_total_fat,
        v_total_fiber, v_total_sugar, v_total_sodium,
        now()
    )
    ON CONFLICT (user_id, date) 
    DO UPDATE SET
        total_calories = EXCLUDED.total_calories,
        total_carbs = EXCLUDED.total_carbs,
        total_protein = EXCLUDED.total_protein,
        total_fat = EXCLUDED.total_fat,
        total_fiber = EXCLUDED.total_fiber,
        total_sugar = EXCLUDED.total_sugar,
        total_sodium = EXCLUDED.total_sodium,
        last_updated = now();
END;
$$ LANGUAGE plpgsql;

-- Create default report templates for existing users (only if they don't have any)
DO $$
DECLARE
    user_record RECORD;
    template_count integer;
BEGIN
    FOR user_record IN SELECT id FROM users LOOP
        -- Check if user already has templates
        SELECT COUNT(*) INTO template_count
        FROM report_templates 
        WHERE user_id = user_record.id;
        
        -- Only create templates if user has none
        IF template_count = 0 THEN
            -- Standard Doctor Visit Template
            INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
            VALUES (
                user_record.id,
                'Standard Doctor Visit',
                'doctor',
                '{"sections": ["patient_info", "health_summary", "medications", "diagnoses", "seizures", "mental_health", "blood_pressure", "weight_trends", "questions"], "include_charts": true, "include_raw_data": false}',
                true
            );

            -- Mental Health Template
            INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
            VALUES (
                user_record.id,
                'Mental Health Check-in',
                'mental_health',
                '{"sections": ["patient_info", "mental_health", "medications", "mood_patterns", "coping_strategies", "crisis_episodes", "support_systems"], "include_charts": true, "include_raw_data": false}',
                false
            );

            -- Neurologist Template
            INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
            VALUES (
                user_record.id,
                'Neurologist Visit',
                'specialist',
                '{"sections": ["patient_info", "seizures", "medications", "triggers", "sleep_patterns", "mood_correlation", "emergency_episodes"], "include_charts": true, "include_raw_data": true}',
                false
            );

            -- Emergency Template
            INSERT INTO report_templates (user_id, template_name, report_type, template_content, is_default)
            VALUES (
                user_record.id,
                'Emergency Room Summary',
                'emergency',
                '{"sections": ["patient_info", "medications", "diagnoses", "recent_seizures", "mental_health_alerts", "emergency_contacts"], "include_charts": false, "include_raw_data": true}',
                false
            );
        END IF;
    END LOOP;
END $$;