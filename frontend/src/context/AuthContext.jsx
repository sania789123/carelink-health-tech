import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('carelink_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me').then(d => setUser(d.user)).catch(() => localStorage.removeItem('carelink_token')).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const d = await api.post('/auth/login', { email, password });
    localStorage.setItem('carelink_token', d.token);
    setUser(d.user);
    return d.user;
  };

  const register = async (payload) => {
    const d = await api.post('/auth/register', payload);
    localStorage.setItem('carelink_token', d.token);
    setUser(d.user);
    return d.user;
  };

  const logout = () => {
    localStorage.removeItem('carelink_token');
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
