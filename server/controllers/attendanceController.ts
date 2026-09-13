// @ts-nocheck
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import Attendance, { ATTENDANCE_STATUS } from '../models/Attendance.js';
import User, { ROLES } from '../models/User.js';

const buildPagination = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return { page: p, limit: l, skip: (p - 1) * l };
};

const buildUserFilterExcludingSuperAdmins = (userFilter, superAdminIds) => {
  if (!userFilter) {
    return { $nin: superAdminIds };
  }

  if (userFilter && typeof userFilter === 'object' && userFilter.$in) {
    const values = Array.isArray(userFilter.$in) ? userFilter.$in : [userFilter.$in];
    return {
      ...userFilter,
      $in: values.filter((id) => !superAdminIds.some((s) => String(s) === String(id))),
    };
  }

  if (
    userFilter &&
    typeof userFilter === 'object' &&
    !Array.isArray(userFilter) &&
    Object.keys(userFilter).some((key) => key.startsWith('$'))
  ) {
    return {
      ...userFilter,
      $nin: superAdminIds,
    };
  }

  if (userFilter && typeof userFilter === 'object' && typeof userFilter.toHexString === 'function') {
    return {
      $in: [userFilter],
      $nin: superAdminIds,
    };
  }

  return {
    $in: [userFilter],
    $nin: superAdminIds,
  };
};

const getDayStartEnd = (dateInput, timezone) => {
  const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(d.getTime())) throw new Error('Invalid date.');

  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
  return { start, end };
};

const getMonthRange = (year, month) => {
  const m = parseInt(month, 10) - 1;
  const y = parseInt(year, 10);
  const start = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  return { start, end };
};

const getScheduledWorkingDays = (year, month) => {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day += 1) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday !== 0 && weekday !== 6) workingDays += 1;
  }
  return workingDays;
};

const isLateCheckIn = (record) => {
  if (!record.checkIn || !record.date) return false;
  const date = new Date(record.date);
  const cutoff = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 9));
  return new Date(record.checkIn).getTime() > cutoff.getTime();
};

const resolveUserId = (req) => {
  const targetId = req.params.userId || req.query.userId || req.body.userId;
  const requesterIsAdmin = req.user.role === ROLES.SUPER_ADMIN;
  const requesterIsLead = req.user.role === ROLES.TEAM_LEAD;
  const requesterIsIntern = req.user.role === ROLES.INTERN;

  if (!targetId) return { userId: req.user.id, mode: 'self' };

  if (requesterIsAdmin) return { userId: targetId, mode: 'admin' };

  if (requesterIsLead) {
    if (String(targetId) === String(req.user.id)) {
      return { userId: targetId, mode: 'self' };
    }
    const intern = { teamLead: req.user.id, role: ROLES.INTERN };
    return { userId: targetId, mode: 'lead-intern', scope: intern };
  }

  if (requesterIsIntern && String(targetId) === String(req.user.id)) {
    return { userId: targetId, mode: 'self' };
  }

  return { userId: targetId, mode: 'unauthorized' };
};

const buildAdminOrLeadAttendanceFilter = (req) => {
  const { role, teamLead, status, from, to } = req.query;
  const filter = {};

  if (status && Object.values(ATTENDANCE_STATUS).includes(status)) {
    filter.status = status;
  }

  if (teamLead) filter.teamLead = teamLead;

  const dateParts = [];
  if (from) {
    const s = new Date(from);
    if (!isNaN(s.getTime())) dateParts.push({ $gte: s });
  }
  if (to) {
    const e = new Date(to);
    if (!isNaN(e.getTime())) {
      e.setUTCHours(23, 59, 59, 999);
      dateParts.push({ $lte: e });
    }
  }
  if (dateParts.length) filter.date = Object.assign({}, ...dateParts);

  return { filter, roleFilter: role };
};

