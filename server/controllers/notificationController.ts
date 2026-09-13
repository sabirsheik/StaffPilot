// @ts-nocheck
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import Notification from '../models/Notification.js';
import User, { ROLES } from '../models/User.js';
import { publishNotification, subscribeToNotifications } from '../utils/notificationEvents.js';

export const createNotificationForUsers = async (recipients, payload) => {
  const normalizedRecipients = Array.isArray(recipients) ? recipients : [recipients];
  const uniqueIds = [...new Set(normalizedRecipients.filter(Boolean).map((id) => String(id)))];

  if (!uniqueIds.length || !payload || !payload.type || !payload.title || !payload.message) {
    return [];
  }

  const docs = uniqueIds.map((recipientId) => ({
    recipient: recipientId,
    actor: payload.actor || null,
    actorName: payload.actorName || 'System',
    type: payload.type,
    title: payload.title,
    message: payload.message,
    entityType: payload.entityType || null,
    entityId: payload.entityId || null,
  }));

  if (!docs.length) return [];
  const createdNotifications = await Notification.insertMany(docs);
  createdNotifications.forEach((notification) => publishNotification(notification.toObject()));
  return createdNotifications;
};

export const streamNotifications = (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(': connected\n\n');

  const unsubscribe = subscribeToNotifications(req.user.id, res);
  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
};

export const listNotifications = asyncHandler(async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(5, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [notifications, total] = await Promise.all([
    Notification.find({ recipient: req.user.id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments({ recipient: req.user.id }),
  ]);

  res.status(200).json({
    success: true,
    count: notifications.length,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    data: notifications,
  });
});

export const getUnreadNotificationCount = asyncHandler(async (req, res, next) => {
  const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });

  res.status(200).json({
    success: true,
    data: { unreadCount: count },
  });
});

export const getNotificationById = asyncHandler(async (req, res, next) => {
  const notification = await Notification.findOne({ _id: req.params.id, recipient: req.user.id }).lean();
  if (!notification) return next(new ErrorResponse('Notification not found.', 404));
  res.status(200).json({ success: true, data: notification });
});

export const markNotificationRead = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const notification = await Notification.findOne({ _id: id, recipient: req.user.id });

  if (!notification) {
    return next(new ErrorResponse('Notification not found.', 404));
  }

  notification.isRead = true;
  await notification.save();

  res.status(200).json({
    success: true,
    data: notification,
  });
});

export const markAllNotificationsRead = asyncHandler(async (req, res, next) => {
  await Notification.updateMany({ recipient: req.user.id, isRead: false }, { $set: { isRead: true } });

  res.status(200).json({
    success: true,
    message: 'All notifications marked as read.',
  });
});

export const notifySuperAdmins = async (payload) => {
  const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN }, '_id').lean();
  const ids = superAdmins.map((u) => u._id);
  return createNotificationForUsers(ids, payload);
};

export const notifyProjectActivity = async ({
  project,
  actor,
  actorName,
  title,
  message,
  type = 'project_update',
  includeSuperAdmins = true,
}) => {
  if (!project || !title || !message) return [];

  const projectLeadId = project.lead?._id || project.lead;
  const assignedInternIds = Array.isArray(project.assignedInterns)
    ? project.assignedInterns.map((intern) => intern?._id || intern)
    : [];

  const recipients = [projectLeadId, ...assignedInternIds].filter(Boolean);

  if (includeSuperAdmins) {
    const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN }, '_id').lean();
    recipients.push(...superAdmins.map((admin) => admin._id));
  }

  const uniqueRecipients = [...new Set(recipients.map((id) => String(id)))];

  return createNotificationForUsers(uniqueRecipients, {
    actor,
    actorName,
    type,
    title,
    message,
    entityType: 'project',
    entityId: project._id,
  });
};

export const notifyUserAssignment = async ({
  recipient,
  actor,
  actorName,
  title,
  message,
  type = 'user_update',
  includeSuperAdmins = true,
}) => {
  if (!recipient || !title || !message) return [];

  const recipients = [recipient];

  if (includeSuperAdmins) {
    const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN }, '_id').lean();
    recipients.push(...superAdmins.map((admin) => admin._id));
  }

  return createNotificationForUsers([...new Set(recipients.map((id) => String(id)))], {
    actor,
    actorName,
    type,
    title,
    message,
    entityType: 'user',
    entityId: recipient,
  });
};
