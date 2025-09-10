import React, { useState, useEffect } from 'react';
import { Calendar, Mic, Check, X, Plus, Clock, Activity } from 'lucide-react';
import { googleCalendar, createMedicationSchedule, scheduleDoctorAppointment } from '../lib/google-calendar';
import { alexaIntegration, scheduleVitaminReminder, scheduleBloodPressureCheck } from '../lib/alexa-integration';

interface Integration {
  name: string;
  type: 'calendar' | 'alexa';
  status: 'connected' | 'disconnected' | 'error';
  icon: React.ComponentType<any>;
  color: string;
}

interface ReminderTemplate {
  id: string;
  name: string;
  description: string;
  type: 'medication' | 'appointment' | 'health_check' | 'vitamin';
  defaultTime?: string;
  icon: React.ComponentType<any>;
}

const reminderTemplates: ReminderTemplate[] = [
  {
    id: 'blood_pressure',
    name: 'Blood Pressure Check',
    description: 'Daily blood pressure monitoring reminder',
    type: 'health_check',
    defaultTime: '09:00',
    icon: Activity
  },
  {
    id: 'medication',
    name: 'Medication Reminder',
    description: 'Set up medication schedule with custom times',
    type: 'medication',
    icon: Clock
  },
  {
    id: 'vitamin',
    name: 'Vitamin Reminder',
    description: 'Daily vitamin and supplement reminders',
    type: 'vitamin',
    defaultTime: '08:00',
    icon: Plus
  },
  {
    id: 'appointment',
    name: 'Doctor Appointment',
    description: 'Schedule and get reminders for medical appointments',
    type: 'appointment',
    icon: Calendar
  }
];

