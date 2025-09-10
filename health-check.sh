#!/bin/bash

# Health Check Script for Health Tracker
# This script checks if the application is running properly

set -e

APP_URL="http://localhost:3000"
SERVICE_NAME="health-tracker"

echo "🏥 Health Tracker - System Health Check"
echo "======================================"

# Check if service is running
echo -n "Service Status: "
if sudo systemctl is-active --quiet $SERVICE_NAME; then
    echo "✅ Running"
else
    echo "❌ Not Running"
    echo "Service logs:"
    sudo journalctl -u $SERVICE_NAME --no-pager -n 10
    exit 1
fi

# Check if application responds
echo -n "Application Response: "
if curl -f -s $APP_URL > /dev/null; then
    echo "✅ Responding"
else
    echo "❌ Not Responding"
    echo "Checking if port 3000 is in use:"
    sudo netstat -tlnp | grep :3000 || echo "Port 3000 not in use"
    exit 1
fi

# Check disk space
echo -n "Disk Space: "
DISK_USAGE=$(df /var/www/health-tracker | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -lt 90 ]; then
    echo "✅ OK ($DISK_USAGE% used)"
else
    echo "⚠️ Warning ($DISK_USAGE% used)"
fi

# Check memory usage
echo -n "Memory Usage: "
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -lt 90 ]; then
    echo "✅ OK ($MEMORY_USAGE% used)"
else
    echo "⚠️ Warning ($MEMORY_USAGE% used)"
fi

# Check recent logs for errors
echo -n "Recent Errors: "
ERROR_COUNT=$(sudo journalctl -u $SERVICE_NAME --since "1 hour ago" | grep -i error | wc -l)
if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ None"
else
    echo "⚠️ $ERROR_COUNT errors in the last hour"
    echo "Recent error logs:"
    sudo journalctl -u $SERVICE_NAME --since "1 hour ago" | grep -i error | tail -5
fi

echo ""
echo "✅ Health check completed!"