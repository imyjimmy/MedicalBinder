#!/bin/zsh
set -e

echo "🧹 Cleaning Metro cache..."
rm -rf $TMPDIR/metro-* && rm -rf $TMPDIR/react-* && rm -rf node_modules/.cache

echo "🧹 Cleaning modules..."
rm -rf node_modules/ && yarn install

echo "🧹 Cleaning iOS..."
cd ios && rm -rf build/ && rm -rf Pods/ && rm -f Podfile.lock && cd ..

echo "📦 Installing pods..."
cd ios && pod install && cd ..

echo "🚀 Starting Metro..."
npx react-native start --reset-cache &
METRO_PID=$!

echo "⏳ Waiting for Metro to start..."
sleep 15

echo "📱 Building iOS..."
yarn ios:sim

# Clean up
kill $METRO_PID 2>/dev/null || true
