import React, { createContext, useContext, useState, useEffect } from 'react';

// Create the AuthContext
const AuthContext = createContext();

// Hook to use AuthContext
export const useAuth = () => useContext(AuthContext);

// AuthProvider component
export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Check for existing session/token on mount
    const token = localStorage.getItem('authToken');
    if (token) {
      // Here you could verify the token with your backend or decode it
      setIsAuthenticated(true);
      setUser(JSON.parse(localStorage.getItem('user'))); // Load user info if stored
    }
  }, []);

  const login = async (token, userInfo) => {
    // Save the token and user info in localStorage (or any other storage)
    localStorage.setItem('authToken', token);
    localStorage.setItem('user', JSON.stringify(userInfo));

    // Set state
    setIsAuthenticated(true);
    setUser(userInfo);
  };

  const logout = () => {
    // Clear localStorage and reset state
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = {
    isAuthenticated,
    user,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
