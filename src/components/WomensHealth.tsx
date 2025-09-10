import React, { useState, useEffect } from 'react';
import { Calendar, Heart, Thermometer, Droplets, AlertCircle, TrendingUp, Moon, Flower2, Plus, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createMenstrualEntry, getMenstrualEntries, createPremenopausalEntry, getPremenopausalEntries, getMenstrualEntryByDate, getPremenopausalEntryByDate } from '../lib/database';
import { format, addDays, differenceInDays, subDays } from 'date-fns';

export const WomensHealth: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'cycle' | 'premenopausal'>('cycle');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [menstrualData, setMenstrualData] = useState<any[]>([]);
  const [premenopausalData, setPremenopausalData] = useState<any[]>([]);
  const [todayEntry, setTodayEntry] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form states
  const [menstrualForm, setMenstrualForm] = useState({
    cycle_day: 1,
    flow_intensity: 'none' as const,
    symptoms: [] as string[],
    cycle_phase: 'menstrual' as const,
    notes: ''
  });

  const [premenopausalForm, setPremenopausalForm] = useState({
    hot_flashes: 0,
    night_sweats: false,
    mood_swings: 5,
    irregular_periods: false,
    sleep_disturbances: false,
    joint_aches: false,
    brain_fog: 5,
    weight_changes: false,
    notes: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
      loadTodayEntry();
    }
  }, [currentUser, selectedDate, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'cycle') {
        const { data, error } = await getMenstrualEntries(currentUser!.id, 90);
        if (error && !error.message?.includes('does not exist')) {
          throw error;
        }
        setMenstrualData(data || []);
      } else {
        const { data, error } = await getPremenopausalEntries(currentUser!.id, 90);
        if (error && !error.message?.includes('does not exist')) {
          throw error;
        }
        setPremenopausalData(data || []);
      }
    } catch (error) {
      console.error('Error loading women\'s health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTodayEntry = async () => {
    try {
      if (activeTab === 'cycle') {
        const { data } = await getMenstrualEntryByDate(currentUser!.id, selectedDate);
        setTodayEntry(data);
        if (data) {
          setMenstrualForm({
            cycle_day: data.cycle_day,
            flow_intensity: data.flow_intensity,
            symptoms: data.symptoms || [],
            cycle_phase: data.cycle_phase,
            notes: data.notes || ''
          });
        }
      } else {
        const { data } = await getPremenopausalEntryByDate(currentUser!.id, selectedDate);
        setTodayEntry(data);
        if (data) {
          setPremenopausalForm({
            hot_flashes: data.hot_flashes,
            night_sweats: data.night_sweats,
            mood_swings: data.mood_swings,
            irregular_periods: data.irregular_periods,
            sleep_disturbances: data.sleep_disturbances,
            joint_aches: data.joint_aches,
            brain_fog: data.brain_fog,
            weight_changes: data.weight_changes,
            notes: data.notes || ''
          });
        }
      }
    } catch (error) {
      console.error('Error loading today\'s entry:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      
      if (activeTab === 'cycle') {
        const { error } = await createMenstrualEntry({
          user_id: currentUser.id,
          date: selectedDate,
          ...menstrualForm
        });
        if (error) throw error;
      } else {
        const { error } = await createPremenopausalEntry({
          user_id: currentUser.id,
          date: selectedDate,
          ...premenopausalForm
        });
        if (error) throw error;
      }

      setShowForm(false);
      await loadData();
      await loadTodayEntry();
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const availableSymptoms = [
    'Cramps', 'Bloating', 'Breast tenderness', 'Headache', 'Mood changes',
    'Fatigue', 'Nausea', 'Back pain', 'Acne', 'Food cravings',
    'Irritability', 'Anxiety', 'Depression', 'Insomnia'
  ];

  const toggleSymptom = (symptom: string) => {
    setMenstrualForm(prev => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter(s => s !== symptom)
        : [...prev.symptoms, symptom]
    }));
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'menstrual': return 'bg-red-100 text-red-800';
      case 'follicular': return 'bg-yellow-100 text-yellow-800';
      case 'ovulation': return 'bg-green-100 text-green-800';
      case 'luteal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFlowColor = (intensity: string) => {
    switch (intensity) {
      case 'heavy': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'light': return 'bg-yellow-500';
      case 'none': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Flower2 className="h-6 w-6 text-pink-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Women's Health Tracking</h3>
              <p className="text-sm text-gray-600">
                Comprehensive tracking for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Entry</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('cycle')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'cycle'
                ? 'bg-pink-50 text-pink-700 border-b-2 border-pink-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Menstrual Cycle</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('premenopausal')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'premenopausal'
                ? 'bg-pink-50 text-pink-700 border-b-2 border-pink-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Thermometer className="h-4 w-4" />
              <span>Pre-menopausal</span>
            </div>
          </button>
        </div>
      </div>

      {/* Date Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Date:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
          />
          {todayEntry && (
            <span className="text-sm text-green-600 font-medium">✓ Entry exists for this date</span>
          )}
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {activeTab === 'cycle' ? 'Menstrual Cycle Entry' : 'Pre-menopausal Symptoms'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'cycle' ? (
              <>
                {/* Cycle Day & Phase */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Day</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={menstrualForm.cycle_day}
                      onChange={(e) => setMenstrualForm({...menstrualForm, cycle_day: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cycle Phase</label>
                    <select
                      value={menstrualForm.cycle_phase}
                      onChange={(e) => setMenstrualForm({...menstrualForm, cycle_phase: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="menstrual">Menstrual (Days 1-5)</option>
                      <option value="follicular">Follicular (Days 6-14)</option>
                      <option value="ovulation">Ovulation (Days 14-16)</option>
                      <option value="luteal">Luteal (Days 17-28)</option>
                    </select>
                  </div>
                </div>

                {/* Flow Intensity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Flow Intensity</label>
                  <div className="grid grid-cols-4 gap-3">
                    {['none', 'light', 'medium', 'heavy'].map(intensity => (
                      <button
                        key={intensity}
                        type="button"
                        onClick={() => setMenstrualForm({...menstrualForm, flow_intensity: intensity as any})}
                        className={`p-3 rounded-lg border-2 transition-colors ${
                          menstrualForm.flow_intensity === intensity
                            ? 'border-pink-500 bg-pink-50'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full mx-auto mb-2 ${getFlowColor(intensity)}`} />
                        <span className="text-sm font-medium capitalize">{intensity}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Symptoms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Symptoms</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {availableSymptoms.map(symptom => (
                      <button
                        key={symptom}
                        type="button"
                        onClick={() => toggleSymptom(symptom)}
                        className={`p-2 text-sm rounded-lg border transition-colors ${
                          menstrualForm.symptoms.includes(symptom)
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        {symptom}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Hot Flashes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hot Flashes (count today)</label>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={premenopausalForm.hot_flashes}
                    onChange={(e) => setPremenopausalForm({...premenopausalForm, hot_flashes: Number(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                {/* Mood & Brain Fog Scales */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Mood Swings (1-10)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={premenopausalForm.mood_swings}
                        onChange={(e) => setPremenopausalForm({...premenopausalForm, mood_swings: Number(e.target.value)})}
                        className="flex-1 h-2 bg-pink-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <span className="w-8 text-center font-medium text-pink-600">{premenopausalForm.mood_swings}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Stable</span>
                      <span>Severe</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Brain Fog (1-10)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={premenopausalForm.brain_fog}
                        onChange={(e) => setPremenopausalForm({...premenopausalForm, brain_fog: Number(e.target.value)})}
                        className="flex-1 h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <span className="w-8 text-center font-medium text-purple-600">{premenopausalForm.brain_fog}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Clear</span>
                      <span>Severe</span>
                    </div>
                  </div>
                </div>

                {/* Boolean Symptoms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Symptoms Present Today</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { key: 'night_sweats', label: 'Night Sweats' },
                      { key: 'irregular_periods', label: 'Irregular Periods' },
                      { key: 'sleep_disturbances', label: 'Sleep Disturbances' },
                      { key: 'joint_aches', label: 'Joint Aches' },
                      { key: 'weight_changes', label: 'Weight Changes' }
                    ].map(symptom => (
                      <button
                        key={symptom.key}
                        type="button"
                        onClick={() => setPremenopausalForm({
                          ...premenopausalForm,
                          [symptom.key]: !premenopausalForm[symptom.key as keyof typeof premenopausalForm]
                        })}
                        className={`p-3 text-sm rounded-lg border transition-colors ${
                          premenopausalForm[symptom.key as keyof typeof premenopausalForm]
                            ? 'border-pink-500 bg-pink-50 text-pink-700'
                            : 'border-gray-200 hover:border-pink-300'
                        }`}
                      >
                        {symptom.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={activeTab === 'cycle' ? menstrualForm.notes : premenopausalForm.notes}
                onChange={(e) => {
                  if (activeTab === 'cycle') {
                    setMenstrualForm({...menstrualForm, notes: e.target.value});
                  } else {
                    setPremenopausalForm({...premenopausalForm, notes: e.target.value});
                  }
                }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                placeholder="Any additional notes or observations..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-pink-600 text-white px-6 py-2 rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (todayEntry ? 'Update Entry' : 'Save Entry')}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Data Display */}
      {activeTab === 'cycle' ? (
        <MenstrualCycleView data={menstrualData} />
      ) : (
        <PremenopausalView data={premenopausalData} />
      )}
    </div>
  );
};

// Menstrual Cycle View Component
const MenstrualCycleView: React.FC<{ data: any[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100 text-center">
        <Calendar className="h-12 w-12 text-pink-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Cycle Data Yet</h3>
        <p className="text-gray-600">Start tracking your menstrual cycle to identify patterns and correlations.</p>
      </div>
    );
  }

  // Calculate cycle statistics
  const avgCycleLength = 28; // Could be calculated from data
  const lastPeriod = data.find(entry => entry.flow_intensity !== 'none');
  const nextPeriod = lastPeriod ? addDays(new Date(lastPeriod.date), avgCycleLength) : null;

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'menstrual': return 'bg-red-100 text-red-800';
      case 'follicular': return 'bg-yellow-100 text-yellow-800';
      case 'ovulation': return 'bg-green-100 text-green-800';
      case 'luteal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFlowColor = (intensity: string) => {
    switch (intensity) {
      case 'heavy': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'light': return 'bg-yellow-500';
      case 'none': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Cycle Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-pink-100">
          <h4 className="font-medium text-gray-900 mb-2">Current Cycle Day</h4>
          <p className="text-2xl font-bold text-pink-600">
            {data[0]?.cycle_day || 1}
          </p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-pink-100">
          <h4 className="font-medium text-gray-900 mb-2">Current Phase</h4>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            data[0] ? getPhaseColor(data[0].cycle_phase) : 'bg-gray-100 text-gray-800'
          }`}>
            {data[0]?.cycle_phase || 'Unknown'}
          </span>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-pink-100">
          <h4 className="font-medium text-gray-900 mb-2">Next Period</h4>
          <p className="text-sm text-gray-600">
            {nextPeriod ? format(nextPeriod, 'MMM d') : 'Calculating...'}
          </p>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Cycle Entries</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data.slice(0, 10).map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <span className="font-medium text-gray-900">
                    {format(new Date(entry.date), 'MMM d, yyyy')}
                  </span>
                  <span className="text-sm text-gray-500">Day {entry.cycle_day}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPhaseColor(entry.cycle_phase)}`}>
                    {entry.cycle_phase}
                  </span>
                </div>
                <div className={`w-4 h-4 rounded-full ${getFlowColor(entry.flow_intensity)}`} />
              </div>
              {entry.symptoms && entry.symptoms.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {entry.symptoms.map((symptom: string, index: number) => (
                    <span key={index} className="px-2 py-1 bg-pink-100 text-pink-700 text-xs rounded">
                      {symptom}
                    </span>
                  ))}
                </div>
              )}
              {entry.notes && (
                <p className="text-sm text-gray-600">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Pre-menopausal View Component
const PremenopausalView: React.FC<{ data: any[] }> = ({ data }) => {
  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-pink-100 text-center">
        <Thermometer className="h-12 w-12 text-purple-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Pre-menopausal Data Yet</h3>
        <p className="text-gray-600">Start tracking symptoms to monitor patterns and their impact on your health.</p>
      </div>
    );
  }

  // Calculate averages
  const avgHotFlashes = data.reduce((sum, entry) => sum + entry.hot_flashes, 0) / data.length;
  const avgMoodSwings = data.reduce((sum, entry) => sum + entry.mood_swings, 0) / data.length;
  const avgBrainFog = data.reduce((sum, entry) => sum + entry.brain_fog, 0) / data.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-pink-100">
          <h4 className="font-medium text-gray-900 mb-2">Avg Hot Flashes</h4>
          <p className="text-2xl font-bold text-red-600">{avgHotFlashes.toFixed(1)}</p>
          <p className="text-xs text-gray-500">per day</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-pink-100">
          <h4 className="font-medium text-gray-900 mb-2">Mood Swings</h4>
          <p className="text-2xl font-bold text-purple-600">{avgMoodSwings.toFixed(1)}/10</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-pink-100">
          <h4 className="font-medium text-gray-900 mb-2">Brain Fog</h4>
          <p className="text-2xl font-bold text-blue-600">{avgBrainFog.toFixed(1)}/10</p>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-pink-100">
          <h4 className="font-medium text-gray-900 mb-2">Night Sweats</h4>
          <p className="text-2xl font-bold text-orange-600">
            {Math.round((data.filter(entry => entry.night_sweats).length / data.length) * 100)}%
          </p>
          <p className="text-xs text-gray-500">of days</p>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="bg-white rounded-xl shadow-sm border border-pink-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Symptom Entries</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {data.slice(0, 10).map((entry) => (
            <div key={entry.id} className="p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-900">
                  {format(new Date(entry.date), 'MMM d, yyyy')}
                </span>
                <div className="flex items-center space-x-2">
                  {entry.hot_flashes > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                      {entry.hot_flashes} hot flashes
                    </span>
                  )}
                  {entry.night_sweats && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">
                      Night sweats
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mood Swings: </span>
                  <span className="font-medium">{entry.mood_swings}/10</span>
                </div>
                <div>
                  <span className="text-gray-600">Brain Fog: </span>
                  <span className="font-medium">{entry.brain_fog}/10</span>
                </div>
              </div>
              
              {entry.notes && (
                <p className="text-sm text-gray-600 mt-2">{entry.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};