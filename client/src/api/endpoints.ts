import api from '../lib/axios';
import type {
  ApiEnvelope,
  AuthResponse,
  NotificationCountResponse,
  NotificationRecord,
  PaginatedResponse,
  QueryParams,
  UnknownRecord,
  UserRecord,
} from '../types/api';

export const authApi = {
  login: (data: UnknownRecord) => api.post<AuthResponse>('/auth/login', data).then((response) => response.data),
  register: (data: UnknownRecord) => api.post<AuthResponse>('/auth/register', data).then((response) => response.data),
  logout: () => api.post<ApiEnvelope<null>>('/auth/logout').then((response) => response.data),
  getMe: () => api.get<{ success: boolean; user: UserRecord }>('/auth/me').then((response) => response.data),
};

export const userApi = {
  getTeamLeads: (params?: QueryParams) => api.get<PaginatedResponse<UserRecord>>('/users/team-leads', { params }).then((response) => response.data),
  getUsers: (params?: QueryParams) => api.get<PaginatedResponse<UserRecord>>('/users', { params }).then((response) => response.data),
  getInterns: (params?: QueryParams) => api.get<PaginatedResponse<UserRecord>>('/users/interns', { params }).then((response) => response.data),
  getUserById: (id: string) => api.get<ApiEnvelope<UserRecord>>(`/users/${id}`).then((response) => response.data),
  createUser: (data: UnknownRecord) => api.post<ApiEnvelope<UserRecord>>('/users', data).then((response) => response.data),
  updateUser: (id: string, data: UnknownRecord) => api.put<ApiEnvelope<UserRecord>>(`/users/${id}`, data).then((response) => response.data),
  activateUser: (id: string) => api.patch<ApiEnvelope<UserRecord>>(`/users/${id}/activate`).then((response) => response.data),
  deactivateUser: (id: string) => api.patch<ApiEnvelope<UserRecord>>(`/users/${id}/deactivate`).then((response) => response.data),
  deleteUser: (id: string) => api.delete<ApiEnvelope<null>>(`/users/${id}`).then((response) => response.data),
  getDashboardStats: () => api.get<ApiEnvelope<UnknownRecord>>('/users/dashboard-stats').then((response) => response.data),
};

export const attendanceApi = {
  checkIn: (data: UnknownRecord = {}) => api.post<ApiEnvelope<UnknownRecord>>('/attendance/check-in', data).then((response) => response.data),
  checkOut: (data: UnknownRecord = {}) => api.post<ApiEnvelope<UnknownRecord>>('/attendance/check-out', data).then((response) => response.data),
  pause: (data: UnknownRecord = {}) => api.post<ApiEnvelope<UnknownRecord>>('/attendance/pause', data).then((response) => response.data),
  resume: (data: UnknownRecord = {}) => api.post<ApiEnvelope<UnknownRecord>>('/attendance/resume', data).then((response) => response.data),
  getTodayStatus: (params?: QueryParams) => api.get<ApiEnvelope<UnknownRecord>>('/attendance/today', { params }).then((response) => response.data),
  getTodayOverview: (params?: QueryParams) => api.get<ApiEnvelope<UnknownRecord>>('/attendance/today-overview', { params }).then((response) => response.data),
  getHistory: (params?: QueryParams) => api.get<PaginatedResponse<UnknownRecord>>('/attendance/history', { params }).then((response) => response.data),
  getMonthlyReport: (params?: QueryParams) => api.get<ApiEnvelope<UnknownRecord>>('/attendance/monthly-report', { params }).then((response) => response.data),
  exportCsv: (params?: QueryParams) => api.get<Blob>('/attendance/export', { params: { ...params, format: 'csv' }, responseType: 'blob' }).then((response) => response.data),
};

export const notificationApi = {
  getAll: (params?: QueryParams) => api.get<PaginatedResponse<NotificationRecord>>('/notifications', { params }).then((response) => response.data),
  getById: (id: string) => api.get<ApiEnvelope<NotificationRecord>>(`/notifications/${id}`).then((response) => response.data),
  getUnreadCount: () => api.get<NotificationCountResponse>('/notifications/unread-count').then((response) => response.data),
  markRead: (id: string) => api.patch<ApiEnvelope<NotificationRecord>>(`/notifications/${id}/read`).then((response) => response.data),
  markAllRead: () => api.patch<ApiEnvelope<null>>('/notifications/read-all').then((response) => response.data),
};

export const taskApi = {
  getAll: (params?: QueryParams) => api.get<PaginatedResponse<UnknownRecord>>('/tasks', { params }).then((response) => response.data),
  getById: (id: string) => api.get<ApiEnvelope<UnknownRecord>>(`/tasks/${id}`).then((response) => response.data),
  createTask: (data: UnknownRecord) => api.post<ApiEnvelope<UnknownRecord>>('/tasks', data).then((response) => response.data),
  updateTask: (id: string, data: UnknownRecord) => api.put<ApiEnvelope<UnknownRecord>>(`/tasks/${id}`, data).then((response) => response.data),
  updateStatus: (id: string, data: UnknownRecord) => api.patch<ApiEnvelope<UnknownRecord>>(`/tasks/${id}/status`, data).then((response) => response.data),
  deleteTask: (id: string) => api.delete<ApiEnvelope<null>>(`/tasks/${id}`).then((response) => response.data),
  submitTask: (id: string, summary: string, file?: File | null) => {
    const formData = new FormData();
    formData.append('summary', summary);
    if (file) formData.append('file', file);
    return api.post<ApiEnvelope<UnknownRecord>>(`/tasks/${id}/submission`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then((response) => response.data);
  },
};

export const settingsApi = {
  getSettings: () => api.get<ApiEnvelope<UnknownRecord>>('/settings').then((response) => response.data),
  updateSettings: (data: UnknownRecord) => api.put<ApiEnvelope<UnknownRecord>>('/settings', data).then((response) => response.data),
};

export const projectApi = {
  getProjects: (params?: QueryParams) => api.get<PaginatedResponse<UnknownRecord>>('/projects', { params }).then((response) => response.data),
  getProjectById: (id: string) => api.get<ApiEnvelope<UnknownRecord>>(`/projects/${id}`).then((response) => response.data),
  createProject: (data: UnknownRecord) => api.post<ApiEnvelope<UnknownRecord>>('/projects', data).then((response) => response.data),
  updateProject: (id: string, data: UnknownRecord) => api.put<ApiEnvelope<UnknownRecord>>(`/projects/${id}`, data).then((response) => response.data),
  deleteProject: (id: string) => api.delete<ApiEnvelope<null>>(`/projects/${id}`).then((response) => response.data),
  addRemark: (id: string, data: UnknownRecord) => api.post<ApiEnvelope<UnknownRecord>>(`/projects/${id}/remarks`, data).then((response) => response.data),
  editRemark: (id: string, remarkId: string, data: UnknownRecord) => api.put<ApiEnvelope<UnknownRecord>>(`/projects/${id}/remarks/${remarkId}`, data).then((response) => response.data),
  uploadFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ApiEnvelope<UnknownRecord>>(`/projects/${id}/files`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then((response) => response.data);
  },
  getAnalytics: () => api.get<ApiEnvelope<UnknownRecord>>('/projects/analytics').then((response) => response.data),
};