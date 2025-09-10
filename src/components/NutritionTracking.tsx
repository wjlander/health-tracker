import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Utensils, Target, TrendingUp, Droplets } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  createFoodNutrition, 
  getFoodNutrition, 
  updateFoodNutrition, 
  deleteFoodNutrition,
  getDailyNutritionSummary,
  createWaterIntake,
  getTotalWaterIntake,
  calculateDailyNutrition
} from '../lib/database';
import { format } from 'date-fns';

interface NutritionEntry {
  id?: string;
  food_entry_id: string;
  calories: number;
  serving_size: string;
  serving_unit: string;
  carbs: number;
  protein: number;
  fat: number;
  fiber: number;
  sugar: number;
  sodium: number;
}

export const NutritionTracking: React.FC<{ 
  foodEntryId?: string;
  selectedDate?: string;
}> = ({ foodEntryId, selectedDate }) => {
  const { currentUser } = useAuth();
  const [nutritionEntry, setNutritionEntry] = useState<NutritionEntry>({
    food_entry_id: foodEntryId || '',
    calories: 0,
    serving_size: '1',
    serving_unit: 'serving',
    carbs: 0,
    protein: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0
  });
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [waterIntake, setWaterIntake] = useState(0);
  const [totalWater, setTotalWater] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showNutritionForm, setShowNutritionForm] = useState(false);
  
  const currentDate = selectedDate || format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (currentUser) {
      loadNutritionData();
      loadWaterIntake();
    }
  }, [currentUser, currentDate]);

  const loadNutritionData = async () => {
    try {
      // First, ensure nutrition summary is calculated for today
      await calculateDailyNutrition(currentUser!.id, currentDate);
      
      const { data, error } = await getDailyNutritionSummary(currentUser!.id, currentDate);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setDailySummary(data);
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    }
  };

  const loadWaterIntake = async () => {
    try {
      const { total, error } = await getTotalWaterIntake(currentUser!.id, currentDate);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setTotalWater(total);
    } catch (error) {
      console.error('Error loading water intake:', error);
    }
  };

  const addWaterIntake = async () => {
    if (!waterIntake || !currentUser) return;
    
    try {
      const { error } = await createWaterIntake({
        user_id: currentUser.id,
        date: currentDate,
        amount_ml: waterIntake,
        source: 'manual'
      });
      
      if (error) throw error;
      
      setWaterIntake(0);
      await loadWaterIntake();
    } catch (error) {
      console.error('Error adding water intake:', error);
      alert('Failed to add water intake. Please try again.');
    }
  };

  const saveNutritionEntry = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const nutritionData = {
        ...nutritionEntry,
        user_id: currentUser.id,
        data_source: 'manual'
      };
      
      if (nutritionEntry.id) {
        const { error } = await updateFoodNutrition(nutritionEntry.id, nutritionData);
        if (error) throw error;
      } else {
        const { error } = await createFoodNutrition(nutritionData);
        if (error) throw error;
      }
      
      setShowNutritionForm(false);
      await loadNutritionData();
    } catch (error) {
      console.error('Error saving nutrition entry:', error);
      alert('Failed to save nutrition data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const MacroCard: React.FC<{
    title: string;
    current: number;
    goal: number;
    unit: string;
    color: string;
  }> = ({ title, current, goal, unit, color }) => {
    const percentage = goal > 0 ? Math.round((current / goal) * 100) : 0;
    
    return (
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium text-gray-600">{title}</h4>
          <span className={`text-xs font-medium ${
            percentage >= 90 && percentage <= 110 ? 'text-green-600' :
            percentage >= 70 && percentage <= 130 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {percentage}%
          </span>
        </div>
        <div className="flex items-baseline space-x-2 mb-2">
          <span className="text-xl font-bold text-gray-900">{Math.round(current)}</span>
          <span className="text-sm text-gray-500">/ {goal}{unit}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full ${color}`}
            style={{ width: `${Math.min(100, percentage)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Daily Nutrition Summary */}
      {dailySummary ? (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Target className="h-5 w-5 mr-2 text-blue-500" />
            Daily Nutrition Goals - {format(new Date(currentDate), 'MMM d, yyyy')}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <MacroCard
              title="Calories"
              current={dailySummary.total_calories}
              goal={dailySummary.calorie_goal}
              unit=""
              color="bg-blue-500"
            />
            <MacroCard
              title="Carbs"
              current={dailySummary.total_carbs}
              goal={dailySummary.carb_goal}
              unit="g"
              color="bg-purple-500"
            />
            <MacroCard
              title="Protein"
              current={dailySummary.total_protein}
              goal={dailySummary.protein_goal}
              unit="g"
              color="bg-green-500"
            />
            <MacroCard
              title="Fat"
              current={dailySummary.total_fat}
              goal={dailySummary.fat_goal}
              unit="g"
              color="bg-yellow-500"
            />
          </div>
          
          {/* Additional Nutrients */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
            <h4 className="font-medium text-gray-900 mb-4">Additional Nutrients</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{Math.round(dailySummary.total_fiber)}g</div>
                <div className="text-sm text-gray-600">Fiber</div>
                <div className="text-xs text-gray-500">Goal: {dailySummary.fiber_goal}g</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{Math.round(dailySummary.total_sugar)}g</div>
                <div className="text-sm text-gray-600">Sugar</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{Math.round(dailySummary.total_sodium)}mg</div>
                <div className="text-sm text-gray-600">Sodium</div>
                <div className="text-xs text-gray-500">Limit: {dailySummary.sodium_limit}mg</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{totalWater}ml</div>
                <div className="text-sm text-gray-600">Water</div>
                <div className="text-xs text-gray-500">Goal: 2000ml</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <Utensils className="h-12 w-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">No Nutrition Data</h3>
          <p className="text-blue-700">Add food entries with nutrition information to see your daily breakdown.</p>
        </div>
      )}

      {/* Water Intake */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Droplets className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Water Intake</h3>
          </div>
          <div className="text-sm text-gray-600">
            Today: {totalWater}ml / 2000ml
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <input
            type="number"
            value={waterIntake}
            onChange={(e) => setWaterIntake(Number(e.target.value))}
            placeholder="Amount in ml"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            min="0"
            step="50"
          />
          <button
            onClick={addWaterIntake}
            disabled={!waterIntake}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Water</span>
          </button>
        </div>
        
        <div className="mt-4">
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (totalWater / 2000) * 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0ml</span>
            <span>2000ml goal</span>
          </div>
        </div>
      </div>

      {/* Quick Add Nutrition */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Quick Add Nutrition</h3>
          <button
            onClick={() => setShowNutritionForm(!showNutritionForm)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Food</span>
          </button>
        </div>

        {showNutritionForm && (
          <div className="border border-gray-200 rounded-lg p-4 bg-green-50">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <input
                type="number"
                placeholder="Calories"
                value={nutritionEntry.calories}
                onChange={(e) => setNutritionEntry({...nutritionEntry, calories: Number(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <input
                type="text"
                placeholder="Serving size"
                value={nutritionEntry.serving_size}
                onChange={(e) => setNutritionEntry({...nutritionEntry, serving_size: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <select
                value={nutritionEntry.serving_unit}
                onChange={(e) => setNutritionEntry({...nutritionEntry, serving_unit: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              >
                <option value="serving">serving</option>
                <option value="cup">cup</option>
                <option value="oz">oz</option>
                <option value="g">grams</option>
                <option value="ml">ml</option>
              </select>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <input
                type="number"
                placeholder="Carbs (g)"
                value={nutritionEntry.carbs}
                onChange={(e) => setNutritionEntry({...nutritionEntry, carbs: Number(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="Protein (g)"
                value={nutritionEntry.protein}
                onChange={(e) => setNutritionEntry({...nutritionEntry, protein: Number(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="Fat (g)"
                value={nutritionEntry.fat}
                onChange={(e) => setNutritionEntry({...nutritionEntry, fat: Number(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="Fiber (g)"
                value={nutritionEntry.fiber}
                onChange={(e) => setNutritionEntry({...nutritionEntry, fiber: Number(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="number"
                placeholder="Sugar (g)"
                value={nutritionEntry.sugar}
                onChange={(e) => setNutritionEntry({...nutritionEntry, sugar: Number(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
              <input
                type="number"
                placeholder="Sodium (mg)"
                value={nutritionEntry.sodium}
                onChange={(e) => setNutritionEntry({...nutritionEntry, sodium: Number(e.target.value)})}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={saveNutritionEntry}
                disabled={loading}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Nutrition'}
              </button>
              <button
                onClick={() => setShowNutritionForm(false)}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};