import React, { useState, useEffect } from 'react';
import { Activity, Plus, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createBowelMovementEntry, getTodayBowelMovements } from '../lib/database';
import { format } from 'date-fns';

export const BowelMovementWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [bristolScale, setBristolScale] = useState(4);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const dailyGoal = 1; // Goal: 1-3 bowel movements per day

  useEffect(() => {
    if (currentUser) {
      loadTodayCount();
    }
  }, [currentUser]);

  const loadTodayCount = async () => {
    try {
      const { count, error } = await getTodayBowelMovements(currentUser!.id, today);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setTodayCount(count);
    } catch (error) {
      console.error('Error loading today\'s bowel movements:', error);
    }
  };

  const addBowelMovement = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await createBowelMovementEntry({
        user_id: currentUser.id,
        date: today,
        time: format(new Date(), 'HH:mm'),
        bristol_scale: bristolScale,
        consistency: getBristolConsistency(bristolScale),
        color: 'brown',
        urgency: 5,
        completeness: 8,
        pain_level: 0,
        blood_present: false,
        mucus_present: false,
        symptoms: [],
        notes: 'Quick widget entry'
      });
      
      if (error) throw error;
      
      await loadTodayCount();
    } catch (error) {
      console.error('Error adding bowel movement:', error);
      alert('Failed to add bowel movement. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getBristolConsistency = (scale: number): string => {
    if (scale <= 2) return 'hard';
    if (scale <= 4) return 'normal';
    if (scale <= 5) return 'soft';
    if (scale <= 6) return 'loose';
    return 'watery';
  };

  const getBristolDescription = (scale: number): string => {
    const descriptions = {
      1: 'Hard lumps',
      2: 'Lumpy sausage',
      3: 'Cracked sausage',
      4: 'Smooth sausage',
      5: 'Soft blobs',
      6: 'Mushy pieces',
      7: 'Watery liquid'
    };
    return descriptions[scale as keyof typeof descriptions] || 'Normal';
  };

  const getStatusColor = () => {
    if (todayCount >= 1 && todayCount <= 3) return 'text-green-600';
    if (todayCount === 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMotivationalMessage = () => {
    if (todayCount >= 1 && todayCount <= 3) return "Normal bowel function today! 💚";
    if (todayCount === 0) return "No movements logged yet today 📝";
    return "Multiple movements today - monitor for patterns 📊";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-amber-600 p-2 rounded-lg">
          <Activity className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Bowel Movements</h3>
          <p className="text-sm text-gray-600">Today's count</p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-2">
          <span className={`text-3xl font-bold ${getStatusColor()}`}>
            {todayCount}
          </span>
          <span className="text-sm text-gray-500">movements today</span>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          {getMotivationalMessage()}
        </p>
      </div>
      
      <div className="space-y-3">
        {/* Bristol Scale Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Bristol Scale (1-7):
          </label>
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="range"
              min="1"
              max="7"
              value={bristolScale}
              onChange={(e) => setBristolScale(Number(e.target.value))}
              className="flex-1 h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="w-8 text-center text-xs font-medium text-amber-600">
              {bristolScale}
            </span>
          </div>
          <p className="text-xs text-gray-500">{getBristolDescription(bristolScale)}</p>
        </div>

        <button
          onClick={addBowelMovement}
          disabled={loading}
          className="w-full bg-amber-600 text-white py-3 px-4 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>{loading ? 'Adding...' : 'Log Movement'}</span>
        </button>
        
        {/* Quick add buttons */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(count => (
            <button
              key={count}
              onClick={async () => {
                for (let i = 0; i < count; i++) {
                  await addBowelMovement();
                }
              }}
              disabled={loading}
              className="bg-amber-100 text-amber-800 py-2 px-3 rounded-lg hover:bg-amber-200 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              +{count}
            </button>
          ))}
        </div>
      </div>
      
      {todayCount >= 1 && todayCount <= 3 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Normal bowel function - good digestive health!
            </span>
          </div>
        </div>
      )}
      
      {/* Movement breakdown */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Movements today: {todayCount}</span>
          <span>Normal: 1-3/day</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Bristol: {bristolScale} ({getBristolDescription(bristolScale)})</span>
          <span>Track patterns</span>
        </div>
      </div>
    </div>
  );
};