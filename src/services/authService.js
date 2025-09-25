import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserByUsername, getUsers, updateUser, createUser as dbCreateUser } from '../database/database';

const USER_KEY = 'cannabis_pos_user';
const SESSION_KEY = 'cannabis_pos_session';

export const login = async (username, password) => {
  try {
    const user = await getUserByUsername(username);
    
    if (user && user.password === password) {
      // Store user info securely
      await AsyncStorage.setItem(USER_KEY, JSON.stringify({
        id: user.id,
        username: user.username,
        role: user.role
      }));
      
      // Create session
      const session = {
        userId: user.id,
        timestamp: new Date().getTime(),
        expiresAt: new Date().getTime() + (8 * 60 * 60 * 1000) // 8 hour session
      };
      
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
      
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      };
    } else {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }
  } catch (error) {
    console.error('Error during login:', error);
    return {
      success: false,
      message: 'An error occurred during login'
    };
  }
};

export const logout = async () => {
  try {
    await AsyncStorage.removeItem(USER_KEY);
    await AsyncStorage.removeItem(SESSION_KEY);
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
};

export const getCurrentUser = async () => {
  try {
    const userJson = await AsyncStorage.getItem(USER_KEY);
    if (!userJson) return null;
    
    const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionJson) {
      await logout();
      return null;
    }
    
    const session = JSON.parse(sessionJson);
    const now = new Date().getTime();
    
    // Check if session is expired
    if (now > session.expiresAt) {
      await logout();
      return null;
    }
    
    return JSON.parse(userJson);
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

export const isAuthenticated = async () => {
  const user = await getCurrentUser();
  return user !== null;
};

export const refreshSession = async () => {
  try {
    const sessionJson = await AsyncStorage.getItem(SESSION_KEY);
    if (!sessionJson) return false;
    
    const session = JSON.parse(sessionJson);
    session.timestamp = new Date().getTime();
    session.expiresAt = new Date().getTime() + (8 * 60 * 60 * 1000); // 8 hour session
    
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  try {
    const users = await getUsers();
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    
    if (users[userIndex].password !== currentPassword) {
      return {
        success: false,
        message: 'Current password is incorrect'
      };
    }
    
    const success = await updateUser(userId, { password: newPassword });
    
    return {
      success,
      message: success ? 'Password updated successfully' : 'Failed to update password'
    };
  } catch (error) {
    console.error('Error changing password:', error);
    return {
      success: false,
      message: 'An error occurred while changing password'
    };
  }
};

export const createUser = async (username, password, role) => {
  try {
    // Check if username already exists
    const existingUser = await getUserByUsername(username);
    
    if (existingUser) {
      return {
        success: false,
        message: 'Username already exists'
      };
    }
    
    // Create new user
    const newUser = await dbCreateUser({
      username,
      password,
      role
    });
    
    return {
      success: true,
      userId: newUser.id,
      message: 'User created successfully'
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      message: 'An error occurred while creating user'
    };
  }
};