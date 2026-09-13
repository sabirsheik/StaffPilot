// @ts-nocheck
import fs from 'fs';
import path from 'path';
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import Task from '../models/Task.js';
import User, { ROLES } from '../models/User.js';
import { TASK_UPLOAD_DIR } from '../config/storage.js';
import { createNotificationForUsers } from './notificationController.js';

const buildPagination = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return { page: p, limit: l, skip: (p - 1) * l };
};

const ALLOWED_SUBMISSION_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
]);
const MAX_SUBMISSION_SIZE = 10 * 1024 * 1024;

const isAssignedToIntern = async (task, userId) => {
  if (String(task.assigneeId || '') === String(userId)) return true;
  if ((task.assigneeIds || []).some((id) => String(id) === String(userId))) return true;
  if (task.assigneeName !== 'All interns') return false;
  const intern = await User.findById(userId).select('teamLead');
  return Boolean(intern?.teamLead && String(intern.teamLead) === String(task.teamLeadId));
};

const canManageTask = (user, task) => {
  if (!task) return false;
  const currentUserId = String(user.id || user._id);
  const assigneeId = task.assigneeId ? String(task.assigneeId) : null;
  const creatorId = task.createdBy ? String(task.createdBy) : null;
  const teamLeadId = task.teamLeadId ? String(task.teamLeadId) : null;

  if (user.role === ROLES.SUPER_ADMIN) return true;
  if (user.role === ROLES.TEAM_LEAD) {
    return String(teamLeadId) === currentUserId || String(creatorId) === currentUserId;
  }
  return String(assigneeId) === currentUserId || String(creatorId) === currentUserId;
};

const getTaskAssigneeIds = async ({ assigneeId, assigneeIds, assigneeName, teamLeadId }) => {
  if (assigneeIds?.length) return assigneeIds;
  if (assigneeId) return [assigneeId];
  if (assigneeName !== 'All interns') return [];

  const query = { role: ROLES.INTERN, isActive: true };
  if (teamLeadId) query.teamLead = teamLeadId;
  return User.find(query).distinct('_id');
};

const notifyTaskAssignees = async ({ task, actor }) => {
  const recipients = await getTaskAssigneeIds({
    assigneeId: task.assigneeId,
    assigneeIds: task.assigneeIds,
    assigneeName: task.assigneeName,
    teamLeadId: task.teamLeadId,
  });

  if (!recipients.length) return;

  await createNotificationForUsers(recipients, {
    actor: actor.id || actor._id,
    actorName: actor.fullName || actor.username,
    type: 'task_assigned',
    title: `New task assigned: ${task.title}`,
    message: `${actor.fullName || actor.username} assigned a task to you.`,
    entityType: 'task',
    entityId: task._id,
  });
};

