// @ts-nocheck
import fs from 'fs';
import path from 'path';
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import Project from '../models/Project.js';
import User, { ROLES } from '../models/User.js';
import { notifyProjectActivity } from './notificationController.js';

const PROJECT_UPLOAD_DIR = path.resolve('uploads/projects');
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/x-zip-compressed']);
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

const ensureUploadDir = () => {
  fs.mkdirSync(PROJECT_UPLOAD_DIR, { recursive: true });
};

const buildPagination = (page, limit) => {
  const p = Math.max(1, parseInt(page, 10) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  return { page: p, limit: l, skip: (p - 1) * l };
};

const appendHistory = async (project, action, description, actor) => {
  project.history = [
    ...(project.history || []),
    {
      action,
      description,
      actor: actor._id,
      actorName: actor.fullName || actor.username || 'System',
    },
  ];
  await project.save();
};

export const listProjects = asyncHandler(async (req, res, next) => {
  const { page, limit, skip } = buildPagination(req.query.page, req.query.limit);
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const status = typeof req.query.status === 'string' ? req.query.status : '';

  const query = { isArchived: false };
  if (req.user.role === ROLES.TEAM_LEAD) {
    query.$or = [{ lead: req.user.id }, { assignedInterns: req.user.id }];
  } else if (req.user.role === ROLES.INTERN) {
    query.assignedInterns = req.user.id;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { projectCode: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  if (status) query.status = status;

  const [total, projects] = await Promise.all([
    Project.countDocuments(query),
    Project.find(query)
      .populate('lead', 'fullName username email teamInfo.teamName')
      .populate('assignedInterns', 'fullName username email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  res.status(200).json({ success: true, count: projects.length, total, page, limit, totalPages: Math.ceil(total / limit), data: projects });
});

export const createProject = asyncHandler(async (req, res, next) => {
  if (req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Only Team Leads can create projects.', 403));
  }

  const { title, description, projectCode, category, priority, status, startDate, endDate, dueDate, assignedInternIds } = req.body;
  const leadId = req.user.role === ROLES.TEAM_LEAD ? req.user.id : req.body.lead;

  if (!title || !title.trim()) return next(new ErrorResponse('Project title is required.', 400));
  if (!leadId) return next(new ErrorResponse('A project lead is required.', 400));

  const lead = await User.findOne({ _id: leadId, role: ROLES.TEAM_LEAD, isActive: true });
  if (!lead) return next(new ErrorResponse('Selected lead is invalid.', 400));

  const normalizedInternIds = Array.isArray(assignedInternIds) ? assignedInternIds.filter(Boolean) : [];
  if (normalizedInternIds.length) {
    const interns = await User.find({ _id: { $in: normalizedInternIds }, role: ROLES.INTERN, teamLead: leadId, isActive: true }).select('_id');
    if (interns.length !== normalizedInternIds.length) {
      return next(new ErrorResponse('One or more assigned interns are invalid.', 400));
    }
  }

  const project = await Project.create({
    title: title.trim(),
    description: description?.trim() || '',
    projectCode: projectCode?.trim().toUpperCase() || undefined,
    category: category?.trim() || undefined,
    priority: priority || 'medium',
    status: status || 'planning',
    startDate: startDate ? new Date(startDate) : undefined,
    endDate: endDate ? new Date(endDate) : undefined,
    dueDate: dueDate ? new Date(dueDate) : undefined,
    lead: lead._id,
    assignedInterns: normalizedInternIds,
    history: [{ action: 'created', description: 'Project created.', actor: req.user.id, actorName: req.user.fullName || req.user.username }],
  });

  const created = await Project.findById(project._id).populate('lead', 'fullName username email').populate('assignedInterns', 'fullName username email');

  await notifyProjectActivity({
    project: created,
    actor: req.user.id,
    actorName: req.user.fullName || req.user.username,
    title: `Project assigned: ${created.title}`,
    message: `A new project was created and assigned to ${created.assignedInterns?.length ? 'your team' : 'your team lead'}.`,
    type: 'project_created',
  });

  res.status(201).json({ success: true, data: created });
});

export const updateProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) return next(new ErrorResponse('Project not found.', 404));

  if (req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Only Team Leads can update projects.', 403));
  }

  if (String(project.lead) !== String(req.user.id)) {
    return next(new ErrorResponse('You can only manage your own projects.', 403));
  }

  const { title, description, projectCode, category, priority, status, startDate, endDate, dueDate, assignedInternIds } = req.body;
  const updates = {};

  if (title !== undefined) updates.title = title.trim();
  if (description !== undefined) updates.description = description.trim();
  if (projectCode !== undefined) updates.projectCode = projectCode.trim().toUpperCase();
  if (category !== undefined) updates.category = category.trim();
  if (priority !== undefined) updates.priority = priority;
  if (status !== undefined) updates.status = status;
  if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : undefined;
  if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : undefined;
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : undefined;

  if (assignedInternIds !== undefined) {
    const normalizedInternIds = Array.isArray(assignedInternIds) ? assignedInternIds.filter(Boolean) : [];
    if (normalizedInternIds.length) {
      const interns = await User.find({ _id: { $in: normalizedInternIds }, role: ROLES.INTERN, teamLead: project.lead, isActive: true }).select('_id');
      if (interns.length !== normalizedInternIds.length) {
        return next(new ErrorResponse('One or more assigned interns are invalid.', 400));
      }
    }
    updates.assignedInterns = normalizedInternIds;
  }

  Object.assign(project, updates);
  project.history = [
    ...(project.history || []),
    { action: 'updated', description: 'Project updated.', actor: req.user.id, actorName: req.user.fullName || req.user.username },
  ];
  await project.save();

  const updated = await Project.findById(project._id).populate('lead', 'fullName username email').populate('assignedInterns', 'fullName username email');

  await notifyProjectActivity({
    project: updated,
    actor: req.user.id,
    actorName: req.user.fullName || req.user.username,
    title: `Project updated: ${updated.title}`,
    message: `Project details were updated by ${req.user.fullName || req.user.username}.`,
    type: 'project_updated',
  });

  res.status(200).json({ success: true, data: updated });
});

export const deleteProject = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const project = await Project.findById(id);
  if (!project) return next(new ErrorResponse('Project not found.', 404));

  if (req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Only Team Leads can delete projects.', 403));
  }

  if (String(project.lead) !== String(req.user.id)) {
    return next(new ErrorResponse('You can only manage your own projects.', 403));
  }

  project.isArchived = true;
  project.history = [...(project.history || []), { action: 'archived', description: 'Project archived.', actor: req.user.id, actorName: req.user.fullName || req.user.username }];
  await project.save();

  const archivedProject = await Project.findById(project._id).populate('lead', 'fullName username email').populate('assignedInterns', 'fullName username email');
  await notifyProjectActivity({
    project: archivedProject,
    actor: req.user.id,
    actorName: req.user.fullName || req.user.username,
    title: `Project archived: ${archivedProject.title}`,
    message: `A team lead archived the project and it is no longer active.`,
    type: 'project_archived',
  });

  res.status(200).json({ success: true, message: 'Project archived successfully.' });
});

export const addRemark = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { content } = req.body;
  const project = await Project.findById(id);
  if (!project) return next(new ErrorResponse('Project not found.', 404));

  if (req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Only Team Leads can add remarks.', 403));
  }

  const canAccess = String(project.lead) === String(req.user.id) || project.assignedInterns.some((s) => String(s) === String(req.user.id));
  if (!canAccess) return next(new ErrorResponse('You are not assigned to this project.', 403));

  if (!content || !content.trim()) return next(new ErrorResponse('Remark content is required.', 400));

  project.remarks = [
    ...(project.remarks || []),
    { author: req.user.id, authorName: req.user.fullName || req.user.username, content: content.trim() },
  ];
  project.history = [...(project.history || []), { action: 'remarked', description: 'Remark added.', actor: req.user.id, actorName: req.user.fullName || req.user.username }];
  await project.save();

  const updated = await Project.findById(project._id).populate('lead', 'fullName username email').populate('assignedInterns', 'fullName username email');

  await notifyProjectActivity({
    project: updated,
    actor: req.user.id,
    actorName: req.user.fullName || req.user.username,
    title: `New project update: ${updated.title}`,
    message: `${req.user.fullName || req.user.username} left a remark on this project.`,
    type: 'project_remark',
  });

  res.status(201).json({ success: true, data: updated });
});

