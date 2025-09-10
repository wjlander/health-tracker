#!/bin/bash

# Supabase CLI Installation Script
# This script installs the Supabase CLI on various systems

set -e

echo "🔧 Installing Supabase CLI..."

# Detect the operating system
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📦 Detected Linux system"
    
    # Check if running as root or with sudo
    if [[ $EUID -eq 0 ]]; then
        echo "⚠️  Running as root - installing system-wide"
        INSTALL_DIR="/usr/local/bin"
    else
        echo "📁 Installing to user directory"
        INSTALL_DIR="$HOME/.local/bin"
        mkdir -p "$INSTALL_DIR"
        
        # Add to PATH if not already there
        if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
            echo "export PATH=\"$INSTALL_DIR:\$PATH\"" >> ~/.bashrc
            echo "📝 Added $INSTALL_DIR to PATH in ~/.bashrc"
            echo "⚠️  Please run: source ~/.bashrc"
        fi
    fi
    
    # Download and install Supabase CLI
    echo "⬇️  Downloading Supabase CLI..."
    
    if [ -f "$INSTALL_DIR/supabase" ]; then
        echo "🔄 Supabase CLI already installed. Updating..."
        rm -f "$INSTALL_DIR/supabase"
    fi
    
    # Create temporary directory for extraction
    TEMP_DIR=$(mktemp -d)
    cd "$TEMP_DIR"
    
    # Download and extract to temporary directory
    echo "📥 Downloading and extracting..."
    if curl -fsSL https://github.com/supabase/cli/releases/latest/download/supabase_linux_amd64.tar.gz | tar -xz; then
        echo "✅ Download and extraction successful"
    else
        echo "❌ Download failed"
        cd - > /dev/null
        rm -rf "$TEMP_DIR"
        exit 1
    fi
    
    # Move to final location
    echo "📦 Installing to $INSTALL_DIR..."
    mv supabase "$INSTALL_DIR/supabase"
    chmod +x "$INSTALL_DIR/supabase"
    
    # Clean up temporary directory
    cd - > /dev/null
    rm -rf "$TEMP_DIR"
    
    echo "✅ Supabase CLI installed to $INSTALL_DIR/supabase"
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 Detected macOS system"
    
    if command -v brew &> /dev/null; then
        echo "🍺 Installing via Homebrew..."
        brew install supabase/tap/supabase
        echo "✅ Supabase CLI installed via Homebrew"
    else
        echo "❌ Homebrew not found. Please install Homebrew first:"
        echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
else
    echo "📦 Attempting npm installation..."
    
    if command -v npm &> /dev/null; then
        echo "📦 Installing via npm..."
        npm install -g supabase
        echo "✅ Supabase CLI installed via npm"
    else
        echo "❌ Could not detect a suitable installation method."
        echo ""
        echo "Please install Supabase CLI manually:"
        echo "https://supabase.com/docs/guides/cli/getting-started"
        exit 1
    fi
fi

# Verify installation
echo ""
echo "🔍 Verifying installation..."
if command -v supabase &> /dev/null; then
    SUPABASE_VERSION=$(supabase --version)
    echo "✅ Supabase CLI installed successfully!"
    echo "📋 Version: $SUPABASE_VERSION"
    echo ""
    echo "🔑 Next steps:"
    echo "1. Login to Supabase: supabase login"
    echo "2. Link your project: supabase link --project-ref qbmpamnjianmwzxfagfn"
    echo "3. Deploy functions: ./deploy-functions.sh"
else
    echo "❌ Installation failed. Supabase CLI not found in PATH."
    echo "You may need to restart your terminal or run: source ~/.bashrc"
    exit 1
fi