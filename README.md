# Enhanced Health Tracker Application

A comprehensive health tracking application with women's health monitoring, lab results tracking, seizure management, mental health support, and advanced wellness features designed for individuals with complex medical conditions.

## 🆕 Latest Updates (January 2025)

### New Features Added
- **Bowel Movement Tracking**: Bristol Stool Chart classification with symptom tracking
- **Notifications & Reminders**: Custom reminders for medications, appointments, and health tasks
- **Automatic Fitbit Syncing**: Background sync every 30 minutes with manual override
- **Dashboard Auto-Refresh**: Real-time updates without page refresh
- **Water Intake Widget**: Quick water logging with daily goal tracking
- **Seizure Tracking Widget**: Fast seizure logging with severity tracking
- **Outdoor Time Widget**: Track time spent outside for mood benefits
- **Enhanced Mental Health**: Updated triggers and coping strategies for better tracking
- **Heartburn Tracking**: Food correlation analysis and trigger identification
- **Weight Goal Management**: Comprehensive weight loss/gain tracking with progress monitoring

## Features

### Core Health Tracking
- **Daily Health Metrics**: Mood, energy, anxiety levels, sleep, weight tracking
- **Vital Signs**: Blood pressure, blood sugar, heart rate, and temperature monitoring
- **Bowel Movement Tracking**: Bristol Stool Chart with symptom correlation
- **Water Intake**: Daily hydration monitoring with goal tracking
- **Outdoor Time**: Track time spent outside for mental health benefits

### Specialized Health Modules
- **Women's Health**: Menstrual cycle tracking and pre-menopausal symptom monitoring
- **Lab Results**: Blood work, hormone levels, and medical test tracking with trend analysis
- **Seizure Management**: Comprehensive seizure tracking with trigger identification
- **Mental Health Support**: Crisis tracking with updated triggers and coping strategies
- **Heartburn Analysis**: Food correlation tracking and trigger identification
- **Medical Management**: Diagnosis and medication tracking with effectiveness ratings

### Advanced Features
- **Pattern Recognition**: AI-powered analytics to identify correlations between health metrics
- **Weight Goal Management**: Personalized weight loss/gain plans with calorie targets
- **Report Builder**: Generate comprehensive medical reports for doctor visits
- **Backup & Restore**: Automatic daily backups with manual restore capability
- **Caregiver Support**: Dual-user system with patient and caregiver roles

### Integrations & Automation
- **Automatic Fitbit Sync**: Background synchronization every 30 minutes
- **GitHub Deployment**: One-click updates from repository to production server
- **Supabase Backend**: Secure, scalable database with real-time capabilities
- **Smart Notifications**: Custom reminders and health alerts

