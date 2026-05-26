import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('crm_token');

      // No token = definitely not logged in, skip API call
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const { data } = await api.get('/auth/profile');
        setUser(data);
      } catch (error) {
        // Token is invalid/expired — clear it
        setUser(null);
        localStorage.removeItem('crm_token');
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
    // Always clear local state first — never leave a stale token
    localStorage.removeItem('crm_token');
    localStorage.removeItem('crm_session_start');
    setUser(null);
    try {
      await api.post('/auth/logout'); // clear server-side cookie too
      toast.success('Logged out successfully');
    } catch {
      // Even if server call fails, user is already logged out locally
      toast.success('Logged out successfully');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};
