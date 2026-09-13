import { useEffect, useState } from 'react';
import { Clock, LogIn, LogOut, CalendarCheck, CircleDot, Pause, Play } from 'lucide-react';
import { Button } from './Form.jsx';
import { Spinner } from './Spinner.jsx';

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

const formatDurationWithSeconds = (ms) => {
  const totalSeconds = Math.max(0, Math.floor((ms || 0) / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}h ${m}m ${s}s`;
};

const getPausedMilliseconds = (pauses = [], now = Date.now()) => pauses.reduce((total, pause) => {
  if (!pause?.startedAt) return total;
  const end = pause.endedAt ? new Date(pause.endedAt).getTime() : now;
  return total + Math.max(0, end - new Date(pause.startedAt).getTime());
}, 0);

const getWorkingMilliseconds = (record, now = Date.now()) => {
  if (!record?.checkIn) return 0;
  const end = record.checkOut ? new Date(record.checkOut).getTime() : now;
  const previousSessions = (record.workSessions || []).reduce((total, session) => {
    if (!session?.checkIn || !session?.checkOut) return total;
    return total + Math.max(0, new Date(session.checkOut).getTime() - new Date(session.checkIn).getTime());
  }, 0);
  const elapsed = Math.max(0, previousSessions + end - new Date(record.checkIn).getTime());
  return Math.max(0, elapsed - getPausedMilliseconds(record.pauses, now));
};

export const AttendanceCard = ({
  today,
  loading,
  onCheckIn,
  onCheckOut,
  onPause,
  onResume,
  checkingIn,
  checkingOut,
  pausing,
  resuming,
  title = 'Today\'s Attendance',
  compact = false,
}) => {
  const [, setNow] = useState(Date.now());
  useEffect(() => {
    if (!today?.checkIn || today?.checkOut) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [today?.checkIn, today?.checkOut, today?.status]);

  const checkIn = today?.checkIn;
  const checkOut = today?.checkOut;
  const paused = today?.status === 'paused';
  const canPause = Boolean(checkIn) && !checkOut && !paused && !pausing && !checkingOut;
  const canResume = Boolean(checkIn) && !checkOut && paused && !resuming;
  const canCheckOut = Boolean(checkIn) && !checkOut && !paused && !checkingOut && !pausing;
  const workingMilliseconds = getWorkingMilliseconds(today);
  const pauseMilliseconds = getPausedMilliseconds(today?.pauses);
  const workingMinutes = Math.floor(workingMilliseconds / 60000) || today?.workMinutes || 0;
  const pausedMinutes = Math.floor(pauseMilliseconds / 60000);
  const completedMinutes = workingMinutes;
  const targetMinutes = 8 * 60;
  const metTarget = completedMinutes >= targetMinutes;
  const canCheckIn = (!checkIn || (checkOut && completedMinutes < targetMinutes)) && !checkingIn;
  const openPause = [...(today?.pauses || [])].reverse().find((pause) => !pause.endedAt);
  const status = checkOut
    ? 'Completed'
    : paused
    ? 'Paused'
    : checkIn
    ? 'Working'
    : 'Not Started';

  const statusTone = checkOut
    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
    : paused
    ? 'text-amber-700 bg-amber-50 border-amber-200'
    : checkIn
    ? 'text-brand-700 bg-brand-50 border-brand-200'
    : 'text-slate-600 bg-slate-100 border-slate-200';

  return (
    <div className={`card ${compact ? 'p-5' : 'p-6'} card-hover`}>
      <div className="flex items-start justify-between gap-4 mb-5">
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl border border-brand-200 bg-brand-50 flex items-center justify-center text-brand-600">
            <CalendarCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusTone}`}
        >
          <CircleDot
            className={`h-1.5 w-1.5 ${
              status === 'In Progress' ? 'animate-pulse' : ''
            }`}
          />
          {status}
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Spinner size={24} className="text-brand-500" />
        </div>
      ) : (
        <>
          <div className={`grid ${compact ? 'grid-cols-2 gap-3' : 'grid-cols-3 gap-4'} mb-5`}>
            <div className="order-1 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Check In
              </p>
              <div className="flex items-center gap-2">
                <LogIn className={`h-4 w-4 ${checkIn ? 'text-emerald-600' : 'text-slate-400'}`} />
                <p
                  className={`text-lg font-semibold tracking-tight ${
                    checkIn ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {formatTime(checkIn)}
                </p>
              </div>
            </div>
            <div className="order-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Check Out
              </p>
              <div className="flex items-center gap-2">
                <LogOut className={`h-4 w-4 ${checkOut ? 'text-red-600' : 'text-slate-400'}`} />
                <p
                  className={`text-lg font-semibold tracking-tight ${
                    checkOut ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {formatTime(checkOut)}
                </p>
              </div>
            </div>
            <div className={`${compact ? 'col-span-2 sm:col-span-1' : ''} order-2 rounded-xl border border-slate-200 bg-slate-50 p-4`}>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500 mb-1.5">
                Duration
              </p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-brand-600" />
                <p className="text-lg font-semibold tracking-tight text-slate-900">
                  {formatDurationWithSeconds(workingMilliseconds || workingMinutes * 60000)}
                </p>
              </div>
            </div>
          </div>

          {(canCheckIn || canPause || canResume || canCheckOut) && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {canCheckIn && (
                <Button
                  variant="primary"
                  size="md"
                  loading={checkingIn}
                  onClick={onCheckIn}
                  leftIcon={<LogIn className="h-4 w-4" />}
                  className="flex-1"
                >
                  Check In Now
                </Button>
              )}
              {canPause && (
                <Button variant="secondary" size="md" loading={pausing} onClick={onPause} leftIcon={<Pause className="h-4 w-4" />} className="flex-1 !border-amber-300 !text-amber-700 hover:!bg-amber-50">
                  Pause
                </Button>
              )}
              {canResume && (
                <Button variant="primary" size="md" loading={resuming} onClick={onResume} leftIcon={<Play className="h-4 w-4" />} className="flex-1">
                  Resume
                </Button>
              )}
              {canCheckOut && (
                <Button
                  variant="secondary"
                  size="md"
                  loading={checkingOut}
                  onClick={onCheckOut}
                  leftIcon={<LogOut className="h-4 w-4" />}
                  className={`flex-1 ${
                    !checkingOut
                      ? '!bg-emerald-500 !text-white !border-emerald-500 hover:!bg-emerald-600 focus:!ring-emerald-500/50'
                      : ''
                  }`}
                >
                  Check Out
                </Button>
              )}
            </div>
          )}

          {checkIn && !checkOut && (
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-brand-200 bg-brand-50 p-3">
                <p className="text-[11px] font-medium uppercase tracking-wider text-brand-700">Working Time</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatDurationWithSeconds(workingMilliseconds || workingMinutes * 60000)}</p>
              </div>
              <div className={`rounded-xl border p-3 ${paused ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <p className={`text-[11px] font-medium uppercase tracking-wider ${paused ? 'text-amber-700' : 'text-slate-500'}`}>Pause Duration</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{formatDurationWithSeconds(pauseMilliseconds)}</p>
                {openPause && <p className="mt-0.5 text-xs text-amber-700">Paused since {formatTime(openPause.startedAt)}</p>}
              </div>
            </div>
          )}

          {checkOut && (
            <div className={`rounded-xl border p-4 ${metTarget ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg border flex items-center justify-center ${metTarget ? 'bg-emerald-100 border-emerald-200 text-emerald-600' : 'bg-amber-100 border-amber-200 text-amber-700'}`}>
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-sm font-medium ${metTarget ? 'text-emerald-800' : 'text-amber-800'}`}>
                    {metTarget ? '8-hour work target completed' : 'Attendance completed for today'}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Active working time: {formatDurationWithSeconds(workingMilliseconds || completedMinutes * 60000)}
                    {!metTarget && ` · ${formatDuration(targetMinutes - completedMinutes)} remaining to reach 8h target`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AttendanceCard;
