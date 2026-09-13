import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Users,
  UserCheck,
  UserX,
  Download,
  Search,
  Clock,
  ShieldCheck,
  UserCog,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { Button, SelectField } from '../../components/ui/Form.jsx';
import { AttendanceCard } from '../../components/ui/AttendanceCard.jsx';
import { useCurrentUser } from '../../hooks/useApi.js';
import { CardSkeleton } from '../../components/ui/Skeleton.jsx';
import {
  useAttendanceTodayOverview,
  useAttendanceHistory,
  useAttendanceMonthly,
  useTeamLeads,
  useCheckInMutation,
  useCheckOutMutation,
  usePauseMutation,
  useResumeMutation,
  useAttendanceToday,
  useExportAttendanceMutation,
} from '../../hooks/useApi.js';
import { ROLES, ROLE_LABELS, ROLE_BADGE_CLASS } from '../../constants/roles.js';

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

const formatPauseTimeline = (pauses = []) => pauses.length
  ? pauses.map((pause) => `${formatTime(pause.startedAt)} - ${pause.endedAt ? formatTime(pause.endedAt) : 'Active'}`).join(', ')
  : '—';

const STATUS_STYLE = {
  present: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  absent: 'text-red-700 bg-red-50 border-red-200',
  half_day: 'text-amber-700 bg-amber-50 border-amber-200',
  leave: 'text-brand-700 bg-brand-50 border-brand-200',
  paused: 'text-amber-700 bg-amber-50 border-amber-200',
};

const STATUS_LABEL = {
  present: 'Present',
  absent: 'Absent',
  half_day: 'Half Day',
  leave: 'Leave',
  paused: 'Paused',
};

