import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw, CheckCircle, AlertCircle, ExternalLink, Zap, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserIntegration, updateUserIntegration } from '../lib/database';
import { fitbitAPI, syncFitbitData } from '../lib/fitbit';

export const FitbitSync: React.FC = () => {
  const { currentUser } = useAuth();
  const [integration, setIntegration] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      checkFitbitConnection();
      
      // Set up auto-sync interval (every 30 minutes)
      if (autoSyncEnabled) {
        const interval = setInterval(() => {
          if (isConnected && !isSyncing) {
            performSync(true); // Silent sync
          }
        }, 30 * 60 * 1000); // 30 minutes
        
        return () => clearInterval(interval);
      }
    }
  }, [currentUser, isConnected, autoSyncEnabled, isSyncing]);

  const checkFitbitConnection = async () => {
    try {
      const { data, error } = await getUserIntegration(currentUser!.id, 'fitbit');
      
      if (error) {
        if (!error.message?.includes('does not exist')) {
          console.error('Error checking Fitbit connection:', error);
        }
        setIsConnected(false);
        return;
      }
      
      if (data) {
        setIntegration(data);
        setIsConnected(true);
        setLastSync(data.last_sync ? new Date(data.last_sync) : null);
        
        console.log('✅ Fitbit connected for user:', currentUser?.name);
        
        // Auto-sync on load if it's been more than 30 minutes
        const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
        if (!data.last_sync || new Date(data.last_sync) < thirtyMinutesAgo) {
          performSync(true);
        }
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Error checking Fitbit connection:', error);
      setIsConnected(false);
    }
  };

  const connectFitbit = async () => {
    try {
      console.log('=== FITBIT CONNECTION START ===');
      console.log('🔗 Connecting Fitbit for user:', currentUser?.name, currentUser?.id);
      
      // Store user info in session storage for the callback
      sessionStorage.setItem('fitbit_connecting_user_id', currentUser!.id);
      sessionStorage.setItem('fitbit_connecting_user_name', currentUser!.name);
      sessionStorage.setItem('fitbit_callback_expected', 'true');
      
      console.log('💾 Stored in session storage:', {
        userId: currentUser!.id,
        userName: currentUser!.name,
        timestamp: new Date().toISOString()
      });
      
      const authUrl = fitbitAPI.getAuthUrl();
      console.log('Generated auth URL:', authUrl);
      console.log('Redirecting to Fitbit authorization...');
      
      // Redirect to Fitbit authorization
      window.location.href = authUrl;
    } catch (error: any) {
      console.error('Error connecting to Fitbit:', error);
      setError(`Failed to connect to Fitbit: ${error.message}`);
    }
  };

  const disconnectFitbit = async () => {
    try {
      if (!integration) return;
      
      const { error } = await updateUserIntegration(currentUser!.id, 'fitbit', {
        is_active: false
      });
      
      if (error) throw error;
      
      setIsConnected(false);
      setIntegration(null);
      setLastSync(null);
      setSyncResults(null);
      
      console.log('🔌 Fitbit disconnected for user:', currentUser?.name);
    } catch (error: any) {
      console.error('Error disconnecting Fitbit:', error);
      setError(`Failed to disconnect Fitbit: ${error.message}`);
    }
  };

  const performSync = async (silent: boolean = false) => {
    if (!isConnected || !integration) {
      if (!silent) {
        setError('Fitbit not connected');
      }
      return;
    }

    try {
      setIsSyncing(true);
      setError(null);
      
      if (!silent) {
        console.log('🔄 Starting manual Fitbit sync for user:', currentUser?.name);
      }
      
      const results = await syncFitbitData(currentUser!.id, 7);
      
      // Update last sync time
      await updateUserIntegration(currentUser!.id, 'fitbit', {
        last_sync: new Date().toISOString()
      });
      
      setSyncResults(results);
      setLastSync(new Date());
      
      if (!silent) {
        console.log('✅ Fitbit sync completed:', results);
      }
    } catch (error: any) {
      console.error('Fitbit sync error:', error);
      if (!silent) {
        setError(`Sync failed: ${error.message}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const getConnectionStatus = () => {
    if (!isConnected) return { color: 'text-gray-600', icon: AlertCircle, text: 'Not Connected' };
    if (isSyncing) return { color: 'text-blue-600', icon: RefreshCw, text: 'Syncing...' };
    return { color: 'text-green-600', icon: CheckCircle, text: 'Connected' };
  };

  const status = getConnectionStatus();
  const StatusIcon = status.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-blue-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-green-500 p-2 rounded-lg">
            <Smartphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Fitbit Integration</h3>
            <p className="text-sm text-gray-600">
              Sync health data automatically for {currentUser?.name}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <StatusIcon className={`h-5 w-5 ${status.color} ${isSyncing ? 'animate-spin' : ''}`} />
          <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
        </div>
      </div>

      {/* Auto-sync Toggle */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-blue-900">Automatic Sync</h4>
            <p className="text-xs text-blue-700">Sync Fitbit data every 30 minutes in the background</p>
          </div>
          <button
            onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        {autoSyncEnabled && isConnected && (
          <div className="mt-2 text-xs text-blue-700">
            ✓ Auto-sync enabled - data syncs automatically every 30 minutes
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {isConnected ? (
        <div className="space-y-4">
          {/* Sync Results */}
          {syncResults && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Last Sync Results</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">{syncResults.activities}</div>
                  <div className="text-green-600">Activities</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">{syncResults.weights}</div>
                  <div className="text-green-600">Weight</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">{syncResults.foods}</div>
                  <div className="text-green-600">Foods</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-700">{syncResults.sleep}</div>
                  <div className="text-green-600">Sleep</div>
                </div>
              </div>
              {lastSync && (
                <p className="text-xs text-green-600 mt-2">
                  Last synced: {lastSync.toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={() => performSync(false)}
              disabled={isSyncing}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            
            <button
              onClick={disconnectFitbit}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Zap className="h-4 w-4" />
              <span>Disconnect</span>
            </button>
          </div>

          {/* Connection Info */}
          <div className="text-xs text-gray-500">
            <p>Connected to Fitbit account for {currentUser?.name}</p>
            {lastSync && <p>Last sync: {lastSync.toLocaleString()}</p>}
          </div>
        </div>
      ) : (
        <div className="text-center">
          <div className="mb-4">
            <Smartphone className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Connect Your Fitbit</h4>
            <p className="text-sm text-gray-600 mb-4">
              Automatically sync your activity, weight, food, and sleep data for {currentUser?.name}
            </p>
          </div>
          
          <button
            onClick={connectFitbit}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2 mx-auto"
          >
            <Smartphone className="h-5 w-5" />
            <span>Connect Fitbit Account</span>
            <ExternalLink className="h-4 w-4" />
          </button>
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h5 className="font-medium text-blue-800 mb-2">What gets synced:</h5>
            <ul className="text-sm text-blue-700 space-y-1 text-left">
              <li>• Daily steps, distance, and calories burned</li>
              <li>• Weight and body composition data</li>
              <li>• Food intake and water consumption</li>
              <li>• Sleep duration, efficiency, and stages</li>
              <li>• Automatic daily sync (every 30 minutes)</li>
            </ul>
          </div>
        </div>
      )}

      {/* Multi-user Support Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          <span>Each user can connect their own Fitbit account independently</span>
        </div>
      </div>
    </div>
  );
};