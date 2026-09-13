import express from 'express';
import multer from 'multer';
import path from 'path';
import { body, param } from 'express-validator';
import fs from 'fs';
import { protect, authorize } from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { ROLES } from '../models/User.js';
import { PROJECT_UPLOAD_DIR } from '../config/storage.js';
import {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  addRemark,
  editRemark,
  uploadFile,
  getProjectById,
  getProjectAnalytics,
} from '../controllers/projectController.js';

const router = express.Router();
const projectTempDir = path.join(PROJECT_UPLOAD_DIR, 'tmp');
fs.mkdirSync(projectTempDir, { recursive: true });
const upload = multer({ dest: projectTempDir, limits: { fileSize: 10 * 1024 * 1024 } });

router.use(protect);

router.get('/', authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN), listProjects);
router.get('/analytics', authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN), getProjectAnalytics);
router.post(
  '/',
  authorize(ROLES.TEAM_LEAD),
  [
    body('title').trim().notEmpty().withMessage('Project title is required.'),
    body('lead').optional({ checkFalsy: true }).isMongoId().withMessage('Invalid lead id.'),
    body('assignedInternIds').optional().isArray().withMessage('assignedInternIds must be an array.'),
  ],
  validateRequest,
  createProject
);
router.get('/:id', authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN), [param('id').isMongoId().withMessage('Invalid project ID.')], validateRequest, getProjectById);
router.put(
  '/:id',
  authorize(ROLES.TEAM_LEAD),
  [param('id').isMongoId().withMessage('Invalid project ID.')],
  validateRequest,
  updateProject
);
router.delete('/:id', authorize(ROLES.TEAM_LEAD), [param('id').isMongoId().withMessage('Invalid project ID.')], validateRequest, deleteProject);
router.post(
  '/:id/remarks',
  authorize(ROLES.TEAM_LEAD),
  [param('id').isMongoId().withMessage('Invalid project ID.'), body('content').trim().notEmpty().withMessage('Remark content is required.')],
  validateRequest,
  addRemark
);
router.put(
  '/:id/remarks/:remarkId',
  authorize(ROLES.TEAM_LEAD),
  [param('id').isMongoId().withMessage('Invalid project ID.'), param('remarkId').isMongoId().withMessage('Invalid remark ID.')],
  validateRequest,
  editRemark
);
router.post(
  '/:id/files',
  authorize(ROLES.TEAM_LEAD),
  upload.single('file'),
  [param('id').isMongoId().withMessage('Invalid project ID.')],
  validateRequest,
  uploadFile
);

export default router;