export const checkIn = asyncHandler(async (req, res, next) => {
  const { timezone, note } = req.body || {};
  const resolved = resolveUserId(req);
  const userId = resolved.userId;

  if (resolved.mode === 'unauthorized') {
    return next(new ErrorResponse('Not authorized to check in for this user.', 403));
  }

  if (resolved.mode === 'lead-intern') {
    const u = await User.findOne({ _id: userId, role: ROLES.INTERN, teamLead: req.user.id });
    if (!u) return next(new ErrorResponse('Not authorized to manage this intern.', 403));
  }

  const user = await User.findById(userId);
  if (!user) return next(new ErrorResponse('User not found.', 404));
  if (!user.isActive) return next(new ErrorResponse('User account is inactive.', 403));

  // Super admins (CEOs) are exempt from attendance tracking
  if (user.role === ROLES.SUPER_ADMIN) {
    return next(new ErrorResponse('Attendance tracking is disabled for administrator accounts.', 403));
  }

  // Super admins (CEOs) are exempt from attendance tracking
  if (user.role === ROLES.SUPER_ADMIN) {
    return next(new ErrorResponse('Attendance tracking is disabled for administrator accounts.', 403));
  }

  const now = new Date();
  const { start, end } = getDayStartEnd(now);

  const existing = await Attendance.findOne({
    user: userId,
    date: { $gte: start, $lte: end },
  });

  if (existing && existing.checkIn && !existing.checkOut) {
    return next(new ErrorResponse('You are already checked in today.', 400));
  }

  if (existing && existing.checkOut && (existing.workMinutes || 0) >= 8 * 60) {
    return next(new ErrorResponse('Your 8-hour work target is already complete for today.', 400));
  }

  const tz =
    typeof timezone === 'string' && timezone.trim()
      ? timezone.trim().slice(0, 64)
      : 'UTC';

  if (existing) {
    if (existing.checkIn && existing.checkOut) {
      existing.workSessions.push({ checkIn: existing.checkIn, checkOut: existing.checkOut });
    }
    existing.checkIn = now;
    existing.checkOut = undefined;
    existing.checkOutTimezone = undefined;
    existing.checkInTimezone = tz;
    if (note) existing.note = String(note).slice(0, 500);
    existing.status = ATTENDANCE_STATUS.PRESENT;
    const saved = await existing.save();
    return res.status(200).json({ success: true, data: saved });
  }

  const record = await Attendance.create({
    user: userId,
    teamLead: user.role === ROLES.INTERN ? user.teamLead : null,
    date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
    checkIn: now,
    checkInTimezone: tz,
    status: ATTENDANCE_STATUS.PRESENT,
    note: note ? String(note).slice(0, 500) : undefined,
  });

  res.status(201).json({ success: true, data: record });
});

export const checkOut = asyncHandler(async (req, res, next) => {
  const { timezone, note } = req.body || {};
  const resolved = resolveUserId(req);
  const userId = resolved.userId;

  if (resolved.mode === 'unauthorized') {
    return next(new ErrorResponse('Not authorized to check out for this user.', 403));
  }

  if (resolved.mode === 'lead-intern') {
    const u = await User.findOne({ _id: userId, role: ROLES.INTERN, teamLead: req.user.id });
    if (!u) return next(new ErrorResponse('Not authorized to manage this intern.', 403));
  }

  const now = new Date();
  const { start, end } = getDayStartEnd(now);

  const existing = await Attendance.findOne({
    user: userId,
    date: { $gte: start, $lte: end },
  });

  if (!existing || !existing.checkIn) {
    return next(new ErrorResponse('You must check in before you can check out.', 400));
  }

  if (existing.checkOut) {
    return next(new ErrorResponse('You have already checked out today.', 400));
  }

  if (existing.status === ATTENDANCE_STATUS.PAUSED) {
    return next(new ErrorResponse('Resume your attendance before checking out.', 400));
  }

  if (now.getTime() < existing.checkIn.getTime()) {
    return next(new ErrorResponse('Check out time cannot be earlier than check in time.', 400));
  }

  const tz =
    typeof timezone === 'string' && timezone.trim()
      ? timezone.trim().slice(0, 64)
      : 'UTC';

  existing.checkOut = now;
  existing.checkOutTimezone = tz;
  if (note) existing.note = (existing.note ? existing.note + ' | ' : '') + String(note).slice(0, 500);

  const saved = await existing.save();
  res.status(200).json({ success: true, data: saved });
});

