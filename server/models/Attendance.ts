// @ts-nocheck
import mongoose from 'mongoose';
import { ROLES } from './User.js';

const ATTENDANCE_STATUS = Object.freeze({
  PRESENT: 'present',
  PAUSED: 'paused',
  ABSENT: 'absent',
  HALF_DAY: 'half_day',
  LEAVE: 'leave',
});

const AttendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required.'],
      index: true,
    },
    teamLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    date: {
      type: Date,
      required: [true, 'Attendance date is required.'],
      index: true,
    },
    checkIn: {
      type: Date,
    },
    checkOut: {
      type: Date,
    },
    checkInTimezone: {
      type: String,
      trim: true,
      maxlength: [64, 'Timezone identifier cannot exceed 64 characters.'],
    },
    checkOutTimezone: {
      type: String,
      trim: true,
      maxlength: [64, 'Timezone identifier cannot exceed 64 characters.'],
    },
    workSessions: {
      type: [
        {
          checkIn: { type: Date, required: true },
          checkOut: { type: Date, required: true },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      required: [true, 'Attendance status is required.'],
      enum: {
        values: Object.values(ATTENDANCE_STATUS),
        message: 'Invalid attendance status.',
      },
      default: ATTENDANCE_STATUS.PRESENT,
    },
    pauses: {
      type: [
        {
          startedAt: { type: Date, required: true },
          endedAt: { type: Date },
          durationMinutes: { type: Number, min: 0, default: 0 },
        },
      ],
      default: [],
    },
    workMinutes: {
      type: Number,
      min: [0, 'Work minutes cannot be negative.'],
      default: 0,
    },
    note: {
      type: String,
      trim: true,
      maxlength: [500, 'Note cannot exceed 500 characters.'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

AttendanceSchema.index({ user: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ teamLead: 1, date: 1 });
AttendanceSchema.index({ status: 1, date: 1 });

AttendanceSchema.virtual('durationHours').get(function () {
  if (!this.checkIn || !this.checkOut) return 0;
  const sessionMs = (this.workSessions || []).reduce((total, session) => {
    if (!session.checkIn || !session.checkOut) return total;
    return total + Math.max(0, session.checkOut.getTime() - session.checkIn.getTime());
  }, 0);
  const ms = sessionMs + this.checkOut.getTime() - this.checkIn.getTime();
  const pausedMs = (this.pauses || []).reduce((total, pause) => {
    if (!pause.startedAt || !pause.endedAt) return total;
    return total + Math.max(0, pause.endedAt.getTime() - pause.startedAt.getTime());
  }, 0);
  return Number(Math.max(0, (ms - pausedMs) / (1000 * 60 * 60)).toFixed(2));
});

AttendanceSchema.pre('save', function (next) {
  if (this.checkIn) {
    const end = this.checkOut || new Date();
    if (end > this.checkIn) {
      const sessionMs = (this.workSessions || []).reduce((total, session) => {
        if (!session.checkIn || !session.checkOut) return total;
        return total + Math.max(0, session.checkOut.getTime() - session.checkIn.getTime());
      }, 0);
      const elapsedMs = sessionMs + end.getTime() - this.checkIn.getTime();
      const pausedMs = (this.pauses || []).reduce((total, pause) => {
        const pauseEnd = pause.endedAt || (this.status === ATTENDANCE_STATUS.PAUSED ? new Date() : null);
        if (!pause.startedAt || !pauseEnd) return total;
        return total + Math.max(0, pauseEnd.getTime() - pause.startedAt.getTime());
      }, 0);
      this.workMinutes = Math.max(0, Math.floor((elapsedMs - pausedMs) / (1000 * 60)));
    }
  }
  next();
});

export { ATTENDANCE_STATUS };
export default mongoose.model('Attendance', AttendanceSchema);