export const listTasks = asyncHandler(async (req, res) => {
  const { page, limit, skip } = buildPagination(req.query.page, req.query.limit);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  const query = {};

  if (req.user.role === ROLES.TEAM_LEAD) {
    query.$or = [
      { createdBy: req.user.id },
      { teamLeadId: req.user.id },
      { assigneeId: req.user.id },
      { assigneeIds: req.user.id },
      { assigneeName: 'All interns', teamLeadId: req.user.id },
    ];
  } else if (req.user.role === ROLES.INTERN) {
    query.$or = [
      { assigneeId: req.user.id },
      { assigneeIds: req.user.id },
      { createdBy: req.user.id },
      { assigneeName: 'All interns', teamLeadId: req.user.teamLead || null },
    ];
  }

  if (search) {
    query.$and = query.$and || [];
    query.$and.push({
      $or: [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { assigneeName: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (status) {
    query.status = status;
  }

  const [total, tasks] = await Promise.all([
    Task.countDocuments(query),
    Task.find(query)
      .populate('createdBy', 'fullName username email role')
      .populate('assigneeId', 'fullName username email role')
      .populate('teamLeadId', 'fullName username email role')
      .populate('submission.submittedBy', 'fullName username email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.status(200).json({
    success: true,
    count: tasks.length,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: tasks,
  });
});

export const getTaskById = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id)
    .populate('createdBy', 'fullName username email role')
    .populate('assigneeId', 'fullName username email role')
    .populate('assigneeIds', 'fullName username email role')
    .populate('teamLeadId', 'fullName username email role')
    .populate('submission.submittedBy', 'fullName username email role')
    .lean();

  if (!task) return next(new ErrorResponse('Task not found.', 404));
  const visible = req.user.role === ROLES.SUPER_ADMIN
    || String(task.createdBy?._id || task.createdBy) === String(req.user.id)
    || String(task.teamLeadId?._id || task.teamLeadId) === String(req.user.id)
    || String(task.assigneeId?._id || task.assigneeId) === String(req.user.id)
    || (task.assigneeIds || []).some((id) => String(id?._id || id) === String(req.user.id))
    || (task.assigneeName === 'All interns' && String(req.user.teamLead || '') === String(task.teamLeadId?._id || task.teamLeadId));

  if (!visible) return next(new ErrorResponse('You are not allowed to view this task.', 403));
  res.status(200).json({ success: true, data: task });
});

export const createTask = asyncHandler(async (req, res, next) => {
  const { title, description, status, priority, dueDate, assigneeId, assigneeIds, assigneeName, projectId } = req.body;

  if (req.user.role === ROLES.INTERN) {
    return next(new ErrorResponse('Interns cannot create new tasks. Please contact your team lead.', 403));
  }

  if (!title || !title.trim()) {
    return next(new ErrorResponse('Task title is required.', 400));
  }

  const selectedAssigneeIds = Array.isArray(assigneeIds)
    ? [...new Set(assigneeIds.filter(Boolean).map(String))]
    : assigneeId && assigneeId !== 'all'
    ? [String(assigneeId)]
    : [];
  let resolvedAssigneeId = selectedAssigneeIds.length === 1 ? selectedAssigneeIds[0] : null;
  let resolvedAssigneeName = assigneeName?.trim() || '';

  if (!selectedAssigneeIds.length) {
    resolvedAssigneeId = null;
    resolvedAssigneeName = 'All interns';
  } else {
    const assigneeFilter = { _id: { $in: selectedAssigneeIds }, role: ROLES.INTERN, isActive: true };
    if (req.user.role === ROLES.TEAM_LEAD) assigneeFilter.teamLead = req.user.id;
    const assignees = await User.find(assigneeFilter).select('_id fullName username');
    if (assignees.length !== selectedAssigneeIds.length) return next(new ErrorResponse('One or more selected interns are invalid.', 400));
    resolvedAssigneeName = assignees.map((assignee) => assignee.fullName || assignee.username).join(', ');
  }

  const matchingUser = req.user.role === ROLES.INTERN ? req.user : null;
  const teamLeadId = req.user.role === ROLES.TEAM_LEAD ? req.user.id : (matchingUser?.teamLead || null);

  const task = await Task.create({
    title: title.trim(),
    description: description?.trim() || '',
    status: status || 'todo',
    priority: priority || 'medium',
    dueDate: dueDate ? new Date(dueDate) : null,
    assigneeId: resolvedAssigneeId,
    assigneeIds: selectedAssigneeIds,
    assigneeName: resolvedAssigneeName,
    createdBy: req.user.id,
    teamLeadId,
    projectId: projectId || null,
  });

  await notifyTaskAssignees({ task, actor: req.user });

  const populated = await Task.findById(task._id)
    .populate('createdBy', 'fullName username email role')
    .populate('assigneeId', 'fullName username email role')
    .populate('teamLeadId', 'fullName username email role');

  res.status(201).json({ success: true, data: populated });
});

export const updateTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const task = await Task.findById(id);

  if (!task) {
    return next(new ErrorResponse('Task not found.', 404));
  }

  if (task.submission?.submittedAt) {
    return next(new ErrorResponse('This task has already been submitted and cannot be changed.', 409));
  }

  if (req.user.role === ROLES.INTERN) {
    return next(new ErrorResponse('Interns cannot edit tasks.', 403));
  }

  if (!canManageTask(req.user, task)) {
    return next(new ErrorResponse('You are not allowed to update this task.', 403));
  }

  const { title, description, status, priority, dueDate, assigneeId, assigneeIds, assigneeName, projectId } = req.body;
  if (req.user.role === ROLES.TEAM_LEAD && status !== undefined && status !== task.status) {
    return next(new ErrorResponse('Team Leads cannot update task status.', 403));
  }
  const previousAssigneeId = task.assigneeId ? String(task.assigneeId) : null;
  const previousAssigneeIds = (task.assigneeIds || []).map(String).sort().join(',');
  const previousAssigneeName = task.assigneeName;

  if (title !== undefined) {
    if (!title.trim()) return next(new ErrorResponse('Task title is required.', 400));
    task.title = title.trim();
  }

  if (description !== undefined) task.description = description.trim() || '';
  if (status !== undefined) task.status = status;
  if (priority !== undefined) task.priority = priority;
  if (dueDate !== undefined) task.dueDate = dueDate ? new Date(dueDate) : null;
  if (projectId !== undefined) task.projectId = projectId || null;

  if (assigneeId !== undefined) {
    if (assigneeId === 'all') {
      task.assigneeId = null;
      task.assigneeName = 'All interns';
    } else {
      task.assigneeId = assigneeId || null;
      if (assigneeId) {
        const assignee = await User.findOne({ _id: assigneeId, isActive: true }).select('_id fullName username');
        if (!assignee) {
          return next(new ErrorResponse('Selected assignee is invalid.', 400));
        }
        task.assigneeName = assignee.fullName || assignee.username || task.assigneeName || '';
      } else {
        task.assigneeName = '';
      }
    }
  }

  if (assigneeIds !== undefined) {
    const selectedIds = Array.isArray(assigneeIds) ? [...new Set(assigneeIds.filter(Boolean).map(String))] : [];
    if (!selectedIds.length) {
      task.assigneeId = null;
      task.assigneeIds = [];
      task.assigneeName = 'All interns';
    } else {
      const assigneeFilter = { _id: { $in: selectedIds }, role: ROLES.INTERN, isActive: true };
      if (req.user.role === ROLES.TEAM_LEAD) assigneeFilter.teamLead = req.user.id;
      const assignees = await User.find(assigneeFilter).select('_id fullName username');
      if (assignees.length !== selectedIds.length) return next(new ErrorResponse('One or more selected interns are invalid.', 400));
      task.assigneeIds = selectedIds;
      task.assigneeId = selectedIds.length === 1 ? selectedIds[0] : null;
      task.assigneeName = assignees.map((assignee) => assignee.fullName || assignee.username).join(', ');
    }
  }

  if (assigneeName !== undefined) {
    task.assigneeName = assigneeName?.trim() || '';
  }

  await task.save();

  const nextAssigneeId = task.assigneeId ? String(task.assigneeId) : null;
  const nextAssigneeIds = (task.assigneeIds || []).map(String).sort().join(',');
  if (previousAssigneeId !== nextAssigneeId || previousAssigneeIds !== nextAssigneeIds || previousAssigneeName !== task.assigneeName) {
    await notifyTaskAssignees({ task, actor: req.user });
  }

  const updated = await Task.findById(task._id)
    .populate('createdBy', 'fullName username email role')
    .populate('assigneeId', 'fullName username email role')
    .populate('teamLeadId', 'fullName username email role');

  res.status(200).json({ success: true, data: updated });
});

export const updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) return next(new ErrorResponse('Status is required.', 400));

  if (req.user.role === ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Team Leads cannot update task status.', 403));
  }

  const task = await Task.findById(id);
  if (!task) return next(new ErrorResponse('Task not found.', 404));

  if (task.submission?.submittedAt) {
    return next(new ErrorResponse('This task has already been submitted and cannot be changed.', 409));
  }

  const canUpdateStatus = req.user.role === ROLES.INTERN
    ? await isAssignedToIntern(task, req.user.id)
    : canManageTask(req.user, task);

  if (!canUpdateStatus) {
    return next(new ErrorResponse('You are not allowed to update this task status.', 403));
  }

  task.status = status;
  await task.save();

  const updated = await Task.findById(task._id)
    .populate('createdBy', 'fullName username email role')
    .populate('assigneeId', 'fullName username email role')
    .populate('teamLeadId', 'fullName username email role');

  res.status(200).json({ success: true, data: updated });
});

