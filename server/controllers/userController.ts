// @ts-nocheck
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import User, { ROLES } from '../models/User.js';
import { notifyUserAssignment } from './notificationController.js';

const buildPagination = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return { page: p, limit: l, skip: (p - 1) * l };
};

const buildSearchQuery = (search) => {
  if (!search || typeof search !== 'string' || !search.trim()) return null;
  const term = search.trim();
  const regex = { $regex: term, $options: 'i' };
  return {
    $or: [{ fullName: regex }, { email: regex }, { username: regex }],
  };
};

const buildUserListQuery = (req, base = {}) => {
  const { q, role, status, teamLead, department } = req.query;
  const query = { ...base };

  if (role && Object.values(ROLES).includes(role)) {
    query.role = role;
  }

  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;

  if (teamLead) query.teamLead = teamLead;

  if (department && typeof department === 'string') {
    query['teamInfo.department'] = { $regex: department.trim(), $options: 'i' };
  }

  const sq = buildSearchQuery(q);
  if (sq) Object.assign(query, sq);

  return query;
};

const USER_PUBLIC_FIELDS =
  '_id fullName username email role isActive teamLead teamInfo createdAt updatedAt lastLogin';

const sanitizeUserDoc = (u) => {
  if (!u) return null;
  const obj = u.toObject ? u.toObject() : { ...u };
  delete obj.password;
  return obj;
};

export const getUsers = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = buildPagination(req.query.page, req.query.limit);
  const sortBy = req.query.sortBy || 'createdAt';
  const sortDir = req.query.sortDir === 'asc' ? 1 : -1;

  let base = {};

  if (req.user.role === ROLES.TEAM_LEAD) {
    base = {
      $or: [{ _id: req.user.id }, { teamLead: req.user.id, role: ROLES.INTERN }],
    };
  } else if (req.user.role === ROLES.INTERN) {
    return next(new ErrorResponse('Not authorized to list users.', 403));
  }

  const query = buildUserListQuery(req, base);

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query, USER_PUBLIC_FIELDS)
      .populate({
        path: 'teamLead',
        select: '_id fullName username email teamInfo.teamName',
      })
      .sort({ [sortBy]: sortDir })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    count: users.length,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: users,
  });
});

export const getTeamLeads = asyncHandler(async (req, res, next) => {
  const query = { role: ROLES.TEAM_LEAD, isActive: true };
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    const regex = { $regex: q, $options: 'i' };
    query.$or = [{ fullName: regex }, { email: regex }, { username: regex }];
  }

  const teamLeads = await User.find(query, USER_PUBLIC_FIELDS)
    .sort({ fullName: 1 })
    .lean();

  const sanitized = teamLeads.map((lead) => ({
    id: lead._id,
    fullName: lead.fullName,
    username: lead.username,
    email: lead.email,
    teamName: lead.teamInfo?.teamName || 'Unassigned',
    department: lead.teamInfo?.department || null,
    projectFocus: lead.teamInfo?.projectFocus || null,
  }));

  res.status(200).json({
    success: true,
    count: sanitized.length,
    data: sanitized,
  });
});

export const getInterns = asyncHandler(async (req, res, next) => {
  const query = { role: ROLES.INTERN };

  if (req.user.role === ROLES.TEAM_LEAD) {
    query.teamLead = req.user.id;
  } else if (req.user.role === ROLES.INTERN) {
    query._id = req.user.id;
  }

  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (q) {
    const regex = { $regex: q, $options: 'i' };
    query.$or = [{ fullName: regex }, { email: regex }, { username: regex }];
  }

  const { page, limit, skip } = buildPagination(req.query.page, req.query.limit);

  const [total, interns] = await Promise.all([
    User.countDocuments(query),
    User.find(query, USER_PUBLIC_FIELDS)
      .populate({
        path: 'teamLead',
        select: '_id fullName username email teamInfo.teamName',
      })
      .sort({ fullName: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    count: interns.length,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: interns,
  });
});

export const getUserById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id, USER_PUBLIC_FIELDS).populate({
    path: 'teamLead',
    select: '_id fullName username email teamInfo',
  });

  if (!user) {
    return next(new ErrorResponse('User not found.', 404));
  }

  if (req.user.role === ROLES.INTERN && String(user._id) !== String(req.user.id)) {
    return next(new ErrorResponse('Not authorized to view this user.', 403));
  }

  if (req.user.role === ROLES.TEAM_LEAD && String(user._id) !== String(req.user.id)) {
    const leadId = String(user.teamLead?._id || user.teamLead || '');
    if (leadId !== String(req.user.id)) {
      return next(new ErrorResponse('Not authorized to view this user.', 403));
    }
  }

  res.status(200).json({
    success: true,
    data: sanitizeUserDoc(user),
  });
});

