import React, { useState, useEffect } from 'react';
import { Download, Upload, Trash2, RefreshCw, Save, Clock, HardDrive, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { backupManager, BackupSummary } from '../lib/backup';
import { format } from 'date-fns';

export const BackupRestore: React.FC = () => {
  const { currentUser } = useAuth();
  const [backups, setBackups] = useState<BackupSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [backupName, setBackupName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadBackups();
    }
  }, [currentUser]);

  const loadBackups = async () => {
    try {
      setLoading(true);
      const { data, error } = await backupManager.getBackups(currentUser!.id);
      if (error) throw error;
      setBackups(data);
    } catch (error) {
      console.error('Error loading backups:', error);
      setMessage({ type: 'error', text: 'Failed to load backups' });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      setCreating(true);
      const name = backupName.trim() || `manual-backup-${format(new Date(), 'yyyy-MM-dd-HH-mm')}`;
      
      const { data, error } = await backupManager.createBackup(currentUser!.id, name, 'manual');
      if (error) throw error;
      
      setMessage({ type: 'success', text: `Backup "${name}" created successfully!` });
      setBackupName('');
      setShowCreateForm(false);
      await loadBackups();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      setMessage({ type: 'error', text: `Failed to create backup: ${error.message}` });
    } finally {
      setCreating(false);
    }
  };

  const restoreBackup = async (backupId: string, backupName: string) => {
    if (!confirm(`Are you sure you want to restore "${backupName}"? This will replace all your current data.`)) {
      return;
    }

    try {
      setRestoring(backupId);
      const { success, error } = await backupManager.restoreBackup(currentUser!.id, backupId);
      if (!success) throw error;
      
      setMessage({ type: 'success', text: `Data restored from "${backupName}" successfully!` });
      
      // Refresh the page to show restored data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error('Error restoring backup:', error);
      setMessage({ type: 'error', text: `Failed to restore backup: ${error.message}` });
    } finally {
      setRestoring(null);
    }
  };

  const downloadBackup = async (backupId: string) => {
    try {
      await backupManager.downloadBackup(currentUser!.id, backupId);
      setMessage({ type: 'success', text: 'Backup downloaded successfully!' });
    } catch (error: any) {
      console.error('Error downloading backup:', error);
      setMessage({ type: 'error', text: `Failed to download backup: ${error.message}` });
    }
  };

  const deleteBackup = async (backupId: string, backupName: string) => {
    if (!confirm(`Are you sure you want to delete "${backupName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { success, error } = await backupManager.deleteBackup(currentUser!.id, backupId);
      if (!success) throw error;
      
      setMessage({ type: 'success', text: `Backup "${backupName}" deleted successfully!` });
      await loadBackups();
    } catch (error: any) {
      console.error('Error deleting backup:', error);
      setMessage({ type: 'error', text: `Failed to delete backup: ${error.message}` });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBackupTypeIcon = (type: 'manual' | 'automatic') => {
    return type === 'automatic' ? 
      <Clock className="h-4 w-4 text-blue-500" /> : 
      <Save className="h-4 w-4 text-green-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <HardDrive className="h-6 w-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Backup & Restore</h3>
              <p className="text-sm text-gray-600">
                Manage your health data backups for <strong>{currentUser?.name}</strong>
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
          >
            <Save className="h-4 w-4" />
            <span>Create Backup</span>
          </button>
        </div>

        {/* Auto-backup info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm font-medium text-blue-800">Automatic Daily Backups</p>
              <p className="text-xs text-blue-700">
                Your data is automatically backed up once per day when you use the app. 
                Manual backups can be created anytime for extra safety.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Backup Form */}
      {showCreateForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
          <h4 className="text-lg font-semibold text-gray-900 mb-4">Create New Backup</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Name (optional)
              </label>
              <input
                type="text"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                placeholder="e.g., before-medication-change"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                If left empty, a timestamp will be used automatically
              </p>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={createBackup}
                disabled={creating}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center space-x-2"
              >
                {creating ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Create Backup</span>
                  </>
                )}
              </button>
              
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setBackupName('');
                }}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message */}
      {message && (
        <div className={`rounded-xl shadow-sm p-4 border ${
          message.type === 'success' 
            ? 'bg-green-50 border-green-200' 
            : 'bg-red-50 border-red-200'
        }`}>
          <div className="flex items-center space-x-2">
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            <p className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </p>
          </div>
        </div>
      )}

      {/* Backups List */}
      <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Backups</h3>
          <button
            onClick={loadBackups}
            disabled={loading}
            className="text-blue-600 hover:text-blue-700 transition-colors flex items-center space-x-1"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Loading backups...</p>
          </div>
        ) : backups.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Backups Yet</h4>
            <p className="text-gray-600">Create your first backup to keep your health data safe.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {backups.map((backup) => (
              <div key={backup.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getBackupTypeIcon(backup.backup_type)}
                      <h4 className="text-lg font-medium text-gray-900">
                        {backup.backup_name}
                      </h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        backup.backup_type === 'automatic' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {backup.backup_type}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Created:</span><br />
                        {format(new Date(backup.created_at), 'MMM d, yyyy HH:mm')}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span><br />
                        {formatFileSize(backup.file_size)}
                      </div>
                      <div>
                        <span className="font-medium">Records:</span><br />
                        {backup.record_counts.total.toLocaleString()}
                      </div>
                      <div>
                        <span className="font-medium">Health Entries:</span><br />
                        {backup.record_counts.health_entries}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      Health: {backup.record_counts.health_entries} • 
                      Food: {backup.record_counts.food_entries} • 
                      Activities: {backup.record_counts.activity_entries} • 
                      Fitbit: {backup.record_counts.fitbit_data}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => downloadBackup(backup.id)}
                      className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                      title="Download backup file"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    
                    <button
                      onClick={() => restoreBackup(backup.id, backup.backup_name)}
                      disabled={restoring === backup.id}
                      className="bg-green-100 text-green-700 p-2 rounded-lg hover:bg-green-200 disabled:opacity-50 transition-colors"
                      title="Restore from this backup"
                    >
                      {restoring === backup.id ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => deleteBackup(backup.id, backup.backup_name)}
                      className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors"
                      title="Delete backup"
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

      {/* Info Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
        <h4 className="font-medium text-gray-900 mb-3">📋 Backup Information</h4>
        <div className="space-y-2 text-sm text-gray-600">
          <p><strong>Automatic Backups:</strong> Created daily when you use the app (max 10 kept)</p>
          <p><strong>Manual Backups:</strong> Created by you for specific situations</p>
          <p><strong>Storage:</strong> Backups are stored locally in your browser</p>
          <p><strong>Download:</strong> Save backup files to your computer for extra safety</p>
          <p><strong>Restore:</strong> Replace all current data with backup data (irreversible)</p>
        </div>
        
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important Notes:</p>
              <ul className="mt-1 space-y-1 list-disc list-inside">
                <li>Restoring a backup will replace ALL your current data</li>
                <li>Download important backups to keep them safe</li>
                <li>Backups are stored in your browser - clearing browser data will delete them</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};