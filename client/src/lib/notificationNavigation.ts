import type { NotificationRecord } from '../types/api';
import type { Role } from '../constants/roles';

const basePath = (role: Role | undefined) => {
  if (role === 'super_admin') return '/admin';
  if (role === 'team_lead') return '/lead';
  return '/intern';
};

export const getNotificationDestination = (notification: NotificationRecord, role?: Role) => {
  const entityType = String(notification.entityType || '').toLowerCase();
  const entityId = notification.entityId;
  const context = new URLSearchParams({ notificationId: notification._id });

  if (entityId && (entityType === 'project' || entityType === 'project_file' || entityType === 'project_remark')) {
    return `${basePath(role)}/projects/${entityId}?${context.toString()}`;
  }

  if (entityId && (entityType === 'task' || entityType === 'task_submission' || entityType === 'comment' || entityType === 'mention')) {
    context.set('taskId', entityId);
    return `${basePath(role)}/tasks?${context.toString()}`;
  }

  if (entityId && (entityType === 'user' || entityType === 'employee' || entityType === 'team_intern_joined' || entityType === 'team_lead_registered')) {
    if (role === 'super_admin') {
      context.set('userId', entityId);
      return `/admin/users?${context.toString()}`;
    }
    return `${basePath(role)}/notifications?${context.toString()}`;
  }

  return `${basePath(role)}/notifications?${context.toString()}`;
};