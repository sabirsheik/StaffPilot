import express from 'express';
import { body } from 'express-validator';
import { protect, authorize } from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import { ROLES } from '../models/User.js';
import { getSettings, updateSettings } from '../controllers/settingsController.js';

const router = express.Router();

router.use(protect);

router.get('/', authorize(ROLES.SUPER_ADMIN), getSettings);

router.put(
  '/',
  authorize(ROLES.SUPER_ADMIN),
  [
    body('companyName').optional().isString().trim().isLength({ min: 1, max: 100 }),
    body('timezone').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('sessionTimeout').optional().isString().trim().isLength({ min: 1, max: 50 }),
    body('securityMode').optional().isIn(['strict', 'balanced', 'light']),
    body('autoLogout').optional().isBoolean(),
    body('taskNotifications').optional().isBoolean(),
    body('projectAlerts').optional().isBoolean(),
    body('attendanceReminders').optional().isBoolean(),
    body('maintenanceMode').optional().isBoolean(),
  ],
  validateRequest,
  updateSettings
);

export default router;
