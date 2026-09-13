import { useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Check, Clock3, ListChecks, RefreshCw, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { notificationApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import Pagination from '../components/ui/Pagination';
import { getNotificationDestination } from '../lib/notificationNavigation';

const PAGE_SIZE = 8;

const formatDateTime = (value) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const NotificationsPage = () => {
  const { refreshNotifications } = useAuth();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightedId = searchParams.get('notificationId');
  const highlightedRef = useRef(null);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['notifications', page],
    queryFn: async () => {
      const res = await notificationApi.getAll({ page, limit: PAGE_SIZE });
      return res;
    },
    keepPreviousData: true,
  });

  const notifications = data?.data || [];
  const focusedQuery = useQuery({
    queryKey: ['notification', highlightedId],
    queryFn: async () => (await notificationApi.getById(highlightedId || '')).data,
    enabled: Boolean(highlightedId) && !notifications.some((item) => item._id === highlightedId),
    retry: false,
  });
  const visibleNotifications = useMemo(() => {
    if (!focusedQuery.data || notifications.some((item) => item._id === focusedQuery.data._id)) return notifications;
    return [focusedQuery.data, ...notifications];
  }, [focusedQuery.data, notifications]);
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const unreadCount = notifications.filter((item) => !item.isRead).length;

  useEffect(() => {
    if (!highlightedId || !highlightedRef.current) return undefined;
    const node = highlightedRef.current;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [highlightedId, visibleNotifications.length]);

  useEffect(() => {
    if (!highlightedId) return;
    const notification = visibleNotifications.find((item) => item._id === highlightedId);
    if (notification && !notification.isRead) {
      void notificationApi.markRead(notification._id).then(() => refreshNotifications()).catch(() => null);
    }
  }, [highlightedId, visibleNotifications, refreshNotifications]);

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      await Promise.all([refetch(), refreshNotifications()]);
    } catch {
      // ignore
    }
  };

  const markSingleRead = async (id) => {
    try {
      await notificationApi.markRead(id);
      await Promise.all([refetch(), refreshNotifications()]);
    } catch {
      // ignore
    }
  };

  const openNotification = async (notification) => {
    if (!notification.isRead) await markSingleRead(notification._id);
    const destination = getNotificationDestination(notification, user?.role);
    if (destination !== window.location.pathname + window.location.search) navigate(destination);
  };

  return (
    <div className="page-shell space-y-5">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-600">Workspace inbox</p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-[28px]">Notifications</h2>
          <p className="mt-1 text-sm text-slate-500">Updates and activity from your teams and projects.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex h-9 items-center gap-2 border border-slate-200 bg-white px-3 text-xs text-slate-600">
            <span className="font-medium text-slate-900">{unreadCount}</span>
            unread
          </div>
          <button
            type="button"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-busy={isFetching}
            className="btn-secondary !px-3 !py-2 text-xs disabled:cursor-wait"
            aria-label="Refresh notifications"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            type="button"
            onClick={markAllRead}
            className="btn-primary !px-3 !py-2 text-xs"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="overflow-hidden border border-slate-200 bg-white shadow-card">
        <div className="flex min-h-12 items-center justify-between border-b border-slate-200 bg-slate-50/80 px-4 sm:px-5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            <Bell className="h-3.5 w-3.5" />
            Recent activity
          </div>
          <span className="text-xs text-slate-400">{total} total</span>
        </div>
        {isLoading ? (
          <div className="divide-y divide-slate-100">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="flex gap-3 px-4 py-5 sm:px-5">
                <div className="h-9 w-9 shrink-0 animate-pulse bg-slate-100" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-4 w-2/5 animate-pulse bg-slate-100" />
                  <div className="h-3 w-4/5 animate-pulse bg-slate-100" />
                  <div className="h-3 w-1/4 animate-pulse bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="m-4 flex flex-col items-start gap-3 border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700 sm:m-5">
            <p>Unable to load notifications right now.</p>
            <button type="button" onClick={() => refetch()} className="btn-secondary !border-red-200 !px-3 !py-2 !text-xs !text-red-700">
              Try again
            </button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex min-h-[260px] flex-col items-center justify-center border-dashed border-slate-200 bg-slate-50 px-5 text-center">
            <div className="flex h-11 w-11 items-center justify-center border border-slate-200 bg-white text-slate-500">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No notifications yet</h3>
            <p className="mt-1 max-w-md text-sm text-slate-500">Project updates, assignments, and team activity will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleNotifications.map((notification) => (
              <div
                key={notification._id}
                ref={notification._id === highlightedId ? highlightedRef : undefined}
                className={`group relative flex gap-3 px-4 py-4 transition-colors sm:px-5 ${notification._id === highlightedId ? 'notification-context-highlight' : notification.isRead ? 'bg-white hover:bg-slate-50/70' : 'bg-brand-50/30 hover:bg-brand-50/60'}`}
                onClick={() => void openNotification(notification)}
              >
                {!notification.isRead && <span className="absolute inset-y-0 left-0 w-0.5 bg-brand-600" />}
                <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center border ${notification.isRead ? 'border-slate-200 bg-slate-50 text-slate-500' : 'border-brand-200 bg-white text-brand-600'}`}>
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 cursor-pointer">
                      <h3 className="truncate text-sm font-semibold text-slate-900 sm:text-[15px]">{notification.title}</h3>
                      <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5 text-xs text-slate-400 sm:pt-0.5">
                      <Clock3 className="h-3.5 w-3.5" />
                      <span>{formatDateTime(notification.createdAt)}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                    <span>{notification.actorName || 'System'} <span className="px-1 text-slate-300">·</span> {notification.type || 'general'}</span>
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); void markSingleRead(notification._id); }}
                        className="inline-flex items-center gap-1.5 font-medium text-brand-600 transition-colors hover:text-brand-800"
                      >
                        <Check className="h-3.5 w-3.5" />
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && !isError && notifications.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 sm:px-5">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={PAGE_SIZE}
              onChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
