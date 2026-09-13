import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { authApi, userApi, attendanceApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../lib/axios';

export const useCurrentUser = (options = {}) => {
  const { user, isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await authApi.getMe();
      return res?.user || null;
    },
    enabled: isAuthenticated && options.enabled !== false,
    initialData: user || undefined,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useTeamLeads = (options = {}) => {
  const { isAuthenticated } = useAuth();
  const enabled = options.enabled !== undefined ? options.enabled : isAuthenticated;
  return useQuery({
    queryKey: ['team-leads', options.params || {}],
    queryFn: async () => {
      const res = await userApi.getTeamLeads(options.params);
      return res?.data || [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useDashboardStats = (options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await userApi.getDashboardStats();
      return res?.data || null;
    },
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useUsers = (params = {}, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const res = await userApi.getUsers(params);
      return res;
    },
    enabled: isAuthenticated,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useInterns = (params = {}, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['interns', params],
    queryFn: async () => {
      const res = await userApi.getInterns(params);
      return res;
    },
    enabled: isAuthenticated,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useUser = (id, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['user', id],
    queryFn: async () => {
      const res = await userApi.getUserById(id);
      return res?.data || null;
    },
    enabled: Boolean(isAuthenticated && id),
    refetchOnWindowFocus: false,
    ...options,
  });
};

const invalidateUserQueries = (q) => {
  q.invalidateQueries({ queryKey: ['users'] });
  q.invalidateQueries({ queryKey: ['interns'] });
  q.invalidateQueries({ queryKey: ['team-leads'] });
  q.invalidateQueries({ queryKey: ['dashboard-stats'] });
  q.invalidateQueries({ queryKey: ['current-user'] });
};

export const useCreateUserMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await userApi.createUser(payload);
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      invalidateUserQueries(queryClient);
      toast.success(options.successMessage || 'User created successfully.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to create user.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useUpdateUserMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...payload }) => {
      const res = await userApi.updateUser(id, payload);
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      invalidateUserQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['user', vars.id] });
      toast.success(options.successMessage || 'User updated successfully.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to update user.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useActivateUserMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await userApi.activateUser(id);
      return res?.data;
    },
    onSuccess: (data, id, ctx) => {
      invalidateUserQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      toast.success(options.successMessage || 'User activated.');
      options.onSuccess?.(data, id, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to activate user.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useDeactivateUserMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await userApi.deactivateUser(id);
      return res?.data;
    },
    onSuccess: (data, id, ctx) => {
      invalidateUserQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      toast.success(options.successMessage || 'User deactivated.');
      options.onSuccess?.(data, id, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to deactivate user.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useDeleteUserMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id) => {
      const res = await userApi.deleteUser(id);
      return res;
    },
    onSuccess: (data, id, ctx) => {
      invalidateUserQueries(queryClient);
      toast.success(options.successMessage || 'User deleted successfully.');
      options.onSuccess?.(data, id, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to delete user.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuth();

  return useMutation({
    mutationFn: async () => logout(),
    onSettled: () => {
      queryClient.clear();
    },
  });
};

const invalidateAttendanceQueries = (q) => {
  q.invalidateQueries({ queryKey: ['attendance'] });
};

export const useAttendanceToday = (params = {}, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['attendance', 'today', params],
    queryFn: async () => {
      const res = await attendanceApi.getTodayStatus(params);
      return res?.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    ...options,
  });
};

export const useAttendanceTodayOverview = (params = {}, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['attendance', 'today-overview', params],
    queryFn: async () => {
      const res = await attendanceApi.getTodayOverview(params);
      return res?.data;
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
    ...options,
  });
};

export const useAttendanceHistory = (params = {}, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['attendance', 'history', params],
    queryFn: async () => {
      const res = await attendanceApi.getHistory(params);
      return res;
    },
    enabled: isAuthenticated,
    keepPreviousData: true,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useAttendanceMonthly = (params = {}, options = {}) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['attendance', 'monthly', params],
    queryFn: async () => {
      const res = await attendanceApi.getMonthlyReport(params);
      return res?.data;
    },
    enabled: isAuthenticated,
    refetchOnWindowFocus: false,
    ...options,
  });
};

export const useCheckInMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload = {}) => {
      const tz =
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
      const res = await attendanceApi.checkIn({ timezone: tz, ...payload });
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      invalidateAttendanceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(options.successMessage || 'Checked in successfully.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to check in.'));
      options.onError?.(err);
    },
    ...options,
  });
};

export const useCheckOutMutation = (options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload = {}) => {
      const tz =
        typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
      const res = await attendanceApi.checkOut({ timezone: tz, ...payload });
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      invalidateAttendanceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(options.successMessage || 'Checked out successfully.');
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Failed to check out.'));
      options.onError?.(err);
    },
    ...options,
  });
};

const useAttendanceStateMutation = (action, successMessage, options = {}) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload = {}) => {
      const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC';
      const res = await attendanceApi[action]({ timezone: tz, ...payload });
      return res?.data;
    },
    onSuccess: (data, vars, ctx) => {
      invalidateAttendanceQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success(options.successMessage || successMessage);
      options.onSuccess?.(data, vars, ctx);
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, `Failed to ${action} attendance.`));
      options.onError?.(err);
    },
    ...options,
  });
};

export const usePauseMutation = (options = {}) => useAttendanceStateMutation('pause', 'Attendance paused.', options);
export const useResumeMutation = (options = {}) => useAttendanceStateMutation('resume', 'Attendance resumed.', options);

export const useExportAttendanceMutation = (options = {}) => {
  return useMutation({
    mutationFn: async (params = {}) => {
      const blob = await attendanceApi.exportCsv(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `attendance-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      return true;
    },
    onSuccess: () => {
      toast.success(options.successMessage || 'Export started.');
      options.onSuccess?.();
    },
    onError: (err) => {
      toast.error(extractErrorMessage(err, 'Export failed.'));
      options.onError?.(err);
    },
    ...options,
  });
};
