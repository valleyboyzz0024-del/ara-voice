# Cannabis POS App

A modern, offline-first Point of Sale system for cannabis dispensaries. Built with React Native and Expo.

## Features

- **Dark Mode UI**: Clean, modern interface with dark theme and gold accents
- **Inventory Management**: Track products, categories, and stock levels
- **Sales System**: Process sales with an intuitive cart interface
- **Voice Commands**: Add products to cart using voice commands
- **Cash Float Management**: Track daily cash float and reconcile at day's end
- **Offline-First**: Works without internet connection
- **Secure Authentication**: Password-protected access
- **Mobile Optimized**: Enhanced for use on mobile devices

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (for mobile development)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/cannabis-pos-app.git
cd cannabis-pos-app
```

2. Install dependencies
```bash
npm install
```

3. Start the development server
```bash
# For web
npx expo start --web

# For mobile (recommended for full feature access)
npx expo start
```

4. For mobile development, scan the QR code with the Expo Go app on your device

### Default Login

- Username: admin
- Password: admin123

## Usage

### Inventory Management

- View all products in the inventory screen
- Filter by category or type
- Add new products with the + button
- Edit product details by tapping on a product

### Sales

- Browse products in the sales screen
- Add products to cart by tapping the + button
- Use voice commands by tapping the microphone icon
- View and edit cart contents
- Complete sales with cash payment

### Cash Float

- Initialize daily cash float at the start of the day
- View sales totals throughout the day
- Close the float at the end of the day
- Auto-close option for quick reconciliation

## Voice Commands

The app supports voice commands for adding products to the cart. Examples:

- "Add two grams of Blue Dream"
- "Add one Northern Lights"
- "Add three CBD oil"

Voice commands work best on physical mobile devices. See the [Mobile Guide](./MOBILE_GUIDE.md) for more details.

## Mobile vs Web

This app is designed to work on both web and mobile platforms, but certain features are optimized for mobile use:

### Web Version
- Great for desktop management and administration
- All core functionality available
- Limited voice command support
- No barcode scanning

### Mobile Version (Recommended)
- Full voice command support
- Barcode scanning capability
- Touch-optimized interface
- Offline-first functionality
- See the [Mobile Guide](./MOBILE_GUIDE.md) for detailed instructions

## Project Structure

```
cannabis-pos-app/
├── assets/              # App icons and images
├── src/
│   ├── components/      # Reusable UI components
│   ├── context/         # React context providers
│   ├── database/        # SQLite database setup
│   ├── hooks/           # Custom React hooks
│   ├── navigation/      # Navigation configuration
│   ├── screens/         # App screens
│   ├── services/        # Business logic and API services
│   └── theme/           # UI theme and styling
├── App.js               # Main app component
└── package.json         # Project dependencies
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.