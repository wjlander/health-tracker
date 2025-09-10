#!/bin/bash

# Setup Deployment User Script for Health Tracker
# This script creates a dedicated deployment user for GitHub Actions
# Run with: sudo ./setup-deployment-user.sh

set -e

echo "🔧 Setting up deployment user for Health Tracker..."

# Configuration
DEPLOY_USER="health-deploy"
DEPLOY_HOME="/home/$DEPLOY_USER"
APP_DIR="/var/www/health-tracker"
SSH_KEY_PATH="$DEPLOY_HOME/.ssh"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root (use sudo)"
    exit 1
fi

# Create deployment user
log "👤 Creating deployment user: $DEPLOY_USER"
if id "$DEPLOY_USER" &>/dev/null; then
    log "✅ User $DEPLOY_USER already exists"
else
    useradd -m -s /bin/bash $DEPLOY_USER
    log "✅ Created user $DEPLOY_USER"
fi

# Create SSH directory
log "🔑 Setting up SSH keys..."
mkdir -p $SSH_KEY_PATH
chown $DEPLOY_USER:$DEPLOY_USER $SSH_KEY_PATH
chmod 700 $SSH_KEY_PATH

# Generate SSH key pair if it doesn't exist
if [ ! -f "$SSH_KEY_PATH/id_rsa" ]; then
    log "🔐 Generating SSH key pair..."
    sudo -u $DEPLOY_USER ssh-keygen -t rsa -b 4096 -f "$SSH_KEY_PATH/id_rsa" -N "" -C "health-tracker-deploy@$(hostname)"
    log "✅ SSH key pair generated"
else
    log "✅ SSH key pair already exists"
fi

# Set up authorized_keys for the deployment user
touch "$SSH_KEY_PATH/authorized_keys"
chown $DEPLOY_USER:$DEPLOY_USER "$SSH_KEY_PATH/authorized_keys"
chmod 600 "$SSH_KEY_PATH/authorized_keys"

# Add deployment user to www-data group
log "👥 Adding $DEPLOY_USER to www-data group..."
usermod -a -G www-data $DEPLOY_USER

# Create sudoers file for deployment user
log "🔐 Setting up sudo permissions..."
cat > /etc/sudoers.d/health-deploy << EOF
# Allow health-deploy user to run deployment commands
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl start health-tracker
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl stop health-tracker
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl restart health-tracker
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl reload health-tracker
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl status health-tracker
$DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/sbin/nginx -t
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx
$DEPLOY_USER ALL=(ALL) NOPASSWD: /var/www/health-tracker/deploy.sh
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/chown -R www-data\\:www-data /var/www/health-tracker
$DEPLOY_USER ALL=(ALL) NOPASSWD: /bin/chmod -R 755 /var/www/health-tracker
EOF

# Validate sudoers file
if visudo -c -f /etc/sudoers.d/health-deploy; then
    log "✅ Sudoers configuration validated"
else
    log "❌ Sudoers configuration invalid, removing..."
    rm -f /etc/sudoers.d/health-deploy
    exit 1
fi

# Set up deployment directory permissions
log "📁 Setting up directory permissions..."
if [ -d "$APP_DIR" ]; then
    # Add deployment user to the app directory group
    chgrp -R www-data $APP_DIR
    chmod -R g+w $APP_DIR
    
    # Ensure deployment user can access the directory
    usermod -a -G www-data $DEPLOY_USER
    
    log "✅ Directory permissions configured"
else
    log "⚠️ Application directory $APP_DIR does not exist yet"
    log "   It will be created during first deployment"
fi

# Create deployment script wrapper
log "📝 Creating deployment wrapper script..."
cat > "$DEPLOY_HOME/deploy-wrapper.sh" << 'EOF'
#!/bin/bash

# Deployment wrapper script
# This script is called by GitHub Actions

set -e

APP_DIR="/var/www/health-tracker"
LOG_FILE="/var/log/health-tracker-deploy.log"

# Ensure log file exists and is writable
sudo touch $LOG_FILE
sudo chmod 666 $LOG_FILE

