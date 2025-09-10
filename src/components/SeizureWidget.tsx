import React, { useState, useEffect } from 'react';
import { Zap, Plus, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createSeizureEntry, getTodaySeizures } from '../lib/database';
import { format } from 'date-fns';

export const SeizureWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [todaySeizures, setTodaySeizures] = useState(0);
  const [loading, setLoading] = useState(false);
  const [severity, setSeverity] = useState(5);
  
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (currentUser) {
      loadTodaySeizures();
    }
  }, [currentUser]);

  const loadTodaySeizures = async () => {
    try {
      const { count, error } = await getTodaySeizures(currentUser!.id, today);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setTodaySeizures(count);
    } catch (error) {
      console.error('Error loading today\'s seizures:', error);
    }
  };

  const addSeizureEntry = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      
      const { error } = await createSeizureEntry({
        user_id: currentUser.id,
        date: today,
        time: format(new Date(), 'HH:mm'),
        seizure_type: 'unknown',
        severity: severity < 4 ? 'mild' : severity < 7 ? 'moderate' : severity < 9 ? 'severe' : 'critical',
        triggers: [],
        warning_signs: [],
        post_seizure_effects: [],
        witnesses: [],
        emergency_services_called: false,
        recovery_time_minutes: 0,
        notes: 'Quick widget entry'
      });
      
      if (error) throw error;
      
      await loadTodaySeizures();
    } catch (error) {
      console.error('Error adding seizure entry:', error);
      alert('Failed to add seizure entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    if (todaySeizures === 0) return 'text-green-600';
    if (todaySeizures === 1) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMotivationalMessage = () => {
    if (todaySeizures === 0) return "Great! No seizures today! 🌟";
    if (todaySeizures === 1) return "One seizure logged. Take care of yourself. 💙";
    return "Multiple seizures today. Please consider medical attention. ⚠️";
  };

  const getSeverityLabel = (sev: number) => {
    if (sev < 4) return 'Mild';
    if (sev < 7) return 'Moderate';
    if (sev < 9) return 'Severe';
    return 'Critical';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-yellow-500 p-2 rounded-lg">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Seizure Tracking</h3>
          <p className="text-sm text-gray-600">Episodes today</p>
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex items-baseline space-x-2 mb-2">
          <span className={`text-3xl font-bold ${getStatusColor()}`}>
            {todaySeizures}
          </span>
          <span className="text-sm text-gray-500">seizures today</span>
        </div>
        
        <p className="text-xs text-gray-600 mb-3">
          {getMotivationalMessage()}
        </p>
      </div>
      
      <div className="space-y-3">
        {/* Severity Selector */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-2">
            If logging seizure, select severity:
          </label>
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="range"
              min="1"
              max="10"
              value={severity}
              onChange={(e) => setSeverity(Number(e.target.value))}
              className="flex-1 h-2 bg-yellow-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <span className="w-12 text-center text-xs font-medium text-yellow-600">
              {severity} ({getSeverityLabel(severity)})
            </span>
          </div>
        </div>

        <button
          onClick={addSeizureEntry}
          disabled={loading}
          className="w-full bg-yellow-500 text-white py-3 px-4 rounded-lg hover:bg-yellow-600 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2 font-medium"
        >
          <Plus className="h-5 w-5" />
          <span>{loading ? 'Adding...' : 'Log Seizure'}</span>
        </button>
        
        {/* Quick add buttons for multiple seizures */}
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(count => (
            <button
              key={count}
              onClick={async () => {
                for (let i = 0; i < count; i++) {
                  await addSeizureEntry();
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
      
      {todaySeizures > 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-sm font-medium text-red-800">
              {todaySeizures} seizure{todaySeizures > 1 ? 's' : ''} logged today. Consider reviewing triggers and medication.
            </span>
          </div>
        </div>
      )}
      
      {todaySeizures === 0 && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              No seizures today - that's excellent! Keep up your medication routine.
            </span>
          </div>
        </div>
      )}
      
      {/* Episode breakdown */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Episodes today: {todaySeizures}</span>
          <span>Goal: 0 seizures</span>
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Status: {todaySeizures === 0 ? 'Seizure-free' : 'Monitor closely'}</span>
          <span>Track patterns & triggers</span>
        </div>
      </div>
    </div>
  );
};