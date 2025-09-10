import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Save, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateUserPreferences } from '../lib/database';
import { WeightUnit, TemperatureUnit } from '../lib/units';

interface UserPreferences {
  weight_unit: WeightUnit;
  temperature_unit: TemperatureUnit;
  notifications_enabled: boolean;
  data_sharing: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  caregiver_sections?: {
    dashboard: boolean;
    daily_entry: boolean;
    patterns: boolean;
    history: boolean;
    lab_results: boolean;
    womens_health: boolean;
    medical_management: boolean;
    seizure_tracking: boolean;
    mental_health: boolean;
    heartburn_tracking: boolean;
    reports: boolean;
    weight_goals: boolean;
    settings: boolean;
    data_management: boolean;
    backup_restore: boolean;
  };
}

export const Settings: React.FC = () => {
  const { currentUser, updateUser } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>({
    weight_unit: 'lbs',
    temperature_unit: 'fahrenheit',
    notifications_enabled: true,
    data_sharing: false,
    theme: 'light',
    language: 'en'
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentUser?.tracking_preferences) {
      setPreferences({
        weight_unit: currentUser.tracking_preferences.weight_unit || 'lbs',
        temperature_unit: currentUser.tracking_preferences.temperature_unit || 'fahrenheit',
        notifications_enabled: currentUser.tracking_preferences.notifications_enabled ?? true,
        data_sharing: currentUser.tracking_preferences.data_sharing ?? false,
        theme: currentUser.tracking_preferences.theme || 'light',
        language: currentUser.tracking_preferences.language || 'en',
        caregiver_sections: currentUser.tracking_preferences.caregiver_sections || {
          dashboard: true,
          daily_entry: true,
          patterns: true,
          history: true,
          lab_results: true,
          womens_health: false,
          medical_management: false,
          seizure_tracking: false,
          mental_health: false,
          heartburn_tracking: false,
          reports: true,
          weight_goals: true,
          settings: true,
          data_management: true,
          backup_restore: false
        }
      });
    }
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    
    setSaving(true);
    try {
      const { error } = await updateUserPreferences(currentUser.id, preferences);
      if (error) throw error;
      
      // Update the user in context
      updateUser({
        ...currentUser,
        tracking_preferences: preferences
      });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const SettingCard: React.FC<{
    title: string;
    description: string;
    icon: React.ReactNode;
    children: React.ReactNode;
  }> = ({ title, description, icon, children }) => (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-start space-x-4">
        <div className="p-2 bg-blue-100 rounded-lg">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );

  const Toggle: React.FC<{
    enabled: boolean;
    onChange: (enabled: boolean) => void;
    label: string;
  }> = ({ enabled, onChange, label }) => (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!enabled)}
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

  const Select: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    label: string;
  }> = ({ value, onChange, options, label }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="h-8 w-8 mr-3 text-blue-600" />
            Settings
          </h1>
          <p className="text-gray-600 mt-1">Customize your health tracking experience</p>
        </div>
        
        <button
          onClick={handleSave}
          disabled={saving}
          className={`px-6 py-2 rounded-lg font-medium transition-all ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
          }`}
        >
          {saving ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Saving...
            </div>
          ) : saved ? (
            <div className="flex items-center">
              <Check className="h-4 w-4 mr-2" />
              Saved!
            </div>
          ) : (
            <div className="flex items-center">
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </div>
          )}
        </button>
      </div>

      <div className="grid gap-6">
        <SettingCard
          title="Units & Measurements"
          description="Choose your preferred units for weight and temperature"
          icon={<Globe className="h-5 w-5 text-blue-600" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Weight Unit"
              value={preferences.weight_unit}
              onChange={(value) => updatePreference('weight_unit', value as WeightUnit)}
              options={[
                { value: 'lbs', label: 'Pounds (lbs)' },
                { value: 'kg', label: 'Kilograms (kg)' },
                { value: 'stones', label: 'Stones (st)' }
              ]}
            />
            <Select
              label="Temperature Unit"
              value={preferences.temperature_unit}
              onChange={(value) => updatePreference('temperature_unit', value as TemperatureUnit)}
              options={[
                { value: 'fahrenheit', label: 'Fahrenheit (°F)' },
                { value: 'celsius', label: 'Celsius (°C)' }
              ]}
            />
          </div>
        </SettingCard>

        <SettingCard
          title="Notifications"
          description="Manage how you receive updates and reminders"
          icon={<Bell className="h-5 w-5 text-blue-600" />}
        >
          <div className="space-y-4">
            <Toggle
              enabled={preferences.notifications_enabled}
              onChange={(enabled) => updatePreference('notifications_enabled', enabled)}
              label="Enable notifications"
            />
          </div>
        </SettingCard>

        <SettingCard
          title="Privacy & Data"
          description="Control how your data is used and shared"
          icon={<Shield className="h-5 w-5 text-blue-600" />}
        >
          <div className="space-y-4">
            <Toggle
              enabled={preferences.data_sharing}
              onChange={(enabled) => updatePreference('data_sharing', enabled)}
              label="Allow anonymous data sharing for research"
            />
          </div>
        </SettingCard>

        <SettingCard
          title="Appearance"
          description="Customize the look and feel of the application"
          icon={<Palette className="h-5 w-5 text-blue-600" />}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Theme"
              value={preferences.theme}
              onChange={(value) => updatePreference('theme', value)}
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'auto', label: 'Auto (System)' }
              ]}
            />
            <Select
              label="Language"
              value={preferences.language}
              onChange={(value) => updatePreference('language', value)}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' }
              ]}
            />
          </div>
        </SettingCard>

        <SettingCard
          title="Account Information"
          description="View and manage your account details"
          icon={<User className="h-5 w-5 text-blue-600" />}
        >
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="text-lg text-gray-900">{currentUser?.name || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="text-lg text-gray-900 capitalize">{currentUser?.role || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Created</label>
              <p className="text-lg text-gray-900">
                {currentUser?.created_at 
                  ? new Date(currentUser.created_at).toLocaleDateString()
                  : 'Unknown'
                }
              </p>
            </div>
          </div>
        </SettingCard>
      </div>
    </div>
  );
};