const updatePauseState = async (req, res, next, action) => {
  const resolved = resolveUserId(req);
  const userId = resolved.userId;

  if (resolved.mode === 'unauthorized') {
    return next(new ErrorResponse(`Not authorized to ${action} attendance for this user.`, 403));
  }

  if (resolved.mode === 'lead-intern') {
    const u = await User.findOne({ _id: userId, role: ROLES.INTERN, teamLead: req.user.id });
    if (!u) return next(new ErrorResponse('Not authorized to manage this intern.', 403));
  }

  const now = new Date();
  const { start, end } = getDayStartEnd(now);
  const existing = await Attendance.findOne({ user: userId, date: { $gte: start, $lte: end } });

  if (!existing || !existing.checkIn) {
    return next(new ErrorResponse('You must check in before changing attendance state.', 400));
  }
  if (existing.checkOut) {
    return next(new ErrorResponse('Attendance is already checked out.', 400));
  }

  const openPause = existing.pauses?.find((pause) => !pause.endedAt);
  if (action === 'pause') {
    if (existing.status === ATTENDANCE_STATUS.PAUSED || openPause) {
      return next(new ErrorResponse('Attendance is already paused.', 400));
    }
    existing.pauses.push({ startedAt: now, durationMinutes: 0 });
    existing.status = ATTENDANCE_STATUS.PAUSED;
  } else {
    if (existing.status !== ATTENDANCE_STATUS.PAUSED || !openPause) {
      return next(new ErrorResponse('Attendance is not currently paused.', 400));
    }
    openPause.endedAt = now;
    openPause.durationMinutes = Math.max(0, Math.floor((now.getTime() - openPause.startedAt.getTime()) / 60000));
    existing.status = ATTENDANCE_STATUS.PRESENT;
  }

  const saved = await existing.save();
  return res.status(200).json({ success: true, data: saved });
};

export const pause = asyncHandler(async (req, res, next) => updatePauseState(req, res, next, 'pause'));
export const resume = asyncHandler(async (req, res, next) => updatePauseState(req, res, next, 'resume'));

export const getTodayStatus = asyncHandler(async (req, res, next) => {
  const resolved = resolveUserId(req);
  const userId = resolved.userId;

  if (resolved.mode === 'unauthorized') {
    return next(new ErrorResponse('Not authorized to view this status.', 403));
  }

  const now = new Date();
  const { start, end } = getDayStartEnd(now);

  const record = await Attendance.findOne({
    user: userId,
    date: { $gte: start, $lte: end },
  }).lean();

  res.status(200).json({
    success: true,
    data: record || {
      user: userId,
      date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
      checkIn: null,
      checkOut: null,
      status: ATTENDANCE_STATUS.ABSENT,
      workMinutes: 0,
    },
  });
});

export const getAttendanceHistory = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = buildPagination(req.query.page, req.query.limit);

  let filter = {};
  const resolved = resolveUserId(req);

  if (resolved.mode === 'unauthorized') {
    return next(new ErrorResponse('Not authorized to view this history.', 403));
  }

  if (resolved.mode === 'self') {
    filter.user = resolved.userId;
  } else if (resolved.mode === 'admin') {
    if (req.query.userId) filter.user = req.query.userId;
    const { filter: extra, roleFilter } = buildAdminOrLeadAttendanceFilter(req);
    Object.assign(filter, extra);

    if (roleFilter && Object.values(ROLES).includes(roleFilter)) {
      const userIds = await User.find({ role: roleFilter }, '_id').lean();
      filter.user = filter.user
        ? filter.user
        : { $in: userIds.map((u) => u._id) };
    }
  } else if (resolved.mode === 'lead-intern') {
    const ids = [req.user.id];
    const interns = await User.find(
      { teamLead: req.user.id, role: ROLES.INTERN },
      '_id'
    ).lean();
    interns.forEach((i) => ids.push(i._id));

    const { filter: extra } = buildAdminOrLeadAttendanceFilter(req);
    Object.assign(filter, extra);
    filter.user = req.query.userId
      ? { $in: ids.filter((i) => String(i) === String(req.query.userId)) }
      : { $in: ids };
  }

  const q = typeof req.query.q === 'string' && req.query.q.trim();
  if (q) {
    const matches = await User.find(
      {
        $or: [
          { fullName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } },
        ],
      },
      '_id'
    ).lean();
    const ids = matches.map((u) => u._id);
    filter.user = filter.user
      ? Array.isArray(filter.user.$in)
        ? { $in: filter.user.$in.filter((i) => ids.some((m) => String(m) === String(i))) }
        : { $in: ids.filter((i) => String(i) === String(filter.user)) }
      : { $in: ids };
  }

  const [total, records] = await Promise.all([
    // exclude attendance records belonging to SUPER_ADMIN users
    (async () => {
      const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN }, '_id').lean();
      const superAdminIds = superAdmins.map((s) => s._id);
      const countFilter = Object.assign({}, filter);
      countFilter.user = buildUserFilterExcludingSuperAdmins(countFilter.user, superAdminIds);
      return Attendance.countDocuments(countFilter);
    })(),
    (async () => {
      const superAdmins = await User.find({ role: ROLES.SUPER_ADMIN }, '_id').lean();
      const superAdminIds = superAdmins.map((s) => s._id);
      // ensure we don't return SUPER_ADMIN attendance rows
      const findFilter = Object.assign({}, filter);
      findFilter.user = buildUserFilterExcludingSuperAdmins(findFilter.user, superAdminIds);
      return Attendance.find(findFilter)
        .populate({
          path: 'user',
          select: '_id fullName username email role',
        })
        .populate({
          path: 'teamLead',
          select: '_id fullName username',
        })
        .sort({ date: -1, checkIn: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    })(),
  ]);

  res.status(200).json({
    success: true,
    count: records.length,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: records,
  });
});

