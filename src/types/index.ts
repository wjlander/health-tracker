export interface User {
  id: string;
  email: string;
  role: 'patient' | 'caregiver';
  name: string;
  tracking_preferences: TrackingPreferences;
  created_at: string;
}

export interface TrackingPreferences {
  // Basic health tracking
  mood: boolean;
  energy: boolean;
  anxiety: boolean;
  sleep: boolean;
  weight: boolean;
  
  // Women's health
  menstrual_cycle: boolean;
  premenopausal_symptoms: boolean;
  
  // Lab results
  lab_results: boolean;
  
  // Vitals
  blood_pressure: boolean;
  blood_sugar: boolean;
  heart_rate: boolean;
  temperature: boolean;
  
  // Nutrition
  nutrition_tracking: boolean;
  water_intake: boolean;
  
  // Activity
  activity_tracking: boolean;
  fitbit_integration: boolean;
  
  // Units
  weight_unit: 'lbs' | 'kg' | 'stones';
  temperature_unit: 'fahrenheit' | 'celsius';
  
  // Caregiver section visibility (only applies to caregiver role)
  caregiver_sections?: {
    dashboard: boolean;
    daily_entry: boolean;
    patterns: boolean;
    history: boolean;
    lab_results: boolean;
    womens_health: boolean;
    medical_management: boolean;
    seizure_tracking: boolean;
    mental_health: boolean;
    heartburn_tracking: boolean;
    reports: boolean;
    weight_goals: boolean;
    settings: boolean;
    data_management: boolean;
    backup_restore: boolean;
  };
}

export interface HealthEntry {
  id: string;
  user_id: string;
  date: string;
  mood?: number;
  energy?: number;
  anxiety_level?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  weight?: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface MenstrualEntry {
  id: string;
  user_id: string;
  date: string;
  cycle_day: number;
  flow_intensity: 'none' | 'light' | 'medium' | 'heavy';
  symptoms: string[];
  cycle_phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  notes: string;
  created_at: string;
}

export interface PremenopausalEntry {
  id: string;
  user_id: string;
  date: string;
  hot_flashes: number;
  night_sweats: boolean;
  mood_swings: number;
  irregular_periods: boolean;
  sleep_disturbances: boolean;
  joint_aches: boolean;
  brain_fog: number;
  weight_changes: boolean;
  notes: string;
  created_at: string;
}

export interface MenstrualEntry {
  id: string;
  user_id: string;
  date: string;
  cycle_day: number;
  flow_intensity: 'none' | 'light' | 'medium' | 'heavy';
  symptoms: string[];
  cycle_phase: 'menstrual' | 'follicular' | 'ovulation' | 'luteal';
  notes: string;
  created_at: string;
}

export interface PremenopausalEntry {
  id: string;
  user_id: string;
  date: string;
  hot_flashes: number;
  night_sweats: boolean;
  mood_swings: number;
  irregular_periods: boolean;
  sleep_disturbances: boolean;
  joint_aches: boolean;
  brain_fog: number;
  weight_changes: boolean;
  notes: string;
  created_at: string;
}

export interface LabResult {
  id: string;
  user_id: string;
  test_date: string;
  test_name: string;
  test_category: 'blood' | 'hormone' | 'vitamin' | 'metabolic' | 'thyroid' | 'other';
  result_value: number;
  result_unit: string;
  reference_range_min?: number;
  reference_range_max?: number;
  status: 'low' | 'normal' | 'high' | 'critical';
  doctor_notes?: string;
  lab_name?: string;
  created_at: string;
}

export interface Diagnosis {
  id: string;
  user_id: string;
  diagnosis_name: string;
  diagnosis_code?: string;
  diagnosed_date?: string;
  diagnosed_by?: string;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface Medication {
  id: string;
  user_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  prescribed_by?: string;
  prescribed_date?: string;
  status: 'active' | 'discontinued' | 'paused' | 'as_needed';
  start_date?: string;
  end_date?: string;
  side_effects: string[];
  effectiveness_rating?: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SeizureEntry {
  id: string;
  user_id: string;
  date: string;
  time: string;
  seizure_type: 'focal' | 'generalized' | 'absence' | 'tonic_clonic' | 'myoclonic' | 'atonic' | 'unknown';
  duration_seconds?: number;
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  triggers: string[];
  warning_signs: string[];
  post_seizure_effects: string[];
  location?: string;
  witnesses: string[];
  emergency_services_called: boolean;
  medication_taken?: string;
  recovery_time_minutes?: number;
  notes: string;
  created_at: string;
}

export interface BloodPressureReading {
  id: string;
  user_id: string;
  date: string;
  time: string;
  systolic: number;
  diastolic: number;
  heart_rate?: number;
  position: string;
  arm: string;
  cuff_size: string;
  notes: string;
  created_at: string;
}

export interface MentalHealthEntry {
  id: string;
  user_id: string;
  date: string;
  time: string;
  suicidal_thoughts: boolean;
  thoughts_intensity?: number;
  thoughts_duration?: string;
  triggers: string[];
  coping_mechanisms_used: string[];
  support_contacted: boolean;
  support_person?: string;
  safety_plan_followed: boolean;
  mood_before?: number;
  mood_after?: number;
  notes: string;
  is_crisis: boolean;
  created_at: string;
}

export interface OutdoorTimeEntry {
  id: string;
  user_id: string;
  date: string;
  time_logged: string;
  session_count: number;
  duration_minutes: number; // Approximate duration per session
  activity_type: string;
  weather_conditions?: string;
  mood_before?: number;
  mood_after?: number;
  notes: string;
  created_at: string;
}

export interface WeightGoal {
  id: string;
  user_id: string;
  goal_type: 'loss' | 'gain' | 'maintain';
  start_weight: number;
  target_weight: number;
  target_date?: string;
  weekly_goal?: number;
  start_date: string;
  is_active: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface ReportTemplate {
  id: string;
  user_id: string;
  template_name: string;
  report_type: 'doctor' | 'mental_health' | 'specialist' | 'emergency' | 'routine_checkup';
  template_content: any;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CommonLabTests {
  // Blood tests
  hemoglobin: number;
  hematocrit: number;
  white_blood_cells: number;
  platelets: number;
  
  // Vitamins & Minerals
  vitamin_b12: number;
  vitamin_d: number;
  iron: number;
  ferritin: number;
  folate: number;
  
  // Metabolic
  hba1c: number;
  glucose: number;
  cholesterol_total: number;
  cholesterol_ldl: number;
  cholesterol_hdl: number;
  triglycerides: number;
  
  // Thyroid
  tsh: number;
  t3: number;
  t4: number;
  
  // Hormones
  estrogen: number;
  progesterone: number;
  testosterone: number;
  cortisol: number;
  
  // Kidney & Liver
  creatinine: number;
  bun: number;
  alt: number;
  ast: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  time: string;
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes: string;
  nutrition?: {
    calories?: number;
    serving_size?: string;
    carbs?: number;
    protein?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
}

export interface ActivityEntry {
  id: string;
  name: string;
  duration: number;
  intensity: 'low' | 'moderate' | 'high';
  time: string;
}

export interface HealthEntryInsert {
  user_id: string;
  date: string;
  mood?: number;
  energy?: number;
  anxiety_level?: number;
  sleep_hours?: number;
  sleep_quality?: number;
  weight?: number;
  notes?: string;
}