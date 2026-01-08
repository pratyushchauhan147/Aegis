'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  
  // Robust API URL handling
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

  // 1. Load User from Storage on Mount
  useEffect(() => {
    const initAuth = () => {
      try {
        const storedUser = localStorage.getItem('aegis_user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (e) {
        console.error("Failed to parse user data", e);
        localStorage.removeItem('aegis_user'); // Clean up corrupt data
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  // 2. Login Action
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // 👈 Essential for cookies
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      // ✅ Update State & Storage
      setUser(data.user);
      localStorage.setItem('aegis_user', JSON.stringify(data.user));
      
      // ✅ Redirect
      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 3. Signup Action
  const signup = async (formData) => {
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Signup failed');

      setUser(data.user);
      localStorage.setItem('aegis_user', JSON.stringify(data.user));
      
      router.push('/dashboard');
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // 4. Logout Action
  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) { console.error("Logout error", e); }

    setUser(null);
    localStorage.removeItem('aegis_user');
    router.push('/');
  };
  const checkAuth = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/me`, { 
        method: 'GET', 
        credentials: 'include' 
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('aegis_user', JSON.stringify(data.user));
        return { authenticated: true };
      } else {
        // Token invalid or expired
        setUser(null);
        localStorage.removeItem('aegis_user');
        return { authenticated: false };
      }
    } catch (err) {
      console.error("Auth verification failed", err);
      return { authenticated: false };
    }
  };

  // Update useEffect to use checkAuth for real-time validation on refresh
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const result = await checkAuth();
      if (!result.authenticated) {
        // Fallback to local storage only if offline/api fails, or just clear it
        const storedUser = localStorage.getItem('aegis_user');
        if (storedUser) setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);