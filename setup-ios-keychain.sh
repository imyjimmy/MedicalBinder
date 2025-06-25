#!/bin/zsh

# Setup script for iOS Keychain entitlements for NOSTR authentication
# Run this after adding the new dependencies

echo "Setting up iOS Keychain for NOSTR authentication..."

# Navigate to iOS directory
cd ios || { echo "Error: ios directory not found"; exit 1; }

# Create or update entitlements file
ENTITLEMENTS_FILE="MedicalBinder/MedicalBinder.entitlements"

if [ ! -f "$ENTITLEMENTS_FILE" ]; then
    echo "Creating entitlements file..."
    cat > "$ENTITLEMENTS_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>keychain-access-groups</key>
    <array>
        <string>\$(AppIdentifierPrefix)com.medicalbinder</string>
    </array>
</dict>
</plist>
EOF
else
    echo "Entitlements file already exists at $ENTITLEMENTS_FILE"
fi

# Update Info.plist for biometric authentication
INFO_PLIST="MedicalBinder/Info.plist"

if [ -f "$INFO_PLIST" ]; then
    echo "Updating Info.plist for biometric authentication..."
    
    # Check if NSFaceIDUsageDescription already exists
    if ! grep -q "NSFaceIDUsageDescription" "$INFO_PLIST"; then
        echo "Adding NSFaceIDUsageDescription to Info.plist..."
        # Use plutil to add the key properly
        /usr/libexec/PlistBuddy -c "Add :NSFaceIDUsageDescription string 'MedicalBinder uses Face ID to securely access your NOSTR private keys for medical record authentication.'" "$INFO_PLIST" 2>/dev/null || echo "NSFaceIDUsageDescription may already exist"
    fi
else
    echo "Warning: Info.plist not found at $INFO_PLIST"
fi

# Update Xcode project to include entitlements
echo "Updating Xcode project settings..."

PROJECT_FILE="MedicalBinder.xcodeproj/project.pbxproj"

if [ -f "$PROJECT_FILE" ]; then
    # Add entitlements file reference if not exists
    if ! grep -q "MedicalBinder.entitlements" "$PROJECT_FILE"; then
        echo "Adding entitlements file to Xcode project..."
        # This is a simplified approach - in practice, you might want to use xcodeproj gem or similar
        echo "Note: You may need to manually add the entitlements file to your Xcode project"
        echo "1. Open MedicalBinder.xcworkspace in Xcode"
        echo "2. Select your target -> Build Settings -> Code Signing Entitlements"
        echo "3. Set the path to: MedicalBinder/MedicalBinder.entitlements"
    fi
else
    echo "Warning: Xcode project file not found"
fi

echo "iOS setup complete!"
echo ""
echo "Next steps:"
echo "1. Install new dependencies: yarn install"
echo "2. Install iOS pods: cd ios && pod install && cd .."
echo "3. Open MedicalBinder.xcworkspace in Xcode"
echo "4. Verify entitlements are properly configured"
echo "5. Run: npx expo run:ios"