export const createUser = asyncHandler(async (req, res, next) => {
  if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Not authorized to create users.', 403));
  }

  const {
    fullName,
    email,
    username,
    password,
    role,
    teamInfo,
    teamLead,
    isActive,
  } = req.body;

  if (!fullName || !email || !username || !password || !role) {
    return next(new ErrorResponse('All required fields must be provided.', 400));
  }

  if (password.length < 6) {
    return next(new ErrorResponse('Password must be at least 6 characters long.', 400));
  }

  let allowedRoles = [];
  if (req.user.role === ROLES.SUPER_ADMIN) {
    allowedRoles = [ROLES.TEAM_LEAD, ROLES.INTERN];
  } else if (req.user.role === ROLES.TEAM_LEAD) {
    allowedRoles = [ROLES.INTERN];
  }

  if (!allowedRoles.includes(role)) {
    return next(
      new ErrorResponse(`You are only authorized to create: ${allowedRoles.join(', ')}.`, 403)
    );
  }

  const userData = {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    username: username.trim(),
    password,
    role,
    isActive: typeof isActive === 'boolean' ? isActive : true,
  };

  if (role === ROLES.TEAM_LEAD) {
    if (teamInfo && typeof teamInfo === 'object') {
      userData.teamInfo = {
        teamName: teamInfo.teamName?.trim(),
        department: teamInfo.department?.trim() || undefined,
        projectFocus: teamInfo.projectFocus?.trim() || undefined,
      };
    }
  }

  if (role === ROLES.INTERN) {
    const assignedLead =
      req.user.role === ROLES.TEAM_LEAD ? req.user.id : teamLead;

    if (!assignedLead) {
      return next(new ErrorResponse('Intern must be assigned to a Team Lead.', 400));
    }
    const lead = await User.findOne({
      _id: assignedLead,
      role: ROLES.TEAM_LEAD,
      isActive: true,
    });
    if (!lead) {
      return next(new ErrorResponse('Assigned Team Lead is invalid or inactive.', 400));
    }
    userData.teamLead = lead._id;
  }

  const [existingEmail, existingUsername] = await Promise.all([
    User.findOne({ email: userData.email }),
    User.findOne({ username: userData.username }),
  ]);
  if (existingEmail) {
    return next(new ErrorResponse('An account with this email already exists.', 400));
  }
  if (existingUsername) {
    return next(new ErrorResponse('An account with this username already exists.', 400));
  }

  const reserved = process.env.SUPER_ADMIN_USERNAME;
  if (reserved && username.trim() === reserved) {
    return next(new ErrorResponse('This username is not available.', 400));
  }

  const user = await User.create(userData);

  if (user.role === ROLES.INTERN && user.teamLead) {
    await notifyUserAssignment({
      recipient: user._id,
      actor: req.user.id,
      actorName: req.user.fullName || req.user.username,
      title: 'You were assigned to a team lead',
      message: `${req.user.fullName || req.user.username} assigned you to the team and project workflow.`,
      type: 'intern_assigned',
    });
  }

  if (user.role === ROLES.INTERN && user.teamLead) {
    const lead = await User.findById(user.teamLead).select('_id fullName username');
    if (lead) {
      await notifyUserAssignment({
        recipient: lead._id,
        actor: req.user.id,
        actorName: req.user.fullName || req.user.username,
        title: `New intern joined: ${user.fullName}`,
        message: `${user.fullName} has been assigned under your team.`,
        type: 'team_intern_joined',
      });
    }
  }

  res.status(201).json({
    success: true,
    data: sanitizeUserDoc(user),
  });
});

