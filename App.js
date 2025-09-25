import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, LogBox, View, Text, ActivityIndicator } from 'react-native';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import AppNavigator from './src/navigation/AppNavigator';
import { theme } from './src/theme/theme';
import { AuthProvider } from './src/context/AuthContext';
import { CartProvider } from './src/context/CartContext';
import { initDatabase } from './src/database/database';

// Ignore specific warnings
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'VirtualizedLists should never be nested',
]);

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    async function prepare() {
      try {
        console.log('Loading resources...');
        
        // Initialize database
        await initDatabase();
        console.log('Database initialized successfully');
        
        // Load fonts
        await Font.loadAsync({
          'System': require('expo-font/build/FontLoader').loadAsync({
            'normal': {
              fontFamily: 'System',
              fontWeight: 'normal',
            },
            'medium': {
              fontFamily: 'System',
              fontWeight: '500',
            },
            'light': {
              fontFamily: 'System',
              fontWeight: '300',
            },
            'thin': {
              fontFamily: 'System',
              fontWeight: '100',
            },
            'bold': {
              fontFamily: 'System',
              fontWeight: 'bold',
            },
          }),
        });
        console.log('Fonts loaded successfully');
        
      } catch (e) {
        console.warn('Error loading resources:', e);
        setError('Failed to load resources. Please restart the app.');
      } finally {
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);
  
  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // This tells the splash screen to hide immediately
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.colors.background
      }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ 
          marginTop: 20, 
          color: theme.colors.text,
          fontSize: 16
        }}>
          Loading Cannabis POS...
        </Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: theme.colors.background,
        padding: 20
      }}>
        <Text style={{ 
          color: theme.colors.error,
          fontSize: 18,
          marginBottom: 20,
          textAlign: 'center'
        }}>
          {error}
        </Text>
        <Text style={{ 
          color: theme.colors.text,
          fontSize: 14,
          textAlign: 'center'
        }}>
          If the problem persists, please clear the app data and try again.
        </Text>
      </View>
    );
  }
  
  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <PaperProvider theme={theme}>
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        <AuthProvider>
          <CartProvider>
            <AppNavigator />
          </CartProvider>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}