import React, { createContext, useState, useContext, useEffect } from 'react';
import { login, logout, getCurrentUser, isAuthenticated, refreshSession } from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is already authenticated on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Refresh session periodically
  useEffect(() => {
    if (!user) return;
    
    const refreshInterval = setInterval(async () => {
      await refreshSession();
    }, 30 * 60 * 1000); // Refresh every 30 minutes
    
    return () => clearInterval(refreshInterval);
  }, [user]);
  
  const signIn = async (username, password) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await login(username, password);
      
      if (result.success) {
        setUser(result.user);
        return { success: true };
      } else {
        setError(result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      setError(err.message);
      return { success: false, message: err.message };
    } finally {
      setLoading(false);
    }
  };
  
  const signOut = async () => {
    try {
      setLoading(true);
      await logout();
      setUser(null);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };
  
  const checkAuthentication = async () => {
    try {
      const authenticated = await isAuthenticated();
      if (!authenticated) {
        setUser(null);
      }
      return authenticated;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };
  
  const value = {
    user,
    loading,
    error,
    signIn,
    signOut,
    checkAuthentication,
    isAuthenticated: !!user
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;