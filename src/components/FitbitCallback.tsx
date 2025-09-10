import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { fitbitAPI } from '../lib/fitbit';
import { useAuth } from '../contexts/AuthContext';
import { createUserIntegration } from '../lib/database';

export const FitbitCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, loading, switchUser } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing Fitbit authorization...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('=== FITBIT CALLBACK START ===');
        console.log('FitbitCallback: Starting callback processing');
        console.log('Current URL:', window.location.href);
        console.log('Search params:', Object.fromEntries(searchParams.entries()));
        
        // Get the connecting user info from session storage
        const connectingUserId = sessionStorage.getItem('fitbit_connecting_user_id');
        const connectingUserName = sessionStorage.getItem('fitbit_connecting_user_name');
        
        console.log('Session storage check:', {
          expectedCallback: sessionStorage.getItem('fitbit_callback_expected'),
          connectingUserId,
          connectingUserName,
          currentUserId: currentUser?.id,
          currentUserName: currentUser?.name
        });
        
        if (!connectingUserId) {
          console.log('❌ No connecting user info found, redirecting to dashboard');
          setStatus('error');
          setMessage('Connection session expired. Please try connecting again.');
          setTimeout(() => navigate('/', { replace: true }), 3000);
          return;
        }

        const code = searchParams.get('code');
        const error = searchParams.get('error');

        console.log('Extracted values:', { code: code?.substring(0, 10) + '...', error });

        if (error) {
          console.error('Fitbit authorization error:', error);
          throw new Error(`Fitbit authorization failed: ${error}`);
        }

        if (!code) {
          console.error('No authorization code found in URL');
          throw new Error('No authorization code received from Fitbit');
        }

        console.log('Authorization code received:', code.substring(0, 10) + '...');
        setMessage('Exchanging authorization code for tokens...');
        
        // Exchange code for tokens
        console.log('Calling fitbitAPI.getTokens...');
        const tokens = await fitbitAPI.getTokens(code);
        console.log('Tokens received successfully:', { 
          hasAccessToken: !!tokens.access_token,
          hasRefreshToken: !!tokens.refresh_token,
          expiresIn: tokens.expires_in 
        });
        
        setMessage('Saving integration to database...');
        
        // Calculate expires_at timestamp
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
        
        // Save integration to database using the stored user ID
        console.log('Saving Fitbit integration for user:', connectingUserName, connectingUserId);
        
        const { error: dbError } = await createUserIntegration({
          user_id: connectingUserId,
          provider: 'fitbit',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt
        });

        if (dbError) {
          console.error('Database error:', dbError);
          throw new Error(`Failed to save integration: ${dbError.message}`);
        }

        console.log('Integration saved successfully for user:', connectingUserName);
        
        // Check if we need to switch back to the connecting user
        if (currentUser?.id !== connectingUserId) {
          console.log('🔄 Current user mismatch, switching back to connecting user:', connectingUserName);
          setMessage(`Switching back to ${connectingUserName}...`);
          switchUser(connectingUserId);
        }
        
        // Clear the session storage
        sessionStorage.removeItem('fitbit_connecting_user_id');
        sessionStorage.removeItem('fitbit_connecting_user_name');
        sessionStorage.removeItem('fitbit_callback_expected');
        
        console.log('=== FITBIT CALLBACK SUCCESS ===');
        setStatus('success');
        setMessage(`Fitbit account connected successfully for ${connectingUserName}!`);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          console.log('Redirecting to dashboard...');
          navigate('/', { replace: true });
        }, 2000);

      } catch (error: any) {
        console.error('Fitbit callback error:', error);
        
        // Clear session storage on error too
        sessionStorage.removeItem('fitbit_connecting_user_id');
        sessionStorage.removeItem('fitbit_connecting_user_name');
        sessionStorage.removeItem('fitbit_callback_expected');
        
        console.log('=== FITBIT CALLBACK ERROR ===');
        setStatus('error');
        setMessage(error.message || 'Failed to connect Fitbit account');
      }
    };

    console.log('FitbitCallback component mounted, starting callback handling...');
    console.log('Auth state:', { isAuthenticated, currentUser: currentUser?.name, loading });
    handleCallback();
  }, [searchParams, navigate, currentUser, isAuthenticated, loading, switchUser]);

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'bg-blue-50 border-blue-200';
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className={`bg-white rounded-2xl shadow-xl p-8 border ${getStatusColor()}`}>
          <div className="text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon()}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {status === 'processing' && 'Connecting Fitbit...'}
              {status === 'success' && 'Connection Successful!'}
              {status === 'error' && 'Connection Failed'}
            </h1>
            
            <p className="text-gray-600 mb-6">{message}</p>
            
            {status === 'success' && (
              <p className="text-sm text-green-700">
                Redirecting you back to the dashboard...
              </p>
            )}
            
            {status === 'error' && (
              <button
                onClick={() => navigate('/', { replace: true })}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};