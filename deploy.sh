#!/bin/bash

# Health Tracker Deployment Script for Ubuntu 22.04
# This script handles automatic deployment from GitHub with enhanced error handling and API endpoint

set -e

echo "🚀 Starting Health Tracker deployment..."

# Configuration
APP_DIR="/var/www/health-tracker"
REPO_URL="${GITHUB_REPO_URL:-}"
SERVICE_NAME="health-tracker"
BACKUP_DIR="/var/backups/health-tracker"
LOG_FILE="/var/log/health-tracker-deploy.log"
NODE_VERSION="18"

# Create log file if it doesn't exist
sudo touch $LOG_FILE
sudo chmod 666 $LOG_FILE

# Create backup directory if it doesn't exist
sudo mkdir -p $BACKUP_DIR

# Function to log messages
log() {
    local message="[$(date '+%Y-%m-%d %H:%M:%S')] $1"
    echo "$message"
    echo "$message" >> $LOG_FILE
}

# Function to check prerequisites
check_prerequisites() {
    log "🔍 Checking prerequisites..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log "❌ Node.js not found. Installing Node.js $NODE_VERSION..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Check Node.js version
    NODE_CURRENT=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_CURRENT" -lt "$NODE_VERSION" ]; then
        log "⚠️ Node.js version $NODE_CURRENT is too old. Updating to $NODE_VERSION..."
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        log "❌ Git not found. Installing git..."
        sudo apt-get update
        sudo apt-get install -y git
    fi
    
    # Check if we're in a git repository (for manual deployment)
    if [ ! -d ".git" ]; then
        log "⚠️ Not in a git repository - assuming manual deployment"
        MANUAL_DEPLOY=true
    else
        MANUAL_DEPLOY=false
    fi
    
    log "✅ Prerequisites check completed"
}

# Function to backup current deployment
backup_current() {
    if [ -d "$APP_DIR" ]; then
        log "📦 Creating backup of current deployment..."
        sudo cp -r $APP_DIR $BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S)
        
        # Keep only last 5 backups
        sudo find $BACKUP_DIR -maxdepth 1 -type d -name "backup-*" | sort -r | tail -n +6 | sudo xargs rm -rf
    fi
}

# Function to restore from backup
restore_backup() {
    log "🔄 Restoring from backup..."
    LATEST_BACKUP=$(sudo find $BACKUP_DIR -maxdepth 1 -type d -name "backup-*" | sort -r | head -n 1)
    if [ -n "$LATEST_BACKUP" ]; then
        sudo rm -rf $APP_DIR
        sudo cp -r $LATEST_BACKUP $APP_DIR
        sudo systemctl restart $SERVICE_NAME
        log "✅ Restored from backup: $LATEST_BACKUP"
    else
        log "❌ No backup found to restore from"
        exit 1
    fi
}

# Function to check if deployment was successful
check_deployment() {
    log "🔍 Checking deployment health..."
    
    # Wait for service to start
    sleep 10
    
    # Check if service is running
    if sudo systemctl is-active --quiet $SERVICE_NAME; then
        log "✅ Service is running"
        
        # Check if application responds
        if curl -f -s http://localhost:3000 > /dev/null; then
            log "✅ Application is responding"
            return 0
        else
            log "❌ Application is not responding"
            return 1
        fi
    else
        log "❌ Service is not running"
        return 1
    fi
}

# Main deployment process
main() {
    log "🏁 Starting deployment process..."
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    backup_current
    
    # Stop the service
    log "⏹️ Stopping application service..."
    sudo systemctl stop $SERVICE_NAME || true
    
    # Update repository if we're in git, otherwise assume files are already in place
    if [ "$MANUAL_DEPLOY" = false ]; then
        log "📥 Updating from git repository..."
        sudo git stash push -m "Auto-stash before deployment $(date)" || true
        sudo git fetch origin || true
        sudo git reset --hard origin/main || true
        sudo git clean -fd || true
    else
        log "📁 Using existing files (manual deployment)"
    fi
    
    # Change to app directory
    cd $APP_DIR
    
    # Verify we're on the right branch (if in git)
    if [ "$MANUAL_DEPLOY" = false ]; then
        CURRENT_BRANCH=$(sudo git branch --show-current 2>/dev/null || echo "unknown")
        log "📋 Current branch: $CURRENT_BRANCH"
    fi
    
    # Install dependencies
    log "📦 Installing dependencies..."
    sudo npm install --legacy-peer-deps --no-audit --no-fund
    
    # Build application
    log "🔨 Building application..."
    sudo npm run build
    
    # Verify build was successful
    if [ ! -d "dist" ]; then
        log "❌ Build failed - dist directory not found"
        exit 1
    fi
    
    # Update permissions
    log "🔐 Updating permissions..."
    sudo chown -R www-data:www-data $APP_DIR
    sudo chmod -R 755 $APP_DIR
    
    # Ensure .env file exists and has correct permissions
    if [ ! -f "$APP_DIR/.env" ]; then
        log "⚠️ .env file not found. Creating template..."
        sudo cp "$APP_DIR/.env.example" "$APP_DIR/.env" || true
        sudo chown www-data:www-data "$APP_DIR/.env"
        sudo chmod 600 "$APP_DIR/.env"
        log "📝 Please update $APP_DIR/.env with your configuration"
    fi
    
    # Update systemd service if needed
    if [ -f "health-tracker.service" ]; then
        log "🔧 Updating systemd service..."
        sudo cp health-tracker.service /etc/systemd/system/
        sudo systemctl daemon-reload
    fi
    
    # Start the service
    log "▶️ Starting application service..."
    sudo systemctl start $SERVICE_NAME
    sudo systemctl enable $SERVICE_NAME
    
    # Check deployment
    if check_deployment; then
        log "🎉 Deployment successful!"
        
        # Log deployment info
        if [ "$MANUAL_DEPLOY" = false ]; then
            COMMIT_HASH=$(sudo git rev-parse --short HEAD 2>/dev/null || echo "manual")
            log "📝 Deployed commit: $COMMIT_HASH"
        else
            log "📝 Manual deployment completed"
        fi
        log "📝 Deployment completed at: $(date)"
        
        exit 0
    else
        log "❌ Deployment failed, restoring backup..."
        restore_backup
        
        exit 1
    fi
}

# Error handling
trap 'log "❌ Deployment failed with error on line $LINENO"; restore_backup' ERR

# Run main function
main "$@"