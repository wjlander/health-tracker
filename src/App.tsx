import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { DailyEntry } from './components/DailyEntry';
import { Patterns } from './components/Patterns';
import { History } from './components/History';
import { Settings } from './components/Settings';
import { FitbitCallback } from './components/FitbitCallback';
import { DataManagement } from './components/DataManagement';
import { WomensHealth } from './components/WomensHealth';
import { LabResults } from './components/LabResults';
import { MedicalManagement } from './components/MedicalManagement';
import { SeizureTracking } from './components/SeizureTracking';
import { MentalHealthTracking } from './components/MentalHealthTracking';
import { HeartburnTracking } from './components/HeartburnTracking';
import { ReportBuilder } from './components/ReportBuilder';
import { WeightGoalManagement } from './components/WeightGoalManagement';
import { NotificationsReminders } from './components/NotificationsReminders';
import { IntegrationsManager } from './components/IntegrationsManager';
import { useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== currentPage) {
        setCurrentPage(hash);
      }
    };
    
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentPage]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth />;
  }

  const renderPage = () => {
    const hash = window.location.hash.replace('#', '');
    const pageFromHash = hash || currentPage;
    
    switch (pageFromHash) {
      case 'dashboard':
        return <Dashboard />;
      case 'entry':
        return <DailyEntry />;
      case 'patterns':
        return <Patterns />;
      case 'history':
        return <History />;
      case 'womens-health':
        return <WomensHealth />;
      case 'lab-results':
        return <LabResults />;
      case 'medical-management':
        return <MedicalManagement />;
      case 'seizure-tracking':
        return <SeizureTracking />;
      case 'mental-health':
        return <MentalHealthTracking />;
      case 'heartburn-tracking':
        return <HeartburnTracking />;
      case 'reports':
        return <ReportBuilder />;
      case 'weight-goals':
        return <WeightGoalManagement />;
      case 'notifications':
        return <NotificationsReminders />;
      case 'integrations':
        return <IntegrationsManager />;
      case 'settings':
        return <Settings />;
      case 'data-management':
        return <DataManagement />;
      default:
        return <Dashboard />;
    }
  };

  const getPageTitle = () => {
    const hash = window.location.hash.replace('#', '');
    const pageFromHash = hash || currentPage;
    
    switch (pageFromHash) {
      case 'dashboard':
        return 'Dashboard';
      case 'entry':
        return 'Daily Entry';
      case 'patterns':
        return 'Health Patterns';
      case 'history':
        return 'Health History';
      case 'womens-health':
        return 'Women\'s Health';
      case 'lab-results':
        return 'Lab Results';
      case 'medical-management':
        return 'Medical Management';
      case 'seizure-tracking':
        return 'Seizure Tracking';
      case 'mental-health':
        return 'Mental Health';
      case 'heartburn-tracking':
        return 'Heartburn Tracking';
      case 'reports':
        return 'Medical Reports';
      case 'weight-goals':
        return 'Weight Goals';
      case 'notifications':
        return 'Notifications';
      case 'integrations':
        return 'Integrations';
      case 'settings':
        return 'Settings';
      case 'data-management':
        return 'Data Management';
      default:
        return 'Dashboard';
    }
  };

  return (
    <Layout 
      title={getPageTitle()} 
      currentPage={window.location.hash.replace('#', '') || currentPage}
      onNavigate={setCurrentPage}
    >
      {renderPage()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/fitbit/callback" element={<FitbitCallback />} />
          <Route path="/*" element={<AppContent />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;