### User Experience
- **Real-time Dashboard**: Auto-refreshing dashboard with live data updates
- **Quick Entry Widgets**: Fast logging for water, seizures, outdoor time, and bowel movements
- **Calming Design**: Anxiety-reducing color palette and intuitive navigation
- **Mobile Responsive**: Optimized for use on any device
- **Data Export**: CSV and JSON export for medical professionals

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Edge Functions)
- **Charts**: Recharts for data visualization
- **Forms**: React Hook Form with Yup validation
- **Icons**: Lucide React
- **Build Tool**: Vite

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Fitbit Developer account (optional)
- Ubuntu 22.04 server (for production deployment)
- GitHub repository

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/wjlander/health-tracker.git
   cd health-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Fill in your environment variables:
   ```env
   # Supabase
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   
   # Fitbit (optional)
   VITE_FITBIT_CLIENT_ID=your_fitbit_client_id
   VITE_FITBIT_CLIENT_SECRET=your_fitbit_client_secret
   VITE_FITBIT_REDIRECT_URI=https://j.ringing.org.uk/fitbit/callback
   
   # GitHub Deployment
   VITE_GITHUB_TOKEN=your_github_token
   VITE_GITHUB_OWNER=your_github_username
   VITE_GITHUB_REPO=health-tracker
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

## Production Deployment & Updates

### Initial Server Setup (One-time)

1. **Download and run the server setup script on your Ubuntu server:**
   ```bash
   wget https://raw.githubusercontent.com/wjlander/health-tracker/main/setup-server.sh
   chmod +x setup-server.sh
   ./setup-server.sh
   ```

2. **Clone and deploy your application:**
   ```bash
   git clone https://github.com/wjlander/health-tracker.git /var/www/health-tracker
   cd /var/www/health-tracker
   chmod +x deploy.sh configure-nginx.sh health-check.sh
   sudo ./deploy.sh
   ```

3. **Configure Nginx with SSL (optional):**
   ```bash
   sudo ./configure-nginx.sh j.ringing.org.uk
   ```

### Updating Your Working Server

#### Method 1: Using the GitHub Deployment Button (Recommended)
1. Open your health tracker application
2. Navigate to the Dashboard
3. Scroll down to the "GitHub Deployment" section
4. Click "Deploy Update" button
5. Wait for deployment to complete (usually 2-3 minutes)

#### Method 2: Manual Git Pull Update
1. **SSH into your server:**
   ```bash
   ssh your-username@j.ringing.org.uk
   ```

2. **Navigate to the application directory:**
   ```bash
   cd /var/www/health-tracker
   ```

3. **Stop the application service:**
   ```bash
   sudo systemctl stop health-tracker
   ```

4. **Pull the latest changes:**
   ```bash
   sudo git stash  # Save any local changes
   sudo git pull origin main
   sudo git stash pop  # Restore local changes if needed
   ```

5. **Install any new dependencies:**
   ```bash
   sudo npm install --legacy-peer-deps
   ```

6. **Build the updated application:**
   ```bash
   sudo npm run build
   ```

7. **Update permissions:**
   ```bash
   sudo chown -R www-data:www-data /var/www/health-tracker
   sudo chmod -R 755 /var/www/health-tracker
   ```

8. **Start the application service:**
   ```bash
   sudo systemctl start health-tracker
   ```

9. **Verify the update:**
   ```bash
   sudo systemctl status health-tracker
   ./health-check.sh
   ```

#### Method 3: Automated Update Script
```bash
# Run the automated deployment script
cd /var/www/health-tracker
sudo ./deploy.sh
```

### Troubleshooting Updates

If you encounter issues during updates:

1. **Check service status:**
   ```bash
   sudo systemctl status health-tracker
   sudo journalctl -u health-tracker -f
   ```

2. **Check for merge conflicts:**
   ```bash
   git status
   git log --oneline -5
   ```

3. **Reset to clean state (if needed):**
   ```bash
   sudo git reset --hard origin/main
   sudo git clean -fd
   sudo ./deploy.sh
   ```

4. **Verify application health:**
   ```bash
   ./health-check.sh
   curl -f http://localhost:3000
   ```

## Database Schema

The application uses Supabase with the following main tables:

### Core Tables
- `users` - User authentication and profiles with tracking preferences
- `health_entries` - Daily health tracking data (mood, energy, anxiety, sleep, weight)
- `food_entries` - Meal and snack logging with nutrition integration
- `activity_entries` - Exercise and activity tracking

### Specialized Health Tables
- `menstrual_entries` - Menstrual cycle tracking with symptoms
- `premenopausal_entries` - Pre-menopausal symptom monitoring
- `lab_results` - Medical test results with trend analysis
- `seizure_entries` - Comprehensive seizure tracking
- `mental_health_entries` - Mental health check-ins with crisis support
- `heartburn_entries` - Heartburn tracking with food correlations
- `bowel_movements` - Bowel movement tracking with Bristol Stool Chart
- `blood_pressure_readings` - Blood pressure and heart rate monitoring

### Integration & Automation Tables
- `user_integrations` - Third-party service connections (Fitbit)
- `fitbit_activities` - Synced Fitbit activity data
- `fitbit_weights` - Synced Fitbit weight data
- `fitbit_foods` - Synced Fitbit food data
- `fitbit_sleep` - Synced Fitbit sleep data
- `notifications` - System notifications and alerts
- `reminders` - Custom user reminders
- `weight_goals` - Weight management goals and progress
- `report_templates` - Medical report templates

### Nutrition & Wellness Tables
- `food_nutrition` - Detailed nutritional information
- `daily_nutrition_summary` - Daily nutrition totals and goals
- `water_intake` - Hydration tracking
- `outdoor_time_entries` - Outdoor activity for mental health

## Fitbit Integration Setup

### 1. Create Fitbit App
- Go to [Fitbit Developer Console](https://dev.fitbit.com/)
- Create a new application
- Set callback URL to: `https://j.ringing.org.uk/fitbit/callback`
- Note your Client ID and Client Secret