export const submitTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);
  if (!task) return next(new ErrorResponse('Task not found.', 404));

  if (!(await isAssignedToIntern(task, req.user.id))) {
    return next(new ErrorResponse('You are not assigned to this task.', 403));
  }
  if (task.submission?.submittedAt) {
    return next(new ErrorResponse('This task has already been submitted.', 409));
  }

  const summary = typeof req.body.summary === 'string' ? req.body.summary.trim() : '';
  if (!summary) return next(new ErrorResponse('Submission summary is required.', 400));
  if (summary.length > 5000) return next(new ErrorResponse('Submission summary cannot exceed 5000 characters.', 400));

  const file = req.file;
  if (file && !ALLOWED_SUBMISSION_TYPES.has(file.mimetype)) {
    fs.rmSync(file.path, { force: true });
    return next(new ErrorResponse('Only PDF, DOCX, ZIP, PNG, and JPG files are allowed.', 400));
  }
  if (file && file.size > MAX_SUBMISSION_SIZE) {
    fs.rmSync(file.path, { force: true });
    return next(new ErrorResponse('Submission file cannot exceed 10MB.', 400));
  }

  let storedFile = null;
  if (file) {
    fs.mkdirSync(TASK_UPLOAD_DIR, { recursive: true });
    const storedName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const destination = path.join(TASK_UPLOAD_DIR, storedName);
    fs.renameSync(file.path, destination);
    storedFile = {
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      path: `/uploads/tasks/${storedName}`,
    };
  }

  task.submission = {
    summary,
    file: storedFile,
    submittedBy: req.user.id,
    submittedAt: new Date(),
  };
  task.status = 'done';
  await task.save();

  const recipients = [task.teamLeadId].filter(Boolean);
  await createNotificationForUsers(recipients, {
    actor: req.user.id,
    actorName: req.user.fullName || req.user.username,
    type: 'task_submission',
    title: `Task submitted: ${task.title}`,
    message: `${req.user.fullName || req.user.username} submitted task progress for review.`,
    entityType: 'task',
    entityId: task._id,
  });

  const submitted = await Task.findById(task._id)
    .populate('assigneeId', 'fullName username email role')
    .populate('teamLeadId', 'fullName username email role')
    .lean();

  res.status(201).json({ success: true, data: submitted });
});

export const deleteTask = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const task = await Task.findById(id);

  if (!task) {
    return next(new ErrorResponse('Task not found.', 404));
  }

  if (req.user.role === ROLES.INTERN) {
    return next(new ErrorResponse('Interns cannot delete tasks.', 403));
  }

  if (!canManageTask(req.user, task)) {
    return next(new ErrorResponse('You are not allowed to delete this task.', 403));
  }

  await task.deleteOne();

  res.status(200).json({ success: true, message: 'Task deleted successfully.' });
});
