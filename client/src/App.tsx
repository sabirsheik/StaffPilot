import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, GuestOnlyRoute } from './routes/ProtectedRoute';
import { AppLayout } from './layouts/AppLayout';
import { DASHBOARD_PATHS, ROLES } from './constants/roles';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage'));
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage'));
const AdminTeamsPage = lazy(() => import('./pages/admin/AdminTeamsPage'));
const AdminSettingsPage = lazy(() => import('./pages/admin/AdminSettingsPage'));
const AdminAttendancePage = lazy(() => import('./pages/admin/AdminAttendancePage'));
const LeadDashboardPage = lazy(() => import('./pages/lead/LeadDashboardPage'));
const LeadInternsPage = lazy(() => import('./pages/lead/LeadInternsPage'));
const LeadAttendancePage = lazy(() => import('./pages/lead/LeadAttendancePage'));
const InternDashboardPage = lazy(() => import('./pages/intern/InternDashboardPage'));
const InternAttendancePage = lazy(() => import('./pages/intern/InternAttendancePage'));
const ProjectManagementPage = lazy(() => import('./pages/projects/ProjectManagementPage'));
const ProjectDetailPage = lazy(() => import('./pages/projects/ProjectDetailPage'));
const TaskManagementPage = lazy(() => import('./pages/TaskManagementPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } })?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      refetchOnReconnect: true,
    },
    mutations: { retry: false },
  },
});

const toastOptions = {
  position: 'top-right' as const,
  style: {
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '13px',
    padding: '10px 14px',
    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
  },
  success: { iconTheme: { primary: '#dc2626', secondary: '#fff' } },
  error: { duration: 5000 },
};

const HomeRedirect = () => {
  const { isAuthenticated, initializing, getDashboardPath } = useAuth();
  if (initializing) return <PageFallback />;
  return <Navigate to={isAuthenticated ? getDashboardPath() : '/login'} replace />;
};

const PageFallback = () => (
  <div className="flex min-h-[280px] items-center justify-center">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
  </div>
);

const AdminShell = () => <AppLayout title="Admin Console" subtitle="Organization-wide management & insights" />;
const LeadShell = () => <AppLayout title="Team Lead Workspace" subtitle="Manage your team, projects, and delivery" />;
const InternShell = () => <AppLayout title="My Workspace" subtitle="Your assignments, projects, and attendance" />;

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster toastOptions={toastOptions} containerClassName="font-sans" />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<GuestOnlyRoute><LoginPage /></GuestOnlyRoute>} />
            <Route path="/register" element={<GuestOnlyRoute><RegisterPage /></GuestOnlyRoute>} />

            <Route path="/admin" element={<ProtectedRoute roles={[ROLES.SUPER_ADMIN]}><AdminShell /></ProtectedRoute>}>
              <Route index element={<Navigate to={DASHBOARD_PATHS[ROLES.SUPER_ADMIN]} replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="teams" element={<AdminTeamsPage />} />
              <Route path="projects" element={<ProjectManagementPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="attendance" element={<AdminAttendancePage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>

            <Route path="/lead" element={<ProtectedRoute roles={[ROLES.TEAM_LEAD]}><LeadShell /></ProtectedRoute>}>
              <Route index element={<Navigate to={DASHBOARD_PATHS[ROLES.TEAM_LEAD]} replace />} />
              <Route path="dashboard" element={<LeadDashboardPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="interns" element={<LeadInternsPage />} />
              <Route path="attendance" element={<LeadAttendancePage />} />
              <Route path="projects" element={<ProjectManagementPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="tasks" element={<TaskManagementPage />} />
            </Route>

            <Route path="/intern" element={<ProtectedRoute roles={[ROLES.INTERN]}><InternShell /></ProtectedRoute>}>
              <Route index element={<Navigate to={DASHBOARD_PATHS[ROLES.INTERN]} replace />} />
              <Route path="dashboard" element={<InternDashboardPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="projects" element={<ProjectManagementPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="tasks" element={<TaskManagementPage />} />
              <Route path="attendance" element={<InternAttendancePage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </QueryClientProvider>
  );
}