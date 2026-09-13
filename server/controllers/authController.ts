// @ts-nocheck
import asyncHandler from '../utils/asyncHandler.js';
import ErrorResponse from '../utils/errorResponse.js';
import User, { ROLES } from '../models/User.js';
import { notifyUserAssignment, notifySuperAdmins } from './notificationController.js';

const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  const options = {
    expires: new Date(Date.now() + SIX_DAYS_MS),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  user.lastLogin = Date.now();
  user.save({ validateBeforeSave: false });

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: user.toJSON(),
    });
};

export const login = asyncHandler(async (req, res, next) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return next(new ErrorResponse('Please provide both username and password.', 400));
  }

  const superAdminUsername = process.env.SUPER_ADMIN_USERNAME;
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (superAdminUsername && superAdminPassword && username === superAdminUsername) {
    if (password !== superAdminPassword) {
      return next(new ErrorResponse('Invalid credentials.', 401));
    }

    let superAdmin = await User.findOne({ username: superAdminUsername }).select('+password');

    if (!superAdmin) {
      superAdmin = await User.create({
        fullName: 'System Administrator',
        email: 'admin@staffpilot.local',
        username: superAdminUsername,
        password: superAdminPassword,
        role: ROLES.SUPER_ADMIN,
        isActive: true,
      });
    } else if (superAdmin.password !== superAdminPassword) {
      superAdmin.password = superAdminPassword;
      await superAdmin.save();
    }

    return sendTokenResponse(superAdmin, 200, res);
  }

  const user = await User.findOne({ username }).select('+password');

  if (!user) {
    return next(new ErrorResponse('Invalid credentials.', 401));
  }

  if (username === process.env.SUPER_ADMIN_USERNAME) {
    return next(new ErrorResponse('Invalid credentials.', 401));
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials.', 401));
  }

  if (!user.isActive) {
    return next(
      new ErrorResponse('Your account has been deactivated. Please contact an administrator.', 403)
    );
  }

  sendTokenResponse(user, 200, res);
});

export const register = asyncHandler(async (req, res, next) => {
  const {
    fullName,
    email,
    username,
    password,
    confirmPassword,
    role,
    teamInfo,
    teamLead,
  } = req.body;

  if (!fullName || !email || !username || !password || !confirmPassword || !role) {
    return next(new ErrorResponse('All required fields must be provided.', 400));
  }

  if (password !== confirmPassword) {
    return next(new ErrorResponse('Passwords do not match.', 400));
  }

  if (password.length < 6) {
    return next(new ErrorResponse('Password must be at least 6 characters long.', 400));
  }

  const allowedRoles = [ROLES.TEAM_LEAD, ROLES.INTERN];
  if (!allowedRoles.includes(role)) {
    return next(
      new ErrorResponse(
        `Registration is only allowed for roles: ${allowedRoles.join(', ')}.`,
        400
      )
    );
  }

  const reservedUsername = process.env.SUPER_ADMIN_USERNAME;
  if (reservedUsername && username === reservedUsername) {
    return next(new ErrorResponse('This username is not available.', 400));
  }

  const userData = {
    fullName: fullName.trim(),
    email: email.trim().toLowerCase(),
    username: username.trim(),
    password,
    role,
  };

  if (role === ROLES.TEAM_LEAD) {
    if (!teamInfo || typeof teamInfo !== 'object') {
      return next(new ErrorResponse('Team information is required for Team Lead registration.', 400));
    }
    if (!teamInfo.teamName || !teamInfo.teamName.trim()) {
      return next(new ErrorResponse('Team name is required for Team Lead.', 400));
    }
    userData.teamInfo = {
      teamName: teamInfo.teamName.trim(),
      department: teamInfo.department ? teamInfo.department.trim() : undefined,
      projectFocus: teamInfo.projectFocus ? teamInfo.projectFocus.trim() : undefined,
    };
  }

  if (role === ROLES.INTERN) {
    if (!teamLead) {
      return next(new ErrorResponse('You must select a Team Lead to register as an Intern.', 400));
    }

    const lead = await User.findOne({
      _id: teamLead,
      role: ROLES.TEAM_LEAD,
      isActive: true,
    });

    if (!lead) {
      return next(new ErrorResponse('Selected Team Lead is invalid or no longer active.', 400));
    }

    userData.teamLead = lead._id;
  }

  const existingEmail = await User.findOne({ email: userData.email });
  if (existingEmail) {
    return next(new ErrorResponse('An account with this email already exists.', 400));
  }

  const existingUsername = await User.findOne({ username: userData.username });
  if (existingUsername) {
    return next(new ErrorResponse('An account with this username already exists.', 400));
  }

  const user = await User.create(userData);

  if (user.role === ROLES.INTERN && user.teamLead) {
    const lead = await User.findById(user.teamLead).select('_id fullName username');
    if (lead) {
      await notifyUserAssignment({
        recipient: lead._id,
        actor: user._id,
        actorName: user.fullName || user.username,
        title: `New intern joined: ${user.fullName}`,
        message: `${user.fullName} has registered and joined your team.`,
        type: 'team_intern_joined',
      });
    }
  } else if (user.role === ROLES.TEAM_LEAD) {
    await notifySuperAdmins({
      actor: user._id,
      actorName: user.fullName || user.username,
      title: `New team lead registered: ${user.fullName}`,
      message: `${user.fullName} has registered as a Team Lead.`,
      type: 'team_lead_registered',
      entityType: 'user',
      entityId: user._id,
    });
  }

  sendTokenResponse(user, 201, res);
});

export const logout = asyncHandler(async (req, res, next) => {
  const options = {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    path: '/',
  };

  res.status(200).cookie('token', 'none', options).json({
    success: true,
    message: 'Logged out successfully.',
  });
});

export const getMe = asyncHandler(async (req, res, next) => {
  if (!req.user?.id) {
    return next(new ErrorResponse('User not authenticated.', 401));
  }

  const user = await User.findById(req.user.id).populate({
    path: 'teamLead',
    select: 'fullName username email teamInfo',
  });

  if (!user) {
    return next(new ErrorResponse('User not found.', 404));
  }

  res.status(200).json({
    success: true,
    user: user.toJSON(),
  });
});
