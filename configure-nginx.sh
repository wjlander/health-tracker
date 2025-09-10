#!/bin/bash

# Nginx Configuration Script for Health Tracker with SSL
# Usage: ./configure-nginx.sh j.ringing.org.uk

set -e

DOMAIN=${1:-"j.ringing.org.uk"}
NGINX_CONFIG="/etc/nginx/sites-available/health-tracker"
NGINX_ENABLED="/etc/nginx/sites-enabled/health-tracker"

echo "🌐 Configuring Nginx for domain: $DOMAIN"

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing Certbot for SSL certificates..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Remove default nginx site if it exists
if [ -f "/etc/nginx/sites-enabled/default" ]; then
    echo "🗑️ Removing default nginx site..."
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# Create initial HTTP-only Nginx configuration for Let's Encrypt verification
sudo tee $NGINX_CONFIG > /dev/null << 'EOF'
server {
    listen 80;
    server_name j.ringing.org.uk;
    
    # Allow Let's Encrypt verification
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    # Proxy all other requests to the Node.js app
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/health;
        access_log off;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the site
if [ ! -L $NGINX_ENABLED ]; then
    sudo ln -s $NGINX_CONFIG $NGINX_ENABLED
    echo "✅ Nginx site enabled"
else
    echo "✅ Nginx site already enabled"
fi

# Test Nginx configuration
echo "🔍 Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

# Ensure Nginx is running
sudo systemctl enable nginx
sudo systemctl start nginx

echo "✅ Basic Nginx configuration completed!"
echo ""
echo "🔒 Now obtaining SSL certificate from Let's Encrypt..."
echo "📋 Make sure your domain $DOMAIN points to this server's IP address"
echo ""

# Obtain SSL certificate
echo "🔐 Requesting SSL certificate for $DOMAIN..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

if [ $? -eq 0 ]; then
    echo "✅ SSL certificate obtained and configured successfully!"
    echo ""
    echo "🌐 Your app is now accessible at: https://$DOMAIN"
    echo "🔒 HTTP requests will automatically redirect to HTTPS"
    echo ""
    echo "📋 SSL Certificate Details:"
    sudo certbot certificates
    echo ""
    echo "🔄 Certificate will auto-renew. Test renewal with:"
    echo "   sudo certbot renew --dry-run"
else
    echo "❌ SSL certificate generation failed!"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "1. Ensure $DOMAIN points to this server's IP address"
    echo "2. Check that ports 80 and 443 are open in your firewall"
    echo "3. Verify Nginx is running: sudo systemctl status nginx"
    echo "4. Check Nginx logs: sudo tail -f /var/log/nginx/error.log"
    echo ""
    echo "🌐 Your app is still accessible via HTTP at: http://$DOMAIN"
fi