import express from 'express';
import { body, param } from 'express-validator';
import { protect, authorize, authorizeOwnOrRole } from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { ROLES } from '../models/User.js';
import {
  getTeamLeads,
  getActiveUsers,
  getUserById,
  getDashboardStats,
  getUsers,
  getInterns,
  createUser,
  updateUser,
  activateUser,
  deactivateUser,
  deleteUser,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/team-leads', getTeamLeads);

router.use(protect);

router.get('/interns', authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN), getInterns);

router.get('/dashboard-stats', getDashboardStats);

router.get(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  getUsers
);

router.post(
  '/',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  [
    body('fullName').trim().notEmpty().withMessage('Full name is required.').isLength({ min: 2, max: 100 }),
    body('email').trim().notEmpty().isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('username').trim().notEmpty().matches(/^[a-zA-Z0-9_]+$/).isLength({ min: 3, max: 50 }),
    body('password').trim().notEmpty().isLength({ min: 6 }).withMessage('Password must be at least 6 characters.'),
    body('role').isIn([ROLES.TEAM_LEAD, ROLES.INTERN]).withMessage('Role must be team_lead or intern.'),
    body('teamLead')
      .if((value, { req }) => req.body.role === ROLES.INTERN)
      .notEmpty().withMessage('Team Lead is required for Intern.'),
  ],
  validateRequest,
  createUser
);

router.get(
  '/:id',
  authorizeOwnOrRole(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  [param('id').isMongoId().withMessage('Invalid user ID.')],
  validateRequest,
  getUserById
);

router.put(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid user ID.')],
  validateRequest,
  updateUser
);

router.patch(
  '/:id/activate',
  authorize(ROLES.SUPER_ADMIN),
  [param('id').isMongoId().withMessage('Invalid user ID.')],
  validateRequest,
  activateUser
);

router.patch(
  '/:id/deactivate',
  authorize(ROLES.SUPER_ADMIN),
  [param('id').isMongoId().withMessage('Invalid user ID.')],
  validateRequest,
  deactivateUser
);

router.delete(
  '/:id',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  [param('id').isMongoId().withMessage('Invalid user ID.')],
  validateRequest,
  deleteUser
);

router.get(
  '/active/legacy',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  getActiveUsers
);

export default router;