### 2. Configure Environment
```env
VITE_FITBIT_CLIENT_ID=your_client_id
VITE_FITBIT_CLIENT_SECRET=your_client_secret
VITE_FITBIT_REDIRECT_URI=https://j.ringing.org.uk/fitbit/callback
```

### 3. Automatic Sync Features
- **Background Sync**: Automatically syncs every 30 minutes when connected
- **Manual Sync**: On-demand sync button for immediate updates
- **Auto-reconnect**: Handles token refresh automatically
- **Data Integration**: Synced data appears in daily entries and dashboard

## GitHub Deployment Setup

### 1. Create GitHub Token
- Go to GitHub Settings > Developer settings > Personal access tokens
- Create token with `repo` and `workflow` permissions  
- Copy the token (starts with `ghp_`)

### 2. Configure Repository
- Push your code to a GitHub repository
- Note your GitHub username and repository name

### 3. Environment Variables
```env
VITE_GITHUB_TOKEN=ghp_your_personal_access_token
VITE_GITHUB_OWNER=your_github_username
VITE_GITHUB_REPO=health-tracker
```

### 4. Server Webhook (Optional)
For instant deployments, set up a webhook endpoint:
```env
VITE_GITHUB_WEBHOOK_URL=https://j.ringing.org.uk/webhook/deploy
```

## New Features Guide

### Bowel Movement Tracking
- **Bristol Stool Chart**: Medical-grade classification system
- **Symptom Correlation**: Track related digestive symptoms
- **Pattern Analysis**: Identify trends and potential issues
- **Quick Logging**: Dashboard widget for fast entry

### Notifications & Reminders
- **Custom Reminders**: Set medication, appointment, and health reminders
- **Flexible Scheduling**: Daily, weekly, monthly, or one-time reminders
- **Smart Notifications**: Health alerts and goal achievements
- **Cross-platform**: Works across all devices

### Automatic Fitbit Syncing
- **Background Sync**: Every 30 minutes automatically
- **Smart Reconnection**: Handles token expiration gracefully
- **Data Integration**: Synced data populates daily entries
- **Manual Override**: Force sync when needed

### Enhanced Mental Health Tracking
- **Updated Triggers**: PTSD Flashbacks, Anxiety, Panic Attacks, Seizures
- **Refined Coping Strategies**: Focus on most effective methods
- **Crisis Support**: Direct links to emergency resources
- **Pattern Recognition**: Identify effective coping mechanisms

### Weight Goal Management
- **Personalized Targets**: Custom calorie goals based on weight objectives
- **Progress Tracking**: Visual progress indicators and trend analysis
- **Smart Recommendations**: Adaptive suggestions based on progress
- **Integration**: Links with nutrition and activity tracking

## Security Considerations

- All sensitive data is encrypted at rest in Supabase
- Row Level Security (RLS) policies protect user data
- Fitbit tokens are stored securely and refreshed automatically
- GitHub tokens should have minimal required permissions
- HTTPS enforced in production
- Regular automated backups
- User data isolation between accounts

## Monitoring & Maintenance

