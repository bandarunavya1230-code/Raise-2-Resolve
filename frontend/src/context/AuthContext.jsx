import React, { createContext, useState, useEffect } from 'react';

// Safe localStorage helpers for iframe resilience
const getStoredToken = () => {
  try {
    return localStorage.getItem('token') || null;
  } catch (e) {
    return null;
  }
};

const setStoredToken = (val) => {
  try {
    if (val) {
      localStorage.setItem('token', val);
    } else {
      localStorage.removeItem('token');
    }
  } catch (e) {}
};

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => getStoredToken());
  const [loading, setLoading] = useState(true);

  // Fetch current user on initial load if token exists
  useEffect(() => {
    const loadUser = async () => {
      if (token) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await response.json();
          if (data.success) {
            setUser(data.user);
          } else {
            logout();
          }
        } catch (err) {
          console.error('Failed to load user:', err);
          logout();
        }
      }
      setLoading(false);
    };

    loadUser();
  }, [token]);

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      setStoredToken(data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const register = async (name, email, password) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'citizen' })
    });
    const data = await response.json();
    if (data.success) {
      setStoredToken(data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const loginAuthorityDemo = async () => {
    const response = await fetch('/api/auth/demo-authority', {
      method: 'POST'
    });
    const data = await response.json();
    if (data.success) {
      setStoredToken(data.token);
      setToken(data.token);
      setUser(data.user);
    }
    return data;
  };

  const logout = () => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      loginAuthorityDemo,
      logout,
      isAuthenticated: !!user,
      isAuthority: user?.role === 'authority',
      isCitizen: user?.role === 'citizen'
    }}>
      {children}
    </AuthContext.Provider>
  );
};
