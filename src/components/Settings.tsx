import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Palette, Globe, Save, Check, Key, Database } from 'lucide-react';
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

interface ApiConfiguration {
  supabase_url: string;
  supabase_anon_key: string;
  fitbit_client_id: string;
  fitbit_client_secret: string;
  fitbit_redirect_uri: string;
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
  const [apiConfig, setApiConfig] = useState<ApiConfiguration>({
    supabase_url: '',
    supabase_anon_key: '',
    fitbit_client_id: '',
    fitbit_client_secret: '',
    fitbit_redirect_uri: ''
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [apiSaving, setApiSaving] = useState(false);
  const [apiSaved, setApiSaved] = useState(false);

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

    // Load API configuration from localStorage
    const savedApiConfig = localStorage.getItem('api_configuration');
    if (savedApiConfig) {
      try {
        const config = JSON.parse(savedApiConfig);
        setApiConfig(config);
      } catch (error) {
        console.error('Failed to parse saved API configuration:', error);
      }
    } else {
      // Initialize with current environment variables
      setApiConfig({
        supabase_url: import.meta.env.VITE_SUPABASE_URL || '',
        supabase_anon_key: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
        fitbit_client_id: import.meta.env.VITE_FITBIT_CLIENT_ID || '',
        fitbit_client_secret: import.meta.env.VITE_FITBIT_CLIENT_SECRET || '',
        fitbit_redirect_uri: import.meta.env.VITE_FITBIT_REDIRECT_URI || ''
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

  const updateApiConfig = (key: keyof ApiConfiguration, value: string) => {
    setApiConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleApiSave = async () => {
    setApiSaving(true);
    try {
      // Save to localStorage
      localStorage.setItem('api_configuration', JSON.stringify(apiConfig));
      
      // Show success state
      setApiSaved(true);
      setTimeout(() => setApiSaved(false), 2000);
      
      // Refresh the page to reinitialize API clients with new config
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Error saving API configuration:', error);
    } finally {
      setApiSaving(false);
    }
  };

  const testConnection = async (type: 'supabase' | 'fitbit') => {
    try {
      if (type === 'supabase') {
        // Test Supabase connection
        const url = new URL(apiConfig.supabase_url);
        const response = await fetch(`${apiConfig.supabase_url}/rest/v1/`, {
          headers: {
            'apikey': apiConfig.supabase_anon_key,
            'Authorization': `Bearer ${apiConfig.supabase_anon_key}`
          }
        });
        return response.ok;
      } else if (type === 'fitbit') {
        // For Fitbit, we can just validate the format since we can't test without full OAuth
        return apiConfig.fitbit_client_id.length > 0 && apiConfig.fitbit_client_secret.length > 0;
      }
    } catch (error) {
      return false;
    }
    return false;
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

  const Input: React.FC<{
    value: string;
    onChange: (value: string) => void;
    label: string;
    type?: string;
    placeholder?: string;
    required?: boolean;
  }> = ({ value, onChange, label, type = 'text', placeholder, required = false }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
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
          title="API Configuration"
          description="Configure your Supabase and Fitbit API connection details"
          icon={<Database className="h-5 w-5 text-blue-600" />}
        >
          <div className="space-y-6">
            <div className="border-b border-gray-200 pb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Database className="h-5 w-5 mr-2 text-blue-600" />
                Supabase Configuration
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Supabase URL"
                  value={apiConfig.supabase_url}
                  onChange={(value) => updateApiConfig('supabase_url', value)}
                  placeholder="https://your-project.supabase.co"
                  type="url"
                  required
                />
                <Input
                  label="Supabase Anonymous Key"
                  value={apiConfig.supabase_anon_key}
                  onChange={(value) => updateApiConfig('supabase_anon_key', value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  type="password"
                  required
                />
              </div>
            </div>
            
            <div className="border-b border-gray-200 pb-4">
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Key className="h-5 w-5 mr-2 text-green-600" />
                Fitbit API Configuration
              </h4>
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Fitbit Client ID"
                  value={apiConfig.fitbit_client_id}
                  onChange={(value) => updateApiConfig('fitbit_client_id', value)}
                  placeholder="23QLWB"
                  required
                />
                <Input
                  label="Fitbit Client Secret"
                  value={apiConfig.fitbit_client_secret}
                  onChange={(value) => updateApiConfig('fitbit_client_secret', value)}
                  placeholder="Client secret from Fitbit dev console"
                  type="password"
                  required
                />
                <Input
                  label="Fitbit Redirect URI"
                  value={apiConfig.fitbit_redirect_uri}
                  onChange={(value) => updateApiConfig('fitbit_redirect_uri', value)}
                  placeholder="https://your-domain.com/fitbit/callback"
                  type="url"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-gray-600">
                <p className="mb-2">💡 <strong>Note:</strong> Changes will require a page refresh to take effect.</p>
                <p>🔒 Configuration is stored securely in your browser's local storage.</p>
              </div>
              <button
                onClick={handleApiSave}
                disabled={apiSaving}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  apiSaved
                    ? 'bg-green-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50'
                }`}
              >
                {apiSaving ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : apiSaved ? (
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    Saved!
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Save className="h-4 w-4 mr-2" />
                    Save API Config
                  </div>
                )}
              </button>
            </div>
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