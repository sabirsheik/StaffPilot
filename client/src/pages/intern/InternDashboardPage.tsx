import {
  User,
  Briefcase,
  CalendarCheck,
  ClipboardList,
  TrendingUp,
  FolderKanban,
  UserCog,
  Clock,
  Activity,
  LogIn,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useDashboardStats,
  useCurrentUser,
  useAttendanceMonthly,
  useAttendanceHistory,
  useCheckInMutation,
  useCheckOutMutation,
  usePauseMutation,
  useResumeMutation,
  useAttendanceToday,
} from '../../hooks/useApi';
import { Spinner } from '../../components/ui/Spinner';
import { Skeleton, CardSkeleton } from '../../components/ui/Skeleton';
import { ROLE_LABELS, ROLE_BADGE_CLASS } from '../../constants/roles';
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

export const InternDashboardPage = () => {
  const today = new Date();
  const defaultYear = today.getUTCFullYear();
  const defaultMonth = String(today.getUTCMonth() + 1).padStart(2, '0');

  const { data: user } = useCurrentUser();
  const { data: stats, isLoading, isError } = useDashboardStats();

  const lead = stats?.teamLead;

  const { data: monthly, isLoading: monthlyLoading } = useAttendanceMonthly({
    year: String(defaultYear),
    month: defaultMonth,
  });
  const { data: recentActivity, isLoading: activityLoading } = useAttendanceHistory({
    limit: 5,
  });

  const myToday = useAttendanceToday();
  const checkInMut = useCheckInMutation();
  const checkOutMut = useCheckOutMutation();
  const pauseMut = usePauseMutation();
  const resumeMut = useResumeMutation();

  const summary = (monthly?.summary || [])[0];
  const maxPresent = Math.max(1, ...((monthly?.daily || []).map((d) => d.present) || [0]));

  const statCards = [
    {
      label: 'Assigned Tasks',
      value: 0,
      icon: ClipboardList,
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      muted: true,
    },
    {
      label: 'Active Projects',
      value: 0,
      icon: FolderKanban,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
      muted: true,
    },
    {
      label: 'Monthly Present Days',
      value: monthly?.presentDays ?? 0,
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      subtitle: `${monthly?.totalWorkedHours ?? 0}h of ${monthly?.totalExpectedHours ?? 0}h`,
    },
    {
      label: 'This Month Hours',
      value: `${Math.round((summary?.totalWorkMinutes ?? 0) / 60)}h`,
      icon: Clock,
      tone: 'bg-brand-50 text-brand-700 border-brand-200',
      subtitle: `${monthly?.monthLabel || '—'}`,
    },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
            My Workspace
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Hello, {user?.fullName?.split(' ')[0] || 'there'} 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Your personal dashboard for attendance, assignments, and reporting.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/intern/attendance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 text-xs font-medium transition-colors"
          >
            <CalendarCheck className="h-3.5 w-3.5" />
            My Attendance
          </Link>
          <div className={`badge-role ${ROLE_BADGE_CLASS[user?.role]}`}>
            <User className="h-3 w-3" />
            {ROLE_LABELS[user?.role]}
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
                title="Today's Attendance"
              />
            </div>
            <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
                          {card.muted ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
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
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">My Team Lead</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Your reporting manager</p>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 border border-brand-200">
                  <UserCog className="h-4 w-4 text-brand-600" />
                </div>
              </div>
              <div className="divider mb-4" />
              {lead ? (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold border border-brand-200">
                      {lead.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {lead.fullName}
                      </p>
                      <p className="text-xs text-slate-400 truncate">@{lead.username}</p>
                    </div>
                  </div>
                  <InfoRow label="Team" value={lead.teamName || '—'} />
                  {/* Email removed per client request */}
                  <InfoRow label="Department" value={lead.department || user?.teamInfo?.department || '—'} />
                </div>
              ) : (
                <div className="text-center py-6 text-sm text-slate-400">
                  Team Lead information unavailable.
                </div>
              )}
            </div>

            <div className="xl:col-span-2 card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Monthly Attendance Trend</h3>
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
                    const pct = (d.present / maxPresent) * 100;
                    const label = new Date(d.date).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'numeric',
                      day: 'numeric',
                    });
                    return (
                      <div
                        key={d.date}
                        className="flex-1 flex flex-col items-center gap-1.5 min-w-0"
                        title={`${label} — present: ${d.present}, late: ${d.late}, hours: ${(d.totalMinutes / 60).toFixed(1)}h`}
                      >
                        <div className="w-full flex flex-col gap-0.5 justify-end" style={{ height: '128px' }}>
                          <div
                            className={`w-full rounded-t-md min-h-[4px] transition-all ${
                              d.present
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : 'bg-slate-200'
                            }`}
                            style={{
                              height: `${Math.max(4, d.present ? pct : 6)}%`,
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
              <div className="divider my-5" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Metric label="Working Days" value={monthly?.workingDays ?? 0} tone="brand" />
                <Metric label="Present Days" value={monthly?.presentDays ?? 0} tone="emerald" />
                <Metric label="Late Days" value={monthly?.lateDays ?? 0} tone="amber" />
                <Metric label="Attendance" value={`${monthly?.attendancePercentage ?? 0}%`} tone="brand" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card p-6 space-y-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">My Profile</h3>
                <p className="text-xs text-slate-500 mt-0.5">Account information</p>
              </div>
              <div className="divider" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow label="Full Name" value={user?.fullName || '—'} />
                <InfoRow label="Username" value={user?.username ? `@${user.username}` : '—'} />
                {/* Email removed per client request */}
                <InfoRow label="Joined" value={formatDate(user?.createdAt)} />
                <InfoRow label="Department" value={user?.teamInfo?.department || '—'} />
                <InfoRow label="Focus" value={user?.teamInfo?.projectFocus || '—'} />
              </div>
              <div className="divider" />
              {summary ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold text-slate-900 mb-3">
                    {monthly?.monthLabel} Summary
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <MetricSmall label="Present" value={summary.totalPresent} tone="emerald" />
                    <MetricSmall label="Absent" value={summary.totalAbsent} tone="red" />
                    <MetricSmall label="Half Days" value={summary.totalHalfDays} tone="amber" />
                    <MetricSmall label="Hours" value={formatDuration(summary.totalWorkMinutes)} tone="brand" />
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-50 border border-brand-200">
                      <Briefcase className="h-4 w-4 text-brand-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        Upcoming: projects & tasks
                      </p>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Your team lead is preparing the first round of assignments. Check back soon
                        for project boards, task tracking, and delivery milestones.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">
                    <span className="inline-flex items-center gap-2">
                      <Activity className="h-4 w-4 text-emerald-600" />
                      Recent Activity
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Latest attendance records</p>
                </div>
              </div>
              <div className="divider mb-3" />
              {activityLoading ? (
                <div className="space-y-3">
                  <Skeleton count={5} className="h-9" />
                </div>
              ) : (recentActivity?.data || []).length === 0 ? (
                <div className="text-center py-10 text-sm text-slate-400">
                  No activity yet. Mark your check-in to begin.
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.data.map((r) => (
                    <div
                      key={r._id || r.id}
                      className="flex items-start gap-3 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 text-xs font-medium">
                        {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {formatDate(r.date)}
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
                        </p>
                        {r.workMinutes > 0 && (
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            Worked {formatDuration(r.workMinutes)}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border shrink-0 mt-0.5 ${
                          STATUS_STYLE[r.status] || STATUS_STYLE.absent
                        }`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                  ))}
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
  <div>
    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{label}</p>
    <p className="text-sm text-slate-800 break-all">{value}</p>
  </div>
);

const Metric = ({ label, value, tone }) => {
  const map = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    brand: 'text-brand-700 bg-brand-50 border-brand-200',
  };
  return (
    <div className={`rounded-xl border bg-slate-50 px-4 py-3 ${map[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
};

const MetricSmall = ({ label, value, tone }) => {
  const map = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    brand: 'text-brand-700 bg-brand-50 border-brand-200',
  };
  return (
    <div className={`rounded-lg border p-2.5 bg-slate-50 ${map[tone]}`}>
      <p className="text-[9px] uppercase tracking-wider font-medium opacity-80">{label}</p>
      <p className="text-base font-bold text-slate-900 mt-0.5 tabular-nums">{value}</p>
    </div>
  );
};

export default InternDashboardPage;
