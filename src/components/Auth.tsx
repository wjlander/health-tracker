import React, { useState } from 'react';
import { Heart, LogIn, Shield, AlertCircle, Flower2 } from 'lucide-react';
import { configError } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

export const Auth: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const success = await login(username, password);
      
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (error: any) {
      setError('Login failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-3 rounded-full">
              <Flower2 className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enhanced Health Tracker</h1>
          <p className="text-gray-600">
            Comprehensive health tracking with women's health & lab results
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-pink-100">
          {(error || configError) && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <div className="text-red-700 text-sm">
                {configError || error}
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Enter password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-pink-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              <LogIn className="h-5 w-5" />
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-6 p-4 bg-pink-50 rounded-lg border border-pink-200">
            <div className="flex items-start space-x-2">
              <Shield className="h-5 w-5 text-pink-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-pink-900 mb-1">Enhanced Health Tracker</p>
                <p className="text-xs text-pink-700">
                  Advanced health tracking with menstrual cycle monitoring, lab results, 
                  and comprehensive pattern analysis for optimal wellness management.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};