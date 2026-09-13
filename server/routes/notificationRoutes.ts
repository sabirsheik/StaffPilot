import express from 'express';
import { body, param } from 'express-validator';
import { protect } from '../middleware/auth.js';
import validateRequest from '../middleware/validate.js';
import {
  listNotifications,
  getUnreadNotificationCount,
  getNotificationById,
  markNotificationRead,
  markAllNotificationsRead,
  streamNotifications,
} from '../controllers/notificationController.js';

const router = express.Router();

router.use(protect);

router.get('/', listNotifications);
router.get('/unread-count', getUnreadNotificationCount);
router.get('/stream', streamNotifications);
router.get('/:id', [param('id').isMongoId().withMessage('Invalid notification ID.')], validateRequest, getNotificationById);
router.patch('/:id/read', [param('id').isMongoId().withMessage('Invalid notification ID.')], validateRequest, markNotificationRead);
router.patch('/read-all', markAllNotificationsRead);

export default router;
