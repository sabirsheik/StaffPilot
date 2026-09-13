// @ts-nocheck
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import ErrorResponse from '../utils/errorResponse.js';

export const ROLES = Object.freeze({
  SUPER_ADMIN: 'super_admin',
  TEAM_LEAD: 'team_lead',
  INTERN: 'intern',
});

const TeamInfoSchema = new mongoose.Schema(
  {
    teamName: {
      type: String,
      trim: true,
      maxlength: [100, 'Team name cannot exceed 100 characters'],
    },
    department: {
      type: String,
      trim: true,
      maxlength: [100, 'Department cannot exceed 100 characters'],
    },
    projectFocus: {
      type: String,
      trim: true,
      maxlength: [200, 'Project focus cannot exceed 200 characters'],
    },
  },
  { _id: false }
);

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        'Please provide a valid email address',
      ],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [50, 'Username cannot exceed 50 characters'],
      match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      required: [true, 'Role is required'],
      enum: {
        values: Object.values(ROLES),
        message: 'Invalid role specified',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    teamLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    teamInfo: {
      type: TeamInfoSchema,
    },
    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

UserSchema.index({ role: 1, isActive: 1 });
UserSchema.index({ teamLead: 1 });

UserSchema.virtual('interns', {
  ref: 'User',
  localField: '_id',
  foreignField: 'teamLead',
  justOne: false,
  match: { role: ROLES.INTERN, isActive: true },
});

UserSchema.pre('save', function (next) {
  if (this.role === ROLES.INTERN && !this.teamLead) {
    return next(new ErrorResponse('An Intern must be assigned to a Team Lead.', 400));
  }

  if (this.isModified('role') && this.role !== ROLES.INTERN && this.teamLead) {
    this.teamLead = undefined;
  }

  if (this.isModified('teamLead') && this.teamLead && this.role === ROLES.INTERN) {
    mongoose
      .model('User')
      .findOne({ _id: this.teamLead, role: ROLES.TEAM_LEAD, isActive: true })
      .then((lead) => {
        if (!lead) {
          return next(new ErrorResponse('Assigned Team Lead is invalid or inactive.', 400));
        }
        next();
      })
      .catch(next);
    return;
  }

  if (this.isModified('role') && this.role === ROLES.SUPER_ADMIN) {
    const reservedUsername = process.env.SUPER_ADMIN_USERNAME;
    if (!reservedUsername || this.username !== reservedUsername) {
      return next(
        new ErrorResponse(
          'Super Admin role is reserved for the configured Super Admin username.',
          400
        )
      );
    }
  }

  next();
});

UserSchema.methods.matchPassword = function (enteredPassword) {
  if (!this.password || !enteredPassword) return false;
  return this.password === enteredPassword;
};

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      email: this.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};

UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export default mongoose.model('User', UserSchema);
