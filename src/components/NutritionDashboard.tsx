import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Utensils, Target, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getDailyNutritionSummary, getNutritionHistory, getFoodEntriesWithNutrition } from '../lib/database';

export const NutritionDashboard: React.FC<{ selectedDate?: string }> = ({ selectedDate }) => {
  const { currentUser } = useAuth();
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [nutritionHistory, setNutritionHistory] = useState<any[]>([]);
  const [foodEntries, setFoodEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentDate = selectedDate || new Date().toISOString().split('T')[0];
  
  useEffect(() => {
    if (currentUser) {
      loadNutritionData();
    }
  }, [currentUser, currentDate]);
  
  const loadNutritionData = async () => {
    try {
      setLoading(true);
      
      const [summaryResult, historyResult, foodResult] = await Promise.all([
        getDailyNutritionSummary(currentUser!.id, currentDate),
        getNutritionHistory(currentUser!.id, 7),
        getFoodEntriesWithNutrition(currentUser!.id, currentDate)
      ]);
      
      setDailySummary(summaryResult.data);
      setNutritionHistory(historyResult.data || []);
      setFoodEntries(foodResult.data || []);
      
    } catch (error) {
      console.error('Error loading nutrition data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading nutrition data...</span>
      </div>
    );
  }
  
  if (!dailySummary) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
        <Utensils className="h-12 w-12 text-blue-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-blue-900 mb-2">No Nutrition Data</h3>
        <p className="text-blue-700">Add food entries with nutrition information to see your daily breakdown.</p>
      </div>
    );
  }
  
  // Prepare macro data for pie chart
  const macroData = [
    { name: 'Carbs', value: dailySummary.total_carbs * 4, color: '#3b82f6' }, // 4 cal/g
    { name: 'Protein', value: dailySummary.total_protein * 4, color: '#10b981' }, // 4 cal/g
    { name: 'Fat', value: dailySummary.total_fat * 9, color: '#f59e0b' } // 9 cal/g
  ];
  
  // Calculate percentages
  const getGoalPercentage = (actual: number, goal: number) => {
    return goal > 0 ? Math.round((actual / goal) * 100) : 0;
  };
  
  const getStatusColor = (percentage: number) => {
    if (percentage >= 90 && percentage <= 110) return 'text-green-600';
    if (percentage >= 70 && percentage <= 130) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  const getStatusIcon = (percentage: number) => {
    if (percentage >= 90 && percentage <= 110) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (percentage >= 70 && percentage <= 130) return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };
  
  return (
    <div className="space-y-6">
      {/* Daily Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Calories</h4>
            {getStatusIcon(getGoalPercentage(dailySummary.total_calories, dailySummary.calorie_goal))}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900">{Math.round(dailySummary.total_calories)}</span>
            <span className="text-sm text-gray-500">/ {dailySummary.calorie_goal}</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${Math.min(100, getGoalPercentage(dailySummary.total_calories, dailySummary.calorie_goal))}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Carbs</h4>
            {getStatusIcon(getGoalPercentage(dailySummary.total_carbs, dailySummary.carb_goal))}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900">{Math.round(dailySummary.total_carbs)}g</span>
            <span className="text-sm text-gray-500">/ {dailySummary.carb_goal}g</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${Math.min(100, getGoalPercentage(dailySummary.total_carbs, dailySummary.carb_goal))}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Protein</h4>
            {getStatusIcon(getGoalPercentage(dailySummary.total_protein, dailySummary.protein_goal))}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900">{Math.round(dailySummary.total_protein)}g</span>
            <span className="text-sm text-gray-500">/ {dailySummary.protein_goal}g</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full" 
                style={{ width: `${Math.min(100, getGoalPercentage(dailySummary.total_protein, dailySummary.protein_goal))}%` }}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-600">Fat</h4>
            {getStatusIcon(getGoalPercentage(dailySummary.total_fat, dailySummary.fat_goal))}
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900">{Math.round(dailySummary.total_fat)}g</span>
            <span className="text-sm text-gray-500">/ {dailySummary.fat_goal}g</span>
          </div>
          <div className="mt-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full" 
                style={{ width: `${Math.min(100, getGoalPercentage(dailySummary.total_fat, dailySummary.fat_goal))}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Macro Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Macro Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={macroData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {macroData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${Math.round(value)} cal`, 'Calories']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Weekly Nutrition Trends */}
        {nutritionHistory.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekly Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutritionHistory.reverse()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  />
                  <Legend />
                  <Bar dataKey="total_calories" fill="#3b82f6" name="Calories" />
                  <Bar dataKey="total_protein" fill="#10b981" name="Protein (g)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
      
      {/* Detailed Food Entries */}
      {foodEntries.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Food Entries</h3>
          <div className="space-y-3">
            {foodEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Utensils className="h-4 w-4 text-green-500" />
                  <div>
                    <span className="font-medium">{entry.name}</span>
                    <div className="text-sm text-gray-500">
                      {entry.category} • {entry.time}
                    </div>
                  </div>
                </div>
                {entry.food_nutrition && entry.food_nutrition.length > 0 && (
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {Math.round(entry.food_nutrition[0].calories)} cal
                    </div>
                    <div className="text-xs text-gray-500">
                      C: {Math.round(entry.food_nutrition[0].carbs)}g • 
                      P: {Math.round(entry.food_nutrition[0].protein)}g • 
                      F: {Math.round(entry.food_nutrition[0].fat)}g
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Micronutrients */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Nutrients</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(dailySummary.total_fiber)}g</div>
            <div className="text-sm text-gray-600">Fiber</div>
            <div className="text-xs text-gray-500">Goal: {dailySummary.fiber_goal}g</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(dailySummary.total_sugar)}g</div>
            <div className="text-sm text-gray-600">Sugar</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{Math.round(dailySummary.total_sodium)}mg</div>
            <div className="text-sm text-gray-600">Sodium</div>
            <div className="text-xs text-gray-500">Limit: {dailySummary.sodium_limit}mg</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {getGoalPercentage(dailySummary.total_calories, dailySummary.calorie_goal)}%
            </div>
            <div className="text-sm text-gray-600">Daily Goal</div>
          </div>
        </div>
      </div>
    </div>
  );
};