import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  FolderKanban,
  UserCog,
  Building2,
  Clock,
  ClipboardList,
  Bell,
  Settings,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ROLES } from '../../constants/roles';
import { useState } from 'react';
import BrandMark from '../ui/BrandMark';

const NAV_ITEMS = Object.freeze({
  [ROLES.SUPER_ADMIN]: [
    {
      section: 'Overview',
      items: [
        { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/admin/notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      section: 'Management',
      items: [
        { to: '/admin/users', label: 'Users & Roles', icon: UserCog },
        { to: '/admin/teams', label: 'Teams', icon: Building2 },
      ],
    },
    {
      section: 'Platform',
      items: [
        { to: '/admin/projects', label: 'Projects', icon: FolderKanban },
        { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
        { to: '/admin/settings', label: 'Settings', icon: Settings },
      ],
    },
  ],
  [ROLES.TEAM_LEAD]: [
    {
      section: 'Overview',
      items: [
        { to: '/lead/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/lead/notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      section: 'My Team',
      items: [
        { to: '/lead/interns', label: 'Interns', icon: Users },
        { to: '/lead/attendance', label: 'Attendance', icon: Clock },
      ],
    },
    {
      section: 'Work',
      items: [
        { to: '/lead/projects', label: 'Projects', icon: FolderKanban },
        { to: '/lead/tasks', label: 'Tasks', icon: ClipboardList },
      ],
    },
  ],
  [ROLES.INTERN]: [
    {
      section: 'Overview',
      items: [
        { to: '/intern/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/intern/notifications', label: 'Notifications', icon: Bell },
      ],
    },
    {
      section: 'My Work',
      items: [
        { to: '/intern/projects', label: 'Projects', icon: FolderKanban },
        { to: '/intern/tasks', label: 'Tasks', icon: ClipboardList },
        { to: '/intern/attendance', label: 'Attendance', icon: CalendarCheck },
      ],
    },
  ],
});

const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  if (!user?.role) return null;

  const sections = NAV_ITEMS[user.role] || [];
  const isActive = (to) => {
    if (to.endsWith('/dashboard')) {
      return location.pathname === to;
    }
    return location.pathname.startsWith(to);
  };

  return (
    <aside
      className={`sticky top-0 flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200 shadow-sm ${
        collapsed ? 'w-[72px]' : 'w-64'
      }`}
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center">
            <BrandMark className="h-12 w-12" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-slate-900">StaffPilot</h1>
              <p className="truncate text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500">Operations Suite</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:text-slate-900 hover:bg-slate-50 sm:inline-flex"
        >
          {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                {section.section}
              </p>
            )}
            <ul className="space-y-1">
              {section.items.map(({ to, label, icon: Icon }) => {
                const active = isActive(to);
                return (
                  <li key={to}>
                    <NavLink
                      to={to}
                      className={`btn-sidebar ${active ? 'btn-sidebar-active' : ''} ${collapsed ? 'justify-center px-2' : ''}`}
                      title={collapsed ? label : undefined}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="truncate">{label}</span>}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

    </aside>
  );
};

export default Sidebar;
