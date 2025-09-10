import React, { useState, useEffect } from 'react';
import { Zap, Plus, Edit, Trash2, Clock, AlertTriangle, Calendar, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { createSeizureEntry, getSeizureEntries, updateSeizureEntry, deleteSeizureEntry } from '../lib/database';
import { format } from 'date-fns';

export const SeizureTracking: React.FC = () => {
  const { currentUser } = useAuth();
  const [seizures, setSeizures] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSeizure, setEditingSeizure] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    seizure_type: 'unknown' as const,
    duration_seconds: 0,
    severity: 'moderate' as const,
    triggers: [] as string[],
    warning_signs: [] as string[],
    post_seizure_effects: [] as string[],
    location: '',
    witnesses: [] as string[],
    emergency_services_called: false,
    medication_taken: '',
    recovery_time_minutes: 0,
    notes: ''
  });

  useEffect(() => {
    if (currentUser) {
      loadSeizures();
    }
  }, [currentUser]);

  const loadSeizures = async () => {
    try {
      setLoading(true);
      const { data, error } = await getSeizureEntries(currentUser!.id, 50);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setSeizures(data || []);
    } catch (error) {
      console.error('Error loading seizures:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const seizureData = {
        ...formData,
        user_id: currentUser.id
      };

      if (editingSeizure) {
        const { error } = await updateSeizureEntry(editingSeizure.id, seizureData);
        if (error) throw error;
      } else {
        const { error } = await createSeizureEntry(seizureData);
        if (error) throw error;
      }

      resetForm();
      await loadSeizures();
    } catch (error) {
      console.error('Error saving seizure entry:', error);
      alert('Failed to save seizure entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      seizure_type: 'unknown',
      duration_seconds: 0,
      severity: 'moderate',
      triggers: [],
      warning_signs: [],
      post_seizure_effects: [],
      location: '',
      witnesses: [],
      emergency_services_called: false,
      medication_taken: '',
      recovery_time_minutes: 0,
      notes: ''
    });
    setEditingSeizure(null);
    setShowForm(false);
  };

  const handleEdit = (seizure: any) => {
    setEditingSeizure(seizure);
    setFormData({
      date: seizure.date,
      time: seizure.time,
      seizure_type: seizure.seizure_type,
      duration_seconds: seizure.duration_seconds || 0,
      severity: seizure.severity,
      triggers: seizure.triggers || [],
      warning_signs: seizure.warning_signs || [],
      post_seizure_effects: seizure.post_seizure_effects || [],
      location: seizure.location || '',
      witnesses: seizure.witnesses || [],
      emergency_services_called: seizure.emergency_services_called,
      medication_taken: seizure.medication_taken || '',
      recovery_time_minutes: seizure.recovery_time_minutes || 0,
      notes: seizure.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this seizure entry?')) return;

    try {
      const { error } = await deleteSeizureEntry(id);
      if (error) throw error;
      await loadSeizures();
    } catch (error) {
      console.error('Error deleting seizure:', error);
      alert('Failed to delete seizure entry. Please try again.');
    }
  };

  const commonTriggers = [
    'Stress', 'Lack of sleep', 'Missed medication', 'Flashing lights', 'Alcohol',
    'Dehydration', 'Illness', 'Hormonal changes', 'Overexertion', 'Loud noises'
  ];

  const commonWarnings = [
    'Aura', 'Dizziness', 'Nausea', 'Confusion', 'Strange taste/smell',
    'Visual disturbances', 'Tingling', 'Déjà vu', 'Fear/anxiety'
  ];

  const commonEffects = [
    'Confusion', 'Fatigue', 'Headache', 'Memory loss', 'Muscle soreness',
    'Difficulty speaking', 'Disorientation', 'Sleepiness', 'Nausea'
  ];

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800';
      case 'moderate': return 'bg-yellow-100 text-yellow-800';
      case 'severe': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const getMostCommonSeizureType = () => {
    if (seizures.length === 0) return 'No data';
    
    const typeCount = seizures.reduce((acc, s) => {
      acc[s.seizure_type] = (acc[s.seizure_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const mostCommon = Object.entries(typeCount).reduce((a, b) => 
      typeCount[a[0]] > typeCount[b[0]] ? a : b
    );
    
    return mostCommon[0].replace('_', ' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Zap className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Seizure Tracking</h3>
              <p className="text-sm text-gray-600">
                Monitor seizure patterns and triggers for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Log Seizure</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Zap className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {seizures.filter(s => new Date(s.date).getMonth() === new Date().getMonth()).length}
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
                {seizures.length > 0 
                  ? formatDuration(Math.round(seizures.reduce((sum, s) => sum + (s.duration_seconds || 0), 0) / seizures.length))
                  : '0s'
                }
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Most Common</p>
              <p className="text-sm font-bold text-gray-900">
                {getMostCommonSeizureType()}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Last Seizure</p>
              <p className="text-sm font-bold text-gray-900">
                {seizures.length > 0 
                  ? format(new Date(seizures[0].date), 'MMM d')
                  : 'None recorded'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingSeizure ? 'Edit Seizure Entry' : 'Log New Seizure'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({...formData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration (seconds)</label>
                <input
                  type="number"
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData({...formData, duration_seconds: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Type and Severity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Seizure Type</label>
                <select
                  value={formData.seizure_type}
                  onChange={(e) => setFormData({...formData, seizure_type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="unknown">Unknown</option>
                  <option value="focal">Focal (Partial)</option>
                  <option value="generalized">Generalized</option>
                  <option value="absence">Absence</option>
                  <option value="tonic_clonic">Tonic-Clonic</option>
                  <option value="myoclonic">Myoclonic</option>
                  <option value="atonic">Atonic (Drop)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({...formData, severity: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            {/* Triggers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Possible Triggers</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonTriggers.map(trigger => (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => toggleArrayItem(formData.triggers, trigger, (arr) => setFormData({...formData, triggers: arr}))}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.triggers.includes(trigger)
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 hover:border-yellow-300'
                    }`}
                  >
                    {trigger}
                  </button>
                ))}
              </div>
            </div>

            {/* Warning Signs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Warning Signs (Aura)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonWarnings.map(warning => (
                  <button
                    key={warning}
                    type="button"
                    onClick={() => toggleArrayItem(formData.warning_signs, warning, (arr) => setFormData({...formData, warning_signs: arr}))}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.warning_signs.includes(warning)
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    {warning}
                  </button>
                ))}
              </div>
            </div>

            {/* Post-Seizure Effects */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Post-Seizure Effects</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonEffects.map(effect => (
                  <button
                    key={effect}
                    type="button"
                    onClick={() => toggleArrayItem(formData.post_seizure_effects, effect, (arr) => setFormData({...formData, post_seizure_effects: arr}))}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.post_seizure_effects.includes(effect)
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {effect}
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g., Home, Work, Store"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recovery Time (minutes)</label>
                <input
                  type="number"
                  value={formData.recovery_time_minutes}
                  onChange={(e) => setFormData({...formData, recovery_time_minutes: Number(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Emergency Response */}
            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emergency_services"
                  checked={formData.emergency_services_called}
                  onChange={(e) => setFormData({...formData, emergency_services_called: e.target.checked})}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="emergency_services" className="ml-2 text-sm text-gray-700">
                  Emergency services called
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Rescue Medication Taken</label>
                <input
                  type="text"
                  value={formData.medication_taken}
                  onChange={(e) => setFormData({...formData, medication_taken: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  placeholder="e.g., Lorazepam 2mg"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                rows={3}
                placeholder="Any additional details about the seizure..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (editingSeizure ? 'Update Entry' : 'Log Seizure')}
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

      {/* Seizure History */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Seizure History</h3>
        </div>
        
        {seizures.length === 0 ? (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Seizures Recorded</h3>
            <p className="text-gray-600">Track seizures to identify patterns and triggers.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {seizures.map((seizure) => (
              <div key={seizure.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {format(new Date(seizure.date), 'MMM d, yyyy')} at {seizure.time}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${getSeverityColor(seizure.severity)}`}>
                        {seizure.severity}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-600 capitalize">
                        {seizure.seizure_type.replace('_', ' ')}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 space-y-1">
                      {seizure.duration_seconds > 0 && (
                        <div>Duration: {formatDuration(seizure.duration_seconds)}</div>
                      )}
                      {seizure.location && <div>Location: {seizure.location}</div>}
                      {seizure.triggers && seizure.triggers.length > 0 && (
                        <div>Triggers: {seizure.triggers.join(', ')}</div>
                      )}
                      {seizure.post_seizure_effects && seizure.post_seizure_effects.length > 0 && (
                        <div>Effects: {seizure.post_seizure_effects.join(', ')}</div>
                      )}
                      {seizure.recovery_time_minutes > 0 && (
                        <div>Recovery: {seizure.recovery_time_minutes} minutes</div>
                      )}
                      {seizure.emergency_services_called && (
                        <div className="text-red-600 font-medium">Emergency services called</div>
                      )}
                      {seizure.notes && <div className="mt-2 text-gray-700">{seizure.notes}</div>}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(seizure)}
                      className="text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(seizure.id)}
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
    </div>
  );
};