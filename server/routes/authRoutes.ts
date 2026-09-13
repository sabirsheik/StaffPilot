import express from 'express';
import { body } from 'express-validator';
import { login, register, logout, getMe } from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { ROLES } from '../models/User.js';

const router = express.Router();

router.post(
  '/login',
  [
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required.')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters.'),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required.')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
  ],
  validateRequest,
  login
);

router.post(
  '/register',
  [
    body('fullName')
      .trim()
      .notEmpty()
      .withMessage('Full name is required.')
      .isLength({ min: 2, max: 100 })
      .withMessage('Full name must be between 2 and 100 characters.'),
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required.')
      .isEmail()
      .withMessage('Please provide a valid email address.')
      .normalizeEmail(),
    body('username')
      .trim()
      .notEmpty()
      .withMessage('Username is required.')
      .isLength({ min: 3, max: 50 })
      .withMessage('Username must be between 3 and 50 characters.')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores.'),
    body('password')
      .trim()
      .notEmpty()
      .withMessage('Password is required.')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long.'),
    body('confirmPassword')
      .trim()
      .notEmpty()
      .withMessage('Please confirm your password.')
      .custom((value, { req }) => value === req.body.password)
      .withMessage('Passwords do not match.'),
    body('role')
      .notEmpty()
      .withMessage('Role is required.')
      .isIn([ROLES.TEAM_LEAD, ROLES.INTERN])
      .withMessage('Role must be either team_lead or intern.'),
    body('teamInfo')
      .if((value, { req }) => req.body.role === ROLES.TEAM_LEAD)
      .notEmpty()
      .withMessage('Team information is required for Team Lead.')
      .isObject()
      .withMessage('Team information must be an object.'),
    body('teamInfo.teamName')
      .if((value, { req }) => req.body.role === ROLES.TEAM_LEAD)
      .trim()
      .notEmpty()
      .withMessage('Team name is required for Team Lead.')
      .isLength({ max: 100 })
      .withMessage('Team name cannot exceed 100 characters.'),
    body('teamLead')
      .if((value, { req }) => req.body.role === ROLES.INTERN)
      .notEmpty()
      .withMessage('You must select a Team Lead.'),
  ],
  validateRequest,
  register
);

router.post('/logout', logout);

router.get('/me', protect, getMe);

export default router;
