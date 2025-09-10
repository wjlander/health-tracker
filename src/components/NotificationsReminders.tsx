import React, { useState, useEffect } from 'react';
import { Bell, Plus, Edit, Trash2, Clock, AlertCircle, CheckCircle, Calendar } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getReminders, 
  createReminder, 
  updateReminder, 
  deleteReminder,
  getNotifications,
  markNotificationAsRead,
  createNotification
} from '../lib/database';
import { format } from 'date-fns';

export const NotificationsReminders: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'notifications' | 'reminders'>('notifications');
  const [notifications, setNotifications] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<any>(null);

  const [reminderForm, setReminderForm] = useState({
    reminder_type: 'medication' as const,
    title: '',
    description: '',
    frequency: 'daily' as const,
    time_of_day: '09:00',
    days_of_week: [] as number[],
    start_date: format(new Date(), 'yyyy-MM-dd'),
    end_date: '',
    is_active: true
  });

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'notifications') {
        const { data, error } = await getNotifications(currentUser!.id, 50);
        if (error && !error.message?.includes('does not exist')) {
          throw error;
        }
        setNotifications(data || []);
      } else {
        const { data, error } = await getReminders(currentUser!.id);
        if (error && !error.message?.includes('does not exist')) {
          throw error;
        }
        setReminders(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    try {
      setLoading(true);
      
      const reminderData = {
        ...reminderForm,
        user_id: currentUser.id
      };

      if (editingReminder) {
        const { error } = await updateReminder(editingReminder.id, reminderData);
        if (error) throw error;
      } else {
        const { error } = await createReminder(reminderData);
        if (error) throw error;
      }

      resetForm();
      await loadData();
    } catch (error) {
      console.error('Error saving reminder:', error);
      alert('Failed to save reminder. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setReminderForm({
      reminder_type: 'medication',
      title: '',
      description: '',
      frequency: 'daily',
      time_of_day: '09:00',
      days_of_week: [],
      start_date: format(new Date(), 'yyyy-MM-dd'),
      end_date: '',
      is_active: true
    });
    setEditingReminder(null);
    setShowForm(false);
  };

  const handleEdit = (reminder: any) => {
    setEditingReminder(reminder);
    setReminderForm({
      reminder_type: reminder.reminder_type,
      title: reminder.title,
      description: reminder.description || '',
      frequency: reminder.frequency,
      time_of_day: reminder.time_of_day,
      days_of_week: reminder.days_of_week || [],
      start_date: reminder.start_date,
      end_date: reminder.end_date || '',
      is_active: reminder.is_active
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete reminder "${title}"?`)) return;

    try {
      const { error } = await deleteReminder(id);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Failed to delete reminder. Please try again.');
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await markNotificationAsRead(notificationId);
      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const toggleDayOfWeek = (day: number) => {
    setReminderForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day]
    }));
  };

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getReminderTypeIcon = (type: string) => {
    switch (type) {
      case 'medication': return '💊';
      case 'appointment': return '🏥';
      case 'exercise': return '🏃';
      case 'water': return '💧';
      case 'custom': return '📝';
      default: return '⏰';
    }
  };

  const getNotificationTypeColor = (type: string) => {
    switch (type) {
      case 'alert': return 'bg-red-100 text-red-800';
      case 'reminder': return 'bg-blue-100 text-blue-800';
      case 'sync': return 'bg-green-100 text-green-800';
      case 'goal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Bell className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Notifications & Reminders</h3>
              <p className="text-sm text-gray-600">
                Manage alerts and custom reminders for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          {activeTab === 'reminders' && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Reminder</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications ({notifications.filter(n => !n.is_read).length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'reminders'
                ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Reminders ({reminders.filter(r => r.is_active).length})</span>
            </div>
          </button>
        </div>
      </div>

      {/* Add/Edit Reminder Form */}
      {showForm && activeTab === 'reminders' && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingReminder ? 'Edit Reminder' : 'Create New Reminder'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={reminderForm.reminder_type}
                  onChange={(e) => setReminderForm({...reminderForm, reminder_type: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="medication">Medication</option>
                  <option value="appointment">Appointment</option>
                  <option value="exercise">Exercise</option>
                  <option value="water">Water Intake</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={(e) => setReminderForm({...reminderForm, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Take morning medication"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={reminderForm.description}
                onChange={(e) => setReminderForm({...reminderForm, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Additional details..."
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select
                  value={reminderForm.frequency}
                  onChange={(e) => setReminderForm({...reminderForm, frequency: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="once">Once</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time</label>
                <input
                  type="time"
                  value={reminderForm.time_of_day}
                  onChange={(e) => setReminderForm({...reminderForm, time_of_day: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                <input
                  type="date"
                  value={reminderForm.start_date}
                  onChange={(e) => setReminderForm({...reminderForm, start_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            {reminderForm.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Days of Week</label>
                <div className="flex space-x-2">
                  {dayNames.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDayOfWeek(index)}
                      className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                        reminderForm.days_of_week.includes(index)
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={loading}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Saving...' : (editingReminder ? 'Update' : 'Create')}
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

      {/* Content Display */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            {activeTab === 'notifications' ? 'Recent Notifications' : 'Active Reminders'}
          </h3>
        </div>
        
        {activeTab === 'notifications' ? (
          <div className="divide-y divide-gray-200">
            {notifications.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Notifications</h3>
                <p className="text-gray-600">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div key={notification.id} className={`p-4 ${!notification.is_read ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900">{notification.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${getNotificationTypeColor(notification.notification_type)}`}>
                          {notification.notification_type}
                        </span>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">
                        {format(new Date(notification.created_at), 'MMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {reminders.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reminders Set</h3>
                <p className="text-gray-600">Create your first reminder to stay on track.</p>
              </div>
            ) : (
              reminders.map((reminder) => (
                <div key={reminder.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className="text-lg">{getReminderTypeIcon(reminder.reminder_type)}</span>
                        <h4 className="font-medium text-gray-900">{reminder.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          reminder.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {reminder.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      {reminder.description && (
                        <p className="text-sm text-gray-600 mb-2">{reminder.description}</p>
                      )}
                      
                      <div className="text-sm text-gray-500 space-y-1">
                        <div>Frequency: {reminder.frequency} at {reminder.time_of_day}</div>
                        {reminder.frequency === 'weekly' && reminder.days_of_week && (
                          <div>Days: {reminder.days_of_week.map((d: number) => dayNames[d]).join(', ')}</div>
                        )}
                        <div>Started: {format(new Date(reminder.start_date), 'MMM d, yyyy')}</div>
                        {reminder.next_trigger && (
                          <div>Next: {format(new Date(reminder.next_trigger), 'MMM d, yyyy HH:mm')}</div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleEdit(reminder)}
                        className="text-blue-600 hover:text-blue-700 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(reminder.id, reminder.title)}
                        className="text-red-600 hover:text-red-700 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};