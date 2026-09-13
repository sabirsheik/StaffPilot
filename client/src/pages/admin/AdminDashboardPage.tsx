import {
  Users,
  ShieldCheck,
  UserCog,
  FolderKanban,
  TrendingUp,
  CalendarCheck,
  UserCheck,
  UserX,
  Clock,
  Activity,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDashboardStats,
  useCurrentUser,
  useAttendanceMonthly,
  useAttendanceTodayOverview,
  useAttendanceToday,
  useAttendanceHistory,
} from '../../hooks/useApi';
import { Spinner } from '../../components/ui/Spinner';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { ROLE_LABELS, ROLE_BADGE_CLASS, ROLES } from '../../constants/roles';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
};

const formatTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const formatDuration = (mins) => {
  if (!mins || mins <= 0) return '0h 0m';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m`;
};

const STATUS_STYLE = {
  present: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  absent: 'text-red-700 bg-red-50 border-red-200',
  half_day: 'text-amber-700 bg-amber-50 border-amber-200',
  leave: 'text-brand-700 bg-brand-50 border-brand-200',
};

const STATUS_LABEL = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half Day',
  leave: 'Leave',
};

export const AdminDashboardPage = () => {
  const { data: user } = useCurrentUser();
  const { data: stats, isLoading, isError } = useDashboardStats();
  const { data: monthly } = useAttendanceMonthly({
    year: String(new Date().getUTCFullYear()),
    month: String(new Date().getUTCMonth() + 1).padStart(2, '0'),
  });
  const { data: overview, isLoading: overviewLoading } = useAttendanceTodayOverview({});
  const { data: todayList } = useAttendanceToday();
  const { data: recentActivity, isLoading: activityLoading } = useAttendanceHistory({
    limit: 5,
  });

  const statCards = [
    {
      label: 'Total Users',
      value: stats ? (stats?.teamLeads ?? 0) + (stats?.interns ?? 0) : '—',
      icon: Users,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
      subtitle: stats ? `Inactive: ${stats?.inactiveUsers ?? 0}` : undefined,
    },
    {
      label: 'Team Leads',
      value: stats?.teamLeads ?? 0,
      icon: UserCog,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
    },
    {
      label: 'Interns',
      value: stats?.interns ?? 0,
      icon: FolderKanban,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      label: 'Checked In Today',
      value: Array.isArray(todayList)
        ? todayList.filter((t) => t.status === 'present' && t.user?.role !== ROLES.SUPER_ADMIN).length
        : Array.isArray(overview?.records)
          ? overview.records.filter((r) => (r.user?.role || r.role) !== ROLES.SUPER_ADMIN).length
          : overview?.totalPresent ?? '—',
      icon: UserCheck,
      tone: 'bg-green-50 text-green-700 border-green-200',
      subtitle: overviewLoading ? 'Loading…' : 'Live',
    },
    {
      label: 'Absent Today',
      value: Array.isArray(todayList)
        ? todayList.filter((t) => t.status === 'absent' && t.user?.role !== ROLES.SUPER_ADMIN).length
        : Array.isArray(overview?.absentUsers)
          ? overview.absentUsers.filter((u) => (u.user?.role || u.role) !== ROLES.SUPER_ADMIN).length
          : overview?.totalAbsent ?? '—',
      icon: UserX,
      tone: 'bg-red-50 text-red-700 border-red-200',
    },
    {
      label: 'Monthly Worked Hours',
      value: typeof monthly?.totalWorkedHours === 'number' ? `${monthly.totalWorkedHours}h` : '—',
      icon: Clock,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      subtitle: monthly ? `${monthly.totalExpectedHours}h expected` : 'Current month',
    },
    {
      label: 'Monthly Attendance',
      value: `${monthly?.attendancePercentage ?? 0}%`,
      icon: CalendarCheck,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
    },
  ];

  const maxPresent = Math.max(
    1,
    ...((monthly?.daily || []).map((d) => d.present) || [0])
  );
  const totalPresence = monthly?.daily?.length
    ? monthly.daily.reduce((s, d) => s + d.present, 0)
    : 0;
  const avgPresence = monthly?.daily?.length ? totalPresence / monthly.daily.length : 0;
  const avgPct = Math.min(100, (avgPresence / maxPresent) * 100);

  return (
    <div className="page-shell space-y-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-card sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-brand-600">
            Control Center
          </p>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Overview of your organization, team health, and attendance trends.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/attendance"
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-500/20 bg-brand-500/10 px-3.5 py-2 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-500/20"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Attendance Console
          </Link>
          <div className={`badge-role ${ROLE_BADGE_CLASS[user?.role]}`}>
            <ShieldCheck className="h-3 w-3" />
            {ROLE_LABELS[user?.role]}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} className="text-brand-500" />
        </div>
      ) : isError ? (
        <div className="card p-6 text-center text-sm text-slate-500">
          Unable to load dashboard stats. Please refresh.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {statCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.label} className="stat-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        {card.label}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                        {card.value}
                      </p>
                      <div className="mt-2 flex items-center gap-1 text-xs">
                        <TrendingUp className="h-3 w-3 text-emerald-600" />
                        <span className="text-slate-400">
                          {card.subtitle ?? 'Live count'}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex h-11 w-11 items-center justify-center rounded-xl border ${card.tone}`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Attendance Analytics</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Calendar-month attendance for {monthly?.monthLabel || 'the current month'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                  Full
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
                  Half
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
                  Leave
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 border-l border-slate-200 pl-4">
                  <span className="h-[2px] w-5 border-t-2 border-dashed border-amber-500" />
                  Avg ({avgPresence.toFixed(1)})
                </span>
              </div>
            </div>
            <div className="divider mb-4" />
            {!monthly?.daily?.length ? (
              <CardSkeleton count={1} />
            ) : (
              <div className="relative h-52 sm:h-56">
                <div className="absolute left-0 right-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none">
                  {[100, 75, 50, 25, 0].map((t) => (
                    <div key={t} className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-slate-400 w-7 text-right shrink-0 tabular-nums">
                        {t === 0 ? '0' : (t / 100 * maxPresent).toFixed(maxPresent < 5 ? 1 : 0)}
                      </span>
                      <div className={`flex-1 border-t ${t === 0 ? 'border-slate-200' : 'border-dashed border-slate-100'}`} />
                    </div>
                  ))}
                </div>
                {avgPresence > 0 && (
                  <div
                    className="absolute left-9 right-0 border-t-2 border-dashed border-amber-400/70 z-10 pointer-events-none"
                    style={{ bottom: `calc(1.25rem + ${avgPct}%)` }}
                  >
                    <span className="absolute -top-4 right-0 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
                      Avg {avgPresence.toFixed(1)}
                    </span>
                  </div>
                )}
                <div className="absolute left-9 right-0 top-0 bottom-0 flex items-end gap-1.5 sm:gap-2">
                  {monthly.daily.map((d) => {
                    const val = d.present + d.half * 0.5;
                    const pct = (val / maxPresent) * 100;
                    const presentH = Math.max(d.present > 0 ? 4 : 0, (d.present / maxPresent) * 100);
                    const halfH = Math.max(d.half > 0 ? 3 : 0, (d.half * 0.5 / maxPresent) * 100);
                    const leaveH = Math.max(d.leave > 0 ? 2 : 0, (d.leave * 0.25 / maxPresent) * 100);
                    const isPeak = val === maxPresent && val > 0;
                    return (
                      <div
                        key={d.date}
                        className="group relative flex-1 flex flex-col items-center min-w-0 h-full"
                      >
                        <div
                          className="absolute left-1/2 -translate-x-1/2 -top-1 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ bottom: `calc(${Math.max(4, pct)}% + 1.25rem + 8px)` }}
                        >
                          <div className="bg-slate-900 text-white text-[11px] font-medium rounded-lg px-2.5 py-2 shadow-lg whitespace-nowrap -translate-y-full">
                            <div className="text-[10px] text-slate-300 mb-1 border-b border-slate-700 pb-1">{d.date}</div>
                            <div className="flex items-center gap-2 text-slate-100">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                                Full: {d.present}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-100">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm bg-amber-500" />
                                Half: {d.half}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-slate-100">
                              <span className="inline-flex items-center gap-1">
                                <span className="h-2 w-2 rounded-sm bg-brand-500" />
                                Leave: {d.leave}
                              </span>
                            </div>
                            <div className="mt-1 pt-1 border-t border-slate-700 text-[10px] text-slate-300">
                              Hours: {(d.totalMinutes / 60).toFixed(1)}h
                            </div>
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 mx-auto" />
                        </div>
                        <div className="w-full flex-1 flex flex-col gap-0.5 justify-end relative">
                          {d.leave > 0 && (
                            <div
                              className="w-full rounded bg-brand-500/70 shadow-[0_1px_2px_rgba(220,38,38,0.25)]"
                              style={{ height: `${leaveH}%` }}
                            />
                          )}
                          {d.half > 0 && (
                            <div
                              className={`w-full rounded ${isPeak ? 'ring-1 ring-amber-300/70' : ''} bg-amber-500`}
                              style={{ height: `${halfH}%` }}
                            />
                          )}
                          <div
                            className={`w-full rounded-t-md rounded-b-sm shadow-[0_2px_4px_-2px_rgba(16,185,129,0.45)] transition-all duration-300 group-hover:shadow-[0_4px_10px_-2px_rgba(16,185,129,0.6)] ${
                              isPeak
                                ? 'bg-emerald-600 ring-2 ring-emerald-200/80'
                                : 'bg-emerald-500 group-hover:bg-emerald-600'
                            }`}
                            style={{ height: `${presentH}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="absolute left-9 right-0 bottom-0 flex gap-1.5 sm:gap-2 items-start pt-1">
                  {monthly.daily.map((d) => {
                    const dateObj = new Date(d.date + 'T00:00:00');
                    const dayName = isNaN(dateObj) ? '' : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                    const md = d.date.slice(5);
                    return (
                      <div key={d.date} className="flex-1 min-w-0 flex flex-col items-center leading-tight">
                        <span className="text-[9px] sm:text-[10px] font-medium text-slate-600 tabular-nums">
                          {md}
                        </span>
                        <span className="hidden sm:block text-[9px] text-slate-400 -mt-0.5">
                          {dayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Recent Registrations</h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Latest accounts added to the platform
                  </p>
                </div>
                <Link
                  to="/admin/users"
                  className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Manage users →
                </Link>
              </div>
              <div className="divider mb-3" />
              {(stats?.recentRegistrations || []).length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">
                  No registrations yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {stats.recentRegistrations.map((r) => (
                    <div key={r.id || r._id} className="flex items-center justify-between py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-medium text-sm border ${
                            r.role === ROLES.SUPER_ADMIN
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : r.role === ROLES.TEAM_LEAD
                              ? 'bg-brand-50 text-brand-600 border-brand-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          {r.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{r.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">
                            @{r.username} · {r.teamInfo?.teamName || '—'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className={`badge-role ${ROLE_BADGE_CLASS[r.role]}`}>
                          {ROLE_LABELS[r.role]}
                        </span>
                        <span className="text-xs text-slate-400 hidden sm:inline">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <Activity className="h-4 w-4 text-brand-600" />
                      Recent Activity
                    </span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">Latest attendance events</p>
                </div>
              </div>
              <div className="divider mb-3" />
              {activityLoading ? (
                <div className="space-y-3">
                  <Skeleton count={5} className="h-9" />
                </div>
              ) : (recentActivity?.data || []).length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">
                  No activity yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.data.map((r) => {
                    const u = r.user || {};
                    return (
                      <div
                        key={r._id || r.id}
                        className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors"
                      >
                        <div
                          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium border ${
                            u.role === ROLES.TEAM_LEAD
                              ? 'bg-brand-50 text-brand-600 border-brand-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {u.fullName || 'Unknown user'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">
                            {r.checkIn ? `In ${formatTime(r.checkIn)}` : ''}
                            {r.checkIn && r.checkOut ? ' · ' : ''}
                            {r.checkOut ? `Out ${formatTime(r.checkOut)}` : ''}
                            {!r.checkIn && !r.checkOut ? 'Recorded' : ''}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${
                              STATUS_STYLE[r.status] || STATUS_STYLE.absent
                            }`}
                          >
                            {STATUS_LABEL[r.status]}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatDate(r.date)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboardPage;
