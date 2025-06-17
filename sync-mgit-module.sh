#!/bin/zsh

set -e

echo "🔄 Syncing react-native-mgit module..."

# Remove the existing module from node_modules
echo "🗑️  Removing old module..."
rm -rf node_modules/react-native-mgit

# Force reinstall the local module
echo "📦 Reinstalling local module..."
npm install ../react-native-mgit --force

# Verify it's there
if [ -d "node_modules/react-native-mgit" ]; then
    echo "✅ Module installed successfully"
    ls -la node_modules/react-native-mgit/ios/
else
    echo "❌ Module installation failed"
    exit 1
fi

# Copy fresh binaries (if the script exists)
if [ -f "../react-native-mgit/copy-mgit-binaries.sh" ]; then
    echo "📋 Copying fresh MGit binaries..."
    cd ../react-native-mgit
    ./copy-mgit-binaries.sh
    cd ../MedicalBinder
fi

# Clean iOS build
echo "🧹 Cleaning iOS build..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

# Reinstall
