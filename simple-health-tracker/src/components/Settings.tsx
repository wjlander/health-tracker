import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Save, CheckCircle, Heart, TrendingUp, AlertCircle, Moon, Scale, Activity, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserPreferences, updateUserPreferences } from '../lib/database';

export const Settings: React.FC = () => {
  const { currentUser } = useAuth();
  const [preferences, setPreferences] = useState<any>({
    // Basic health tracking
    mood: true,
    energy: true,
    anxiety: true,
    sleep: true,
    weight: true,
    
    // Activity
    activity_tracking: true,
    fitbit_integration: true,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadPreferences();
    }
  }, [currentUser]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await getUserPreferences(currentUser!.id);
      if (error) throw error;
      
      if (data) {
        setPreferences({ ...preferences, ...data });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const savePreferences = async () => {
    try {
      setSaving(true);
      const { error } = await updateUserPreferences(currentUser!.id, preferences);
      if (error) throw error;
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const togglePreference = (key: string) => {
    setPreferences({ ...preferences, [key]: !preferences[key] });
  };

  const PreferenceToggle: React.FC<{
    label: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    icon: React.ReactNode;
  }> = ({ label, description, enabled, onToggle, icon }) => (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
      <div className="flex items-center space-x-3">
        {icon}
        <div>
          <h4 className="font-medium text-gray-900">{label}</h4>
          <p className="text-sm text-gray-600">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-blue-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SettingsIcon className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tracking Preferences</h3>
              <p className="text-sm text-gray-600">
                Customize what health metrics to track for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={savePreferences}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tracking Preferences */}
      <div className="space-y-6">
        {/* Basic Health */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-4">Basic Health Tracking</h4>
          <div className="space-y-4">
            <PreferenceToggle
              label="Mood Tracking"
              description="Track daily mood levels and emotional wellbeing"
              enabled={preferences.mood}
              onToggle={() => togglePreference('mood')}
              icon={<Heart className="h-5 w-5 text-pink-500" />}
            />
            <PreferenceToggle
              label="Energy Levels"
              description="Monitor daily energy and fatigue patterns"
              enabled={preferences.energy}
              onToggle={() => togglePreference('energy')}
              icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
            />
            <PreferenceToggle
              label="Anxiety Tracking"
              description="Track anxiety levels and stress patterns"
              enabled={preferences.anxiety}
              onToggle={() => togglePreference('anxiety')}
              icon={<AlertCircle className="h-5 w-5 text-orange-500" />}
            />
            <PreferenceToggle
              label="Sleep Monitoring"
              description="Track sleep hours, quality, and patterns"
              enabled={preferences.sleep}
              onToggle={() => togglePreference('sleep')}
              icon={<Moon className="h-5 w-5 text-purple-500" />}
            />
            <PreferenceToggle
              label="Weight Tracking"
              description="Monitor weight changes and trends"
              enabled={preferences.weight}
              onToggle={() => togglePreference('weight')}
              icon={<Scale className="h-5 w-5 text-green-500" />}
            />
          </div>
        </div>

        {/* Activity & Integration */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h4 className="font-semibold text-gray-900 mb-4">Activity & Integration</h4>
          <div className="space-y-4">
            <PreferenceToggle
              label="Activity Tracking"
              description="Track exercises and daily activities"
              enabled={preferences.activity_tracking}
              onToggle={() => togglePreference('activity_tracking')}
              icon={<Activity className="h-5 w-5 text-blue-500" />}
            />
            <PreferenceToggle
              label="Fitbit Integration"
              description="Sync data from Fitbit devices"
              enabled={preferences.fitbit_integration}
              onToggle={() => togglePreference('fitbit_integration')}
              icon={<Smartphone className="h-5 w-5 text-green-500" />}
            />
          </div>
        </div>
      </div>
    </div>
  );
};