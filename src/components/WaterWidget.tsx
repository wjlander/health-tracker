import React, { useState, useEffect } from 'react';
import { Droplets, Plus, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createWaterIntake, getTotalWaterIntake } from '../lib/database';
import { format } from 'date-fns';

export const WaterWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [totalWater, setTotalWater] = useState(0);
  const [loading, setLoading] = useState(false);
  const [addAmount, setAddAmount] = useState(250);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const dailyGoal = 2000; // Goal: 2000ml per day

  useEffect(() => {
    if (currentUser) {
      loadTotalWater();
    }
  }, [currentUser]);

  const loadTotalWater = async () => {
    try {
      const { total, error } = await getTotalWaterIntake(currentUser!.id, today);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setTotalWater(total);
    } catch (error) {
      console.error('Error loading water intake:', error);
    }
  };

  const addWater = async (amount: number) => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await createWaterIntake({
        user_id: currentUser.id,
        date: today,
        amount_ml: amount,
        source: 'widget'
      });
      
      if (error) throw error;
      
      await loadTotalWater();
    } catch (error) {
      console.error('Error adding water intake:', error);
      alert('Failed to add water intake. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = () => {
    return Math.min(100, (totalWater / dailyGoal) * 100);
  };

  const getStatusColor = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getMotivationalMessage = () => {
    const percentage = getProgressPercentage();
    if (percentage >= 100) return "Excellent hydration! 💧";
    if (percentage >= 75) return "Almost there! Keep drinking! 🌊";
    if (percentage >= 50) return "Good progress! Stay hydrated! 💙";
    return "Start hydrating for better health! 🚰";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-blue-500 p-2 rounded-lg">
          <Droplets className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Water Intake</h3>
          <p className="text-sm text-gray-600">Daily hydration</p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-2">
          <span className={`text-3xl font-bold ${getStatusColor()}`}>
            {totalWater}
          </span>
          <span className="text-sm text-gray-500">/ {dailyGoal}ml</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-600 mt-2">
          {getMotivationalMessage()}
        </p>
      </div>
      
      <div className="space-y-3">
        {/* Amount selector */}
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={addAmount}
            onChange={(e) => setAddAmount(Number(e.target.value))}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center"
            min="50"
            max="1000"
            step="50"
          />
          <span className="text-sm text-gray-500">ml</span>
        </div>

        <button
          onClick={() => addWater(addAmount)}
          disabled={loading}
          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>{loading ? 'Adding...' : `Add ${addAmount}ml`}</span>
        </button>
        
        {/* Quick add buttons */}
        <div className="grid grid-cols-3 gap-2">
          {[250, 500, 750].map(amount => (
            <button
              key={amount}
              onClick={() => addWater(amount)}
              disabled={loading}
              className="bg-blue-100 text-blue-800 py-2 px-3 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              +{amount}ml
            </button>
          ))}
        </div>
      </div>
      
      {totalWater >= dailyGoal && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Daily hydration goal achieved! Great job! 🎉
            </span>
          </div>
        </div>
      )}
      
      {/* Progress breakdown */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Progress: {Math.round(getProgressPercentage())}%</span>
          <span>Remaining: {Math.max(0, dailyGoal - totalWater)}ml</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Glasses: ~{Math.round(totalWater / 250)}</span>
          <span>Benefits: Energy ↑, Skin ↑</span>
        </div>
      </div>
    </div>
  );
};