export const getMonthlyReport = asyncHandler(async (req, res, next) => {
  const { year, month } = req.query;
  const today = new Date();
  const y = parseInt(year, 10) || today.getUTCFullYear();
  const m = parseInt(month, 10) || today.getUTCMonth() + 1;
  const { start, end } = getMonthRange(y, m);

  let filter = { date: { $gte: start, $lte: end } };
  const role = req.query.role;

  if (req.user.role === ROLES.INTERN) {
    filter.user = req.user.id;
  } else if (req.user.role === ROLES.TEAM_LEAD) {
    const ids = [req.user.id];
    const interns = await User.find(
      { teamLead: req.user.id, role: ROLES.INTERN },
      '_id'
    ).lean();
    interns.forEach((i) => ids.push(i._id));
    if (req.query.userId) {
      const ok = ids.some((i) => String(i) === String(req.query.userId));
      if (!ok) return next(new ErrorResponse('Not authorized.', 403));
      filter.user = req.query.userId;
    } else {
      filter.user = { $in: ids };
    }
    if (role && role === ROLES.INTERN) {
      const internIds = interns.map((i) => i._id);
      filter.user = Array.isArray(filter.user.$in)
        ? { $in: filter.user.$in.filter((i) => internIds.some((x) => String(x) === String(i))) }
        : filter.user;
    }
  } else {
    if (req.query.userId) filter.user = req.query.userId;
    if (role && Object.values(ROLES).includes(role)) {
      const userIds = await User.find({ role }, '_id').lean();
      filter.user = filter.user
        ? filter.user
        : { $in: userIds.map((u) => u._id) };
    }
    if (req.query.teamLead) {
      const leadInterns = await User.find(
        { teamLead: req.query.teamLead, role: ROLES.INTERN },
        '_id'
      ).lean();
      const ids = [req.query.teamLead, ...leadInterns.map((i) => i._id)];
      filter.user = filter.user
        ? Array.isArray(filter.user.$in)
          ? { $in: filter.user.$in.filter((i) => ids.some((x) => String(x) === String(i))) }
          : { $in: ids.filter((i) => String(i) === String(filter.user)) }
        : { $in: ids };
    }
  }

  // exclude SUPER_ADMIN attendance rows from monthly report
  const superAdminsMonthly = await User.find({ role: ROLES.SUPER_ADMIN }, '_id').lean();
  const superAdminIdsMonthly = superAdminsMonthly.map((s) => s._id);
  filter.user = buildUserFilterExcludingSuperAdmins(filter.user, superAdminIdsMonthly);

  const records = await Attendance.find(filter)
    .populate({
      path: 'user',
      select: '_id fullName username email role',
    })
    .populate({
      path: 'teamLead',
      select: '_id fullName',
    })
    .sort({ date: -1, checkIn: -1 })
    .lean();

  const workingDays = getScheduledWorkingDays(y, m);
  const dailyWorkingHours = 8;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const calendarDays = new Map();
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(Date.UTC(y, m - 1, day));
    const key = date.toISOString().slice(0, 10);
    calendarDays.set(key, {
      date: key,
      workingDay: date.getUTCDay() !== 0 && date.getUTCDay() !== 6,
      present: 0,
      late: 0,
      totalMinutes: 0,
    });
  }

  const byUser = new Map();
  for (const r of records) {
    const uid = String(r.user?._id || r.user);
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        user: r.user,
        teamLead: r.teamLead,
        totalPresent: 0,
        totalAbsent: 0,
        totalHalfDays: 0,
        totalLeave: 0,
        totalWorkMinutes: 0,
        lateDays: 0,
        records: [],
      });
    }
    const agg = byUser.get(uid);
    agg.records.push(r);
    agg.totalWorkMinutes += r.workMinutes || 0;
    if (isLateCheckIn(r)) agg.lateDays++;
    if (r.status === ATTENDANCE_STATUS.PRESENT || r.status === ATTENDANCE_STATUS.PAUSED) agg.totalPresent++;
    else if (r.status === ATTENDANCE_STATUS.ABSENT) agg.totalAbsent++;
    else if (r.status === ATTENDANCE_STATUS.HALF_DAY) agg.totalHalfDays++;
    else if (r.status === ATTENDANCE_STATUS.LEAVE) agg.totalLeave++;

    const day = calendarDays.get(new Date(r.date).toISOString().slice(0, 10));
    if (day) {
      if (r.checkIn) day.present++;
      if (isLateCheckIn(r)) day.late++;
      day.totalMinutes += r.workMinutes || 0;
    }
  }

  const summaries = Array.from(byUser.values()).map((summary) => {
    const expectedHours = workingDays * dailyWorkingHours;
    const workedHours = Number((summary.totalWorkMinutes / 60).toFixed(2));
    return {
      ...summary,
      totalAbsent: Math.max(0, workingDays - summary.totalPresent),
      expectedHours,
      workedHours,
      remainingHours: Number(Math.max(0, expectedHours - workedHours).toFixed(2)),
      attendancePercentage: expectedHours
        ? Number(Math.min(100, (workedHours / expectedHours) * 100).toFixed(1))
        : 0,
    };
  });

  const employeeCount = Math.max(1, summaries.length);
  const totalExpectedHours = workingDays * dailyWorkingHours * employeeCount;
  const totalWorkedHours = Number((records.reduce((total, r) => total + (r.workMinutes || 0), 0) / 60).toFixed(2));
  const presentDays = records.filter((r) => r.checkIn).length;
  const lateDays = records.filter(isLateCheckIn).length;

  res.status(200).json({
    success: true,
    data: {
      year: y,
      month: m,
      monthLabel: new Date(Date.UTC(y, m - 1, 1)).toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
      summary: summaries,
      records,
      workingDays,
      dailyWorkingHours,
      presentDays,
      absentDays: Math.max(0, workingDays * employeeCount - presentDays),
      lateDays,
      totalExpectedHours,
      totalWorkedHours,
      remainingHours: Number(Math.max(0, totalExpectedHours - totalWorkedHours).toFixed(2)),
      attendancePercentage: totalExpectedHours
        ? Number(Math.min(100, (totalWorkedHours / totalExpectedHours) * 100).toFixed(1))
        : 0,
      daily: Array.from(calendarDays.values()),
    },
  });
});

