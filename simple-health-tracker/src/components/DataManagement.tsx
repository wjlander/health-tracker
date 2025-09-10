import React, { useState } from 'react';
import { Trash2, Download, AlertTriangle, CheckCircle, Database, FileText, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export const DataManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const handleDeleteAllData = async () => {
    if (deleteConfirm !== 'DELETE ALL DATA' || !currentUser) {
      return;
    }

    try {
      setLoading(true);
      setDeleteResult(null);

      console.log('🗑️ Starting data deletion for user:', currentUser.name, currentUser.id);

      // Delete all user data in correct order (respecting foreign key constraints)
      const deletions = [
        { table: 'fitbit_sleep', name: 'Fitbit Sleep Data' },
        { table: 'fitbit_foods', name: 'Fitbit Food Data' },
        { table: 'fitbit_weights', name: 'Fitbit Weight Data' },
        { table: 'fitbit_activities', name: 'Fitbit Activity Data' },
        { table: 'user_integrations', name: 'Fitbit Connections' },
        { table: 'activity_entries', name: 'Activity Entries' },
        { table: 'food_entries', name: 'Food Entries' },
        { table: 'health_entries', name: 'Health Entries' }
      ];

      let deletedCounts: { [key: string]: number } = {};

      for (const deletion of deletions) {
        try {
          const { count, error } = await supabase
            .from(deletion.table)
            .delete()
            .eq('user_id', currentUser.id);

          if (error) {
            if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
              console.log(`⚠️ Table ${deletion.table} doesn't exist, skipping...`);
              deletedCounts[deletion.name] = 0;
              continue;
            }
            throw error;
          }

          deletedCounts[deletion.name] = count || 0;
          console.log(`✅ Deleted ${count || 0} records from ${deletion.table}`);
        } catch (tableError: any) {
          console.error(`Error deleting ${deletion.name}:`, tableError);
          deletedCounts[deletion.name] = 0;
        }
      }

      const totalDeleted = Object.values(deletedCounts).reduce((sum, count) => sum + count, 0);
      
      setDeleteResult(`Successfully deleted all data for ${currentUser.name}:
${Object.entries(deletedCounts)
  .map(([name, count]) => `• ${name}: ${count} records`)
  .join('\n')}

Total: ${totalDeleted} records deleted`);

      setShowDeleteConfirm(false);
      setDeleteConfirm('');

    } catch (error: any) {
      console.error('Error deleting data:', error);
      setDeleteResult(`Error deleting data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const exportUserData = async () => {
    if (!currentUser) return;

    try {
      setLoading(true);
      console.log('📤 Exporting data for user:', currentUser.name);

      // Fetch all user data
      const [
        healthEntries,
        foodEntries,
        activityEntries,
        userIntegrations,
        fitbitActivities,
        fitbitWeights,
        fitbitFoods,
        fitbitSleep
      ] = await Promise.all([
        supabase.from('health_entries').select('*').eq('user_id', currentUser.id),
        supabase.from('food_entries').select('*').eq('user_id', currentUser.id),
        supabase.from('activity_entries').select('*').eq('user_id', currentUser.id),
        supabase.from('user_integrations').select('*').eq('user_id', currentUser.id),
        supabase.from('fitbit_activities').select('*').eq('user_id', currentUser.id),
        supabase.from('fitbit_weights').select('*').eq('user_id', currentUser.id),
        supabase.from('fitbit_foods').select('*').eq('user_id', currentUser.id),
        supabase.from('fitbit_sleep').select('*').eq('user_id', currentUser.id)
      ]);

      const exportData = {
        user: currentUser,
        exportDate: new Date().toISOString(),
        data: {
          healthEntries: healthEntries.data || [],
          foodEntries: foodEntries.data || [],
          activityEntries: activityEntries.data || [],
          userIntegrations: userIntegrations.data || [],
          fitbitActivities: fitbitActivities.data || [],
          fitbitWeights: fitbitWeights.data || [],
          fitbitFoods: fitbitFoods.data || [],
          fitbitSleep: fitbitSleep.data || []
        }
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `health-data-${currentUser.name.toLowerCase()}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('✅ Data exported successfully');

    } catch (error) {
      console.error('Error exporting data:', error);
      alert('Error exporting data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center space-x-3 mb-4">
          <Database className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Data Management</h3>
        </div>
        <p className="text-gray-600">
          Manage your health data for <strong>{currentUser?.name}</strong>. 
          Export your data for backup or delete all records to start fresh.
        </p>
      </div>

      {/* Export Data */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Download className="h-6 w-6 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Export Data</h3>
              <p className="text-sm text-gray-600">Download all your health data as a JSON file</p>
            </div>
          </div>
          <button
            onClick={exportUserData}
            disabled={loading}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            <Download className="h-5 w-5" />
            <span>{loading ? 'Exporting...' : 'Export Data'}</span>
          </button>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-800 mb-2">Export includes:</h4>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Health entries (mood, energy, anxiety, sleep, weight)</li>
            <li>• Food and activity entries</li>
            <li>• Fitbit data (activities, weight, food, sleep)</li>
            <li>• Integration settings</li>
          </ul>
        </div>
      </div>

      {/* Delete All Data */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-red-200">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Delete All Data</h3>
            <p className="text-sm text-gray-600">Permanently delete all health data for {currentUser?.name}</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-red-800 mb-2">⚠️ Warning: This action cannot be undone!</h4>
              <p className="text-sm text-red-700 mb-3">This will permanently delete:</p>
              <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                <li>All health entries and daily logs</li>
                <li>All food and activity entries</li>
                <li>All synced Fitbit data</li>
                <li>Fitbit connection (you'll need to reconnect)</li>
              </ul>
            </div>
          </div>
        </div>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
          >
            <Trash2 className="h-5 w-5" />
            <span>Delete All Data</span>
          </button>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type "DELETE ALL DATA" to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                className="w-full px-4 py-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="DELETE ALL DATA"
              />
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={handleDeleteAllData}
                disabled={deleteConfirm !== 'DELETE ALL DATA' || loading}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                <Trash2 className="h-5 w-5" />
                <span>{loading ? 'Deleting...' : 'Confirm Delete'}</span>
              </button>
              
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirm('');
                }}
                disabled={loading}
                className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Result */}
      {deleteResult && (
        <div className={`rounded-xl shadow-sm p-6 border ${
          deleteResult.includes('Error') 
            ? 'bg-red-50 border-red-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-start space-x-3">
            {deleteResult.includes('Error') ? (
              <AlertTriangle className="h-6 w-6 text-red-600 mt-1" />
            ) : (
              <CheckCircle className="h-6 w-6 text-green-600 mt-1" />
            )}
            <div>
              <h4 className={`font-medium mb-2 ${
                deleteResult.includes('Error') ? 'text-red-800' : 'text-green-800'
              }`}>
                {deleteResult.includes('Error') ? 'Deletion Failed' : 'Deletion Successful'}
              </h4>
              <pre className={`text-sm whitespace-pre-wrap ${
                deleteResult.includes('Error') ? 'text-red-700' : 'text-green-700'
              }`}>
                {deleteResult}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Data Summary */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center space-x-3 mb-4">
          <FileText className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Data Summary</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-blue-900">Manual Entries</div>
            <div className="text-sm text-blue-700">Health, food, activities</div>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <Database className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-green-900">Fitbit Data</div>
            <div className="text-sm text-green-700">Synced activities & vitals</div>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
            <FileText className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-lg font-bold text-purple-900">Core Features</div>
            <div className="text-sm text-purple-700">Simple health tracking</div>
          </div>
        </div>
        
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> All data is stored securely and is only accessible by you. 
            Export your data regularly for backup purposes. Deleting data is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
};