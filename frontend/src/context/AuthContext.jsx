import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    const checkUser = async () => {
      try {
        const { data } = await api.get('/auth/profile');
        setUser(data);
      } catch (error) {
        setUser(null);
        localStorage.removeItem('crm_token'); // clear stale token
      } finally {
        setLoading(false);
      }
    };
    checkUser();
  }, []);

  const login = async (email, password, loginType = 'Admin') => {
    try {
      const { data } = await api.post('/auth/login', { email, password, loginType });
      // Store token in localStorage for cross-domain auth (production)
      if (data.token) {
        localStorage.setItem('crm_token', data.token);
      }
      setUser(data);
      toast.success('Logged in successfully!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_session_start');
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
