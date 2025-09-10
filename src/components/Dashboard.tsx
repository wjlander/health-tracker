import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Heart, Activity, Moon, Scale, TrendingUp, RefreshCw, Smartphone, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { FitbitSync } from './FitbitSync';
import { GitHubUpdate } from './GitHubUpdate';
import { WaterWidget } from './WaterWidget';
import { SeizureWidget } from './SeizureWidget';
import { OutdoorTimeWidget } from './OutdoorTimeWidget';
import { BowelMovementWidget } from './BowelMovementWidget';
import { BloodPressureWidget } from './BloodPressureWidget';
import { WeightGoalWidget } from './WeightGoalWidget';
import { getHealthEntries, getLatestFitbitData, getDailyNutritionSummary, getActiveWeightGoal, getTotalWaterIntake } from '../lib/database';
import { convertWeight, formatWeight, WeightUnit } from '../lib/units';
import { format } from 'date-fns';

export const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const [healthData, setHealthData] = useState<any[]>([]);
  const [fitbitData, setFitbitData] = useState<any>(null);
  const [nutritionSummary, setNutritionSummary] = useState<any>(null);
  const [weightGoal, setWeightGoal] = useState<any>(null);
  const [waterTotal, setWaterTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  
  const weightUnit = (currentUser?.tracking_preferences?.weight_unit as WeightUnit) || 'lbs';

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
      
      // Set up auto-refresh every 30 seconds
      const interval = setInterval(() => {
        loadDashboardData();
        setLastRefresh(new Date());
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadDashboardData = async () => {
    try {
      console.log('Loading dashboard data for user:', currentUser?.name, currentUser?.id);
      
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const [healthResult, fitbitResult, nutritionResult, weightGoalResult, waterResult] = await Promise.all([
        getHealthEntries(currentUser!.id, 7),
        getLatestFitbitData(currentUser!.id),
        getDailyNutritionSummary(currentUser!.id, today),
        getActiveWeightGoal(currentUser!.id),
        getTotalWaterIntake(currentUser!.id, today)
      ]);
      
      console.log('Raw dashboard data loaded:', {
        healthEntries: healthResult.data?.length || 0,
        fitbitData: fitbitResult,
        nutritionSummary: nutritionResult.data,
        weightGoal: weightGoalResult.data,
        waterTotal: waterResult.total || 0
      });
      
      if (healthResult.data) {
        // Transform health data for chart
        const chartData = healthResult.data.slice(0, 7).reverse().map(entry => ({
          date: format(new Date(entry.date), 'MMM d'),
          mood: entry.mood || 5,
          energy: entry.energy || 5,
          anxiety: entry.anxiety_level || 5,
          sleep: entry.sleep_hours || 7,
          weight: entry.weight ? convertWeight(entry.weight, 'lbs', weightUnit) : 0
        }));
        
        setHealthData(chartData);
        
        console.log('Health data for', currentUser?.name, ':', {
          entries: chartData.length,
          latestWeight: chartData[chartData.length - 1]?.weight || null,
          latestMood: chartData[chartData.length - 1]?.mood || null
        });
      }
      
      setFitbitData(fitbitResult);
      setNutritionSummary(nutritionResult.data);
      setWeightGoal(weightGoalResult.data);
      setWaterTotal(waterResult.total || 0);
      
      console.log('Final dashboard state:', {
        caloriesFromNutrition: nutritionResult.data?.total_calories || 0,
        caloriesFromFitbit: fitbitResult?.food?.calories || 0,
        hasWeightGoal: !!weightGoalResult.data,
        currentWeight: fitbitResult?.weight?.weight || 'none'
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading your health dashboard...</span>
      </div>
    );
  }

  const latestEntry = healthData[healthData.length - 1];
  const currentWeight = fitbitData?.weight?.weight ? 
    convertWeight(fitbitData.weight.weight, 'lbs', weightUnit) : 
    (latestEntry?.weight || 0);

  return (
    <div className="space-y-6">
      {/* Auto-refresh indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back, {currentUser?.name}!</h1>
          <p className="text-gray-600">Here's your health overview for today</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <RefreshCw className="h-4 w-4" />
          <span>Last updated: {format(lastRefresh, 'HH:mm:ss')}</span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="bg-pink-500 p-2 rounded-lg">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mood</h3>
              <p className="text-2xl font-bold text-pink-600">{latestEntry?.mood || 5}/10</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-500 p-2 rounded-lg">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Energy</h3>
              <p className="text-2xl font-bold text-blue-600">{latestEntry?.energy || 5}/10</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-500 p-2 rounded-lg">
              <Moon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Sleep</h3>
              <p className="text-2xl font-bold text-purple-600">{latestEntry?.sleep || 7}h</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3">
            <div className="bg-green-500 p-2 rounded-lg">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Weight</h3>
              <p className="text-2xl font-bold text-green-600">
                {currentWeight > 0 ? formatWeight(currentWeight, weightUnit) : 'Not set'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Health Trend Chart */}
      {healthData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">7-Day Health Trends</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="mood" stroke="#ec4899" strokeWidth={2} name="Mood" />
                <Line type="monotone" dataKey="energy" stroke="#3b82f6" strokeWidth={2} name="Energy" />
                <Line type="monotone" dataKey="anxiety" stroke="#f97316" strokeWidth={2} name="Anxiety" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Dashboard Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <WaterWidget />
        <SeizureWidget />
        <OutdoorTimeWidget />
        <BowelMovementWidget />
        <BloodPressureWidget />
        <WeightGoalWidget />
      </div>

      {/* Fitbit Integration */}
      <FitbitSync />

      {/* GitHub Deployment */}
      <GitHubUpdate />

      {/* Today's Nutrition Summary */}
      {nutritionSummary && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Nutrition</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{Math.round(nutritionSummary.total_calories)}</p>
              <p className="text-sm text-gray-600">Calories</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{Math.round(nutritionSummary.total_protein)}g</p>
              <p className="text-sm text-gray-600">Protein</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{Math.round(nutritionSummary.total_carbs)}g</p>
              <p className="text-sm text-gray-600">Carbs</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{Math.round(nutritionSummary.total_fat)}g</p>
              <p className="text-sm text-gray-600">Fat</p>
            </div>
          </div>
        </div>
      )}

      {/* Fitbit Data Summary */}
      {fitbitData && (fitbitData.activity || fitbitData.weight || fitbitData.food || fitbitData.sleep) && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <div className="flex items-center space-x-3 mb-4">
            <Smartphone className="h-6 w-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">Today's Fitbit Data</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {fitbitData.activity && (
              <div className="text-center">
                <div className="bg-green-100 p-3 rounded-lg mb-2">
                  <Activity className="h-6 w-6 text-green-600 mx-auto" />
                </div>
                <p className="text-lg font-bold text-gray-900">{fitbitData.activity.steps?.toLocaleString() || 0}</p>
                <p className="text-sm text-gray-600">Steps</p>
                <p className="text-xs text-gray-500">{fitbitData.activity.calories || 0} calories</p>
              </div>
            )}
            
            {fitbitData.weight && (
              <div className="text-center">
                <div className="bg-blue-100 p-3 rounded-lg mb-2">
                  <Scale className="h-6 w-6 text-blue-600 mx-auto" />
                </div>
                <p className="text-lg font-bold text-gray-900">
                  {formatWeight(convertWeight(fitbitData.weight.weight, 'lbs', weightUnit), weightUnit)}
                </p>
                <p className="text-sm text-gray-600">Weight</p>
                {fitbitData.weight.bmi && (
                  <p className="text-xs text-gray-500">BMI: {fitbitData.weight.bmi}</p>
                )}
              </div>
            )}
            
            {fitbitData.food && (
              <div className="text-center">
                <div className="bg-orange-100 p-3 rounded-lg mb-2">
                  <Calendar className="h-6 w-6 text-orange-600 mx-auto" />
                </div>
                <p className="text-lg font-bold text-gray-900">{fitbitData.food.calories || 0}</p>
                <p className="text-sm text-gray-600">Calories</p>
                <p className="text-xs text-gray-500">{fitbitData.food.water || 0}ml water</p>
              </div>
            )}
            
            {fitbitData.sleep && (
              <div className="text-center">
                <div className="bg-purple-100 p-3 rounded-lg mb-2">
                  <Moon className="h-6 w-6 text-purple-600 mx-auto" />
                </div>
                <p className="text-lg font-bold text-gray-900">{(fitbitData.sleep.duration / 60).toFixed(1)}h</p>
                <p className="text-sm text-gray-600">Sleep</p>
                <p className="text-xs text-gray-500">{fitbitData.sleep.efficiency}% efficiency</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};