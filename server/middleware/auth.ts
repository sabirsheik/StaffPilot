// @ts-nocheck
import jwt from 'jsonwebtoken';
import ErrorResponse from '../utils/errorResponse.js';
import User, { ROLES } from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    } else if (req.query?.token) {
      token = req.query.token;
    }

    if (!token) {
      return next(
        new ErrorResponse('Not authorized to access this route. No token provided.', 401)
      );
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return next(new ErrorResponse('Session expired. Please login again.', 401));
      }
      return next(new ErrorResponse('Invalid token. Please login again.', 401));
    }

    if (!decoded || !decoded.id) {
      return next(new ErrorResponse('Invalid token structure.', 401));
    }

    const user = await User.findById(decoded.id).select('+password');

    if (!user) {
      return next(
        new ErrorResponse('User belonging to this token no longer exists.', 401)
      );
    }

    if (!user.isActive) {
      return next(
        new ErrorResponse('Your account has been deactivated. Please contact an administrator.', 403)
      );
    }

    if (decoded.role !== user.role) {
      return next(new ErrorResponse('Token role mismatch. Please login again.', 401));
    }

    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      teamLead: user.teamLead || null,
    };

    next();
  } catch (error) {
    return next(new ErrorResponse('Authorization failed. Please try again.', 500));
  }
};

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.role) {
      return next(
        new ErrorResponse('User context missing. Please login again.', 401)
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ErrorResponse(
          `Role '${req.user.role}' is not authorized to access this route. Required: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }

    if (
      allowedRoles.includes(ROLES.SUPER_ADMIN) &&
      req.user.role === ROLES.SUPER_ADMIN &&
      process.env.SUPER_ADMIN_USERNAME &&
      req.user.username !== process.env.SUPER_ADMIN_USERNAME
    ) {
      return next(
        new ErrorResponse(
          'Super Admin access is restricted to the configured Super Admin account.',
          403
        )
      );
    }

    next();
  };
};

export const authorizeOwnOrRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user?.id || !req.user?.role) {
      return next(
        new ErrorResponse('User context missing. Please login again.', 401)
      );
    }

    const targetId = req.params.id;
    const isOwn = targetId && String(targetId) === String(req.user.id);
    const hasRole = allowedRoles.includes(req.user.role);

    if (!isOwn && !hasRole) {
      return next(
        new ErrorResponse(
          `Not authorized to perform this action on another user's data.`,
          403
        )
      );
    }

    if (
      !isOwn &&
      hasRole &&
      allowedRoles.includes(ROLES.SUPER_ADMIN) &&
      req.user.role === ROLES.SUPER_ADMIN &&
      process.env.SUPER_ADMIN_USERNAME &&
      req.user.username !== process.env.SUPER_ADMIN_USERNAME
    ) {
      return next(
        new ErrorResponse(
          'Super Admin access is restricted to the configured Super Admin account.',
          403
        )
      );
    }

    next();
  };
};

export const ROLE_HIERARCHY = Object.freeze({
  [ROLES.SUPER_ADMIN]: [ROLES.SUPER_ADMIN, ROLES.TEAM_LEAD, ROLES.INTERN],
  [ROLES.TEAM_LEAD]: [ROLES.TEAM_LEAD, ROLES.INTERN],
  [ROLES.INTERN]: [ROLES.INTERN],
});

export const hasAtLeastRole = (currentRole, requiredRole) => {
  const allowed = ROLE_HIERARCHY[currentRole] || [];
  return allowed.includes(requiredRole);
};
