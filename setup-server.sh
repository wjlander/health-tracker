#!/bin/bash

# Health Tracker Server Setup Script for Ubuntu 22.04
# Run this script on your server to set up the deployment environment

set -e

echo "🚀 Setting up Health Tracker deployment environment..."

# Configuration
APP_DIR="/var/www/health-tracker"
SERVICE_NAME="health-tracker"
NGINX_AVAILABLE="/etc/nginx/sites-available/health-tracker"
NGINX_ENABLED="/etc/nginx/sites-enabled/health-tracker"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Update system packages
log "📦 Updating system packages..."
sudo apt-get update

# Install Node.js 18
log "📦 Installing Node.js 18..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    log "✅ Node.js already installed: $(node --version)"
fi

# Install Git
log "📦 Installing Git..."
if ! command -v git &> /dev/null; then
    sudo apt-get install -y git
else
    log "✅ Git already installed: $(git --version)"
fi

# Install Nginx
log "📦 Installing Nginx..."
if ! command -v nginx &> /dev/null; then
    sudo apt-get install -y nginx
    sudo systemctl enable nginx
    sudo systemctl start nginx
else
    log "✅ Nginx already installed"
fi

# Create application directory
log "📁 Creating application directory..."
sudo mkdir -p $APP_DIR
sudo mkdir -p /var/backups/health-tracker
sudo mkdir -p /var/log

# Set up user permissions
log "🔐 Setting up permissions..."
sudo groupadd -f www-data
sudo usermod -a -G www-data $USER

# Create systemd service directory
sudo mkdir -p /etc/systemd/system

# Set up log file
sudo touch /var/log/health-tracker-deploy.log
sudo chmod 666 /var/log/health-tracker-deploy.log

log "✅ Server setup completed!"
log ""
log "🔧 Next steps:"
log "1. Set environment variables:"
log "   export GITHUB_OWNER=wjlander"
log "   export GITHUB_REPO=health-tracker"
log "   export GITHUB_REPO_URL=https://github.com/wjlander/health-tracker.git"
log ""
log "2. Clone your repository:"
log "   git clone https://github.com/wjlander/health-tracker.git $APP_DIR"
log ""
log "3. Run the deployment script:"
log "   cd $APP_DIR && sudo ./deploy.sh"
log ""
log "4. Configure Nginx (optional):"
log "   sudo ./configure-nginx.sh h.ringing.org.uk"
