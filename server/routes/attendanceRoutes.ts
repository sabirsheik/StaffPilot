import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import { ROLES } from '../models/User.js';
import {
  checkIn,
  checkOut,
  pause,
  resume,
  getTodayStatus,
  getAttendanceHistory,
  getMonthlyReport,
  getTodayAttendance,
  exportAttendance,
} from '../controllers/attendanceController.js';

const router = express.Router();

router.use(protect);

router.post('/check-in', checkIn);
router.post('/check-out', checkOut);
router.post('/pause', pause);
router.post('/resume', resume);
router.get('/today', getTodayStatus);

router.get(
  '/today-overview',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  getTodayAttendance
);

router.get('/history', getAttendanceHistory);

router.get('/monthly-report', getMonthlyReport);

router.get(
  '/export',
  authorize(ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD),
  exportAttendance
);

export default router;
