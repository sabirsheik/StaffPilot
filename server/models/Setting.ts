// @ts-nocheck
import mongoose from 'mongoose';

const DEFAULT_SETTINGS = {
  companyName: 'StaffPilot',
  timezone: 'UTC+05:00',
  autoLogout: true,
  sessionTimeout: '30 min',
  taskNotifications: true,
  projectAlerts: true,
  attendanceReminders: false,
  securityMode: 'strict',
  maintenanceMode: false,
};

const SettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: 'platform',
    },
    values: {
      type: Object,
      default: DEFAULT_SETTINGS,
    },
  },
  { timestamps: true }
);

export const DEFAULT_PLATFORM_SETTINGS = DEFAULT_SETTINGS;
export default mongoose.model('Setting', SettingSchema);
