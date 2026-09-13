import { useMemo, useState } from 'react';
import {
  CalendarCheck,
  CalendarDays,
  Clock,
  RefreshCw,
  LogIn,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { AttendanceCard } from '../../components/ui/AttendanceCard.jsx';
import { CardSkeleton, Skeleton } from '../../components/ui/Skeleton.jsx';
import {
  useAttendanceHistory,
  useAttendanceMonthly,
  useCheckInMutation,
  useCheckOutMutation,
  usePauseMutation,
  useResumeMutation,
  useAttendanceToday,
  useDashboardStats,
} from '../../hooks/useApi.js';

const formatDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      weekday: 'short',
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

export const InternAttendancePage = () => {
  const today = new Date();
  const defaultYear = today.getUTCFullYear();
  const defaultMonth = today.getUTCMonth() + 1;

  const [tab, setTab] = useState('overview');
  const [year, setYear] = useState(String(defaultYear));
  const [month, setMonth] = useState(String(defaultMonth).padStart(2, '0'));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState('date');
  const [sortDir, setSortDir] = useState('desc');

  const myToday = useAttendanceToday();
  const checkInMut = useCheckInMutation();
  const checkOutMut = useCheckOutMutation();
  const pauseMut = usePauseMutation();
  const resumeMut = useResumeMutation();

  const { data: stats } = useDashboardStats();

  const historyParams = useMemo(
    () => ({ page, limit: pageSize, sortBy, sortDir }),
    [page, pageSize, sortBy, sortDir]
  );
  const { data: history, isLoading: historyLoading } =
    useAttendanceHistory(historyParams);

  const monthlyParams = useMemo(() => ({ year, month }), [year, month]);
  const { data: monthly, isLoading: monthlyLoading } =
    useAttendanceMonthly(monthlyParams);


  const total = tab === 'history' ? history?.total || 0 : monthly?.records?.length || 0;
  const records = tab === 'history' ? history?.data || [] : monthly?.records || [];
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const maxPresent = Math.max(1, ...(monthly?.daily || []).map((d) => d.present));

  const summary = useMemo(() => {
    if (!monthly?.summary?.length) return null;
    return monthly.summary[0];
  }, [monthly]);

  const columns = [
    {
      key: 'date',
      header: 'Date',
      minWidth: 180,
      sortable: true,
      accessor: 'date',
      cell: (row) => (
        <span className="text-sm text-slate-800">{formatDate(row.date)}</span>
      ),
    },
    {
      key: 'checkIn',
      header: 'Check In',
      minWidth: 130,
      sortable: true,
      accessor: 'checkIn',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <LogIn className="h-3.5 w-3.5 text-emerald-600" />
          {formatTime(row.checkIn)}
        </span>
      ),
    },
    {
      key: 'checkOut',
      header: 'Check Out',
      minWidth: 130,
      sortable: true,
      accessor: 'checkOut',
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 text-sm text-slate-700">
          <LogOut className="h-3.5 w-3.5 text-red-600" />
          {formatTime(row.checkOut)}
        </span>
      ),
    },
    {
      key: 'duration',
      header: 'Work Hours',
      minWidth: 120,
      sortable: true,
      accessor: 'workMinutes',
      cell: (row) => (
        <span className="text-sm font-medium text-slate-800 tabular-nums">
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
    {
      key: 'note',
      header: 'Note',
      minWidth: 180,
      sortable: false,
      cell: (row) =>
        row.note ? (
          <span className="text-xs text-slate-400 truncate max-w-[200px]">
            {row.note}
          </span>
        ) : (
          <span className="text-xs text-slate-500">—</span>
        ),
    },
  ];

  const tabs = [
    { key: 'overview', label: 'Overview', icon: CalendarDays },
    { key: 'history', label: 'History', icon: CalendarCheck },
    { key: 'monthly', label: 'Monthly', icon: CalendarDays },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider mb-1">
            My Workspace
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Attendance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Mark your check-in/out and review your attendance history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

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
        <div className="xl:col-span-2">
          {monthlyLoading ? (
            <CardSkeleton count={2} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                      Present Days
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                      {monthly?.presentDays || 0}
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl border border-emerald-200 bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                      Working Days
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                      {monthly?.workingDays || 0}
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl border border-amber-200 bg-amber-50 flex items-center justify-center text-amber-700">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                      Late Days
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                      {monthly?.lateDays || 0}
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl border border-brand-200 bg-brand-50 flex items-center justify-center text-brand-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                </div>
              </div>
              <div className="stat-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                      Hours Logged
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
                      {monthly?.totalWorkedHours || 0}h
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {Math.round((monthly?.totalWorkedHours || 0) * 60)} min
                    </p>
                  </div>
                  <div className="h-11 w-11 rounded-xl border border-brand-200 bg-brand-50 flex items-center justify-center text-brand-700">
                    <Clock className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {monthly?.daily?.length ? (
                <div className="col-span-1 sm:col-span-2 xl:col-span-4 card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Monthly Attendance</p>
                      <p className="text-xs text-slate-500">
                        Daily presence for {monthly?.monthLabel || 'this month'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-end gap-1.5 h-24">
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
                          title={`${label} — present: ${d.present}, leave: ${d.leave}, hours: ${(d.totalMinutes / 60).toFixed(1)}h`}
                        >
                          <div
                            className={`w-full rounded-t-md min-h-[4px] transition-all ${
                              d.present
                                ? 'bg-emerald-500 hover:bg-emerald-600'
                                : 'bg-slate-200'
                            }`}
                            style={{ height: `${Math.max(4, d.half ? pct * 0.5 : pct)}%` }}
                          />
                          <span className="text-[9px] text-slate-400 truncate w-full text-center">
                            {d.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

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
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {summary || stats?.teamLead ? (
            <div className="card p-6">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Reporting To</h3>
              <div className="divider mb-4" />
              {(() => {
                const lead = stats?.teamLead;
                if (!lead) return null;
                return (
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-brand-700 font-bold border border-brand-200">
                        {lead.fullName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{lead.fullName}</p>
                        <p className="text-xs text-slate-400">
                          {lead.teamName || 'Team Lead'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Row label="Department" value={lead.department || '—'} />
                      {/* Email removed per client request */}
                      <Row label="Username" value={lead.username ? `@${lead.username}` : '—'} />
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : null}

          <div className="card p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-3">
              Monthly Summary — {monthly?.monthLabel || ''}
            </h3>
            <div className="divider mb-4" />
            {monthlyLoading ? (
              <div className="space-y-3">
                <Skeleton count={4} className="h-8" />
              </div>
            ) : summary ? (
              <div className="space-y-3">
                <StatRow label="Present" value={summary.totalPresent} tone="emerald" />
                <StatRow label="Absent" value={summary.totalAbsent} tone="red" />
                <StatRow label="Half Days" value={summary.totalHalfDays} tone="amber" />
                <StatRow label="Leaves" value={summary.totalLeave} tone="brand" />
                <div className="divider my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 uppercase tracking-wider font-medium">
                    Total Work Hours
                  </span>
                  <span className="text-base font-semibold text-slate-900 tabular-nums">
                    {formatDuration(summary.totalWorkMinutes)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-slate-400">
                No records for this month yet.
              </div>
            )}
          </div>

          <div className="card p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-3">This Month</h3>
            <div className="divider mb-4" />
            <div className="space-y-3">
              <InfoPill
                title="Select Month"
                controls={
                  <div className="flex gap-2">
                    <select
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="rounded-lg bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all"
                    >
                      {Array.from({ length: 5 }).map((_, i) => {
                        const y = defaultYear - i;
                        return (
                          <option key={y} value={y}>
                            {y}
                          </option>
                        );
                      })}
                    </select>
                    <select
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="rounded-lg bg-white border border-slate-300 px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all"
                    >
                      {Array.from({ length: 12 }).map((_, i) => ({
                        v: String(i + 1).padStart(2, '0'),
                        l: new Date(2024, i, 1).toLocaleString('en-US', { month: 'long' }),
                      })).map(({ v, l }) => (
                        <option key={v} value={v}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              />
              <div className="divider my-2" />
              <p className="text-xs text-slate-400 leading-relaxed">
                Mark your attendance daily. Use the Check In / Check Out card at the start and
                end of your workday to maintain accurate records.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <DataTable
          title={tab === 'history' ? 'Attendance History' : `Monthly Report — ${monthly?.monthLabel || ''}`}
          subtitle={tab === 'history' ? 'All your attendance records' : `Your records for ${monthly?.monthLabel || ''}`}
          loading={tab === 'history' ? historyLoading : monthlyLoading}
          columns={columns}
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
              <p className="text-sm font-medium text-slate-800">No records yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                When you check in and out, your attendance will appear here.
              </p>
            </div>
          }
        />
      )}
    </div>
  );
};

const Row = ({ label, value }) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
    <p className="text-sm text-slate-800 break-all">{value}</p>
  </div>
);

const StatRow = ({ label, value, tone }) => {
  const map = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    red: 'text-red-700 bg-red-50 border-red-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    brand: 'text-brand-700 bg-brand-50 border-brand-200',
  };
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border tabular-nums ${map[tone] || map.emerald}`}>
        {value}
      </span>
    </div>
  );
};

const InfoPill = ({ title, controls }) => (
  <div>
    <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">
      {title}
    </p>
    <div>{controls}</div>
  </div>
);

export default InternAttendancePage;
