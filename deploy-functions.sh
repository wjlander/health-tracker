#!/bin/bash

# Deploy Supabase Edge Functions for Health Tracker
# This script deploys the Fitbit integration functions

set -e

echo "🚀 Deploying Health Tracker Edge Functions..."

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    
    # Install Supabase CLI based on the system
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "📦 Installing Supabase CLI for Linux..."
        # Download and install for Linux
        curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz
        sudo mv supabase /usr/local/bin/supabase
        echo "✅ Supabase CLI installed successfully"
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        echo "📦 Installing Supabase CLI for macOS..."
        if command -v brew &> /dev/null; then
            brew install supabase/tap/supabase
        else
            echo "Please install Homebrew first: https://brew.sh"
            exit 1
        fi
    elif command -v npm &> /dev/null; then
        echo "📦 Installing Supabase CLI via npm..."
        npm install -g supabase
    else
        echo "❌ Could not install Supabase CLI automatically."
        echo "Please install it manually:"
        echo ""
        echo "For Linux:"
        echo "curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz"
        echo "sudo mv supabase /usr/local/bin/supabase"
        echo ""
        echo "For macOS:"
        echo "brew install supabase/tap/supabase"
        echo ""
        echo "For Windows/Other:"
        echo "npm install -g supabase"
        echo ""
        echo "Or visit: https://supabase.com/docs/guides/cli/getting-started"
        exit 1
    fi
fi

# Check if we're logged in to Supabase
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "Please log in to Supabase first:"
    echo "supabase login"
    exit 1
fi

# Link to the project if not already linked
echo "🔗 Linking to Supabase project..."
if [ ! -f ".supabase/config.toml" ] || ! grep -q "qbmpamnjianmwzxfagfn" .supabase/config.toml 2>/dev/null; then
    echo "Please link to your Supabase project first:"
    echo "supabase link --project-ref qbmpamnjianmwzxfagfn"
    exit 1
fi

# Deploy the Edge Functions
echo "📦 Deploying fitbit-oauth function..."
supabase functions deploy fitbit-oauth --no-verify-jwt

echo "📦 Deploying fitbit-sync function..."
supabase functions deploy fitbit-sync --no-verify-jwt

# Set environment variables for the functions
echo "🔧 Setting environment variables..."
supabase secrets set FITBIT_CLIENT_ID=23QLWB
supabase secrets set FITBIT_CLIENT_SECRET=892e238222e0df0cbb7dc3021f313a4e

echo "✅ Edge Functions deployed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Your Fitbit integration is now fully functional"
echo "2. Users can connect their real Fitbit accounts"
echo "3. Data sync will use real Fitbit API data"
echo ""
echo "🔗 Function URLs:"
echo "• OAuth: https://qbmpamnjianmwzxfagfn.supabase.co/functions/v1/fitbit-oauth"
echo "• Sync: https://qbmpamnjianmwzxfagfn.supabase.co/functions/v1/fitbit-sync"