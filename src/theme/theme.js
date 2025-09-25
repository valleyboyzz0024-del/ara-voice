import { DefaultTheme } from 'react-native-paper';
import { Platform } from 'react-native';

// Define a more complete font configuration
const fontConfig = {
  web: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: 'bold',
    },
  },
  ios: {
    regular: {
      fontFamily: 'System',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500',
    },
    light: {
      fontFamily: 'System',
      fontWeight: '300',
    },
    thin: {
      fontFamily: 'System',
      fontWeight: '100',
    },
    bold: {
      fontFamily: 'System',
      fontWeight: 'bold',
    },
  },
  android: {
    regular: {
      fontFamily: 'sans-serif',
      fontWeight: 'normal',
    },
    medium: {
      fontFamily: 'sans-serif-medium',
      fontWeight: 'normal',
    },
    light: {
      fontFamily: 'sans-serif-light',
      fontWeight: 'normal',
    },
    thin: {
      fontFamily: 'sans-serif-thin',
      fontWeight: 'normal',
    },
    bold: {
      fontFamily: 'sans-serif',
      fontWeight: 'bold',
    },
  }
};

// Use the appropriate font config based on platform
const fonts = Platform.select({
  web: fontConfig.web,
  ios: fontConfig.ios,
  android: fontConfig.android,
  default: fontConfig.ios,
});

export const theme = {
  ...DefaultTheme,
  dark: true,
  mode: 'adaptive',
  roundness: 10,
  colors: {
    ...DefaultTheme.colors,
    primary: '#D4AF37', // Gold
    accent: '#D4AF37',  // Gold
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
    disabled: '#757575',
    placeholder: '#9E9E9E',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    notification: '#D4AF37',
    error: '#CF6679',
    success: '#4CAF50',
    warning: '#FF9800',
    info: '#2196F3',
    onSurface: '#FFFFFF',
    secondaryContainer: '#2E2E2E',
    card: '#1E1E1E',
    border: '#2E2E2E',
  },
  fonts: fonts,
};

export const buttonStyles = {
  large: {
    height: 60,
    marginVertical: 10,
    borderRadius: 10,
    justifyContent: 'center',
  },
  medium: {
    height: 50,
    marginVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
  },
  small: {
    height: 40,
    marginVertical: 5,
    borderRadius: 6,
    justifyContent: 'center',
  },
};

export const shadowStyles = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.37,
    shadowRadius: 7.49,
    elevation: 6,
  },
};