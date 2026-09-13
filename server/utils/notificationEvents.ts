const subscribers = new Map();

export const subscribeToNotifications = (userId, response) => {
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

export const publishNotification = (notification) => {
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
