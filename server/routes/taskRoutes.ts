import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { body, param } from 'express-validator';
import { TASK_UPLOAD_DIR } from '../config/storage.js';
import { protect, authorize } from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { ROLES } from '../models/User.js';
import {
  listTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  deleteTask,
  submitTask,
} from '../controllers/taskController.js';

const router = express.Router();
const submissionTempDir = path.join(TASK_UPLOAD_DIR, 'tmp');
fs.mkdirSync(submissionTempDir, { recursive: true });
const submissionUpload = multer({ dest: submissionTempDir, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN), listTasks);
router.get('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN), [param('id').isMongoId().withMessage('Invalid task ID.')], validateRequest, getTaskById);
router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  [
    body('title').trim().notEmpty().withMessage('Task title is required.'),
    body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']).withMessage('Invalid status.'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority.'),
    body('assigneeId').optional({ values: 'falsy' }).custom((value) => value === 'all' || /^[a-f\d]{24}$/i.test(value)).withMessage('Invalid assignee id.'),
    body('assigneeIds').optional().isArray().withMessage('Assignee selection must be an array.'),
  ],
  validateRequest,
  createTask
);
router.put(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN),
  [param('id').isMongoId().withMessage('Invalid task ID.')],
  validateRequest,
  updateTask
);
router.patch(
  '/:id/status',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN),
  [param('id').isMongoId().withMessage('Invalid task ID.'), body('status').isIn(['todo', 'in_progress', 'review', 'done']).withMessage('Invalid status.')],
  validateRequest,
  updateTaskStatus
);
router.post(
  '/:id/submission',
  authorize(ROLES.INTERN),
  submissionUpload.single('file'),
  [param('id').isMongoId().withMessage('Invalid task ID.')],
  validateRequest,
  submitTask
);
router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN),
  [param('id').isMongoId().withMessage('Invalid task ID.')],
  validateRequest,
  deleteTask
);

export default router;
