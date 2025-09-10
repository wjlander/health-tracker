import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { format } from 'date-fns';
import { Plus, Trash2, Clock, Utensils } from 'lucide-react';
import { FoodEntry, ActivityEntry } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { createHealthEntry, createFoodEntry, createActivityEntry, getLatestFitbitData } from '../lib/database';
import { formatWeight, convertWeight, WeightUnit } from '../lib/units';

const schema = yup.object({
  date: yup.string().required('Date is required'),
  mood: yup.number().min(1).max(10).required('Mood rating is required'),
  energy: yup.number().min(1).max(10).required('Energy rating is required'),
  anxiety_level: yup.number().min(1).max(10).required('Anxiety level is required'),
  sleep_hours: yup.number().min(0).max(24).required('Sleep hours is required'),
  sleep_quality: yup.number().min(1).max(10).required('Sleep quality is required'),
  weight: yup.number().min(0).required('Weight is required'),
  notes: yup.string(),
});

type FormData = yup.InferType<typeof schema>;

export const DailyEntry: React.FC = () => {
  const { currentUser } = useAuth();
  const [foodEntries, setFoodEntries] = useState<FoodEntry[]>([]);
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [showFoodForm, setShowFoodForm] = useState(false);
  const [showActivityForm, setShowActivityForm] = useState(false);
  const [fitbitData, setFitbitData] = useState<any>(null);
  const [autoFillEnabled, setAutoFillEnabled] = useState(true);
  const [widgetData, setWidgetData] = useState({
    waterIntake: 0,
    outdoorSessions: 0,
    seizureCount: 0,
    bowelMovements: 0
  });
  
  // Get user's weight unit preference
  const weightUnit = (currentUser?.tracking_preferences?.weight_unit as WeightUnit) || 'lbs';

  const { control, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      mood: 5,
      energy: 5,
      anxiety_level: 5,
      sleep_hours: 8,
      sleep_quality: 5,
      weight: 0,
      notes: '',
    },
  });

  // Load Fitbit data for auto-fill
  useEffect(() => {
    if (currentUser && autoFillEnabled) {
      loadFitbitData();
      loadWidgetData();
    }
  }, [currentUser, autoFillEnabled]);
  
  const loadWidgetData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [waterResult, outdoorResult, seizureResult, bowelResult] = await Promise.all([
        getTotalWaterIntake(currentUser!.id, today),
        getTotalOutdoorSessions(currentUser!.id, today),
        getTodaySeizures(currentUser!.id, today),
        getTodayBowelMovements(currentUser!.id, today)
      ]);
      
      setWidgetData({
        waterIntake: waterResult.total || 0,
        outdoorSessions: outdoorResult.total || 0,
        seizureCount: seizureResult.count || 0,
        bowelMovements: bowelResult.count || 0
      });
    } catch (error) {
      console.error('Error loading widget data:', error);
    }
  };

  const loadFitbitData = async () => {
    try {
      const data = await getLatestFitbitData(currentUser!.id);
      setFitbitData(data);
      
      // Auto-fill form with Fitbit data if available
      if (data.sleep) {
        const sleepHours = data.sleep.duration / 60; // Convert minutes to hours
        const sleepQuality = Math.round((data.sleep.efficiency / 100) * 10); // Convert efficiency to 1-10 scale
        
        setValue('sleep_hours', sleepHours);
        setValue('sleep_quality', sleepQuality);
      }
      
      if (data.weight) {
        console.log('Auto-filling weight from Fitbit:', {
          rawWeight: data.weight.weight,
          fromUnit: 'lbs',
          toUnit: weightUnit,
          converted: convertWeight(data.weight.weight, 'lbs', weightUnit)
        });
        const weightInUserUnit = convertWeight(data.weight.weight, 'lbs', weightUnit);
        setValue('weight', weightInUserUnit);
      }
      
      // Auto-add food entries from Fitbit
      if (data.food && data.food.foods && data.food.foods.length > 0) {
        const fitbitFoods = data.food.foods.map((food: any, index: number) => ({
          id: `fitbit-${index}`,
          name: food.name,
          time: food.time ? new Date(food.time).toTimeString().slice(0, 5) : '12:00',
          category: food.mealType || 'snack',
          notes: `From Fitbit (${food.calories} cal)`
        }));
        setFoodEntries(fitbitFoods);
      }
      
      // Auto-add activity from Fitbit
      if (data.activity && data.activity.steps > 1000) {
        const fitbitActivity = {
          id: 'fitbit-activity',
          name: `Daily Activity (${data.activity.steps.toLocaleString()} steps)`,
          duration: data.activity.active_minutes || 30,
          intensity: 'moderate' as const,
          time: '12:00'
        };
        setActivities([fitbitActivity]);
      }
      
    } catch (error) {
      console.error('Error loading Fitbit data for auto-fill:', error);
    }
  };

  const onSubmit = async (data: FormData) => {
    try {
      if (!currentUser) return;
      
      // Convert weight to pounds for storage (database standard)
      const weightInPounds = convertWeight(data.weight, weightUnit, 'lbs');
      
      // Create health entry
      const { data: healthEntry, error: healthError } = await createHealthEntry({
        user_id: currentUser.id,
        date: data.date,
        mood: data.mood,
        energy: data.energy,
        anxiety_level: data.anxiety_level,
        sleep_hours: data.sleep_hours,
        sleep_quality: data.sleep_quality,
        weight: weightInPounds,
        notes: data.notes || ''
      });
      
      if (healthError) throw healthError;
      
      // Create food entries
      for (const foodEntry of foodEntries) {
        await createFoodEntry({
          user_id: currentUser.id,
          health_entry_id: healthEntry.id,
          name: foodEntry.name,
          time: foodEntry.time,
          category: foodEntry.category,
          notes: foodEntry.notes
        });
      }
      
      // Create activity entries
      for (const activity of activities) {
        await createActivityEntry({
          user_id: currentUser.id,
          health_entry_id: healthEntry.id,
          name: activity.name,
          duration: activity.duration,
          intensity: activity.intensity,
          time: activity.time
        });
      }
      
      alert('Daily entry saved successfully!');
      reset();
      setFoodEntries([]);
      setActivities([]);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Error saving daily entry. Please try again.');
    }
  };

  const addFoodEntry = (entry: Omit<FoodEntry, 'id'>) => {
    const newEntry: FoodEntry = {
      ...entry,
      id: Date.now().toString(),
    };
    setFoodEntries([...foodEntries, newEntry]);
    setShowFoodForm(false);
  };

  const addActivity = (activity: Omit<ActivityEntry, 'id'>) => {
    const newActivity: ActivityEntry = {
      ...activity,
      id: Date.now().toString(),
    };
    setActivities([...activities, newActivity]);
    setShowActivityForm(false);
  };

  const ScaleInput: React.FC<{ 
    label: string; 
    value: number; 
    onChange: (value: number) => void;
    min?: number;
    max?: number;
    labels?: { [key: number]: string };
  }> = ({ label, value, onChange, min = 1, max = 10, labels }) => (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center space-x-2">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 h-2 bg-blue-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <span className="w-8 text-center font-medium text-blue-600">{value}</span>
      </div>
      {labels && (
        <div className="flex justify-between text-xs text-gray-500">
          <span>{labels[min] || min}</span>
          <span>{labels[max] || max}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Auto-fill Toggle */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Fitbit Auto-fill</h3>
              <p className="text-xs text-blue-700">Automatically populate fields with today's Fitbit data</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoFillEnabled(!autoFillEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                autoFillEnabled ? 'bg-blue-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  autoFillEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          {fitbitData && autoFillEnabled && (
            <div className="mt-2 text-xs text-blue-700">
              ✓ Auto-filled: 
              {fitbitData.sleep && ' Sleep'}
              {fitbitData.weight && ' Weight'}
              {fitbitData.food && ' Food'}
              {fitbitData.activity && ' Activity'}
            </div>
          )}
          
          {/* Widget data summary */}
          <div className="mt-3 pt-3 border-t border-blue-200">
            <p className="text-xs text-blue-700 mb-2">Today's widget data will be included:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>💧 Water: {widgetData.waterIntake}ml</div>
              <div>☀️ Outdoor: {widgetData.outdoorSessions} sessions</div>
              <div>⚡ Seizures: {widgetData.seizureCount}</div>
              <div>🚽 Bowel: {widgetData.bowelMovements}</div>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Date</h3>
          <Controller
            name="date"
            control={control}
            render={({ field }) => (
              <input
                type="date"
                {...field}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              />
            )}
          />
          {errors.date && <p className="text-red-500 text-sm mt-1">{errors.date.message}</p>}
        </div>

        {/* Mood & Energy */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Mood & Energy</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Controller
              name="mood"
              control={control}
              render={({ field }) => (
                <ScaleInput
                  label="Mood"
                  value={field.value}
                  onChange={field.onChange}
                  labels={{ 1: 'Very Low', 10: 'Excellent' }}
                />
              )}
            />
            <Controller
              name="energy"
              control={control}
              render={({ field }) => (
                <ScaleInput
                  label="Energy Level"
                  value={field.value}
                  onChange={field.onChange}
                  labels={{ 1: 'Exhausted', 10: 'Energetic' }}
                />
              )}
            />
            <Controller
              name="anxiety_level"
              control={control}
              render={({ field }) => (
                <ScaleInput
                  label="Anxiety Level"
                  value={field.value}
                  onChange={field.onChange}
                  labels={{ 1: 'Very Calm', 10: 'Very Anxious' }}
                />
              )}
            />
          </div>
        </div>

        {/* Sleep */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Sleep</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Hours Slept</label>
              <Controller
                name="sleep_hours"
                control={control}
                render={({ field }) => (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="24"
                    {...field}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                )}
              />
              {errors.sleep_hours && <p className="text-red-500 text-sm mt-1">{errors.sleep_hours.message}</p>}
            </div>
            <Controller
              name="sleep_quality"
              control={control}
              render={({ field }) => (
                <ScaleInput
                  label="Sleep Quality"
                  value={field.value}
                  onChange={field.onChange}
                  labels={{ 1: 'Very Poor', 10: 'Excellent' }}
                />
              )}
            />
          </div>
        </div>

        {/* Weight */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Weight ({weightUnit})
          </h3>
          <div className="max-w-xs">
            <Controller
              name="weight"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    {...field}
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="0.0"
                  />
                  <span className="absolute right-3 top-3 text-gray-500">{weightUnit}</span>
                </div>
              )}
            />
            {errors.weight && <p className="text-red-500 text-sm mt-1">{errors.weight.message}</p>}
            <p className="text-xs text-gray-500 mt-2">
              Enter weight in {weightUnit}. Change units in Settings if needed.
            </p>
          </div>
        </div>

        {/* Food Entries */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Food & Meals</h3>
            <button
              type="button"
              onClick={() => setShowFoodForm(true)}
              className="flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Food</span>
            </button>
          </div>
          
          {foodEntries.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No food entries yet. Add your meals and snacks!</p>
          ) : (
            <div className="space-y-2">
              {foodEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Utensils className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{entry.name}</span>
                    <span className="text-sm text-gray-500">({entry.category})</span>
                    <span className="text-sm text-gray-500">{entry.time}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFoodEntries(foodEntries.filter(f => f.id !== entry.id))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showFoodForm && (
            <FoodEntryForm
              onSave={addFoodEntry}
              onCancel={() => setShowFoodForm(false)}
            />
          )}
        </div>

        {/* Activities */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activities</h3>
            <button
              type="button"
              onClick={() => setShowActivityForm(true)}
              className="flex items-center space-x-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Add Activity</span>
            </button>
          </div>
          
          {activities.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No activities yet. Add your exercise and daily activities!</p>
          ) : (
            <div className="space-y-2">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{activity.name}</span>
                    <span className="text-sm text-gray-500">({activity.duration} min)</span>
                    <span className="text-sm text-gray-500">{activity.intensity}</span>
                    <span className="text-sm text-gray-500">{activity.time}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActivities(activities.filter(a => a.id !== activity.id))}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {showActivityForm && (
            <ActivityEntryForm
              onSave={addActivity}
              onCancel={() => setShowActivityForm(false)}
            />
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Notes</h3>
          <Controller
            name="notes"
            control={control}
            render={({ field }) => (
              <textarea
                {...field}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Any additional notes about your day, symptoms, or observations..."
              />
            )}
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors shadow-lg text-lg"
          >
            Save Daily Entry
          </button>
        </div>
      </form>
    </div>
  );
};

// Food Entry Form Component
const FoodEntryForm: React.FC<{
  onSave: (entry: Omit<FoodEntry, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    time: format(new Date(), 'HH:mm'),
    category: 'breakfast' as const,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border border-gray-200 rounded-lg bg-green-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Food/meal name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
          required
        />
        <select
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
        >
          <option value="breakfast">Breakfast</option>
          <option value="lunch">Lunch</option>
          <option value="dinner">Dinner</option>
          <option value="snack">Snack</option>
        </select>
        <input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
        />
        <input
          type="text"
          placeholder="Notes (optional)"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
        />
      </div>
      <div className="flex space-x-2 mt-4">
        <button
          type="submit"
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          Add Food
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

// Activity Entry Form Component
const ActivityEntryForm: React.FC<{
  onSave: (activity: Omit<ActivityEntry, 'id'>) => void;
  onCancel: () => void;
}> = ({ onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    duration: 30,
    intensity: 'moderate' as const,
    time: format(new Date(), 'HH:mm'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      onSave(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 p-4 border border-gray-200 rounded-lg bg-blue-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Activity name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          required
        />
        <input
          type="number"
          placeholder="Duration (minutes)"
          value={formData.duration}
          onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
          min="1"
        />
        <select
          value={formData.intensity}
          onChange={(e) => setFormData({ ...formData, intensity: e.target.value as any })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low</option>
          <option value="moderate">Moderate</option>
          <option value="high">High</option>
        </select>
        <input
          type="time"
          value={formData.time}
          onChange={(e) => setFormData({ ...formData, time: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex space-x-2 mt-4">
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Add Activity
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};