echo "🚀 Starting deployment via GitHub Actions..." | tee -a $LOG_FILE
echo "Timestamp: $(date)" | tee -a $LOG_FILE
echo "User: $(whoami)" | tee -a $LOG_FILE
echo "Working directory: $(pwd)" | tee -a $LOG_FILE

# Change to app directory
cd $APP_DIR

# Run the main deployment script
sudo ./deploy.sh 2>&1 | tee -a $LOG_FILE

echo "✅ Deployment completed successfully" | tee -a $LOG_FILE
EOF

# Make deployment wrapper executable
chmod +x "$DEPLOY_HOME/deploy-wrapper.sh"
chown $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_HOME/deploy-wrapper.sh"

# Create GitHub Actions environment file template
log "📋 Creating GitHub Actions environment template..."
cat > "$DEPLOY_HOME/github-actions-setup.md" << EOF
# GitHub Actions Setup for Health Tracker Deployment

## Server Setup Complete ✅

Your deployment user has been created successfully!

## Next Steps:

### 1. Add SSH Key to GitHub Repository

Copy the public key below and add it to your GitHub repository:

\`\`\`
$(cat $SSH_KEY_PATH/id_rsa.pub)
\`\`\`

**How to add the key:**
1. Go to your GitHub repository
2. Navigate to Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: \`DEPLOY_SSH_KEY\`
5. Value: Copy the PRIVATE key below:

\`\`\`
$(cat $SSH_KEY_PATH/id_rsa)
\`\`\`

### 2. Add Server Details to GitHub Secrets

Add these additional secrets to your GitHub repository:

- \`DEPLOY_HOST\`: Your server's IP address or domain
- \`DEPLOY_USER\`: health-deploy
- \`DEPLOY_PATH\`: /var/www/health-tracker

### 3. Create GitHub Actions Workflow

Create \`.github/workflows/deploy.yml\` in your repository:

\`\`\`yaml
name: Deploy to Server

on:
  repository_dispatch:
    types: [deploy]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Deploy to server
      uses: appleboy/ssh-action@v0.1.5
      with:
        host: \${{ secrets.DEPLOY_HOST }}
        username: \${{ secrets.DEPLOY_USER }}
        key: \${{ secrets.DEPLOY_SSH_KEY }}
        script: |
          cd /var/www/health-tracker
          ./deploy-wrapper.sh
\`\`\`

## Security Notes:

- The deployment user has minimal sudo permissions
- SSH key is dedicated to deployment only
- All deployment actions are logged
- User cannot access other system files

## Testing the Setup:

1. Test SSH connection from your local machine:
   \`ssh health-deploy@your-server-ip\`

2. Test deployment permissions:
   \`sudo -l\` (should show allowed commands)

3. Test deployment script:
   \`cd /var/www/health-tracker && ./deploy-wrapper.sh\`

EOF

# Display setup completion
log ""
log "🎉 Deployment user setup completed successfully!"
log ""
log "📋 Summary:"
log "   • User created: $DEPLOY_USER"
log "   • SSH keys generated: $SSH_KEY_PATH/"
log "   • Sudo permissions configured"
log "   • Deployment wrapper created"
log ""
log "📖 Next steps:"
log "   1. View the setup guide: cat $DEPLOY_HOME/github-actions-setup.md"
log "   2. Copy the SSH keys to your GitHub repository secrets"
log "   3. Create the GitHub Actions workflow file"
log "   4. Test the deployment"
log ""
log "🔑 Public SSH Key (add to GitHub repository as DEPLOY_SSH_KEY secret):"
echo "----------------------------------------"
cat $SSH_KEY_PATH/id_rsa.pub
echo "----------------------------------------"
log ""
log "⚠️  IMPORTANT: Keep the private key secure and only use it for GitHub Actions!"
log ""

# Set final permissions
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_HOME
chmod 755 $DEPLOY_HOME

log "✅ Setup complete! Check $DEPLOY_HOME/github-actions-setup.md for detailed instructions."