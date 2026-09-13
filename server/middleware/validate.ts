// @ts-nocheck
import { validationResult } from 'express-validator';
import ErrorResponse from '../utils/errorResponse.js';

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const firstError = errors.array({ onlyFirstError: true })[0];
    const message = firstError?.msg || 'Validation failed.';
    return next(new ErrorResponse(message, 400));
  }

  next();
};

export default validateRequest;
