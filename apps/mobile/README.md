# @courseweb/mobile

CourseWeb mobile application built with Capacitor for iOS and Android platforms.

## Overview

This is the mobile application for CourseWeb, built using Capacitor to provide native mobile functionality while leveraging the web application as the core interface. The app provides offline capabilities, native device features, and optimized mobile user experience.

## Features

- **Cross-platform**: Runs on both iOS and Android
- **Native capabilities**: Access to device features like camera, filesystem, haptics
- **Offline support**: Works with cached data when offline
- **Push notifications**: Native notification support
- **Deep linking**: Handle custom URL schemes
- **Native UI elements**: Status bar, keyboard, and system integration

## Prerequisites

Before running the mobile app, ensure you have:

- **Node.js**: Version 18+
- **Capacitor CLI**: `npm install -g @capacitor/cli`
- **iOS Development** (for iOS):
  - macOS with Xcode 14+
  - iOS Simulator or physical iOS device
- **Android Development** (for Android):
  - Android Studio with SDK 33+
  - Android Emulator or physical Android device

## Development Setup

### Initial Setup

```bash
# Install dependencies (from monorepo root)
npm install

# Navigate to mobile app
cd apps/mobile

# Add platforms (first time only)
npm run add:ios     # Add iOS platform
npm run add:android # Add Android platform
```

### Development Workflow

```bash
# Sync changes and open in IDE
npm run sync:ios     # Sync and open Xcode
npm run sync:android # Sync and open Android Studio

# Build for platforms
npm run build:ios
npm run build:android

# Run on device/simulator
npm run dev # Opens platform selection
```

## Scripts

### Core Commands

```bash
npm run build          # Build and sync all platforms
npm run dev            # Run on device/simulator
npm run sync           # Sync web assets to native platforms
npm run copy           # Copy web assets only
npm run update         # Update Capacitor and plugins
```

### Platform-Specific

```bash
# iOS
npm run sync:ios       # Sync and open Xcode
npm run build:ios      # Build iOS app
npm run open:ios       # Open in Xcode
npm run clean:ios      # Clean iOS build artifacts

# Android
npm run sync:android   # Sync and open Android Studio
npm run build:android  # Build Android app
npm run open:android   # Open in Android Studio
npm run clean:android  # Clean Android build artifacts
```

### Utilities

```bash
npm run doctor         # Check Capacitor setup
npm run clean          # Clean all build artifacts
npm run lint           # Lint TypeScript files
npm run type-check     # Type check without emitting
```

## Configuration

### Capacitor Configuration

The main configuration is in `capacitor.config.ts`:

```typescript
{
  appId: "com.nthumods.courseweb",
  appName: "NTHUMods",
  webDir: "../../fakeout", // Points to web build output
  server: {
    url: "https://nthumods.com", // Production server
    androidScheme: "https",
  }
}
```

### Development vs Production

- **Development**: Uses live server URL for hot reloading
- **Production**: Uses bundled web assets for offline capability

## Native Plugins

The app includes these Capacitor plugins:

- `@capacitor/app` - App state and URL handling
- `@capacitor/device` - Device information
- `@capacitor/filesystem` - File system access
- `@capacitor/haptics` - Haptic feedback
- `@capacitor/keyboard` - Keyboard control
- `@capacitor/share` - Native sharing
- `@capacitor/status-bar` - Status bar styling
- `@capacitor-community/media` - Media handling

## Build Process

### iOS Build

1. **Sync**: `npm run sync:ios`
2. **Open Xcode**: Automatically opens project
3. **Configure**: Set signing, provisioning profiles
4. **Build**: Use Xcode or `npm run build:ios`
5. **Deploy**: Archive and distribute through App Store Connect

### Android Build

1. **Sync**: `npm run sync:android`
2. **Open Android Studio**: Automatically opens project
3. **Configure**: Set signing keys, build variants
4. **Build**: Use Android Studio or `npm run build:android`
5. **Deploy**: Generate APK/AAB and distribute through Google Play

## Deployment

### App Store (iOS)

1. Configure signing certificates and provisioning profiles
2. Build archive in Xcode
3. Upload to App Store Connect
4. Submit for review

### Google Play (Android)

1. Configure signing keys
2. Build signed APK or Android App Bundle
3. Upload to Google Play Console
4. Submit for review

## Troubleshooting

### Common Issues

**Build Errors**:

```bash
npm run clean        # Clean all build artifacts
npm run doctor       # Check Capacitor setup
npm install          # Reinstall dependencies
```

**iOS Simulator Issues**:

```bash
xcrun simctl list devices    # List available simulators
npm run clean:ios           # Clean iOS build
```

**Android Emulator Issues**:

```bash
adb devices                 # Check connected devices
npm run clean:android       # Clean Android build
```

### Platform-Specific Debugging

**iOS**:

- Use Safari Developer Tools for web debugging
- Use Xcode console for native debugging
- Check device logs in Console.app

**Android**:

- Use Chrome DevTools for web debugging
- Use Android Studio Logcat for native debugging
- Check `adb logcat` for system logs

## File Structure

```
apps/mobile/
├── android/              # Android native project
├── ios/                  # iOS native project
├── capacitor.config.ts   # Capacitor configuration
├── ionic.config.json     # Ionic configuration
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## Integration with Monorepo

The mobile app integrates with the CourseWeb monorepo:

- **Web App**: Uses `apps/web` as the web source
- **Shared**: Can import from `@courseweb/shared` packages
- **Build System**: Integrated with Turborepo for caching

### Workspace Commands

From monorepo root:

```bash
npm run dev:mobile        # Start mobile development
npm run build:mobile      # Build mobile app
npm run sync:ios          # Sync and open iOS
npm run sync:android      # Sync and open Android
```

## Contributing

1. Follow the monorepo development guidelines
2. Test on both iOS and Android platforms
3. Ensure offline functionality works
4. Update native dependencies carefully
5. Test deep linking and push notifications

## License

MIT License - see LICENSE file for details.