### Application Health
- **Health Check Script**: `./health-check.sh`
- **Service Status**: `sudo systemctl status health-tracker`
- **Application Logs**: `sudo journalctl -u health-tracker -f`
- **Deployment Logs**: `sudo tail -f /var/log/health-tracker-deploy.log`

### Database Monitoring
- **Supabase Dashboard**: Monitor database performance and usage
- **Automatic Backups**: Daily backups stored in application
- **Migration Status**: Check Supabase migrations panel

### Performance Optimization
- **Auto-refresh**: Dashboard updates every 30 seconds
- **Efficient Queries**: Optimized database queries with proper indexing
- **Caching**: Browser caching for static assets
- **Compression**: Gzip compression enabled

## API Endpoints

### Supabase Edge Functions
- **Fitbit OAuth**: `https://your-project.supabase.co/functions/v1/fitbit-oauth`
- **Fitbit Sync**: `https://your-project.supabase.co/functions/v1/fitbit-sync`

### Health Check Endpoints
- **Application Health**: `https://j.ringing.org.uk/health`
- **Database Status**: Available through Supabase dashboard

## Backup & Recovery

### Automatic Backups
- **Daily Backups**: Created automatically when app is used
- **Retention**: Last 10 backups kept per user
- **Storage**: Local browser storage with download option

### Manual Backups
- **On-Demand**: Create backups before major changes
- **Export Options**: JSON format with all user data
- **Restore**: Full data restoration from any backup point

### Data Export
- **CSV Export**: Health data for medical professionals
- **JSON Export**: Complete data backup
- **Medical Reports**: Formatted reports for doctor visits

## Development

### Local Development Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build
```

### Database Development
```bash
# Start local Supabase (if using local development)
supabase start

# Apply migrations
supabase db push

# Generate types
supabase gen types typescript --local > src/types/supabase.ts
```

### Testing
```bash
# Run health check
./health-check.sh

# Test Fitbit integration
# (Connect account and verify sync)

# Test GitHub deployment
# (Use deployment button in dashboard)
```

## Troubleshooting

### Common Issues

#### Fitbit Connection Problems
1. **Token Expired**: Use disconnect/reconnect in dashboard
2. **Sync Failures**: Check Fitbit API status and retry
3. **Missing Data**: Verify Fitbit app permissions

#### GitHub Deployment Issues
1. **Token Invalid**: Check GitHub token permissions
2. **Repository Access**: Verify repository exists and is accessible
3. **Server Connection**: Check server SSH access and deployment scripts

#### Database Issues
1. **Migration Errors**: Check Supabase dashboard for migration status
2. **Connection Problems**: Verify environment variables
3. **Data Isolation**: Ensure RLS policies are working correctly

#### Performance Issues
1. **Slow Loading**: Check network connection and database performance
2. **Auto-refresh Problems**: Verify dashboard auto-refresh is enabled
3. **Widget Updates**: Check widget data loading and refresh intervals

### Getting Help

1. **Check Logs**: Application and deployment logs provide detailed error information
2. **Health Check**: Run `./health-check.sh` to verify system status
3. **Database Status**: Check Supabase dashboard for database health
4. **GitHub Issues**: Report bugs and feature requests on GitHub

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit changes: `git commit -m "Add new feature"`
5. Push to branch: `git push origin feature/new-feature`
6. Submit a pull request

### Development Guidelines
- Follow TypeScript best practices
- Maintain responsive design principles
- Add proper error handling
- Include user feedback for all actions
- Test with multiple user accounts
- Verify data isolation between users

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Medical Disclaimer

This application is for tracking and informational purposes only. It is not intended to diagnose, treat, cure, or prevent any disease. Always consult with healthcare professionals for medical advice.

## Support

- **Application Issues**: Check logs and run health check script
- **Feature Requests**: Submit GitHub issues
- **Security Concerns**: Contact repository maintainer
- **Medical Questions**: Consult with healthcare professionals

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Deployment**: j.ringing.org.uk