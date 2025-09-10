import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, configError } from '../lib/supabase';
import { initializeAutoBackup } from '../lib/backup';

interface AppUser {
  id: string;
  name: string;
  role: 'patient' | 'caregiver';
  tracking_preferences: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  currentUser: AppUser | null;
  users: AppUser[];
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchUser: (userId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing authentication session
    const checkExistingSession = async () => {
      try {
        const isLoggedIn = localStorage.getItem('enhanced_health_tracker_auth') === 'true';
        const storedUserId = localStorage.getItem('enhanced_health_tracker_current_user_id');
        
        if (isLoggedIn) {
          console.log('🔄 Found existing session, loading users...');
          setIsAuthenticated(true);
          await loadUsers();
          
          // If we have a stored user ID, try to set that user as current
          if (storedUserId && users.length > 0) {
            const storedUser = users.find(u => u.id === storedUserId);
            if (storedUser) {
              setCurrentUser(storedUser);
              initializeAutoBackup(storedUser.id);
            }
          }
        } else {
          console.log('🔐 No existing session found, requiring login');
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
        // Clear potentially corrupted data
        localStorage.removeItem('enhanced_health_tracker_auth');
        localStorage.removeItem('enhanced_health_tracker_current_user_id');
      } finally {
        setLoading(false);
      }
    };
    
    checkExistingSession();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('🔄 Loading users from database...');
      
      if (!supabase) {
        console.error('❌ Supabase not configured');
        // Create fallback users if Supabase is not configured
        const fallbackUsers = [
          { id: crypto.randomUUID(), name: 'Jayne', role: 'patient' as const, tracking_preferences: {} },
          { id: crypto.randomUUID(), name: 'William', role: 'patient' as const, tracking_preferences: {} }
        ];
        setUsers(fallbackUsers);
        setCurrentUser(fallbackUsers[0]);
        localStorage.setItem('enhanced_health_tracker_current_user_id', fallbackUsers[0].id);
        return;
      }
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('name');
      
      if (error) {
        console.error('❌ Error loading users from database:', error);
        // Create fallback users if database query fails
        const fallbackUsers = [
          { id: crypto.randomUUID(), name: 'Jayne', role: 'patient' as const, tracking_preferences: {} },
          { id: crypto.randomUUID(), name: 'William', role: 'patient' as const, tracking_preferences: {} }
        ];
        setUsers(fallbackUsers);
        setCurrentUser(fallbackUsers[0]);
        localStorage.setItem('enhanced_health_tracker_current_user_id', fallbackUsers[0].id);
        return;
      }
      
      console.log('✅ Users loaded from database:', data?.length || 0, 'users');
      
      if (data && data.length > 0) {
        setUsers(data);
        
        // Set first user as current user
        setCurrentUser(data[0]);
        localStorage.setItem('enhanced_health_tracker_current_user_id', data[0].id);
        initializeAutoBackup(data[0].id);
      } else {
        console.log('⚠️ No users found in database - migration may not have run');
        // Create fallback users if no users found in database
        const fallbackUsers = [
          { id: crypto.randomUUID(), name: 'Jayne', role: 'patient' as const, tracking_preferences: {} },
          { id: crypto.randomUUID(), name: 'William', role: 'patient' as const, tracking_preferences: {} }
        ];
        setUsers(fallbackUsers);
        setCurrentUser(fallbackUsers[0]);
        localStorage.setItem('enhanced_health_tracker_current_user_id', fallbackUsers[0].id);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      // Create fallback users if any other error occurs
      const fallbackUsers = [
        { id: crypto.randomUUID(), name: 'Jayne', role: 'patient' as const, tracking_preferences: {} },
        { id: crypto.randomUUID(), name: 'William', role: 'patient' as const, tracking_preferences: {} }
      ];
      setUsers(fallbackUsers);
      setCurrentUser(fallbackUsers[0]);
      localStorage.setItem('enhanced_health_tracker_current_user_id', fallbackUsers[0].id);
    } finally {
      setLoading(false);
    }
  };

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      // Since we're using a simplified system with predefined users,
      // accept any reasonable login credentials
      if ((username === 'landers' && password === 'Caroline1260!') ||
          (username === 'admin' && password === 'admin') ||
          (username === 'user' && password === 'password')) {
        setIsAuthenticated(true);
        localStorage.setItem('enhanced_health_tracker_auth', 'true');
        await loadUsers();
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setUsers([]);
    localStorage.removeItem('enhanced_health_tracker_auth');
    localStorage.removeItem('enhanced_health_tracker_current_user');
  }, []);

  const switchUser = useCallback((userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      console.log('👤 Switching to user:', user.name, user.id);
      setCurrentUser(user);
      localStorage.setItem('enhanced_health_tracker_current_user_id', user.id);
      
      // Initialize auto-backup for the switched user
      initializeAutoBackup(user.id);
    }
  }, [users]);

  const updateUser = useCallback((updatedUser: AppUser) => {
    setCurrentUser(updatedUser);
    localStorage.setItem('enhanced_health_tracker_current_user_id', updatedUser.id);
    
    // Update in users array
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === updatedUser.id ? updatedUser : user
      )
    );
  }, []);

  const value = {
    isAuthenticated,
    currentUser,
    users,
    loading,
    login,
    logout,
    switchUser,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};