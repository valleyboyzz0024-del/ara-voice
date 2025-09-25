import React, { useState } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  Alert,
  Linking
} from 'react-native';
import { 
  Text, 
  Surface, 
  Title, 
  Button, 
  Divider,
  List,
  Switch,
  Portal,
  Dialog,
  TextInput,
  IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { changePassword } from '../services/authService';
import { theme, shadowStyles } from '../theme/theme';

const SettingsScreen = ({ navigation }) => {
  const { user, signOut } = useAuth();
  const [darkMode, setDarkMode] = useState(true); // Always true for this app
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [processing, setProcessing] = useState(false);
  
  const handleChangePassword = async () => {
    try {
      // Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        Alert.alert('Validation Error', 'All fields are required');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        Alert.alert('Validation Error', 'New passwords do not match');
        return;
      }
      
      if (newPassword.length < 6) {
        Alert.alert('Validation Error', 'New password must be at least 6 characters');
        return;
      }
      
      setProcessing(true);
      
      const result = await changePassword(user.id, currentPassword, newPassword);
      
      if (result.success) {
        setShowPasswordDialog(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Success', 'Password changed successfully');
      } else {
        Alert.alert('Error', result.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setProcessing(false);
    }
  };
  
  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            await signOut();
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          },
          style: 'destructive'
        }
      ]
    );
  };
  
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Surface style={[styles.section, shadowStyles.medium]}>
        <Title style={styles.sectionTitle}>Account</Title>
        <Divider style={styles.divider} />
        
        <List.Item
          title="Username"
          description={user?.username || 'Not logged in'}
          left={props => <List.Icon {...props} icon="account" color={theme.colors.primary} />}
        />
        
        <List.Item
          title="Role"
          description={user?.role || 'Not assigned'}
          left={props => <List.Icon {...props} icon="shield-account" color={theme.colors.primary} />}
        />
        
        <List.Item
          title="Change Password"
          left={props => <List.Icon {...props} icon="lock" color={theme.colors.primary} />}
          onPress={() => setShowPasswordDialog(true)}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
      </Surface>
      
      <Surface style={[styles.section, shadowStyles.medium]}>
        <Title style={styles.sectionTitle}>Business Management</Title>
        <Divider style={styles.divider} />
        
        <List.Item
          title="Cash Float Management"
          description="Manage daily cash float and view history"
          left={props => <List.Icon {...props} icon="cash" color={theme.colors.primary} />}
          onPress={() => navigation.navigate('CashFloat')}
          right={props => <List.Icon {...props} icon="chevron-right" />}
        />
      </Surface>
      
      <Surface style={[styles.section, shadowStyles.medium]}>
        <Title style={styles.sectionTitle}>App Settings</Title>
        <Divider style={styles.divider} />
        
        <List.Item
          title="Dark Mode"
          left={props => <List.Icon {...props} icon="theme-light-dark" color={theme.colors.primary} />}
          right={() => <Switch value={darkMode} disabled />}
        />
        
        <List.Item
          title="App Version"
          description="1.0.0"
          left={props => <List.Icon {...props} icon="information" color={theme.colors.primary} />}
        />
      </Surface>
      
      <Button
        mode="contained"
        onPress={handleLogout}
        style={styles.logoutButton}
        contentStyle={styles.logoutButtonContent}
        icon="logout"
      >
        Logout
      </Button>
      
      <Portal>
        <Dialog
          visible={showPasswordDialog}
          onDismiss={() => setShowPasswordDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Change Password</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry={!showCurrentPassword}
              style={styles.dialogInput}
              mode="outlined"
              right={
                <TextInput.Icon 
                  icon={showCurrentPassword ? "eye-off" : "eye"} 
                  color={theme.colors.primary}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)} 
                />
              }
            />
            
            <TextInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry={!showNewPassword}
              style={styles.dialogInput}
              mode="outlined"
              right={
                <TextInput.Icon 
                  icon={showNewPassword ? "eye-off" : "eye"} 
                  color={theme.colors.primary}
                  onPress={() => setShowNewPassword(!showNewPassword)} 
                />
              }
            />
            
            <TextInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showNewPassword}
              style={styles.dialogInput}
              mode="outlined"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowPasswordDialog(false)} color={theme.colors.text}>
              Cancel
            </Button>
            <Button 
              onPress={handleChangePassword} 
              mode="contained" 
              loading={processing}
              disabled={processing || !currentPassword || !newPassword || !confirmPassword}
            >
              Change Password
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 24,
  },
  section: {
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  divider: {
    marginVertical: 12,
  },
  logoutButton: {
    marginTop: 8,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
  },
  logoutButtonContent: {
    height: 50,
  },
  dialog: {
    backgroundColor: theme.colors.surface,
    borderRadius: 15,
  },
  dialogTitle: {
    color: theme.colors.primary,
  },
  dialogInput: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
});

export default SettingsScreen;