export const getTodayAttendance = asyncHandler(async (req, res, next) => {
  const now = new Date();
  const { start, end } = getDayStartEnd(now);

  let filter = { date: { $gte: start, $lte: end } };

  if (req.user.role === ROLES.TEAM_LEAD) {
    const ids = [req.user.id];
    const interns = await User.find(
      { teamLead: req.user.id, role: ROLES.INTERN },
      '_id'
    ).lean();
    interns.forEach((i) => ids.push(i._id));
    filter.user = { $in: ids };
  } else if (req.user.role === ROLES.INTERN) {
    filter.user = req.user.id;
  } else if (req.user.role === ROLES.SUPER_ADMIN) {
    if (req.query.role && Object.values(ROLES).includes(req.query.role)) {
      const userIds = await User.find({ role: req.query.role }, '_id').lean();
      filter.user = { $in: userIds.map((u) => u._id) };
    }
    if (req.query.teamLead) {
      const leadInterns = await User.find(
        { teamLead: req.query.teamLead, role: ROLES.INTERN },
        '_id'
      ).lean();
      filter.user = { $in: [req.query.teamLead, ...leadInterns.map((i) => i._id)] };
    }
  }

  const q = typeof req.query.q === 'string' && req.query.q.trim();
  if (q) {
    const matches = await User.find(
      {
        $or: [
          { fullName: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } },
          { username: { $regex: q, $options: 'i' } },
        ],
      },
      '_id'
    ).lean();
    const ids = matches.map((u) => u._id);
    filter.user = filter.user
      ? Array.isArray(filter.user.$in)
        ? { $in: filter.user.$in.filter((i) => ids.some((m) => String(m) === String(i))) }
        : { $in: ids.filter((i) => String(i) === String(filter.user)) }
      : { $in: ids };
  }

  // exclude SUPER_ADMIN attendance records from today's listing
  const superAdminsToday = await User.find({ role: ROLES.SUPER_ADMIN }, '_id').lean();
  const superAdminIdsToday = superAdminsToday.map((s) => s._id);
  filter.user = buildUserFilterExcludingSuperAdmins(filter.user, superAdminIdsToday);

  const records = await Attendance.find(filter)
    .populate({
      path: 'user',
      select: '_id fullName username email role',
    })
    .populate({
      path: 'teamLead',
      select: '_id fullName',
    })
    .sort({ checkIn: -1 })
    .lean();

  const allUsersQuery =
    req.user.role === ROLES.SUPER_ADMIN
      ? { role: { $in: [ROLES.TEAM_LEAD, ROLES.INTERN] } }
      : req.user.role === ROLES.TEAM_LEAD
      ? { $or: [{ _id: req.user.id }, { teamLead: req.user.id, role: ROLES.INTERN }] }
      : { _id: req.user.id };

  const allUsers = await User.find(allUsersQuery, '_id fullName username email role teamLead').lean();
  const covered = new Set(records.map((r) => String(r.user?._id || r.user)));
  const missing = allUsers.filter((u) => !covered.has(String(u._id)));

  const totalPresent = records.filter((r) => r.checkIn).length;
  const totalAbsent = missing.length;

  res.status(200).json({
    success: true,
    data: {
      date: now.toISOString(),
      totalUsers: allUsers.length,
      totalPresent,
      totalAbsent,
      records,
      absentUsers: missing,
    },
  });
});

