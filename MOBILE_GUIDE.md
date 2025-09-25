# Cannabis POS Mobile App Guide

This guide provides instructions for running the Cannabis POS app on mobile devices, where you can take full advantage of features like voice commands and barcode scanning.

## Prerequisites

1. **Node.js and npm**: Make sure you have Node.js (v14 or higher) and npm installed
2. **Expo CLI**: Install the Expo CLI globally
   ```bash
   npm install -g expo-cli
   ```
3. **Expo Go App**: Install the Expo Go app on your mobile device
   - [Android Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)

## Setup Instructions

1. **Clone the repository** (if you haven't already)
   ```bash
   git clone <repository-url>
   cd cannabis-pos-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npx expo start
   ```

4. **Connect your mobile device**:
   - Make sure your mobile device is on the same WiFi network as your computer
   - Scan the QR code displayed in the terminal with your device's camera
   - The Expo Go app will open and load your app

## Using Voice Commands

The Cannabis POS app supports voice commands for adding products to your cart. This feature works best on physical devices.

### How to Use Voice Commands:

1. Navigate to the Sales screen
2. Tap the microphone icon in the bottom right corner
3. When prompted, speak your command clearly
4. Example commands:
   - "Add two grams of Blue Dream"
   - "Add one Northern Lights"
   - "Add three CBD oil"

### Troubleshooting Voice Commands:

- Make sure your device has microphone permissions enabled for Expo Go
- Speak clearly and use the product names that exist in the inventory
- If a command isn't recognized, try rephrasing it using the format "Add [quantity] [product name]"

## Mobile-Specific Features

### 1. Barcode Scanning

The app includes barcode scanning functionality for quickly adding products to the cart:

1. Navigate to the Sales screen
2. Tap the barcode icon (if available)
3. Point your camera at a product barcode
4. The product will be automatically added to your cart

### 2. Offline Mode

The app works offline with a local SQLite database:

- All data is stored locally on your device
- No internet connection is required after initial setup
- Changes are persisted between app sessions

### 3. Mobile UI Optimizations

The app includes several optimizations for mobile devices:

- Large, touch-friendly buttons
- Responsive layout that adapts to different screen sizes
- Bottom navigation for easy one-handed operation
- Pull-to-refresh for updating data

## Default Login Credentials

- **Username**: admin
- **Password**: admin123

## Troubleshooting

### App Crashes on Launch

1. Make sure all dependencies are installed:
   ```bash
   npm install
   ```

2. Clear the Expo cache:
   ```bash
   npx expo start -c
   ```

### Voice Commands Not Working

1. Check microphone permissions in your device settings
2. Make sure you're running the app on a physical device, not an emulator
3. Try restarting the app

### Database Issues

If you encounter database errors:

1. Clear the app data in your device settings
2. Restart the app

## Building a Standalone App

To create a standalone app that doesn't require Expo Go:

1. Install EAS CLI:
   ```bash
   npm install -g eas-cli
   ```

2. Log in to your Expo account:
   ```bash
   eas login
   ```

3. Configure the build:
   ```bash
   eas build:configure
   ```

4. Build for Android:
   ```bash
   eas build -p android
   ```

5. Build for iOS:
   ```bash
   eas build -p ios
   ```

## Support

For additional support or feature requests, please contact the developer.