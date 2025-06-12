# MedicalBinder

A React Native iOS app for secure, self-custodial medical data management using MGit (medical git) with Nostr authentication. This app enables patients to maintain complete control over their medical records through distributed version control.

## Overview

MedicalBinder integrates with the `react-native-mgit` module to provide:
- Self-custodial medical record storage
- Version control for medical data using MGit
- Nostr-based authentication and commit signing
- Offline-first medical record access
- Secure synchronization across devices

## Prerequisites

Make sure you have completed the [React Native development environment setup](https://reactnative.dev/docs/set-up-your-environment) for iOS development.

Required tools:
- Node.js (v18+)
- Xcode (latest stable)
- CocoaPods (`sudo gem install cocoapods`)
- Expo CLI (`npm install -g @expo/cli`)
- Yarn package manager

## Project Setup Notes

This project was created with React Native 0.79.3 and uses modern Expo CLI build tools instead of the deprecated direct CocoaPods workflow.

### Key Setup Details:
- **React Native**: 0.79.3 (latest)
- **Package Manager**: Yarn (yarn.lock present)
- **Build Tool**: Expo CLI (`npx expo run:ios`)
- **JavaScript Engine**: Hermes (enabled by default)
- **Architecture**: Classic React Native (not New Architecture)

## Getting Started

### 1. Install Dependencies

```bash
yarn install
```

### 2. Install iOS Dependencies
CocoaPods dependencies are automatically managed by Expo CLI, but if needed:
```bash
cd ios
pod install
cd ..
```
Note: React Native is moving away from direct pod install usage. The preferred method is through Expo CLI.

### 3. Start the Development Server & Run iOS
#### Option A: Single Command (Buggy)
```bash
npx expo run:ios
```

This automatically starts Metro bundler and builds/runs the app.

#### Option B: Separate Metro Process
```bash
# Terminal 1: Start Metro
npx react-native start --reset-cache

# Terminal 2: Build and run
npx expo run:ios --no-bundler
```

#### Option C: Using Yarn
```bash
yarn ios
```
### 4. Development Workflow

The app will open in iOS Simulator automatically
Metro bundler provides hot reloading for development
Use `npx expo run:ios` for clean builds
For Metro issues, use `npx react-native start --reset-cache`

Project Structure
```
MedicalBinder/
├── App.tsx                 # Main app component
├── index.js               # App entry point
├── package.json           # Dependencies and scripts
├── yarn.lock             # Yarn lockfile
├── ios/                  # iOS native project
│   ├── MedicalBinder.xcworkspace  # Open this in Xcode (not .xcodeproj)
│   ├── Podfile           # CocoaPods configuration
│   └── Podfile.lock      # CocoaPods lockfile
├── android/              # Android native project
└── .expo/               # Expo CLI configuration
```

# MGit Integration
This app integrates with the `react-native-mgit` module to provide:

Git-based medical record versioning
Nostr public key authentication
Commit signing with medical data attribution
Repository cloning and synchronization

## MGit Features:

mgit init - Initialize medical record repository
mgit clone - Clone existing medical repositories
mgit commit - Create commits with Nostr signature
mgit sync - Synchronize across devices securely

# Development Notes
## Build System Changes
React Native 0.79+ uses Expo CLI as the recommended build tool instead of direct CocoaPods:
==================== DEPRECATION NOTICE =====================
Calling `pod install` directly is deprecated in React Native
because we are moving away from Cocoapods toward alternative
solutions to build the project.
* If you are using the Community CLI, please run:
`npx expo run:ios`
=============================================================
## Hermes JavaScript Engine
This project uses Hermes for improved performance. If you encounter JavaScript engine issues:

Try clearing Metro cache: npx react-native start --reset-cache
If problems persist, Hermes can be disabled in ios/Podfile


## Common Issues
### Metro bundler issues:
```bash
npx react-native start --reset-cache
```

### Build issues:
```bash
cd ios
pod install
cd ..
npx expo run:ios
```

### Xcode workspace:
Always open ios/MedicalBinder.xcworkspace in Xcode, not the .xcodeproj file.

## Development Workflow

Due to compatibility issues between React Native 0.79.3 and Expo SDK 53, the most reliable development workflow requires running Metro bundler and the build process in separate terminals.

### Two-Terminal Development Setup

This project uses a two-terminal approach for reliable development:

**Terminal 1: Metro Bundler (Keep Running)**
```bash
yarn dev
```

This starts Metro with cache reset and keeps it running throughout your development session.
#### Terminal 2: Build & Run (Restart as Needed)
```bash
yarn build:ios
```
This builds and launches the app, connecting to the Metro instance from Terminal 1.

#### Package.json Scripts
The following scripts are configured for the two-terminal workflow:
```json
{
  "scripts": {
    "dev": "react-native start --reset-cache",
    "build:ios": "expo run:ios", 
    "start": "react-native start",
    "ios": "react-native run-ios"
  }
}
```
### Complete Development Workflow

Initial Setup (Terminal 1):
```bash
yarn dev
```

Keep this terminal running throughout your development session. You'll see Metro bundler output and should see:
Metro waiting on http://localhost:8081

Build and Run (Terminal 2):
```bash
yarn build:ios
```

This will build the app and open it in iOS Simulator. You can restart this command as needed without affecting Metro.
Development Iteration:

Keep Terminal 1 (Metro) running
Make code changes in your editor
App will hot reload automatically
If you need a clean build, restart Terminal 2 only
If you encounter bundling issues, restart Terminal 1

# Contributing
When contributing to this project:

Use yarn for package management (not npm)
Test on iOS Simulator before submitting PRs
Ensure MGit integration works with any changes
Follow React Native 0.79+ best practices

# Troubleshooting
## Development Issues
If the app shows a red error screen:

Check Terminal 1 for Metro errors
Restart Terminal 2: yarn build:ios

If you get "Metro bundler is not running":

Make sure Terminal 1 is still running yarn dev
Check that Metro shows "waiting on http://localhost:8081"

If you get JavaScript bundle errors:

Restart Terminal 1: Stop with Ctrl+C, then yarn dev
Wait for Metro to fully start, then restart Terminal 2

### Clean restart everything:
```bash
# Terminal 1: Stop Metro (Ctrl+C), then:
yarn dev

# Terminal 2: Wait for Metro to start, then:
yarn build:ios
```
### Why Two Terminals?
This workflow is necessary due to Metro bundler timing issues in React Native 0.79.3 + Expo SDK 53. When expo run:ios tries to start its own Metro instance, there are initialization conflicts that cause the "Property 'require' doesn't exist" runtime error.
By pre-starting Metro in a separate terminal, we ensure:

Metro is fully initialized before the app launches
Stable JavaScript bundle serving
Reliable hot reloading during development
Faster subsequent builds (Metro stays warm)

Single Terminal Alternative (Unreliable)
While npx expo run:ios should work in a single terminal, it currently has reliability issues. If you want to try it:
```bash
npx expo run:ios
```
If you encounter runtime errors, fall back to the two-terminal approach above.

## Common Solutions:

Clear Metro cache: npx react-native start --reset-cache
Clean iOS build: cd ios && pod install && cd ..
Reset Expo cache: npx expo start --clear
Restart Metro: Stop all processes and run npx expo run:ios

For more help, see the React Native troubleshooting docs.
License
This project is part of the MGit ecosystem for self-custodial medical data management.