export const AdminAttendancePage = () => {
  const today = new Date();
  const defaultYear = today.getUTCFullYear();
  const defaultMonth = today.getUTCMonth() + 1;

  const [tab, setTab] = useState('today');
  const [role, setRole] = useState('');
  const [teamLead, setTeamLead] = useState('');
  const [q, setQ] = useState('');
  const [year, setYear] = useState(String(defaultYear));
  const [month, setMonth] = useState(String(defaultMonth).padStart(2, '0'));

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const { data: leads = [] } = useTeamLeads();
  const { data: user } = useCurrentUser();

  const overviewParams = useMemo(
    () => ({ role: role || undefined, teamLead: teamLead || undefined }),
    [role, teamLead]
  );
  const { data: overview, isLoading: overviewLoading } =
    useAttendanceTodayOverview(overviewParams);

  const filteredTodayRecords = useMemo(
    () => (overview?.records || []).filter((r) => (r.user?.role || r.role) !== ROLES.SUPER_ADMIN),
    [overview?.records]
  );
  const filteredTodayAbsent = useMemo(
    () =>
      (overview?.absentUsers || []).filter(
        (u) => (u.user?.role || u.role) !== ROLES.SUPER_ADMIN
      ),
    [overview?.absentUsers]
  );

  const myToday = useAttendanceToday();
  const checkInMut = useCheckInMutation();
  const checkOutMut = useCheckOutMutation();
  const pauseMut = usePauseMutation();
  const resumeMut = useResumeMutation();

  const historyParams = useMemo(
    () => ({
      page,
      limit: pageSize,
      q: q || undefined,
      role: tab === 'history' ? (role || undefined) : undefined,
      teamLead: tab === 'history' ? (teamLead || undefined) : undefined,
      sortBy,
      sortDir,
    }),
    [page, pageSize, q, role, teamLead, sortBy, sortDir, tab]
  );
  const { data: history, isLoading: historyLoading } =
    useAttendanceHistory(historyParams);

  const monthlyParams = useMemo(
    () => ({
      year,
      month,
      role: role || undefined,
      teamLead: teamLead || undefined,
    }),
    [year, month, role, teamLead]
  );
  const { data: monthly, isLoading: monthlyLoading } =
    useAttendanceMonthly(monthlyParams);


  const exportMut = useExportAttendanceMutation();

  const total = tab === 'history' ? history?.total || 0 : tab === 'monthly' ? monthly?.records?.length || 0 : 0;
  const records = tab === 'history' ? history?.data || [] : tab === 'monthly' ? monthly?.records || [] : [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const historyColumns = [
    {
      key: 'date',
      header: 'Date',
      minWidth: 120,
      sortable: true,
      accessor: 'date',
      cell: (row) => <span className="text-sm text-slate-800">{formatDate(row.date)}</span>,
    },
    {
      key: 'user',
      header: 'Employee',
      minWidth: 240,
      sortable: false,
      cell: (row) => {
        const u = row.user || {};
        const Icon =
          u.role === ROLES.SUPER_ADMIN
            ? ShieldCheck
            : u.role === ROLES.TEAM_LEAD
            ? UserCog
            : UserIcon;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium border ${
                u.role === ROLES.TEAM_LEAD
                  ? 'bg-brand-50 text-brand-600 border-brand-200'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200'
              }`}
            >
              {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
              <p className="text-xs text-slate-400 truncate">
                @{u.username}
                {u.role && (
                  <>
                    <span className="mx-1">·</span>
                    <span className={`badge-role ${ROLE_BADGE_CLASS[u.role]} !text-[10px]`}>
                      <Icon className="h-2.5 w-2.5" />
                      {ROLE_LABELS[u.role]}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'teamLead',
      header: 'Team Lead',
      minWidth: 160,
      sortable: false,
      cell: (row) => {
        const l = row.teamLead;
        if (!l) return <span className="text-xs text-slate-400">—</span>;
        return (
          <span className="text-sm text-slate-800 truncate">{l.fullName}</span>
        );
      },
    },
    {
      key: 'checkIn',
      header: 'Check In',
      minWidth: 120,
      sortable: true,
      accessor: 'checkIn',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <Clock className="h-3.5 w-3.5 text-emerald-600" />
          {formatTime(row.checkIn)}
        </span>
      ),
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      minWidth: 120,
      sortable: true,
      accessor: 'checkOut',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <Clock className="h-3.5 w-3.5 text-red-600" />
          {formatTime(row.checkOut)}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      minWidth: 110,
      sortable: true,
      accessor: 'workMinutes',
      cell: (row) => (
        <span className="text-sm font-medium text-slate-800">
          {formatDuration(row.workMinutes)}
        </span>
      ),
    },
    {
      key: 'pauses',
      header: 'Pause Timeline',
      minWidth: 210,
      sortable: false,
      cell: (row) => <span className="text-xs text-slate-600">{formatPauseTimeline(row.pauses)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      minWidth: 110,
      sortable: true,
      accessor: 'status',
      cell: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
            STATUS_STYLE[row.status] || STATUS_STYLE.absent
          }`}
        >
          {STATUS_LABEL[row.status] || row.status}
        </span>
      ),
    },
  ];

  const tabs = [
    { key: 'today', label: "Today's Attendance", icon: CalendarDays },
    { key: 'history', label: 'Attendance History', icon: CalendarCheck },
    { key: 'monthly', label: 'Monthly Report', icon: CalendarDays },
  ];

  const leadOptions = leads.map((l) => ({
    value: l.id,
    label: `${l.fullName} (${l.teamName})`,
  }));

  const exportParams = () => {
    if (tab === 'monthly') return { year, month, role: role || undefined, teamLead: teamLead || undefined };
    return { role: role || undefined, teamLead: teamLead || undefined };
  };

  const maxPresent = Math.max(1, ...(monthly?.daily || []).map((d) => d.present));
  const avgPresent = monthly?.daily?.length
    ? monthly.daily.reduce((s, d) => s + d.present, 0) / monthly.daily.length
    : 0;
  const avgPct = Math.min(100, (avgPresent / maxPresent) * 100);

  const renderStatsAndGraph = () => (
    overviewLoading ? (
      <CardSkeleton count={2} />
    ) : (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Total Users
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                  {overview?.totalUsers || 0}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl border border-brand-200 bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Present Today
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                  {overview?.totalPresent || 0}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-sm">
                <UserCheck className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Not Checked In
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                  {overview?.totalAbsent || 0}
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl border border-red-200 bg-red-50 flex items-center justify-center text-red-600 shadow-sm">
                <UserX className="h-5 w-5" />
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Monthly Attendance
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                  {monthly?.presentDays || 0}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {monthly?.totalWorkedHours || 0}h of {monthly?.totalExpectedHours || 0}h
                </p>
              </div>
              <div className="h-11 w-11 rounded-xl border border-brand-200 bg-brand-50 flex items-center justify-center text-brand-600 shadow-sm">
                <CalendarCheck className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>

        {monthly?.daily?.length ? (
          <div className="card p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
              <div>
                <p className="text-sm font-semibold text-slate-900">Attendance Trend</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daily presence for {monthly?.monthLabel || 'this month'}
                </p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-medium uppercase tracking-wider text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
                  Present
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-[2px] w-5 border-t-2 border-dashed border-amber-500" />
                  Avg ({avgPresent.toFixed(1)})
                </span>
              </div>
            </div>
            <div className="relative h-44 sm:h-48">
              <div className="absolute left-0 right-0 top-0 bottom-5 flex flex-col justify-between pointer-events-none">
                {[100, 75, 50, 25, 0].map((t) => (
                  <div key={t} className="flex items-center gap-2">
                    <span className="text-[10px] font-medium text-slate-400 w-7 text-right shrink-0 tabular-nums">
                      {Math.round((t / 100) * maxPresent)}
                    </span>
                    <div className={`flex-1 border-t ${t === 0 ? 'border-slate-200' : 'border-dashed border-slate-100'}`} />
                  </div>
                ))}
              </div>
              {avgPresent > 0 && (
                <div
                  className="absolute left-9 right-0 border-t-2 border-dashed border-amber-400/70 z-10 pointer-events-none"
                  style={{ bottom: `calc(1.25rem + ${avgPct}%)` }}
                >
                  <span className="absolute -top-4 right-0 text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
                    Avg {avgPresent.toFixed(1)}
                  </span>
                </div>
              )}
              <div className="absolute left-9 right-0 top-0 bottom-0 flex items-end gap-1.5 sm:gap-2">
                {monthly.daily.map((d) => {
                  const pct = (d.present / maxPresent) * 100;
                  const isPeak = d.present === maxPresent && d.present > 0;
                  return (
                    <div
                      key={d.date}
                      className="group relative flex-1 flex flex-col items-center min-w-0 h-full"
                    >
                      <div
                        className="absolute left-1/2 -translate-x-1/2 -top-1 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ bottom: `calc(${Math.max(4, pct)}% + 1.25rem + 8px)` }}
                      >
                        <div className="bg-slate-900 text-white text-[11px] font-medium rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap -translate-y-full">
                          <div className="tabular-nums">{d.present} present</div>
                          <div className="text-[10px] text-slate-300 mt-0.5">{d.date}</div>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1 mx-auto" />
                      </div>
                      <div className="w-full flex-1 flex items-end relative">
                        <div
                            className={`w-full rounded-t-md rounded-b-sm transition-all duration-300 ${
                            isPeak
                              ? 'bg-brand-600 ring-2 ring-brand-200/80'
                              : 'bg-brand-500 group-hover:bg-brand-600'
                          }`}
                          style={{ height: `${Math.max(3, pct)}%` }}
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
          </div>
        ) : null}
      </div>
    )
  );

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-brand-600 uppercase tracking-wider mb-1">
            Platform
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Attendance
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Monitor check-ins, run reports, and export attendance across the organization.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="md"
            leftIcon={<Download className="h-4 w-4" />}
            loading={exportMut.isPending}
            onClick={() => exportMut.mutate(exportParams())}
          >
            Export CSV
          </Button>
        </div>
      </div>

      {user?.role !== ROLES.SUPER_ADMIN ? (
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
          <div className="xl:col-span-2">{renderStatsAndGraph()}</div>
        </div>
      ) : (
        renderStatsAndGraph()
      )}

      <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setTab(t.key);
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-600 border border-brand-200'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-stretch sm:items-center gap-3">
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder={
              tab === 'today'
                ? 'Search absent users...'
                : 'Search employee by name...'
            }
            className="input-base pl-10 !py-2"
          />
        </div>
        <SelectField
          placeholder="All roles"
          options={[
            { value: '', label: 'All roles' },
            { value: ROLES.TEAM_LEAD, label: 'Team Leads' },
            { value: ROLES.INTERN, label: 'Interns' },
          ]}
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          inputClassName="!py-2 text-xs min-w-[140px]"
        />
        <SelectField
          placeholder="All team leads"
          options={[
            { value: '', label: 'All team leads' },
            ...leadOptions,
          ]}
          value={teamLead}
          onChange={(e) => {
            setTeamLead(e.target.value);
            setPage(1);
          }}
          inputClassName="!py-2 text-xs min-w-[200px]"
        />
        {tab === 'monthly' && (
          <div className="flex items-center gap-2">
            <SelectField
              placeholder="Year"
              options={Array.from({ length: 5 }).map((_, i) => {
                const y = defaultYear - i;
                return { value: String(y), label: String(y) };
              })}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              inputClassName="!py-2 text-xs min-w-[100px]"
            />
            <SelectField
              placeholder="Month"
              options={Array.from({ length: 12 }).map((_, i) => ({
                value: String(i + 1).padStart(2, '0'),
                label: new Date(2024, i, 1).toLocaleString('en-US', { month: 'long' }),
              }))}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              inputClassName="!py-2 text-xs min-w-[140px]"
            />
          </div>
        )}
      </div>

      {tab === 'today' ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Checked In Today{overview?.totalPresent ? ` · ${overview.totalPresent}` : ''}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Users who have completed their check-in
              </p>
            </div>
            {overviewLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 w-full rounded-md bg-slate-100" />
                  ))}
                </div>
              </div>
            ) : (overview?.records || []).length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400">
                No check-ins yet today.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {overview.records.map((r) => {
                  const u = r.user || {};
                  return (
                    <div key={r._id || r.id} className="flex items-center justify-between px-6 py-3 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center text-sm font-medium shrink-0">
                          {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                          <p className="text-xs text-slate-400 truncate">
                            {ROLE_LABELS[u.role] || u.role}
                            {r.teamLead?.fullName ? ` · Reports to ${r.teamLead.fullName}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-emerald-600" />
                          In {formatTime(r.checkIn)}
                        </span>
                        {r.checkOut && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-red-600" />
                            Out {formatTime(r.checkOut)}
                          </span>
                        )}
                        <span className={`badge-role ${STATUS_STYLE[r.status] || STATUS_STYLE.present}`}>
                          {STATUS_LABEL[r.status]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="border-b border-slate-200 px-6 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Absent Today{overview?.totalAbsent ? ` · ${overview.totalAbsent}` : ''}
              </h3>
              <p className="text-xs text-slate-600 mt-0.5">
                Users who have not yet checked in
              </p>
            </div>
            {overviewLoading ? (
              <div className="p-6">
                <div className="animate-pulse space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-10 w-full rounded-md bg-slate-100" />
                  ))}
                </div>
              </div>
            ) : (overview?.absentUsers || []).length === 0 ? (
              <div className="text-center py-12">
                <UserCheck className="h-10 w-10 mx-auto text-emerald-600 mb-3" />
                <p className="text-sm font-medium text-emerald-700">Everyone's in</p>
                <p className="text-xs text-slate-400 mt-1">
                  All users have checked in today.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-200 max-h-[480px] overflow-y-auto">
                {overview.absentUsers.map((u) => (
                  <div key={u._id || u.id} className="flex items-center justify-between px-6 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center text-sm font-medium shrink-0">
                        {u.fullName?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{u.fullName}</p>
                        <p className="text-xs text-slate-400 truncate">
                          @{u.username} · {ROLE_LABELS[u.role] || u.role}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border text-red-700 bg-red-50 border-red-200 shrink-0">
                      <UserX className="h-3 w-3" />
                      Not Checked In
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <DataTable
          title={tab === 'history' ? 'Attendance History' : `Monthly Report — ${monthly?.monthLabel || ''}`}
          subtitle={tab === 'history' ? 'All attendance records with search and filters' : `Summary for ${monthly?.monthLabel || ''}`}
          loading={tab === 'history' ? historyLoading : monthlyLoading}
          columns={historyColumns}
          data={records}
          total={total}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={(key, dir) => {
            setSortBy(key);
            setSortDir(dir);
          }}
          emptyState={
            <div className="text-center py-14">
              <CalendarCheck className="h-12 w-12 mx-auto text-slate-400 mb-3" />
              <p className="text-sm font-medium text-slate-700">No attendance records</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Adjust filters or choose a different month to view records.
              </p>
            </div>
          }
        />
      )}
    </div>
  );
};

export default AdminAttendancePage;