export const updateUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const user = await User.findById(id).select('+password');
  if (!user) {
    return next(new ErrorResponse('User not found.', 404));
  }

  const isSelf = String(user._id) === String(req.user.id);
  const isSuperAdmin = req.user.role === ROLES.SUPER_ADMIN;
  const isLeadOfIntern =
    req.user.role === ROLES.TEAM_LEAD &&
    user.role === ROLES.INTERN &&
    String(user.teamLead) === String(req.user.id);

  if (!isSelf && !isSuperAdmin && !isLeadOfIntern) {
    return next(new ErrorResponse('Not authorized to update this user.', 403));
  }

  const {
    fullName,
    email,
    username,
    password,
    isActive,
    teamInfo,
    teamLead,
    role,
  } = req.body;

  const update = {};

  if (fullName !== undefined) update.fullName = fullName.trim();
  if (email !== undefined) update.email = email.trim().toLowerCase();
  if (username !== undefined) {
    const reserved = process.env.SUPER_ADMIN_USERNAME;
    if (reserved && username.trim() === reserved && user.username !== reserved) {
      return next(new ErrorResponse('This username is not available.', 400));
    }
    update.username = username.trim();
  }
  if (password !== undefined) {
    if (password.length < 6) {
      return next(new ErrorResponse('Password must be at least 6 characters long.', 400));
    }
    update.password = password;
  }

  if (isActive !== undefined) {
    if (!isSuperAdmin && !isSelf) {
      return next(new ErrorResponse('Only Super Admin can change user status.', 403));
    }
    update.isActive = Boolean(isActive);
  }

  if (role !== undefined && role !== user.role) {
    if (!isSuperAdmin) {
      return next(new ErrorResponse('Only Super Admin can change user roles.', 403));
    }
    if (!Object.values(ROLES).includes(role)) {
      return next(new ErrorResponse('Invalid role specified.', 400));
    }
    update.role = role;
  }

  if (teamInfo !== undefined && user.role === ROLES.TEAM_LEAD) {
    if (!isSuperAdmin && !isSelf) {
      return next(new ErrorResponse('Not authorized to edit team info.', 403));
    }
    update.teamInfo = {
      ...(user.teamInfo ? user.teamInfo.toObject() : {}),
      ...(teamInfo.teamName !== undefined && { teamName: teamInfo.teamName.trim() }),
      ...(teamInfo.department !== undefined && {
        department: teamInfo.department.trim() || undefined,
      }),
      ...(teamInfo.projectFocus !== undefined && {
        projectFocus: teamInfo.projectFocus.trim() || undefined,
      }),
    };
  }

  if (teamLead !== undefined && (user.role === ROLES.INTERN || update.role === ROLES.INTERN)) {
    if (!isSuperAdmin && !isLeadOfIntern && !(isSelf && req.user.role === ROLES.SUPER_ADMIN)) {
      return next(new ErrorResponse('Not authorized to reassign this intern.', 403));
    }
    const lead = await User.findOne({
      _id: teamLead,
      role: ROLES.TEAM_LEAD,
      isActive: true,
    });
    if (!lead) {
      return next(new ErrorResponse('Assigned Team Lead is invalid or inactive.', 400));
    }
    update.teamLead = lead._id;
  }

  if (update.email || update.username) {
    const [dupEmail, dupUsername] = await Promise.all([
      update.email ? User.findOne({ email: update.email, _id: { $ne: user._id } }) : null,
      update.username ? User.findOne({ username: update.username, _id: { $ne: user._id } }) : null,
    ]);
    if (dupEmail) {
      return next(new ErrorResponse('An account with this email already exists.', 400));
    }
    if (dupUsername) {
      return next(new ErrorResponse('An account with this username already exists.', 400));
    }
  }

  const updated = await User.findByIdAndUpdate(id, update, {
    new: true,
    runValidators: true,
    context: 'query',
  }).populate({
    path: 'teamLead',
    select: '_id fullName username email teamInfo',
  });

  res.status(200).json({
    success: true,
    data: sanitizeUserDoc(updated),
  });
});

export const activateUser = asyncHandler(async (req, res, next) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return next(new ErrorResponse('Only Super Admin can activate users.', 403));
  }
  const { id } = req.params;
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: true },
    { new: true, runValidators: true }
  ).select(USER_PUBLIC_FIELDS);
  if (!user) return next(new ErrorResponse('User not found.', 404));
  res.status(200).json({ success: true, data: sanitizeUserDoc(user) });
});

export const deactivateUser = asyncHandler(async (req, res, next) => {
  if (req.user.role !== ROLES.SUPER_ADMIN) {
    return next(new ErrorResponse('Only Super Admin can deactivate users.', 403));
  }
  const { id } = req.params;
  if (String(id) === String(req.user.id)) {
    return next(new ErrorResponse('You cannot deactivate your own account.', 400));
  }
  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true, runValidators: true }
  ).select(USER_PUBLIC_FIELDS);
  if (!user) return next(new ErrorResponse('User not found.', 404));
  res.status(200).json({ success: true, data: sanitizeUserDoc(user) });
});

export const deleteUser = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  if (req.user.role !== ROLES.SUPER_ADMIN && req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Not authorized to delete users.', 403));
  }

  const user = await User.findById(id);
  if (!user) return next(new ErrorResponse('User not found.', 404));

  if (String(user._id) === String(req.user.id)) {
    return next(new ErrorResponse('You cannot delete your own account.', 400));
  }

  if (req.user.role === ROLES.TEAM_LEAD) {
    if (
      user.role !== ROLES.INTERN ||
      String(user.teamLead) !== String(req.user.id)
    ) {
      return next(
        new ErrorResponse('Team Leads can only delete their own interns.', 403)
      );
    }
  }

  await User.findByIdAndDelete(id);
  res.status(200).json({
    success: true,
    message: 'User deleted successfully.',
  });
});

