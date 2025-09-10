/*
  # Macro and Nutrient Tracking Enhancement

  1. New Tables
    - `food_nutrition` - Detailed nutritional information for food entries
    - `daily_nutrition_summary` - Daily nutrition totals and goals

  2. Enhanced Tables
    - Add nutrition fields to existing food entries
    - Link food entries to detailed nutrition data

  3. Security
    - Enable RLS on all new tables
    - Add policies for user data isolation
*/

-- Create food nutrition details table
CREATE TABLE IF NOT EXISTS food_nutrition (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_entry_id uuid REFERENCES food_entries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic nutrition info
  calories numeric(8,2) DEFAULT 0,
  serving_size text,
  serving_unit text DEFAULT 'serving',
  
  -- Macronutrients (in grams)
  carbs numeric(8,2) DEFAULT 0,
  protein numeric(8,2) DEFAULT 0,
  fat numeric(8,2) DEFAULT 0,
  fiber numeric(8,2) DEFAULT 0,
  sugar numeric(8,2) DEFAULT 0,
  
  -- Micronutrients (in mg unless specified)
  sodium numeric(8,2) DEFAULT 0,
  potassium numeric(8,2) DEFAULT 0,
  calcium numeric(8,2) DEFAULT 0,
  iron numeric(8,2) DEFAULT 0,
  vitamin_c numeric(8,2) DEFAULT 0,
  vitamin_d numeric(8,2) DEFAULT 0, -- in IU
  
  -- Additional tracking
  cholesterol numeric(8,2) DEFAULT 0, -- in mg
  saturated_fat numeric(8,2) DEFAULT 0,
  trans_fat numeric(8,2) DEFAULT 0,
  
  -- Source tracking
  data_source text DEFAULT 'manual', -- 'manual', 'fitbit', 'usda', etc.
  fitbit_food_id text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on food_nutrition
ALTER TABLE food_nutrition ENABLE ROW LEVEL SECURITY;

-- Create policy for food_nutrition
CREATE POLICY "food_nutrition_own_data"
  ON food_nutrition
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create daily nutrition summary table
CREATE TABLE IF NOT EXISTS daily_nutrition_summary (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date date NOT NULL,
  
  -- Daily totals
  total_calories numeric(8,2) DEFAULT 0,
  total_carbs numeric(8,2) DEFAULT 0,
  total_protein numeric(8,2) DEFAULT 0,
  total_fat numeric(8,2) DEFAULT 0,
  total_fiber numeric(8,2) DEFAULT 0,
  total_sugar numeric(8,2) DEFAULT 0,
  total_sodium numeric(8,2) DEFAULT 0,
  
  -- Goals (can be customized per user)
  calorie_goal numeric(8,2) DEFAULT 2000,
  carb_goal numeric(8,2) DEFAULT 250,
  protein_goal numeric(8,2) DEFAULT 50,
  fat_goal numeric(8,2) DEFAULT 65,
  fiber_goal numeric(8,2) DEFAULT 25,
  sodium_limit numeric(8,2) DEFAULT 2300,
  
  -- Tracking
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, date)
);

-- Enable RLS on daily_nutrition_summary
ALTER TABLE daily_nutrition_summary ENABLE ROW LEVEL SECURITY;

-- Create policy for daily_nutrition_summary
CREATE POLICY "daily_nutrition_summary_own_data"
  ON daily_nutrition_summary
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_food_nutrition_user_date ON food_nutrition(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_food_nutrition_food_entry ON food_nutrition(food_entry_id);
CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user_date ON daily_nutrition_summary(user_id, date DESC);

-- Add updated_at trigger for food_nutrition
CREATE TRIGGER update_food_nutrition_updated_at
  BEFORE UPDATE ON food_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate daily nutrition totals
CREATE OR REPLACE FUNCTION calculate_daily_nutrition(p_user_id uuid, p_date date)
RETURNS void AS $$
BEGIN
  INSERT INTO daily_nutrition_summary (
    user_id, 
    date, 
    total_calories, 
    total_carbs, 
    total_protein, 
    total_fat, 
    total_fiber, 
    total_sugar, 
    total_sodium,
    last_updated
  )
  SELECT 
    p_user_id,
    p_date,
    COALESCE(SUM(fn.calories), 0),
    COALESCE(SUM(fn.carbs), 0),
    COALESCE(SUM(fn.protein), 0),
    COALESCE(SUM(fn.fat), 0),
    COALESCE(SUM(fn.fiber), 0),
    COALESCE(SUM(fn.sugar), 0),
    COALESCE(SUM(fn.sodium), 0),
    NOW()
  FROM food_entries fe
  LEFT JOIN food_nutrition fn ON fe.id = fn.food_entry_id
  WHERE fe.user_id = p_user_id 
    AND fe.created_at::date = p_date
  ON CONFLICT (user_id, date) 
  DO UPDATE SET
    total_calories = EXCLUDED.total_calories,
    total_carbs = EXCLUDED.total_carbs,
    total_protein = EXCLUDED.total_protein,
    total_fat = EXCLUDED.total_fat,
    total_fiber = EXCLUDED.total_fiber,
    total_sugar = EXCLUDED.total_sugar,
    total_sodium = EXCLUDED.total_sodium,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically update daily nutrition when food nutrition changes
CREATE OR REPLACE FUNCTION update_daily_nutrition_trigger()
RETURNS TRIGGER AS $$
BEGIN
  -- Update for the date of the food entry
  PERFORM calculate_daily_nutrition(
    NEW.user_id, 
    (SELECT created_at::date FROM food_entries WHERE id = NEW.food_entry_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER food_nutrition_daily_update
  AFTER INSERT OR UPDATE OR DELETE ON food_nutrition
  FOR EACH ROW
  EXECUTE FUNCTION update_daily_nutrition_trigger();