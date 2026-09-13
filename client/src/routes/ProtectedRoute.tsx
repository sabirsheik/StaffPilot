import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DASHBOARD_PATHS, ROLES, type Role } from '../constants/roles';
import { Spinner } from '../components/ui/Spinner';

interface RouteGuardProps {
  children: ReactNode;
  roles?: readonly Role[];
}

const LoadingGuard = () => (
  <div className="flex min-h-screen items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <Spinner size={32} className="text-brand-500" />
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  </div>
);

export const ProtectedRoute = ({ children, roles }: RouteGuardProps) => {
  const { isAuthenticated, initializing, user } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingGuard />;
  if (!isAuthenticated) {
    const redirectTo = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
    return <Navigate to={redirectTo} replace />;
  }

  if (roles?.length && (!user?.role || !roles.includes(user.role))) {
    const fallback = user?.role ? DASHBOARD_PATHS[user.role] : DASHBOARD_PATHS[ROLES.INTERN];
    return <Navigate to={fallback} replace />;
  }

  return children;
};

export const GuestOnlyRoute = ({ children }: RouteGuardProps) => {
  const { isAuthenticated, initializing, getDashboardPath } = useAuth();
  const location = useLocation();

  if (initializing) return <LoadingGuard />;
  if (isAuthenticated) {
    const redirect = new URLSearchParams(location.search).get('redirect');
    const target = redirect?.startsWith('/') ? redirect : getDashboardPath();
    return <Navigate to={target} replace />;
  }

  return children;
};

export default ProtectedRoute;