export const editRemark = asyncHandler(async (req, res, next) => {
  const { id, remarkId } = req.params;
  const { content } = req.body;
  const project = await Project.findById(id);
  if (!project) return next(new ErrorResponse('Project not found.', 404));

  const remark = project.remarks.id(remarkId);
  if (!remark) return next(new ErrorResponse('Remark not found.', 404));

  if (req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Only Team Leads can edit remarks.', 403));
  }

  if (String(remark.author) !== String(req.user.id)) {
    return next(new ErrorResponse('You can only edit your own remarks.', 403));
  }

  if (!content || !content.trim()) return next(new ErrorResponse('Remark content is required.', 400));

  remark.content = content.trim();
  project.history = [...(project.history || []), { action: 'remark_edited', description: 'Remark edited.', actor: req.user.id, actorName: req.user.fullName || req.user.username }];
  await project.save();

  const updated = await Project.findById(project._id).populate('lead', 'fullName username email').populate('assignedInterns', 'fullName username email');

  await notifyProjectActivity({
    project: updated,
    actor: req.user.id,
    actorName: req.user.fullName || req.user.username,
    title: `Remark edited: ${updated.title}`,
    message: `${req.user.fullName || req.user.username} updated a remark on this project.`,
    type: 'project_remark_update',
  });

  res.status(200).json({ success: true, data: updated });
});

