import {
  Users,
  Briefcase,
  Clock,
  UserCheck,
  TrendingUp,
  FolderKanban,
  CalendarCheck,
  UserX,
  Activity,
  LogIn,
  LogOut,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDashboardStats,
  useCurrentUser,
  useAttendanceMonthly,
  useAttendanceTodayOverview,
  useAttendanceHistory,
  useCheckInMutation,
  useCheckOutMutation,
  usePauseMutation,
  useResumeMutation,
  useAttendanceToday,
} from '../../hooks/useApi';
import { Spinner } from '../../components/ui/Spinner';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { ROLE_LABELS, ROLE_BADGE_CLASS, ROLES } from '../../constants/roles';
import { AttendanceCard } from '../../components/ui/AttendanceCard';

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

export const LeadDashboardPage = () => {
  const { data: user } = useCurrentUser();
  const { data: stats, isLoading, isError } = useDashboardStats();

  const { data: monthly } = useAttendanceMonthly({
    year: String(new Date().getUTCFullYear()),
    month: String(new Date().getUTCMonth() + 1).padStart(2, '0'),
  });
  const { data: overview, isLoading: overviewLoading } = useAttendanceTodayOverview({});
  const { data: recentActivity, isLoading: activityLoading } = useAttendanceHistory({
    limit: 6,
  });

  const myToday = useAttendanceToday();
  const checkInMut = useCheckInMutation();
  const checkOutMut = useCheckOutMutation();
  const pauseMut = usePauseMutation();
  const resumeMut = useResumeMutation();

  const statCards = [
    {
      label: 'Team Interns',
      value: stats?.interns ?? 0,
      icon: Users,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      subtitle: 'Direct reports',
    },
    {
      label: 'Team',
      value: stats?.teamName || user?.teamInfo?.teamName || '—',
      icon: Briefcase,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
      isText: true,
    },
    {
      label: 'Team Checked In',
      value: overview?.totalPresent ?? 0,
      icon: UserCheck,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
      subtitle: 'Today · live',
    },
    {
      label: 'Pending',
      value: overview?.totalAbsent ?? 0,
      icon: UserX,
      tone: 'bg-red-50 text-red-700 border-red-200',
    },
    {
      label: 'Monthly Worked Hours',
      value: `${monthly?.totalWorkedHours ?? 0}h`,
      icon: Clock,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      subtitle: `${monthly?.totalExpectedHours ?? 0}h expected`,
    },
    {
      label: 'Projects',
      value: stats?.activeProjects ?? 0,
      icon: FolderKanban,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
      subtitle: 'Active portfolio',
    },
  ];

  const maxPresent = Math.max(
    1,
    ...((monthly?.daily || []).map((d) => d.present) || [0])
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brand-600 uppercase tracking-wider mb-1">
            Team Workspace
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Hi, {user?.fullName?.split(' ')[0] || 'Lead'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Dashboard showing your team, attendance, and upcoming responsibilities.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/lead/attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-brand-200 bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-medium transition-colors"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            Team Attendance
          </Link>
          <Link
            to="/lead/interns"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-medium transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
            My Interns
          </Link>
          <div className={`badge-role ${ROLE_BADGE_CLASS[user?.role]}`}>
            <Briefcase className="h-3 w-3" />
            {ROLE_LABELS[user?.role]}
            {user?.teamInfo?.teamName && (
              <span className="text-slate-400 ml-1">· {user.teamInfo.teamName}</span>
            )}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size={28} className="text-brand-500" />
        </div>
      ) : isError ? (
        <div className="card p-6 text-center text-slate-500 text-sm">
          Unable to load dashboard. Please refresh.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-1">
              <AttendanceCard
                today={myToday.data}
                loading={myToday.isLoading}
                onCheckIn={() => checkInMut.mutate()}
                onCheckOut={() => checkOutMut.mutate()}
                onPause={() => pauseMut.mutate()}
                onResume={() => resumeMut.mutate()}
                checkingIn={checkInMut.isPending}
                checkingOut={checkOutMut.isPending}
                pausing={pauseMut.isPending}
                resuming={resumeMut.isPending}
                title="My Attendance Today"
              />
            </div>
            <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {statCards.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.label} className="stat-card">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                          {card.label}
                        </p>
                        <p
                          className={`mt-2 tracking-tight ${
                            card.isText
                              ? 'text-lg font-semibold text-slate-900'
                              : 'text-3xl font-bold text-slate-900'
                          }`}
                        >
                          {card.value}
                        </p>
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                          {card.muted ? (
                            <>
                              <Clock className="h-3 w-3" />
                              <span>Coming soon</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3 text-emerald-600" />
                              <span className="text-slate-400">
                                {card.subtitle ?? 'Live'}
                              </span>
                            </>
                          )}
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
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    Team Attendance Trend
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Daily presence for {monthly?.monthLabel || 'this month'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-600" />
                    Present
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-amber-600" />
                    Half
                  </span>
                </div>
              </div>
              <div className="divider mb-4" />
              {!monthly?.daily?.length ? (
                <CardSkeleton count={1} />
              ) : (
                <div className="flex items-end gap-1.5 h-32 px-1">
                  {monthly.daily.map((d) => {
                    const val = d.present;
                    const pct = (val / maxPresent) * 100;
                    return (
                      <div
                        key={d.date}
                        className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
                        title={`${d.date} — present: ${d.present}, late: ${d.late}, hours: ${(d.totalMinutes / 60).toFixed(1)}h`}
                      >
                        <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: '128px' }}>
                          <div
                            className="w-full rounded-t-md bg-emerald-500 min-h-[4px] transition-all hover:bg-emerald-600"
                            style={{
                              height: `${Math.max(4, (d.present / maxPresent) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 truncate w-full text-center">
                          {d.date.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Department</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Team & project info</p>
                </div>
              </div>
              <div className="divider mb-4" />
              <InfoRow label="Team" value={user?.teamInfo?.teamName || '—'} />
              <InfoRow label="Department" value={user?.teamInfo?.department || '—'} />
              <InfoRow label="Focus" value={user?.teamInfo?.projectFocus || '—'} />
              <div className="divider my-4" />
              <div className="grid grid-cols-2 gap-3">
                <Pill label="Team Leads" value={stats?.teamLeads ?? 0} tone="brand" />
                <Pill label="Interns" value={stats?.interns ?? 0} tone="emerald" />
                <Pill label="Checked-in" value={overview?.totalPresent ?? 0} tone="brand" />
                <Pill label="Inactive" value={stats?.inactiveUsers ?? 0} tone="red" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">My Team Members</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Interns reporting to you directly
                  </p>
                </div>
                <Link
                  to="/lead/interns"
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Manage team →
                </Link>
              </div>
              <div className="divider mb-3" />
              {(stats?.teamMembers || []).length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-10 w-10 mx-auto text-slate-700 mb-3" />
                  <p className="text-sm font-medium text-slate-600">No interns yet</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    Add your first intern from the <span className="text-emerald-600">My Interns</span> page.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {stats.teamMembers.map((m) => (
                    <div
                      key={m.id || m._id}
                      className="flex items-center justify-between py-3 gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 font-semibold text-sm border border-emerald-200">
                          {m.fullName?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {m.fullName}
                          </p>
                          <p className="text-xs text-slate-400 truncate">@{m.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`badge-role ${
                            m.isActive === false
                              ? 'text-red-700 bg-red-50 border-red-200'
                              : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {m.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                        <span className="text-xs text-slate-400 hidden sm:inline">
                          Joined {formatDate(m.createdAt)}
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
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your team's attendance events
                  </p>
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
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                          {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-900 truncate">
                            {u.fullName || 'Unknown'}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate flex items-center gap-2">
                            {r.checkIn && (
                              <span className="inline-flex items-center gap-0.5">
                                <LogIn className="h-2.5 w-2.5 text-emerald-600" />
                                {formatTime(r.checkIn)}
                              </span>
                            )}
                            {r.checkOut && (
                              <span className="inline-flex items-center gap-0.5">
                                <LogOut className="h-2.5 w-2.5 text-red-600" />
                                {formatTime(r.checkOut)}
                              </span>
                            )}
                            {!r.checkIn && !r.checkOut && 'Recorded'}
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

const InfoRow = ({ label, value }) => (
  <div className="mb-3">
    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-0.5">
      {label}
    </p>
    <p className="text-sm text-slate-800 break-all">{value}</p>
  </div>
);

const Pill = ({ label, value, tone }) => {
  const map = {
    brand: 'text-brand-700 bg-brand-50 border-brand-200',
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    brand: 'text-brand-700 bg-brand-50 border-brand-200',
    red: 'text-red-700 bg-red-50 border-red-200',
  };
  return (
    <div className={`rounded-lg border p-2.5 bg-slate-50 ${map[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">{label}</p>
      <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
};

export default LeadDashboardPage;
