import type { Response } from 'express';

type NotificationEvent = {
  recipient: unknown;
  _id: unknown;
  actor?: unknown;
  entityId?: unknown;
  [key: string]: unknown;
};

const subscribers = new Map<string, Set<Response>>();

export const subscribeToNotifications = (userId: unknown, response: Response): (() => void) => {
  const key = String(userId);
  const listeners = subscribers.get(key) || new Set();
  listeners.add(response);
  subscribers.set(key, listeners);

  return () => {
    const current = subscribers.get(key);
    if (!current) return;
    current.delete(response);
    if (!current.size) subscribers.delete(key);
  };
};

export const publishNotification = (notification: NotificationEvent) => {
  if (!notification?.recipient) return;

  const listeners = subscribers.get(String(notification.recipient));
  if (!listeners?.size) return;

  const payload = JSON.stringify({
    ...notification,
    _id: String(notification._id),
    recipient: String(notification.recipient),
    actor: notification.actor ? String(notification.actor) : null,
    entityId: notification.entityId ? String(notification.entityId) : null,
  });

  for (const response of listeners) {
    try {
      response.write(`event: notification\ndata: ${payload}\n\n`);
    } catch {
      listeners.delete(response);
    }
  }

  if (!listeners.size) subscribers.delete(String(notification.recipient));
};
