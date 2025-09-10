# Simple Health Tracker

A clean, focused health tracking application for daily wellness monitoring with Fitbit integration.

## Features

### Core Health Tracking
- **Daily Metrics**: Mood, energy, anxiety levels, sleep hours/quality, weight
- **Food & Activity Logging**: Simple meal and exercise tracking
- **Pattern Analysis**: Correlation detection between health metrics
- **Data Export**: CSV export for medical professionals
- **Visual Charts**: Trend analysis with interactive graphs

### Integrations
- **Fitbit Sync**: Automatic data sync for activities, weight, food, and sleep
- **GitHub Deployment**: One-click updates from repository
- **Supabase Backend**: Secure, scalable database

### User Features
- **Multi-User Support**: Switch between patient and caregiver accounts
- **Data Management**: Export and delete functionality
- **Responsive Design**: Works on desktop and mobile
- **Clean Interface**: Simple, calming design for daily use

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Charts**: Recharts
- **Forms**: React Hook Form with Yup validation
- **Icons**: Lucide React
- **Build Tool**: Vite

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

## Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Fitbit (optional)
VITE_FITBIT_CLIENT_ID=your_fitbit_client_id
VITE_FITBIT_CLIENT_SECRET=your_fitbit_client_secret

# GitHub Deployment
VITE_GITHUB_TOKEN=your_github_token
VITE_GITHUB_OWNER=your_github_username
VITE_GITHUB_REPO=your_repository_name
```

## Database Schema

Core tables:
- `users` - User profiles and authentication
- `health_entries` - Daily health tracking data
- `food_entries` - Meal and snack logging
- `activity_entries` - Exercise and activity tracking
- `user_integrations` - Third-party service connections
- `fitbit_*` tables - Synced Fitbit data

## Deployment

Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory, ready for deployment to any static hosting service.

## License

MIT License - see LICENSE file for details.

## Medical Disclaimer

This application is for tracking and informational purposes only. It is not intended to diagnose, treat, cure, or prevent any disease. Always consult with healthcare professionals for medical advice.