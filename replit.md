# Enhanced Health Tracker Application

## Overview

This is a comprehensive health tracking application specifically designed for individuals with complex health needs, featuring specialized modules for women's health monitoring, lab results tracking, seizure management, mental health support, and advanced wellness features. The application provides both patient and caregiver functionality with real-time dashboard updates, pattern recognition, and automated integrations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern component patterns
- **Styling**: Tailwind CSS for responsive design with custom health-themed color schemes (cycle tracking, severity indicators)
- **Form Management**: React Hook Form with Yup validation for robust data entry and validation
- **Charts & Visualization**: Recharts library for health trend analysis and correlation displays
- **Routing**: React Router DOM for client-side navigation between health modules
- **State Management**: React Context API for authentication and user state management

### Backend Architecture
- **Database**: Supabase (PostgreSQL) as primary backend-as-a-service solution
- **Authentication**: Multi-user system supporting patient and caregiver roles with local authentication
- **Real-time Updates**: Supabase real-time subscriptions for live dashboard data
- **Data Storage**: Comprehensive schema covering health entries, medical data, women's health metrics, lab results, and external API data

### Core Health Modules
- **Daily Health Tracking**: Mood, energy, anxiety, sleep quality, weight monitoring
- **Women's Health**: Menstrual cycle tracking with Bristol Stool Chart, pre-menopausal symptom monitoring
- **Specialized Tracking**: Seizure management, mental health crisis tracking, heartburn analysis
- **Medical Management**: Diagnosis tracking, medication management with effectiveness ratings
- **Lab Results**: Blood work, hormone levels, and medical test tracking with trend analysis

### Data Management & Analytics
- **Pattern Recognition**: AI-powered correlation detection between health metrics
- **Backup System**: Automatic daily backups with manual restore capabilities
- **Report Generation**: Comprehensive medical reports for healthcare provider visits
- **Data Export**: CSV export functionality for medical professionals
- **Weight Goal Management**: Personalized weight tracking with calorie targets and progress monitoring

### User Experience Features
- **Dashboard Widgets**: Quick-entry widgets for water intake, seizure logging, outdoor time tracking
- **Auto-refresh**: Real-time dashboard updates every 30 seconds without page refresh
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Unit Preferences**: Configurable weight and temperature units (lbs/kg/stones, F/C)
- **Caregiver Support**: Dual-user system with role-based access and section visibility controls

## External Dependencies

### Third-party Integrations
- **Fitbit API**: Automatic background synchronization every 30 minutes for activity, weight, food, and sleep data
- **GitHub Integration**: One-click deployment system for application updates from repository to production server
- **Supabase Services**: Authentication, real-time database, edge functions for external API calls

### Development Dependencies
- **Vite**: Modern build tool for fast development and optimized production builds
- **ESLint & TypeScript**: Code quality and type checking
- **Autoprefixer & PostCSS**: CSS processing and browser compatibility
- **Date-fns**: Date manipulation and formatting utilities
- **Axios**: HTTP client for external API communications
- **Lucide React**: Consistent icon system throughout the application

### API Services
- **Fitbit Web API**: Activity tracking, weight monitoring, nutrition data, sleep analysis
- **GitHub API**: Repository management, deployment triggers, commit tracking
- **Supabase Edge Functions**: Server-side processing for data synchronization and external API calls

### Deployment Infrastructure
- **Production Server**: Custom deployment to j.ringing.org.uk with automated update mechanisms
- **Environment Configuration**: Secure handling of API keys and database credentials
- **Health Monitoring**: Application health checks and deployment status tracking