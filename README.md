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

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI

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
npx expo start --tunnel
```

4. Scan the QR code with the Expo Go app on your mobile device or run in a simulator

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

## License

This project is licensed under the MIT License - see the LICENSE file for details.