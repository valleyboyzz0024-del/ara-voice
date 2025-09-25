import { db } from '../database/database';
import * as SecureStore from 'expo-secure-store';

const USER_KEY = 'cannabis_pos_user';
const SESSION_KEY = 'cannabis_pos_session';

export const login = (username, password) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM users WHERE username = ? AND password = ?;',
        [username, password],
        async (_, { rows }) => {
          if (rows.length > 0) {
            const user = rows._array[0];
            // Store user info securely
            try {
              await SecureStore.setItemAsync(USER_KEY, JSON.stringify({
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
              
              await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
              
              resolve({
                success: true,
                user: {
                  id: user.id,
                  username: user.username,
                  role: user.role
                }
              });
            } catch (error) {
              console.error('Error storing user data:', error);
              reject(error);
            }
          } else {
            resolve({
              success: false,
              message: 'Invalid username or password'
            });
          }
        },
        (_, error) => {
          console.error('Error during login:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const logout = async () => {
  try {
    await SecureStore.deleteItemAsync(USER_KEY);
    await SecureStore.deleteItemAsync(SESSION_KEY);
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
};

export const getCurrentUser = async () => {
  try {
    const userJson = await SecureStore.getItemAsync(USER_KEY);
    if (!userJson) return null;
    
    const sessionJson = await SecureStore.getItemAsync(SESSION_KEY);
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
    const sessionJson = await SecureStore.getItemAsync(SESSION_KEY);
    if (!sessionJson) return false;
    
    const session = JSON.parse(sessionJson);
    session.timestamp = new Date().getTime();
    session.expiresAt = new Date().getTime() + (8 * 60 * 60 * 1000); // 8 hour session
    
    await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch (error) {
    console.error('Error refreshing session:', error);
    return false;
  }
};

export const changePassword = (userId, currentPassword, newPassword) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // First verify current password
      tx.executeSql(
        'SELECT * FROM users WHERE id = ? AND password = ?;',
        [userId, currentPassword],
        (_, { rows }) => {
          if (rows.length > 0) {
            // Update password
            tx.executeSql(
              'UPDATE users SET password = ? WHERE id = ?;',
              [newPassword, userId],
              (_, { rowsAffected }) => {
                resolve({
                  success: rowsAffected > 0,
                  message: rowsAffected > 0 ? 'Password updated successfully' : 'Failed to update password'
                });
              },
              (_, error) => {
                console.error('Error updating password:', error);
                reject(error);
                return false;
              }
            );
          } else {
            resolve({
              success: false,
              message: 'Current password is incorrect'
            });
          }
        },
        (_, error) => {
          console.error('Error verifying password:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};

export const createUser = (username, password, role) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Check if username already exists
      tx.executeSql(
        'SELECT * FROM users WHERE username = ?;',
        [username],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve({
              success: false,
              message: 'Username already exists'
            });
          } else {
            // Create new user
            tx.executeSql(
              'INSERT INTO users (username, password, role) VALUES (?, ?, ?);',
              [username, password, role],
              (_, { insertId }) => {
                resolve({
                  success: true,
                  userId: insertId,
                  message: 'User created successfully'
                });
              },
              (_, error) => {
                console.error('Error creating user:', error);
                reject(error);
                return false;
              }
            );
          }
        },
        (_, error) => {
          console.error('Error checking username:', error);
          reject(error);
          return false;
        }
      );
    });
  });
};