export const getDashboardStats = asyncHandler(async (req, res, next) => {
  // Exclude SUPER_ADMIN users from dashboard aggregate counts so totals reflect only team leads and interns
  const baseQuery = { isActive: true, role: { $in: [ROLES.TEAM_LEAD, ROLES.INTERN] } };
  let internIds = [];
  let filters = {};

  if (req.user.role === ROLES.TEAM_LEAD) {
    const interns = await User.find(
      { teamLead: req.user.id, role: ROLES.INTERN, isActive: true },
      '_id'
    ).lean();
    internIds = interns.map((i) => i._id);
    filters = { _id: { $in: [...internIds, req.user.id] } };
  }

  if (req.user.role === ROLES.INTERN) {
    filters = { _id: req.user.id };
  }

  const pipeline = [];
  const matchStage = { ...baseQuery, ...filters };
  pipeline.push({ $match: matchStage });
  pipeline.push({ $group: { _id: '$role', count: { $sum: 1 } } });

  const rawCounts = await User.aggregate(pipeline);
  const counts = Object.fromEntries(rawCounts.map((r) => [r._id, r.count]));
  const allActive = Object.values(counts).reduce((a, b) => a + b, 0);

  const result = {
    totalActiveUsers: allActive,
    totalUsers: 0,
    superAdmins: counts[ROLES.SUPER_ADMIN] || 0,
    teamLeads: counts[ROLES.TEAM_LEAD] || 0,
    interns: counts[ROLES.INTERN] || 0,
    viewerRole: req.user.role,
  };

  if (req.user.role === ROLES.SUPER_ADMIN) {
    result.totalUsers = await User.countDocuments({});
    result.inactiveUsers = await User.countDocuments({ isActive: false });
  }

  if (req.user.role === ROLES.TEAM_LEAD) {
    const leadProfile = await User.findById(req.user.id, 'teamInfo').lean();
    result.teamName = leadProfile?.teamInfo?.teamName || null;
  }

  if (req.user.role === ROLES.INTERN) {
    const directLead = await User.aggregate([
      { $match: { role: ROLES.INTERN, _id: { $eq: req.user.id } } },
      {
        $lookup: {
          from: 'users',
          localField: 'teamLead',
          foreignField: '_id',
          as: 'lead',
        },
      },
      { $unwind: { path: '$lead', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          leadFullName: '$lead.fullName',
          leadUsername: '$lead.username',
          leadEmail: '$lead.email',
          leadId: '$lead._id',
          teamName: '$lead.teamInfo.teamName',
          department: '$lead.teamInfo.department',
        },
      },
    ]);
    if (directLead.length) {
      result.teamLead = {
        id: directLead[0].leadId || null,
        fullName: directLead[0].leadFullName || null,
        username: directLead[0].leadUsername || null,
        email: directLead[0].leadEmail || null,
        teamName: directLead[0].teamName || null,
        department: directLead[0].department || null,
      };
    }
  }

  if (req.user.role === ROLES.SUPER_ADMIN) {
    const recent = await User.find(
      { role: { $in: [ROLES.TEAM_LEAD, ROLES.INTERN] } },
      'fullName username role isActive teamInfo.teamName createdAt'
    )
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    result.recentRegistrations = recent;
  }

  if (req.user.role === ROLES.TEAM_LEAD) {
    const teamMembers = await User.find(
      { teamLead: req.user.id, role: ROLES.INTERN, isActive: true },
      'fullName username email createdAt lastLogin'
    )
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();
    result.teamMembers = teamMembers;
    result.teamMemberIds = internIds.map((i) => i.toString());
  }

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const getActiveUsers = asyncHandler(async (req, res, next) => {
  const role = req.query.role;
  const query = { isActive: true };

  if (role && Object.values(ROLES).includes(role)) {
    query.role = role;
  }

  if (req.user.role === ROLES.TEAM_LEAD) {
    query.$or = [
      { _id: req.user.id },
      { teamLead: req.user.id, role: ROLES.INTERN },
    ];
    if (role) query.role = role;
  }

  const fields = USER_PUBLIC_FIELDS;
  const users = await User.find(query, fields)
    .populate({
      path: 'teamLead',
      select: 'fullName username email',
    })
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: users.length,
    data: users,
  });
});
