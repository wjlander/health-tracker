import React, { useState, useEffect } from 'react';
import { Sun, Plus, TrendingUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createOutdoorTimeEntry, getTotalOutdoorSessions } from '../lib/database';
import { format } from 'date-fns';

export const OutdoorTimeWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(false);
  const [moodBefore, setMoodBefore] = useState(5);
  
  const today = format(new Date(), 'yyyy-MM-dd');
  const dailyGoal = 3; // Goal: 3 outdoor sessions per day

  useEffect(() => {
    if (currentUser) {
      loadTotalSessions();
    }
  }, [currentUser]);

  const loadTotalSessions = async () => {
    try {
      const { total, error } = await getTotalOutdoorSessions(currentUser!.id, today);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setTotalSessions(total);
    } catch (error) {
      console.error('Error loading outdoor sessions:', error);
    }
  };

  const addOutdoorSession = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await createOutdoorTimeEntry({
        user_id: currentUser.id,
        date: today,
        time_logged: format(new Date(), 'HH:mm'),
        session_count: 1,
        duration_minutes: 15, // Approximate duration per session
        activity_type: 'general',
        mood_before: moodBefore,
        mood_after: Math.min(10, moodBefore + 1), // Assume slight mood improvement
        notes: 'Quick outdoor session'
      });
      
      if (error) throw error;
      
      await loadTotalSessions();
    } catch (error) {
      console.error('Error adding outdoor session:', error);
      alert('Failed to add outdoor session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSessionColor = () => {
    if (totalSessions >= dailyGoal) return 'text-green-600';
    if (totalSessions >= Math.floor(dailyGoal * 0.7)) return 'text-yellow-600';
    return 'text-gray-600';
  };

  const getProgressPercentage = () => {
    return Math.min(100, (totalSessions / dailyGoal) * 100);
  };

  const getMotivationalMessage = () => {
    if (totalSessions >= dailyGoal) return "Excellent! You've reached your outdoor goal! 🌟";
    if (totalSessions >= Math.floor(dailyGoal * 0.7)) return "Almost there! One more session to reach your goal! 💪";
    if (totalSessions > 0) return "Great start! Keep going! ☀️";
    return "Step outside for a mood boost! 🌱";
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-yellow-500 p-2 rounded-lg">
          <Sun className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Outdoor Sessions</h3>
          <p className="text-sm text-gray-600">Times outside today</p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-2">
          <span className={`text-3xl font-bold ${getSessionColor()}`}>
            {totalSessions}
          </span>
          <span className="text-sm text-gray-500">/ {dailyGoal} sessions</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
        
        <p className="text-xs text-gray-600 mt-2">
          {getMotivationalMessage()}
        </p>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={addOutdoorSession}
          disabled={loading}
          className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>{loading ? 'Adding...' : 'I Went Outside!'}</span>
        </button>
        
        {/* Quick add buttons for multiple sessions */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(count => (
            <button
              key={count}
              onClick={async () => {
                for (let i = 0; i < count; i++) {
                  await addOutdoorSession();
                }
              }}
              disabled={loading}
              className="bg-yellow-100 text-yellow-800 py-2 px-3 rounded-lg hover:bg-yellow-200 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              +{count}
            </button>
          ))}
        </div>
      </div>
      
      {totalSessions >= dailyGoal && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              Goal achieved! Outdoor time boosts mood, vitamin D, and overall wellbeing.
            </span>
          </div>
        </div>
      )}
      
      {/* Session breakdown */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Sessions today: {totalSessions}</span>
          <span>Goal: {dailyGoal} sessions</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Est. time: ~{totalSessions * 15} min</span>
          <span>Benefits: Mood ↑, Vitamin D ↑</span>
        </div>
      </div>
    </div>
  );
};