import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ROLE_LABELS, ROLE_BADGE_CLASS, ROLES } from '../../constants/roles';
import { Bell, ChevronDown, LogOut, Settings, UserRound } from 'lucide-react';
import BrandMark from '../ui/BrandMark';
import { notificationApi } from '../../api/endpoints';

const AppHeader = ({ title, subtitle }) => {
  const { user, notifications, unreadCount, logout, isLoggingOut } = useAuth();
  const { refreshNotifications } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef(null);
  const badgeClass = ROLE_BADGE_CLASS[user?.role] || '';
  const settingsRoute = user?.role === ROLES.SUPER_ADMIN ? '/admin/settings' : null;

  const notificationsRoute = useMemo(() => {
    switch (user?.role) {
      case ROLES.SUPER_ADMIN:
        return '/admin/notifications';
      case ROLES.TEAM_LEAD:
        return '/lead/notifications';
      case ROLES.INTERN:
        return '/intern/notifications';
      default:
        return '/login';
    }
  }, [user?.role]);

  const ordered = useMemo(
    () => [...(notifications || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)),
    [notifications]
  );

  const openNotification = async (notification) => {
    if (!notification?.isRead) {
      await notificationApi.markRead(notification._id).catch(() => null);
      await refreshNotifications();
    }
    setOpen(false);
    const context = new URLSearchParams({ notificationId: notification._id });
    navigate(`${notificationsRoute}?${context.toString()}`);
  };

  useEffect(() => {
    const closeMenus = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false);
        setProfileOpen(false);
      }
    };

    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setProfileOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeMenus);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeMenus);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 min-h-[68px] border-b border-slate-200/90 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
            <span className="flex h-9 w-9 items-center justify-center">
              <BrandMark className="h-9 w-9" />
            </span>
            StaffPilot workspace
          </div>
          <h1 className="truncate text-lg font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="truncate text-xs text-slate-500">{subtitle}</p>}
        </div>

        <div ref={menuRef} className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpen((v) => !v);
                setProfileOpen(false);
              }}
              className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-transparent bg-white text-slate-600 transition-colors duration-150 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              aria-label="Notifications"
            >
              <Bell className="h-6 w-6 stroke-[2.25]" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full border border-white bg-brand-600 px-1 text-[9px] font-bold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {open && (
              <div className="absolute right-0 top-14 z-40 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3.5 py-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">Recent workspace activity</p>
                  </div>
                  <div>
                    <Link
                      to={notificationsRoute}
                      className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                      onClick={() => setOpen(false)}
                    >
                      View all
                    </Link>
                  </div>
                </div>

                <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
                  {ordered.length === 0 ? (
                    <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-5 text-center text-xs text-slate-500">
                      No notifications yet.
                    </div>
                  ) : (
                    ordered.map((notification) => (
                      <button
                        key={notification._id}
                        type="button"
                        onClick={() => void openNotification(notification)}
                        className={`relative block w-full p-3.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500/35 ${notification.isRead ? 'bg-white hover:bg-slate-50' : 'bg-brand-50/30 hover:bg-brand-50/60'}`}
                      >
                        {!notification.isRead && <span className="absolute inset-y-3 left-0 w-0.5 bg-brand-600" />}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-slate-800">{notification.title}</p>
                            <p className="mt-1 text-xs text-slate-600">{notification.message}</p>
                          </div>
                          {!notification.isRead && (
                            <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                          )}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                          <span>{notification.actorName || 'System'}</span>
                          <span>{new Date(notification.createdAt).toLocaleString()}</span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((v) => !v);
                setOpen(false);
              }}
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
              className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left transition-colors duration-150 hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-brand-500/20 sm:gap-2.5"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-brand-200 bg-brand-50 text-xs font-semibold text-brand-700">
                {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
              </span>
              <span className="min-w-0">
                <span className="block max-w-[8rem] truncate text-xs font-semibold leading-5 text-slate-900 sm:max-w-[12rem]">{user?.fullName}</span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-14 z-40 w-[min(260px,calc(100vw-2rem))] overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-200 bg-slate-50/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{user?.fullName}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">{user?.username || 'StaffPilot account'}</p>
                    </div>
                    <span className={`badge-role !shrink-0 !rounded-md !border !px-2 !py-1 !text-[10px] !font-medium ${badgeClass}`}>
                      {ROLE_LABELS[user?.role]}
                    </span>
                  </div>
                </div>
                <div className="p-1.5">
                  <div className="flex items-center gap-2 px-2.5 py-2 text-xs text-slate-500">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <span>{ROLE_LABELS[user?.role]} account</span>
                  </div>
                  {settingsRoute && (
                    <Link
                      to={settingsRoute}
                      onClick={() => setProfileOpen(false)}
                      className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950"
                    >
                      <Settings className="h-4 w-4 text-slate-500" />
                      Settings
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={logout}
                    disabled={isLoggingOut}
                    className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" />
                    {isLoggingOut ? 'Signing out...' : 'Sign out'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
