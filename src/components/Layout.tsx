import React, { useState, useEffect } from 'react';
import { 
  Home, 
  PlusCircle, 
  TrendingUp, 
  History, 
  Settings, 
  Database, 
  LogOut, 
  User,
  Flower2,
  TestTube,
  Pill,
  Zap,
  Brain,
  Flame,
  FileText,
  Target,
  Bell
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, title, currentPage, onNavigate }) => {
  const { currentUser, users, switchUser, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'entry', label: 'Daily Entry', icon: PlusCircle },
    { id: 'patterns', label: 'Health Patterns', icon: TrendingUp },
    { id: 'history', label: 'History', icon: History },
    { id: 'womens-health', label: 'Women\'s Health', icon: Flower2 },
    { id: 'lab-results', label: 'Lab Results', icon: TestTube },
    { id: 'medical-management', label: 'Medical Management', icon: Pill },
    { id: 'seizure-tracking', label: 'Seizure Tracking', icon: Zap },
    { id: 'mental-health', label: 'Mental Health', icon: Brain },
    { id: 'heartburn-tracking', label: 'Heartburn Tracking', icon: Flame },
    { id: 'reports', label: 'Medical Reports', icon: FileText },
    { id: 'weight-goals', label: 'Weight Goals', icon: Target },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'data-management', label: 'Data Management', icon: Database },
  ];

  const handleNavigation = (pageId: string) => {
    window.location.hash = pageId;
    onNavigate(pageId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-2 rounded-lg">
                <Flower2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Enhanced Health Tracker</h1>
                <p className="text-sm text-gray-600">{title}</p>
              </div>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg transition-colors"
              >
                <User className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{currentUser?.role}</p>
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Switch User
                    </div>
                    {users.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          switchUser(user.id);
                          setShowUserMenu(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                          currentUser?.id === user.id
                            ? 'bg-blue-100 text-blue-900'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-gray-200 mt-2 pt-2">
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-2 rounded-md text-sm text-red-700 hover:bg-red-50 transition-colors flex items-center space-x-2"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-white shadow-sm border-r border-blue-100 min-h-screen">
          <div className="p-4">
            <div className="space-y-1">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};