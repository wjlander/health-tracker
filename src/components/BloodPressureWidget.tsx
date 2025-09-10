import React, { useState, useEffect } from 'react';
import { Heart, Plus, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createBloodPressureReading, getBloodPressureAverages } from '../lib/database';
import { format } from 'date-fns';

export const BloodPressureWidget: React.FC = () => {
  const { currentUser } = useAuth();
  const [systolic, setSystolic] = useState('');
  const [diastolic, setDiastolic] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [averages, setAverages] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadAverages();
    }
  }, [currentUser]);

  const loadAverages = async () => {
    try {
      const { averages: avgData, error } = await getBloodPressureAverages(currentUser!.id, 7);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setAverages(avgData);
    } catch (error) {
      console.error('Error loading BP averages:', error);
    }
  };

  const addReading = async () => {
    if (!currentUser || !systolic || !diastolic) return;
    
    try {
      setLoading(true);
      
      const { error } = await createBloodPressureReading({
        user_id: currentUser.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        systolic: Number(systolic),
        diastolic: Number(diastolic),
        heart_rate: heartRate ? Number(heartRate) : undefined,
        position: 'sitting',
        arm: 'left',
        cuff_size: 'standard',
        notes: 'Quick dashboard entry'
      });
      
      if (error) throw error;
      
      setSystolic('');
      setDiastolic('');
      setHeartRate('');
      setShowForm(false);
      await loadAverages();
    } catch (error) {
      console.error('Error adding BP reading:', error);
      alert('Failed to add blood pressure reading. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getBPStatus = (sys: number, dia: number) => {
    if (sys >= 180 || dia >= 120) return { status: 'crisis', color: 'text-red-600', icon: AlertCircle };
    if (sys >= 140 || dia >= 90) return { status: 'high', color: 'text-orange-600', icon: TrendingUp };
    if (sys >= 130 || dia >= 80) return { status: 'elevated', color: 'text-yellow-600', icon: TrendingUp };
    if (sys < 90 || dia < 60) return { status: 'low', color: 'text-blue-600', icon: TrendingDown };
    return { status: 'normal', color: 'text-green-600', icon: Heart };
  };

  const currentStatus = averages ? getBPStatus(averages.systolic, averages.diastolic) : null;
  const StatusIcon = currentStatus?.icon || Heart;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center space-x-3 mb-4">
        <div className="bg-red-500 p-2 rounded-lg">
          <Heart className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Blood Pressure</h3>
          <p className="text-sm text-gray-600">7-day average</p>
        </div>
      </div>
      
      {averages ? (
        <div className="mb-4">
          <div className="flex items-center space-x-3 mb-2">
            <span className="text-2xl font-bold text-gray-900">
              {averages.systolic}/{averages.diastolic}
            </span>
            <StatusIcon className={`h-5 w-5 ${currentStatus?.color}`} />
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Heart Rate: {averages.heart_rate ? `${averages.heart_rate} bpm` : 'Not recorded'}</div>
            <div>Based on {averages.reading_count} readings</div>
            <div className={`font-medium capitalize ${currentStatus?.color}`}>
              Status: {currentStatus?.status}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-center py-4">
          <p className="text-gray-500">No readings yet</p>
        </div>
      )}
      
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full bg-red-100 text-red-800 py-2 px-4 rounded-lg hover:bg-red-200 transition-colors flex items-center justify-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Add Reading</span>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Systolic"
              value={systolic}
              onChange={(e) => setSystolic(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-center"
              min="60"
              max="250"
            />
            <input
              type="number"
              placeholder="Diastolic"
              value={diastolic}
              onChange={(e) => setDiastolic(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-center"
              min="40"
              max="150"
            />
          </div>
          
          <input
            type="number"
            placeholder="Heart Rate (optional)"
            value={heartRate}
            onChange={(e) => setHeartRate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 text-center"
            min="30"
            max="220"
          />
          
          <div className="flex space-x-2">
            <button
              onClick={addReading}
              disabled={loading || !systolic || !diastolic}
              className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};