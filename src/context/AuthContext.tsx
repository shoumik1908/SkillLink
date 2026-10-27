import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { apiUrl, getAuthHeaders, setAuthToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  role: 'user' | 'admin' | null;
  previewRole?: 'user' | 'admin' | null;
  setPreviewRole?: (role: 'user' | 'admin' | null) => void;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<{
    success: boolean;
    message?: string;
    needsVerification?: boolean;
    email?: string;
  }>;
  register: (data: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    hp?: string;
  }) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function formatUser(raw: any): User {
  return {
    id: raw.id,
    name: raw.name,
    email: raw.email,
    role: raw.role || 'user',
    college: raw.college || 'State University',
    yearOfStudy: raw.yearOfStudy || raw.year_of_study || 1,
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    bio: raw.bio || '',
    avatarUrl: raw.avatarUrl,
    resumeUrl: raw.resumeUrl,
    resumeName: raw.resumeName,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session on app load using httpOnly cookie or stored token
  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/auth/me'), {
        method: 'GET',
        credentials: 'include',
        headers: getAuthHeaders(),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(formatUser(data.user));
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Could not restore session from server:', err);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      const res = await fetch(apiUrl('/auth/login'), {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(credentials),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        if (!res.ok) {
          return {
            success: false,
            message: `Unable to connect to server (${res.status} ${res.statusText || 'Offline'}). Please ensure the backend is running.`,
          };
        }
      }

      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Invalid email or password',
          needsVerification: !!data.needsVerification,
          email: data.email,
        };
      }

      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(formatUser(data.user));
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'An unexpected network error occurred',
      };
    }
  };

  const register = async (userData: {
    name: string;
    email: string;
    password: string;
    confirmPassword?: string;
    hp?: string;
  }) => {
    try {
      const res = await fetch(apiUrl('/auth/register'), {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
        body: JSON.stringify(userData),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        if (!res.ok) {
          return {
            success: false,
            message: `Server error (${res.status}). Please try again.`,
          };
        }
      }

      if (!res.ok) {
        return {
          success: false,
          message: data.message || 'Registration failed',
        };
      }

      return { success: true, message: data.message || 'Account created successfully! Please sign in.' };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'An unexpected network error occurred',
      };
    }
  };

  const logout = async () => {
    try {
      await fetch(apiUrl('/auth/logout'), {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      });
    } catch (err) {
      console.warn('Logout error:', err);
    } finally {
      setAuthToken(null);
      setUser(null);
    }
  };

  const [previewRole, setPreviewRole] = useState<'user' | 'admin' | null>(null);

  // Active role: in dev, allow previewRole override; fallback to actual user role
  const role = (import.meta.env.DEV && previewRole) ? previewRole : (user?.role || null);

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        previewRole,
        setPreviewRole,
        loading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
