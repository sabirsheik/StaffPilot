import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DASHBOARD_PATHS, ROLES, type Role } from '../constants/roles';
import { Spinner } from '../components/ui/Spinner';

interface RouteGuardProps {
  children: ReactNode;
  roles?: readonly Role[];
}

const VALID_ROLES = new Set<Role>(Object.values(ROLES));

const isValidRole = (role: unknown): role is Role => typeof role === 'string' && VALID_ROLES.has(role as Role);

const sanitizeRedirectTarget = (value: string | null): string | null => {
  if (!value) return null;

  const candidate = value.trim();
  if (!candidate || candidate.startsWith('//') || !candidate.startsWith('/')) return null;

  try {
    const url = new URL(candidate, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (['javascript:', 'data:', 'vbscript:'].includes(url.protocol.toLowerCase())) return null;
    return `${url.pathname}${url.search}${url.hash}` || '/';
  } catch {
    return null;
  }
};

const LoadingGuard = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <Spinner size={32} className="text-brand-500" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  </div>
);

export const ProtectedRoute = ({ children, roles }: RouteGuardProps) => {
  const { isAuthenticated, initializing, user, getDashboardPath } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingGuard />;

  const hasValidSession = isAuthenticated && !!user && user.isActive !== false && isValidRole(user.role);
  if (!hasValidSession) {
    const redirectTo = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectTo} replace />;
  }

  if (roles?.length && !roles.includes(user.role)) {
    const fallback = isValidRole(user.role) ? (DASHBOARD_PATHS[user.role] ?? '/login') : '/login';
    return <Navigate to={fallback || getDashboardPath()} replace />;
  }

  return children;
};

export const GuestOnlyRoute = ({ children }: RouteGuardProps) => {
  const { isAuthenticated, initializing, getDashboardPath, user } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingGuard />;
  if (isAuthenticated && user && user.isActive !== false && isValidRole(user.role)) {
    const redirect = sanitizeRedirectTarget(new URLSearchParams(location.search).get('redirect'));
    const target = redirect || getDashboardPath();
    return <Navigate to={target} replace />;
  }

  return children;
};

export default ProtectedRoute;