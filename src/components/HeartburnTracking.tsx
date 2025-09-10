import React, { useState, useEffect } from 'react';
import { Flame, Plus, Edit, Trash2, AlertTriangle, TrendingUp, Utensils, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  createHeartburnEntry, 
  getHeartburnEntries, 
  updateHeartburnEntry, 
  deleteHeartburnEntry,
  getHeartburnFoodCorrelations,
  getTopHeartburnTriggers
} from '../lib/database';
import { format, parseISO, isValid } from 'date-fns';

export const HeartburnTracking: React.FC = () => {
  const { currentUser } = useAuth();
  const [heartburnEntries, setHeartburnEntries] = useState<any[]>([]);
  const [foodCorrelations, setFoodCorrelations] = useState<any[]>([]);
  const [topTriggers, setTopTriggers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    severity: 5,
    duration_minutes: 30,
    triggers: [] as string[],
    relief_methods: [] as string[],
    medication_taken: '',
    notes: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [entriesResult, correlationsResult, triggersResult] = await Promise.all([
        getHeartburnEntries(currentUser!.id, 30),
        getHeartburnFoodCorrelations(currentUser!.id, 30),
        getTopHeartburnTriggers(currentUser!.id)
      ]);
      
      if (entriesResult.error && !entriesResult.error.message?.includes('does not exist')) {
        throw entriesResult.error;
      }
      
      setHeartburnEntries(entriesResult.data || []);
      setFoodCorrelations(correlationsResult.data || []);
      setTopTriggers(triggersResult.data || []);
    } catch (error) {
      console.error('Error loading heartburn data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const entryData = {
        ...formData,
        user_id: currentUser.id
      };

      if (editingEntry) {
        const { error } = await updateHeartburnEntry(editingEntry.id, entryData);
        if (error) throw error;
      } else {
        const { error } = await createHeartburnEntry(entryData);
        if (error) throw error;
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving heartburn entry:', error);
      alert('Failed to save heartburn entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      severity: 5,
      duration_minutes: 30,
      triggers: [],
      relief_methods: [],
      medication_taken: '',
      notes: ''
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      time: entry.time,
      severity: entry.severity,
      duration_minutes: entry.duration_minutes || 30,
      triggers: entry.triggers || [],
      relief_methods: entry.relief_methods || [],
      medication_taken: entry.medication_taken || '',
      notes: entry.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this heartburn entry?')) return;

    try {
      const { error } = await deleteHeartburnEntry(id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting heartburn entry:', error);
      alert('Failed to delete heartburn entry. Please try again.');
    }
  };

  const commonTriggers = [
    'Spicy food', 'Citrus fruits', 'Tomatoes', 'Chocolate', 'Coffee', 'Alcohol',
    'Fatty foods', 'Onions', 'Garlic', 'Mint', 'Carbonated drinks', 'Large meals',
    'Eating late', 'Lying down after eating', 'Stress', 'Certain medications'
  ];

  const commonReliefMethods = [
    'Antacids', 'Water', 'Milk', 'Ginger tea', 'Sitting upright', 'Walking',
    'Deep breathing', 'Chewing gum', 'Baking soda', 'Apple cider vinegar',
    'Aloe vera', 'Chamomile tea', 'Elevation', 'Time'
  ];

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity <= 3) return 'bg-green-100 text-green-800';
    if (severity <= 6) return 'bg-yellow-100 text-yellow-800';
    if (severity <= 8) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Flame className="h-6 w-6 text-orange-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Heartburn Tracking</h3>
              <p className="text-sm text-gray-600">
                Track heartburn episodes and identify food triggers for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Log Heartburn</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {heartburnEntries.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Severity</p>
              <p className="text-2xl font-bold text-gray-900">
                {heartburnEntries.length > 0 
                  ? (heartburnEntries.reduce((sum, e) => sum + e.severity, 0) / heartburnEntries.length).toFixed(1)
                  : '0'
                }/10
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {heartburnEntries.length > 0 
                  ? Math.round(heartburnEntries.reduce((sum, e) => sum + (e.duration_minutes || 0), 0) / heartburnEntries.length)
                  : 0
                } min
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Utensils className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Food Correlations</p>
              <p className="text-2xl font-bold text-gray-900">{foodCorrelations.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Food Triggers */}
      {topTriggers.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-orange-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
            Your Top Heartburn Triggers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {topTriggers.slice(0, 6).map((trigger, index) => (
              <div key={index} className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-orange-900">{trigger.food_name}</h4>
                  <span className="text-sm font-bold text-orange-700">{trigger.episode_count}x</span>
                </div>
                <div className="text-sm text-orange-700">
                  <div>Avg time to heartburn: {trigger.avg_time_to_heartburn.toFixed(1)}h</div>
                  <div>Correlation strength: {Math.round(trigger.avg_correlation * 100)}%</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-orange-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingEntry ? 'Edit Heartburn Entry' : 'Log Heartburn Episode'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>
            </div>

            {/* Severity and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Severity (1-10)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.severity}
                    onChange={(e) => setFormData({...formData, severity: Number(e.target.value)})}
                    className="flex-1 h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="w-8 text-center font-medium text-orange-600">{formData.severity}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Mild</span>
                  <span>Severe</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({...formData, duration_minutes: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  min="0"
                  placeholder="30"
                />
              </div>
            </div>

            {/* Triggers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Possible Triggers</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {commonTriggers.map(trigger => (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => toggleArrayItem(formData.triggers, trigger, (arr) => setFormData({...formData, triggers: arr}))}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.triggers.includes(trigger)
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-300'
                    }`}
                  >
                    {trigger}
                  </button>
                ))}
              </div>
            </div>

            {/* Relief Methods */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">What helped relieve it?</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {commonReliefMethods.map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => toggleArrayItem(formData.relief_methods, method, (arr) => setFormData({...formData, relief_methods: arr}))}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.relief_methods.includes(method)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {/* Medication and Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Medication Taken</label>
                <input
                  type="text"
                  value={formData.medication_taken}
                  onChange={(e) => setFormData({...formData, medication_taken: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="e.g., Tums, Pepcid"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                rows={3}
                placeholder="Any additional details about this episode..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (editingEntry ? 'Update Entry' : 'Log Episode')}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Recent Episodes */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Heartburn Episodes</h3>
        </div>
        
        {heartburnEntries.length === 0 ? (
          <div className="text-center py-12">
            <Flame className="h-12 w-12 text-orange-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Episodes Recorded</h3>
            <p className="text-gray-600">Start tracking heartburn to identify patterns and food triggers.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {heartburnEntries.map((entry) => (
              <div key={entry.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {(() => {
                          if (!entry.date || typeof entry.date !== 'string' || entry.date.trim() === '') {
                            return 'Invalid Date';
                          }
                          try {
                            const parsedDate = parseISO(entry.date);
                            return isValid(parsedDate) ? format(parsedDate, 'MMM d, yyyy') : 'Invalid Date';
                          } catch (error) {
                            return 'Invalid Date';
                          }
                        })()} at {entry.time || 'Unknown time'}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityColor(entry.severity)}`}>
                        Severity: {entry.severity}/10
                      </span>
                      {entry.duration_minutes > 0 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {entry.duration_minutes} min
                        </span>
                      )}
                    </div>
                    
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Triggers: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.triggers.map((trigger: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                              {trigger}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {entry.relief_methods && entry.relief_methods.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Relief: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.relief_methods.map((method: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              {method}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {entry.medication_taken && (
                      <div className="text-sm text-gray-600 mb-2">
                        Medication: {entry.medication_taken}
                      </div>
                    )}
                    
                    {entry.notes && (
                      <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-700">{entry.notes}</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Food Correlations */}
      {foodCorrelations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-orange-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Food-Heartburn Correlations</h3>
          <div className="space-y-3">
            {foodCorrelations.slice(0, 10).map((correlation) => (
              <div key={correlation.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Utensils className="h-4 w-4 text-orange-600" />
                  <div>
                    <span className="font-medium text-gray-900">{correlation.food_name}</span>
                  #  <div className="text-sm text-gray-600">
                   #   {format(new Date(correlation.heartburn_date), 'MMM dd')} • 
                    #  {correlation.time_between_hours.toFixed(1)}h after eating
                   # </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-orange-700">
                    {Math.round(correlation.correlation_strength * 100)}% correlation
                  </div>
                  <div className="text-xs text-gray-500">
                    Severity: {correlation.heartburn_severity}/10
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
  if (array.includes(item)) {
    setter(array.filter(i => i !== item));
  } else {
    setter([...array, item]);
  }
};