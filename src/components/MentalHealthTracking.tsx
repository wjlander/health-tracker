import React, { useState, useEffect } from 'react';
import { Brain, Plus, Edit, Trash2, AlertTriangle, Phone, Heart, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  createMentalHealthEntry, 
  getMentalHealthEntries, 
  updateMentalHealthEntry, 
  deleteMentalHealthEntry 
} from '../lib/database';
import { format } from 'date-fns';

export const MentalHealthTracking: React.FC = () => {
  const { currentUser } = useAuth();
  const [mentalHealthEntries, setMentalHealthEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    suicidal_thoughts: false,
    thoughts_intensity: 5,
    thoughts_duration: '5-15 minutes',
    triggers: [] as string[],
    coping_mechanisms_used: [] as string[],
    support_contacted: false,
    support_person: '',
    safety_plan_followed: false,
    mood_before: 5,
    mood_after: 5,
    notes: '',
    is_crisis: false
  });

  useEffect(() => {
    if (currentUser) {
      loadMentalHealthEntries();
    }
  }, [currentUser]);

  const loadMentalHealthEntries = async () => {
    try {
      setLoading(true);
      const { data, error } = await getMentalHealthEntries(currentUser!.id, 30);
      if (error && !error.message?.includes('does not exist')) {
        throw error;
      }
      setMentalHealthEntries(data || []);
    } catch (error) {
      console.error('Error loading mental health entries:', error);
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
        const { error } = await updateMentalHealthEntry(editingEntry.id, entryData);
        if (error) throw error;
      } else {
        const { error } = await createMentalHealthEntry(entryData);
        if (error) throw error;
      }

      resetForm();
      await loadMentalHealthEntries();
    } catch (error) {
      console.error('Error saving mental health entry:', error);
      alert('Failed to save mental health entry. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), 'yyyy-MM-dd'),
      time: format(new Date(), 'HH:mm'),
      suicidal_thoughts: false,
      thoughts_intensity: 5,
      thoughts_duration: '5-15 minutes',
      triggers: [],
      coping_mechanisms_used: [],
      support_contacted: false,
      support_person: '',
      safety_plan_followed: false,
      mood_before: 5,
      mood_after: 5,
      notes: '',
      is_crisis: false
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      time: entry.time,
      suicidal_thoughts: entry.suicidal_thoughts,
      thoughts_intensity: entry.thoughts_intensity || 5,
      thoughts_duration: entry.thoughts_duration || '5-15 minutes',
      triggers: entry.triggers || [],
      coping_mechanisms_used: entry.coping_mechanisms_used || [],
      support_contacted: entry.support_contacted,
      support_person: entry.support_person || '',
      safety_plan_followed: entry.safety_plan_followed,
      mood_before: entry.mood_before || 5,
      mood_after: entry.mood_after || 5,
      notes: entry.notes || '',
      is_crisis: entry.is_crisis
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this mental health entry?')) return;

    try {
      const { error } = await deleteMentalHealthEntry(id);
      if (error) throw error;
      await loadMentalHealthEntries();
    } catch (error) {
      console.error('Error deleting mental health entry:', error);
      alert('Failed to delete mental health entry. Please try again.');
    }
  };

  // Updated triggers - removed Work pressure, Stress, Substance use
  // Added PTSD Flashbacks, Anxiety, Panic Attacks, Seizures
  const commonTriggers = [
    'PTSD Flashbacks', 'Anxiety', 'Panic Attacks', 'Seizures',
    'Relationship issues', 'Financial concerns', 'Health problems',
    'Social isolation', 'Sleep deprivation', 'Medication changes',
    'Anniversary dates', 'Family conflicts', 'Academic pressure'
  ];

  // Updated coping strategies - removed Deep breathing, Creative activities, Meditation, Prayer & spirituality
  const commonCopingStrategies = [
    'Talking to someone', 'Physical exercise', 'Listening to music',
    'Journaling', 'Taking a walk', 'Calling a friend',
    'Watching TV/movies', 'Reading', 'Taking a bath/shower',
    'Playing with pets', 'Grounding techniques', 'Progressive muscle relaxation',
    'Distraction activities', 'Self-care routine', 'Professional help'
  ];

  const toggleArrayItem = (array: string[], item: string, setter: (arr: string[]) => void) => {
    if (array.includes(item)) {
      setter(array.filter(i => i !== item));
    } else {
      setter([...array, item]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Brain className="h-6 w-6 text-purple-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mental Health Check-in</h3>
              <p className="text-sm text-gray-600">
                Track mental health patterns and coping strategies for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowForm(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>New Check-in</span>
          </button>
        </div>

        {/* Crisis Resources */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 mb-2">Crisis Resources - Available 24/7</h4>
              <div className="space-y-1 text-sm text-red-700">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>National Suicide Prevention Lifeline: <strong>988</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Crisis Text Line: Text <strong>HOME</strong> to <strong>741741</strong></span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4" />
                  <span>Emergency Services: <strong>911</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Brain className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">This Month</p>
              <p className="text-2xl font-bold text-gray-900">
                {mentalHealthEntries.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Heart className="h-5 w-5 text-pink-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Support Contacted</p>
              <p className="text-2xl font-bold text-gray-900">
                {mentalHealthEntries.filter(e => e.support_contacted).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <Shield className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Safety Plan Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {mentalHealthEntries.filter(e => e.safety_plan_followed).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm p-4 border border-blue-100">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-gray-600">Crisis Situations</p>
              <p className="text-2xl font-bold text-gray-900">
                {mentalHealthEntries.filter(e => e.is_crisis).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingEntry ? 'Edit Mental Health Check-in' : 'Mental Health Check-in'}
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({...formData, time: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            {/* Suicidal Thoughts Assessment */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-3 mb-3">
                <input
                  type="checkbox"
                  id="suicidal_thoughts"
                  checked={formData.suicidal_thoughts}
                  onChange={(e) => setFormData({...formData, suicidal_thoughts: e.target.checked})}
                  className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                />
                <label htmlFor="suicidal_thoughts" className="text-sm font-medium text-red-800">
                  I am having thoughts of suicide or self-harm
                </label>
              </div>
              
              {formData.suicidal_thoughts && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">Intensity (1-10)</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={formData.thoughts_intensity}
                        onChange={(e) => setFormData({...formData, thoughts_intensity: Number(e.target.value)})}
                        className="flex-1 h-2 bg-red-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <span className="w-8 text-center font-medium text-red-600">{formData.thoughts_intensity}</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">Duration</label>
                    <select
                      value={formData.thoughts_duration}
                      onChange={(e) => setFormData({...formData, thoughts_duration: e.target.value})}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="Less than 5 minutes">Less than 5 minutes</option>
                      <option value="5-15 minutes">5-15 minutes</option>
                      <option value="15-30 minutes">15-30 minutes</option>
                      <option value="30-60 minutes">30-60 minutes</option>
                      <option value="More than 1 hour">More than 1 hour</option>
                      <option value="Ongoing">Ongoing</option>
                    </select>
                  </div>
                  
                  <div className="bg-red-100 border border-red-300 rounded-lg p-3">
                    <p className="text-sm font-medium text-red-800 mb-2">⚠️ If you're in immediate danger:</p>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Call 911 or go to your nearest emergency room</li>
                      <li>• Call 988 (Suicide & Crisis Lifeline)</li>
                      <li>• Text HOME to 741741 (Crisis Text Line)</li>
                      <li>• Contact your mental health provider immediately</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Triggers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">What triggered these feelings?</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonTriggers.map(trigger => (
                  <button
                    key={trigger}
                    type="button"
                    onClick={() => toggleArrayItem(formData.triggers, trigger, (arr) => setFormData({...formData, triggers: arr}))}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.triggers.includes(trigger)
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    {trigger}
                  </button>
                ))}
              </div>
            </div>

            {/* Coping Mechanisms */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">What coping strategies did you use?</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {commonCopingStrategies.map(strategy => (
                  <button
                    key={strategy}
                    type="button"
                    onClick={() => toggleArrayItem(formData.coping_mechanisms_used, strategy, (arr) => setFormData({...formData, coping_mechanisms_used: arr}))}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      formData.coping_mechanisms_used.includes(strategy)
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300'
                    }`}
                  >
                    {strategy}
                  </button>
                ))}
              </div>
            </div>

            {/* Support and Safety */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center space-x-3 mb-3">
                  <input
                    type="checkbox"
                    id="support_contacted"
                    checked={formData.support_contacted}
                    onChange={(e) => setFormData({...formData, support_contacted: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="support_contacted" className="text-sm font-medium text-gray-700">
                    I contacted someone for support
                  </label>
                </div>
                
                {formData.support_contacted && (
                  <input
                    type="text"
                    placeholder="Who did you contact?"
                    value={formData.support_person}
                    onChange={(e) => setFormData({...formData, support_person: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                )}
              </div>
              
              <div>
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="safety_plan_followed"
                    checked={formData.safety_plan_followed}
                    onChange={(e) => setFormData({...formData, safety_plan_followed: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="safety_plan_followed" className="text-sm font-medium text-gray-700">
                    I followed my safety plan
                  </label>
                </div>
              </div>
            </div>

            {/* Mood Before/After */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Mood Before (1-10)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.mood_before}
                    onChange={(e) => setFormData({...formData, mood_before: Number(e.target.value)})}
                    className="flex-1 h-2 bg-red-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="w-8 text-center font-medium text-red-600">{formData.mood_before}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Mood After (1-10)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.mood_after}
                    onChange={(e) => setFormData({...formData, mood_after: Number(e.target.value)})}
                    className="flex-1 h-2 bg-green-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="w-8 text-center font-medium text-green-600">{formData.mood_after}</span>
                </div>
              </div>
            </div>

            {/* Crisis Flag */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="is_crisis"
                  checked={formData.is_crisis}
                  onChange={(e) => setFormData({...formData, is_crisis: e.target.checked})}
                  className="h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                />
                <label htmlFor="is_crisis" className="text-sm font-medium text-yellow-800">
                  This was a crisis situation requiring immediate attention
                </label>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                rows={4}
                placeholder="Describe your experience, what helped, what didn't help, or any other observations..."
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (editingEntry ? 'Update Entry' : 'Save Check-in')}
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

      {/* Recent Entries */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Mental Health Check-ins</h3>
        </div>
        
        {mentalHealthEntries.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="h-12 w-12 text-purple-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Check-ins Yet</h3>
            <p className="text-gray-600">Start tracking your mental health to identify patterns and effective coping strategies.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {mentalHealthEntries.map((entry) => (
              <div key={entry.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {format(new Date(entry.date), 'MMM d, yyyy')} at {entry.time}
                      </span>
                      {entry.suicidal_thoughts && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-medium">
                          Suicidal thoughts
                        </span>
                      )}
                      {entry.is_crisis && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800 font-medium">
                          Crisis
                        </span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>Mood: {entry.mood_before}/10 → {entry.mood_after}/10</div>
                      <div>Support: {entry.support_contacted ? '✓ Yes' : '✗ No'}</div>
                    </div>
                    
                    {entry.triggers && entry.triggers.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Triggers: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.triggers.map((trigger: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                              {trigger}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {entry.coping_mechanisms_used && entry.coping_mechanisms_used.length > 0 && (
                      <div className="mb-2">
                        <span className="text-sm font-medium text-gray-700">Coping strategies: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {entry.coping_mechanisms_used.map((strategy: string, index: number) => (
                            <span key={index} className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                              {strategy}
                            </span>
                          ))}
                        </div>
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
    </div>
  );
};