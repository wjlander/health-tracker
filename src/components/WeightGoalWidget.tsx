import React, { useState, useEffect } from 'react';
import { Target, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getActiveWeightGoal, getHealthEntries, getLatestFitbitData } from '../lib/database';
import { convertWeight, formatWeight, WeightUnit } from '../lib/units';
import { differenceInDays } from 'date-fns';

export const WeightGoalWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeGoal, setActiveGoal] = useState<any>(null);
  const [currentWeight, setCurrentWeight] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  const weightUnit = (currentUser?.tracking_preferences?.weight_unit as WeightUnit) || 'lbs';

  useEffect(() => {
    if (currentUser) {
      loadGoalData();
    }
  }, [currentUser]);

  const loadGoalData = async () => {
    try {
      setLoading(true);
      
      const [goalResult, healthResult, fitbitResult] = await Promise.all([
        getActiveWeightGoal(currentUser!.id),
        getHealthEntries(currentUser!.id, 1),
        getLatestFitbitData(currentUser!.id)
      ]);
      
      // Handle goal result
      if (goalResult.error && !goalResult.error.message?.includes('does not exist')) {
        throw goalResult.error;
      }
      setActiveGoal(goalResult.data);
      
      // Handle weight data (prioritize Fitbit over health entries)
      let latestWeight = 0;
      
      if (fitbitResult?.weight?.weight) {
        latestWeight = convertWeight(fitbitResult.weight.weight, 'lbs', weightUnit);
      } else if (healthResult.data && healthResult.data.length > 0 && healthResult.data[0].weight) {
        latestWeight = convertWeight(healthResult.data[0].weight, 'lbs', weightUnit);
      }
      
      setCurrentWeight(latestWeight);
    } catch (error) {
      console.warn('Error loading weight goal data:', error);
      // Don't throw error, just log it and continue
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!activeGoal) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center space-x-3 mb-4">
          <div className="bg-purple-500 p-2 rounded-lg">
            <Target className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Weight Goal</h3>
            <p className="text-sm text-gray-600">Set a weight goal</p>
          </div>
        </div>
        
        <div className="text-center py-4">
          <p className="text-gray-500 mb-4">No active weight goal</p>
          <button
            onClick={() => window.location.hash = 'weight-goals'}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Set Goal
          </button>
        </div>
      </div>
    );
  }

  const startWeight = convertWeight(activeGoal.start_weight, 'lbs', weightUnit);
  const targetWeight = convertWeight(activeGoal.target_weight, 'lbs', weightUnit);
  const progress = currentWeight - startWeight;
  const remaining = targetWeight - currentWeight;
  const totalChange = targetWeight - startWeight;
  const progressPercentage = Math.abs(totalChange) > 0 ? Math.abs(progress / totalChange) * 100 : 0;
  
  const daysElapsed = differenceInDays(new Date(), new Date(activeGoal.start_date));
  const daysToTarget = activeGoal.target_date ? differenceInDays(new Date(activeGoal.target_date), new Date()) : null;
  
  const isOnTrack = activeGoal.weekly_goal ? 
    Math.abs(progress) >= Math.abs(activeGoal.weekly_goal * (daysElapsed / 7)) * 0.8 : true;

  const GoalIcon = activeGoal.goal_type === 'loss' ? TrendingDown : 
                   activeGoal.goal_type === 'gain' ? TrendingUp : Minus;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-purple-500 p-2 rounded-lg">
          <GoalIcon className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Weight Goal</h3>
          <p className="text-sm text-gray-600 capitalize">{activeGoal.goal_type}</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Current:</span>
          <span className="font-medium">{formatWeight(currentWeight, weightUnit)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Target:</span>
          <span className="font-medium">{formatWeight(targetWeight, weightUnit)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Progress:</span>
          <span className={`font-medium ${
            (activeGoal.goal_type === 'loss' && progress < 0) || 
            (activeGoal.goal_type === 'gain' && progress > 0) ||
            (activeGoal.goal_type === 'maintain' && Math.abs(progress) < 2)
              ? 'text-green-600' : 'text-gray-900'
          }`}>
            {progress > 0 ? '+' : ''}{formatWeight(Math.abs(progress), weightUnit)}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              isOnTrack ? 'bg-green-500' : 'bg-yellow-500'
            }`}
            style={{ width: `${Math.min(100, progressPercentage)}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-500 text-center">
          {Math.round(progressPercentage)}% to goal
          {daysToTarget && (
            <span> • {daysToTarget} days remaining</span>
          )}
        </div>
        
        {!isOnTrack && activeGoal.weekly_goal && (
          <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            Consider adjusting your approach to stay on track for your weekly goal.
          </div>
        )}
      </div>
    </div>
  );
};