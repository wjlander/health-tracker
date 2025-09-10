/*
  # Create Women's Health Tables

  1. New Tables
    - `menstrual_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `date` (date)
      - `cycle_day` (integer)
      - `flow_intensity` (text)
      - `symptoms` (text array)
      - `cycle_phase` (text)
      - `notes` (text)
      - `created_at` (timestamp)
    - `premenopausal_entries`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users)
      - `date` (date)
      - `hot_flashes` (integer)
      - `night_sweats` (boolean)
      - `mood_swings` (integer)
      - `irregular_periods` (boolean)
      - `sleep_disturbances` (boolean)
      - `joint_aches` (boolean)
      - `brain_fog` (integer)
      - `weight_changes` (boolean)
      - `notes` (text)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data

  3. Indexes
    - Unique indexes on user_id and date for both tables
*/

-- Create menstrual_entries table
CREATE TABLE IF NOT EXISTS public.menstrual_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    cycle_day integer,
    flow_intensity text,
    symptoms text[],
    cycle_phase text,
    notes text,
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for menstrual_entries
ALTER TABLE public.menstrual_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for menstrual_entries
CREATE POLICY "Users can view their own menstrual entries" ON public.menstrual_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own menstrual entries" ON public.menstrual_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own menstrual entries" ON public.menstrual_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own menstrual entries" ON public.menstrual_entries FOR DELETE USING (auth.uid() = user_id);

-- Create unique index for menstrual_entries
CREATE UNIQUE INDEX IF NOT EXISTS menstrual_entries_user_id_date_idx ON public.menstrual_entries (user_id, date);

-- Create premenopausal_entries table
CREATE TABLE IF NOT EXISTS public.premenopausal_entries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    hot_flashes integer DEFAULT 0,
    night_sweats boolean DEFAULT false,
    mood_swings integer DEFAULT 5,
    irregular_periods boolean DEFAULT false,
    sleep_disturbances boolean DEFAULT false,
    joint_aches boolean DEFAULT false,
    brain_fog integer DEFAULT 5,
    weight_changes boolean DEFAULT false,
    notes text DEFAULT '',
    created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS for premenopausal_entries
ALTER TABLE public.premenopausal_entries ENABLE ROW LEVEL SECURITY;

-- Create policies for premenopausal_entries
CREATE POLICY "Users can view their own premenopausal entries" ON public.premenopausal_entries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own premenopausal entries" ON public.premenopausal_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own premenopausal entries" ON public.premenopausal_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own premenopausal entries" ON public.premenopausal_entries FOR DELETE USING (auth.uid() = user_id);

-- Create unique index for premenopausal_entries
CREATE UNIQUE INDEX IF NOT EXISTS premenopausal_entries_user_id_date_idx ON public.premenopausal_entries (user_id, date);