export const exportAttendance = asyncHandler(async (req, res, next) => {
  if (req.user.role === ROLES.INTERN) {
    return next(new ErrorResponse('Not authorized to export attendance.', 403));
  }

  const { year, month, from, to, format = 'csv' } = req.query;

  let filter = {};
  if (year && month) {
    const { start, end } = getMonthRange(year, month);
    filter.date = { $gte: start, $lte: end };
  } else if (from || to) {
    const dp = {};
    if (from) {
      const s = new Date(from);
      if (!isNaN(s.getTime())) dp.$gte = s;
    }
    if (to) {
      const e = new Date(to);
      if (!isNaN(e.getTime())) {
        e.setUTCHours(23, 59, 59, 999);
        dp.$lte = e;
      }
    }
    if (Object.keys(dp).length) filter.date = dp;
  } else {
    const today = new Date();
    const { start, end } = getDayStartEnd(today);
    filter.date = { $gte: start, $lte: end };
  }

  if (req.user.role === ROLES.TEAM_LEAD) {
    const ids = [req.user.id];
    const interns = await User.find(
      { teamLead: req.user.id, role: ROLES.INTERN },
      '_id'
    ).lean();
    interns.forEach((i) => ids.push(i._id));
    filter.user = { $in: ids };
  }

  const records = await Attendance.find(filter)
    .populate({
      path: 'user',
      select: '_id fullName username email role',
    })
    .populate({
      path: 'teamLead',
      select: '_id fullName',
    })
    .sort({ date: -1, checkIn: -1 })
    .lean();

  const headers = [
    'Date',
    'Employee',
    'Username',
    'Email',
    'Role',
    'Team Lead',
    'Status',
    'Check In',
    'Check Out',
    'Work Hours',
    'Work Minutes',
    'Paused Minutes',
    'Pause Timeline',
    'Note',
  ];

  const rows = records.map((r) => {
    const roleLabel =
      r.user?.role === ROLES.TEAM_LEAD
        ? 'Team Lead'
        : r.user?.role === ROLES.INTERN
        ? 'Intern'
        : r.user?.role || '';
    const fmt = (d) => (d ? new Date(d).toISOString().replace('T', ' ').slice(0, 19) : '');
    return [
      new Date(r.date).toISOString().slice(0, 10),
      r.user?.fullName || '',
      r.user?.username || '',
      r.user?.email || '',
      roleLabel,
      r.teamLead?.fullName || '',
      r.status,
      fmt(r.checkIn),
      fmt(r.checkOut),
      (r.workMinutes || 0) / 60,
      r.workMinutes || 0,
      (r.pauses || []).reduce((sum, pause) => sum + (pause.durationMinutes || 0), 0),
      (r.pauses || []).map((pause) => `${fmt(pause.startedAt)} - ${fmt(pause.endedAt) || 'Active'}`).join(' | '),
      (r.note || '').replace(/\n/g, ' '),
    ];
  });

  const escapeCsv = (val) => {
    const s = String(val ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const csv = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `attendance-export-${stamp}.${format}`;

  if (format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).json({ success: true, data: records });
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send('\uFEFF' + csv);
});

