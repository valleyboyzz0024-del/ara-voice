import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Image, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableWithoutFeedback, 
  Keyboard,
  StatusBar,
  Dimensions
} from 'react-native';
import { 
  TextInput, 
  Button, 
  Text, 
  Surface, 
  ActivityIndicator,
  Title
} from 'react-native-paper';
import { useAuth } from '../context/AuthContext';
import { theme, shadowStyles } from '../theme/theme';

const { width } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const { signIn, loading, error, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigation.replace('Main');
    }
  }, [isAuthenticated, navigation]);

  const handleLogin = async () => {
    if (!username || !password) {
      return;
    }
    
    const result = await signIn(username, password);
    
    if (result.success) {
      navigation.replace('Main');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" backgroundColor={theme.colors.background} />
        
        <Surface style={styles.loginContainer}>
          <View style={styles.logoContainer}>
            <Title style={styles.appTitle}>Cannabis POS</Title>
            <Text style={styles.appSubtitle}>Point of Sale System</Text>
          </View>
          
          <View style={styles.formContainer}>
            <TextInput
              label="Username"
              value={username}
              onChangeText={setUsername}
              style={styles.input}
              mode="outlined"
              autoCapitalize="none"
              left={<TextInput.Icon icon="account" color={theme.colors.primary} />}
            />
            
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureTextEntry}
              style={styles.input}
              mode="outlined"
              right={
                <TextInput.Icon 
                  icon={secureTextEntry ? "eye" : "eye-off"} 
                  color={theme.colors.primary}
                  onPress={() => setSecureTextEntry(!secureTextEntry)} 
                />
              }
              left={<TextInput.Icon icon="lock" color={theme.colors.primary} />}
            />
            
            {error && <Text style={styles.errorText}>{error}</Text>}
            
            <Button 
              mode="contained" 
              onPress={handleLogin}
              style={styles.loginButton}
              contentStyle={styles.loginButtonContent}
              disabled={loading || !username || !password}
              loading={loading}
            >
              Login
            </Button>
            
            <Text style={styles.helpText}>
              Default login: admin / admin123
            </Text>
          </View>
        </Surface>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginContainer: {
    width: width > 500 ? 450 : '100%',
    padding: 30,
    borderRadius: 15,
    backgroundColor: theme.colors.surface,
    ...shadowStyles.large,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 16,
    color: theme.colors.text,
    opacity: 0.8,
  },
  formContainer: {
    width: '100%',
  },
  input: {
    marginBottom: 15,
    backgroundColor: theme.colors.surface,
  },
  loginButton: {
    marginTop: 10,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
  },
  loginButtonContent: {
    height: 50,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: 10,
    textAlign: 'center',
  },
  helpText: {
    marginTop: 20,
    textAlign: 'center',
    color: theme.colors.text,
    opacity: 0.7,
  },
});

export default LoginScreen;