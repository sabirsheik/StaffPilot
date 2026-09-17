import { createContext, useContext, useEffect, useMemo, useState, useCallback, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { authApi, notificationApi } from '../api/endpoints';
import { DASHBOARD_PATHS, LEGACY_TOKEN_KEY, LEGACY_USER_KEY, TOKEN_KEY, USER_KEY, type Role } from '../constants/roles';
import { extractErrorMessage } from '../lib/axios';
import type { NotificationRecord, UnknownRecord, UserRecord } from '../types/api';

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthResult {
  ok: boolean;
  user?: UserRecord;
  error?: string;
}

interface AuthContextValue {
  user: UserRecord | null;
  token: string | null;
  initializing: boolean;
  isAuthenticated: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isLoggingOut: boolean;
  notifications: NotificationRecord[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  login: (credentials: UnknownRecord) => Promise<AuthResult>;
  register: (payload: UnknownRecord) => Promise<AuthResult>;
  logout: () => Promise<void>;
  syncMe: () => Promise<void>;
  hasRole: (requiredRole: Role) => boolean;
  hasAnyRole: (roles: readonly Role[]) => boolean;
  getDashboardPath: () => string;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const VALID_ROLES = new Set<Role>(Object.values(ROLES));

const isValidRole = (role: unknown): role is Role => typeof role === 'string' && VALID_ROLES.has(role as Role);

const getStoredUser = (): UserRecord | null => {
  try {
    const raw = localStorage.getItem(USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const candidate = parsed as UserRecord;
    if (!candidate || !candidate.role || !isValidRole(candidate.role)) {
      return null;
    }

    return candidate;
  } catch {
    return null;
  }
};

const getStoredToken = (): string | null => {
  try {
    return localStorage.getItem(TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || null;
  } catch {
    return null;
  }
};

const clearAuthStorage = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  } catch {
    // ignore storage failures
  }
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserRecord | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshNotifications = useCallback(async () => {
    if (!user?._id && !user?.id) return;

    try {
      const [listRes, countRes] = await Promise.all([
        notificationApi.getAll(),
        notificationApi.getUnreadCount(),
      ]);
      setNotifications(listRes?.data || []);
      setUnreadCount(countRes?.data?.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?._id, user?.id]);

  const syncMe = useCallback(async () => {
    try {
      const res = await authApi.getMe();
      if (res?.success && res.user) {
        const normalizedUser = res.user;
        if (!isValidRole(normalizedUser.role) || normalizedUser.isActive === false) {
          clearAuthStorage();
          setUser(null);
          setToken(null);
          return;
        }

        setUser(normalizedUser);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(normalizedUser));
        } catch {
          // ignore storage failures
        }
      } else {
        clearAuthStorage();
        setUser(null);
        setToken(null);
      }
    } catch {
      // Keep cached user; the Axios interceptor handles unauthorized sessions.
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
      try {
        localStorage.setItem(TOKEN_KEY, storedToken);
        localStorage.setItem(USER_KEY, JSON.stringify(storedUser));
        localStorage.removeItem(LEGACY_TOKEN_KEY);
        localStorage.removeItem(LEGACY_USER_KEY);
      } catch {
        // ignore storage migration failures
      }
      void syncMe();
    } else {
      clearAuthStorage();
      setInitializing(false);
    }
  }, [syncMe]);

  useEffect(() => {
    if (!user) return undefined;

    void refreshNotifications();
    const storedToken = getStoredToken();
    const streamUrl = storedToken
      ? `/api/notifications/stream?token=${encodeURIComponent(storedToken)}`
      : null;
    const eventSource = streamUrl ? new EventSource(streamUrl) : null;
    const handleNotification = () => {
      void refreshNotifications();
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    eventSource?.addEventListener('notification', handleNotification);
    const interval = window.setInterval(() => void refreshNotifications(), 15000);

    return () => {
      window.clearInterval(interval);
      eventSource?.removeEventListener('notification', handleNotification);
      eventSource?.close();
    };
  }, [user, refreshNotifications, queryClient]);

  const login = useCallback(async (credentials: UnknownRecord): Promise<AuthResult> => {
    setIsLoggingIn(true);
    try {
      const res = await authApi.login(credentials);
      if (!res?.success) throw new Error(res?.error || 'Login failed.');
      if (!res.token || !res.user) throw new Error('Invalid response from server.');
      if (!isValidRole(res.user.role) || res.user.isActive === false) {
        throw new Error('Your account is not active or does not have access to this app.');
      }

      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      toast.success(`Welcome back, ${res.user.fullName.split(' ')[0]}!`);
      return { ok: true, user: res.user };
    } catch (error) {
      const message = extractErrorMessage(error, 'Login failed.');
      toast.error(message);
      return { ok: false, error: message };
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const register = useCallback(async (payload: UnknownRecord): Promise<AuthResult> => {
    setIsRegistering(true);
    try {
      const res = await authApi.register(payload);
      if (!res?.success) throw new Error(res?.error || 'Registration failed.');
      if (!res.token || !res.user) throw new Error('Invalid response from server.');
      if (!isValidRole(res.user.role) || res.user.isActive === false) {
        throw new Error('This account cannot be used to access StaffPilot right now.');
      }

      localStorage.setItem(TOKEN_KEY, res.token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.user));
      setToken(res.token);
      setUser(res.user);
      toast.success(`Account created. Welcome, ${res.user.fullName.split(' ')[0]}!`);
      return { ok: true, user: res.user };
    } catch (error) {
      const message = extractErrorMessage(error, 'Registration failed.');
      toast.error(message);
      return { ok: false, error: message };
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout().catch(() => null);
    } finally {
      clearAuthStorage();
      setToken(null);
      setUser(null);
      setNotifications([]);
      setUnreadCount(0);
      setIsLoggingOut(false);
      toast.success('Logged out successfully.');
    }
  }, []);

  const hasRole = useCallback((requiredRole: Role) => Boolean(user && user.isActive !== false && isValidRole(user.role) && user.role === requiredRole), [user]);
  const hasAnyRole = useCallback((roles: readonly Role[]) => Boolean(user && user.isActive !== false && isValidRole(user.role) && roles.includes(user.role)), [user]);
  const getDashboardPath = useCallback(() => {
    if (!user || user.isActive === false || !isValidRole(user.role)) return '/login';
    return DASHBOARD_PATHS[user.role] || '/login';
  }, [user]);
  const isAuthenticated = Boolean(user && token && user.isActive !== false && isValidRole(user.role));

  const value = useMemo<AuthContextValue>(() => ({
    user,
    token,
    initializing,
    isAuthenticated,
    isLoggingIn,
    isRegistering,
    isLoggingOut,
    notifications,
    unreadCount,
    refreshNotifications,
    login,
    register,
    logout,
    syncMe,
    hasRole,
    hasAnyRole,
    getDashboardPath,
  }), [
    user, token, initializing, isAuthenticated, isLoggingIn, isRegistering, isLoggingOut,
    notifications, unreadCount, refreshNotifications, login, register, logout, syncMe,
    hasRole, hasAnyRole, getDashboardPath,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider.');
  return context;
};