export const uploadFile = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(new ErrorResponse('No file provided.', 400));

  const project = await Project.findById(req.params.id);
  if (!project) return next(new ErrorResponse('Project not found.', 404));

  if (req.user.role !== ROLES.TEAM_LEAD) {
    return next(new ErrorResponse('Only Team Leads can upload project files.', 403));
  }

  const file = req.file;
  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    return next(new ErrorResponse('Only PDF, DOCX, and ZIP files are allowed.', 400));
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return next(new ErrorResponse('File exceeds the 10MB size limit.', 400));
  }

  ensureUploadDir();
  const storedName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const destination = path.join(PROJECT_UPLOAD_DIR, storedName);
  fs.renameSync(file.path, destination);

  project.files = [
    ...(project.files || []),
    {
      uploadedBy: req.user.id,
      uploadedByName: req.user.fullName || req.user.username,
      originalName: file.originalname,
      storedName,
      mimeType: file.mimetype,
      size: file.size,
      path: `/uploads/projects/${storedName}`,
    },
  ];
  project.history = [...(project.history || []), { action: 'file_uploaded', description: 'File uploaded.', actor: req.user.id, actorName: req.user.fullName || req.user.username }];
  await project.save();

  const updated = await Project.findById(project._id).populate('lead', 'fullName username email').populate('assignedInterns', 'fullName username email');

  await notifyProjectActivity({
    project: updated,
    actor: req.user.id,
    actorName: req.user.fullName || req.user.username,
    title: `File uploaded: ${updated.title}`,
    message: `${req.user.fullName || req.user.username} uploaded a document for this project.`,
    type: 'project_file',
  });

  res.status(201).json({ success: true, data: updated });
});

export const getProjectById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const project = await Project.findById(id).populate('lead', 'fullName username email').populate('assignedInterns', 'fullName username email').lean();
  if (!project) return next(new ErrorResponse('Project not found.', 404));

  if (req.user.role === ROLES.INTERN && !project.assignedInterns.some((user) => String(user._id || user) === String(req.user.id))) {
    return next(new ErrorResponse('You are not assigned to this project.', 403));
  }

  res.status(200).json({ success: true, data: project });
});

export const getProjectAnalytics = asyncHandler(async (req, res, next) => {
  const query = { isArchived: false };
  if (req.user.role === ROLES.TEAM_LEAD) {
    query.$or = [{ lead: req.user.id }, { assignedInterns: req.user.id }];
  } else if (req.user.role === ROLES.INTERN) {
    query.assignedInterns = req.user.id;
  }

  const [stats, recentRemarks] = await Promise.all([
    Project.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Project.find(query, 'title remarks').sort({ updatedAt: -1 }).limit(6).lean(),
  ]);

  const counts = Object.fromEntries(stats.map((entry) => [entry._id, entry.count]));
  const recent = recentRemarks.flatMap((project) => (project.remarks || []).slice(-2).map((remark) => ({ title: project.title, remark })));

  res.status(200).json({ success: true, data: { counts, recentRemarks: recent } });
});