export const IntegrationsManager: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([
    {
      name: 'Google Calendar',
      type: 'calendar',
      status: 'disconnected',
      icon: Calendar,
      color: 'text-red-600'
    },
    {
      name: 'Amazon Alexa',
      type: 'alexa',
      status: 'disconnected',
      icon: Mic,
      color: 'text-purple-600'
    }
  ]);

  const [showReminderForm, setShowReminderForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReminderTemplate | null>(null);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    time: '',
    date: '',
    duration: 15,
    description: '',
    frequency: 'once', // 'once', 'daily', 'weekly'
    platform: 'both' // 'calendar', 'alexa', 'both'
  });

  // Check integration status on component mount
  useEffect(() => {
    checkIntegrationStatus();
  }, []);

  const checkIntegrationStatus = async () => {
    const updatedIntegrations = [...integrations];

    // Check Google Calendar status
    try {
      await googleCalendar.initialize();
      const calendarSignedIn = googleCalendar.getSignInStatus();
      updatedIntegrations[0].status = calendarSignedIn ? 'connected' : 'disconnected';
    } catch (error) {
      updatedIntegrations[0].status = 'error';
    }

    // Check Alexa status
    const alexaAuthenticated = alexaIntegration.isAuthenticated();
    updatedIntegrations[1].status = alexaAuthenticated ? 'connected' : 'disconnected';

    setIntegrations(updatedIntegrations);
  };

  const handleConnect = async (integrationType: 'calendar' | 'alexa') => {
    if (integrationType === 'calendar') {
      const success = await googleCalendar.signIn();
      if (success) {
        setIntegrations(prev => prev.map(integration => 
          integration.type === 'calendar' ? { ...integration, status: 'connected' } : integration
        ));
      }
    } else if (integrationType === 'alexa') {
      // For Alexa, we need to redirect to Amazon OAuth
      const redirectUri = `${window.location.origin}/alexa-callback`;
      const authUrl = alexaIntegration.getAuthUrl(redirectUri);
      window.location.href = authUrl;
    }
  };

  const handleDisconnect = async (integrationType: 'calendar' | 'alexa') => {
    if (integrationType === 'calendar') {
      await googleCalendar.signOut();
    } else if (integrationType === 'alexa') {
      alexaIntegration.signOut();
    }

    setIntegrations(prev => prev.map(integration => 
      integration.type === integrationType ? { ...integration, status: 'disconnected' } : integration
    ));
  };

  const handleTemplateSelect = (template: ReminderTemplate) => {
    setSelectedTemplate(template);
    setReminderForm({
      ...reminderForm,
      title: template.name,
      time: template.defaultTime || '',
      description: template.description
    });
    setShowReminderForm(true);
  };

  const createReminder = async () => {
    if (!selectedTemplate) return;

    const { platform, title, date, time, description } = reminderForm;
    let calendarSuccess = false;
    let alexaSuccess = false;

    // Create calendar event
    if ((platform === 'calendar' || platform === 'both') && integrations[0].status === 'connected') {
      try {
        const dateTime = `${date}T${time}:00`;
        
        if (selectedTemplate.type === 'medication') {
          await createMedicationSchedule(title, description, [time], date);
          calendarSuccess = true;
        } else if (selectedTemplate.type === 'appointment') {
          await scheduleDoctorAppointment(title, dateTime, reminderForm.duration, '', '', description);
          calendarSuccess = true;
        } else {
          await googleCalendar.createHealthReminder({
            title,
            description,
            dateTime,
            reminderMinutes: [15, 60]
          });
          calendarSuccess = true;
        }
      } catch (error) {
        console.error('Calendar reminder failed:', error);
      }
    }

    // Create Alexa reminder
    if ((platform === 'alexa' || platform === 'both') && integrations[1].status === 'connected') {
      try {
        const scheduledTime = `${date}T${time}:00`;
        
        if (selectedTemplate.type === 'vitamin') {
          await scheduleVitaminReminder(title, scheduledTime);
          alexaSuccess = true;
        } else if (selectedTemplate.type === 'health_check' && selectedTemplate.id === 'blood_pressure') {
          await scheduleBloodPressureCheck(time);
          alexaSuccess = true;
        } else {
          await alexaIntegration.createHealthReminder({
            title,
            scheduledTime
          });
          alexaSuccess = true;
        }
      } catch (error) {
        console.error('Alexa reminder failed:', error);
      }
    }

    // Reset form
    setShowReminderForm(false);
    setSelectedTemplate(null);
    setReminderForm({
      title: '',
      time: '',
      date: '',
      duration: 15,
      description: '',
      frequency: 'once',
      platform: 'both'
    });

    // Show success message
    if (calendarSuccess || alexaSuccess) {
      alert(`Reminder created successfully! ${calendarSuccess ? '📅 ' : ''}${alexaSuccess ? '🎤 ' : ''}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'error':
        return <X className="h-4 w-4 text-red-600" />;
      default:
        return <X className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'error':
        return 'Error';
      default:
        return 'Not Connected';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📱 Reminders & Integrations
        </h1>
        <p className="text-gray-600">
          Connect your health tracker to Google Calendar and Amazon Alexa for automated reminders and notifications.
        </p>
      </div>

      {/* Integration Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {integrations.map((integration) => {
          const IconComponent = integration.icon;
          return (
            <div key={integration.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <IconComponent className={`h-8 w-8 ${integration.color} mr-3`} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
                    <div className="flex items-center mt-1">
                      {getStatusIcon(integration.status)}
                      <span className={`ml-2 text-sm ${
                        integration.status === 'connected' ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {getStatusText(integration.status)}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  {integration.status === 'connected' ? (
                    <button
                      onClick={() => handleDisconnect(integration.type)}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(integration.type)}
                      className={`px-4 py-2 text-sm font-medium text-white rounded-md hover:opacity-90 ${
                        integration.type === 'calendar' ? 'bg-red-600' : 'bg-purple-600'
                      }`}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              
              <div className="text-sm text-gray-600">
                {integration.type === 'calendar' ? (
                  <>
                    📅 Create health appointments, medication schedules, and automated calendar reminders with email and popup notifications.
                  </>
                ) : (
                  <>
                    🎤 Set up voice-activated health reminders, daily check-ins, and routine triggers through your Alexa devices.
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Reminder Templates */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          ⚡ Quick Reminder Setup
        </h2>
        <p className="text-gray-600 mb-6">
          Choose a reminder template to quickly set up health notifications on your connected platforms.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reminderTemplates.map((template) => {
            const IconComponent = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="p-4 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
              >
                <IconComponent className="h-6 w-6 text-blue-600 mb-2" />
                <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reminder Form Modal */}
      {showReminderForm && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Set Up {selectedTemplate.name}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reminder Title
                </label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({...reminderForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={reminderForm.date}
                    onChange={(e) => setReminderForm({...reminderForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={reminderForm.time}
                    onChange={(e) => setReminderForm({...reminderForm, time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Platform
                </label>
                <select
                  value={reminderForm.platform}
                  onChange={(e) => setReminderForm({...reminderForm, platform: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="both">Both Google Calendar & Alexa</option>
                  <option value="calendar">Google Calendar Only</option>
                  <option value="alexa">Amazon Alexa Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={reminderForm.description}
                  onChange={(e) => setReminderForm({...reminderForm, description: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowReminderForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={createReminder}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
              >
                Create Reminder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-3">
          💡 Getting Started
        </h2>
        <div className="text-sm text-blue-800 space-y-2">
          <p><strong>Google Calendar:</strong> Connect to automatically sync your health appointments, medication schedules, and reminder events with your calendar.</p>
          <p><strong>Amazon Alexa:</strong> Set up voice reminders that will be announced through your Alexa devices at scheduled times.</p>
          <p><strong>Configuration:</strong> Make sure to configure your API credentials in the Settings page before connecting integrations.</p>
        </div>
      </div>
    </div>
  );
};