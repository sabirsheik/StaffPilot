import type { ErrorRequestHandler } from 'express';
import ErrorResponse from '../utils/errorResponse.js';

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  let error = { ...err };
  error.message = err.message || 'Internal Server Error';

  console.error('ERROR:', {
    message: err.message,
    stack: err.stack,
    name: err.name,
    code: err.code,
  });

  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid ${err.kind || 'ID'} format.`;
    error = new ErrorResponse(message, 404);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0];
    const value = err.keyValue ? err.keyValue[field] : 'duplicate';
    const message = field
      ? `${capitalize(field)} '${value}' already exists. Please use a different ${field}.`
      : 'Duplicate field value entered.';
    error = new ErrorResponse(message, 400);
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e: any) => e.message);
    const message = messages.join('. ');
    error = new ErrorResponse(message, 400);
  }

  if (err.name === 'JsonWebTokenError') {
    error = new ErrorResponse('Invalid token. Please login again.', 401);
  }

  if (err.name === 'TokenExpiredError') {
    error = new ErrorResponse('Session expired. Please login again.', 401);
  }

  if (err.type === 'entity.parse.failed') {
    error = new ErrorResponse('Invalid JSON payload.', 400);
  }

  if (err.name === 'MulterError') {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file exceeds the 10 MB limit.'
      : err.message || 'File upload failed.';
    error = new ErrorResponse(message, 400);
  }

  if (err.message?.includes('Unexpected token') && err.status === 400) {
    error = new ErrorResponse('Invalid request body format.', 400);
  }

  const statusCode = Number(error.statusCode) || Number(err.status) || 500;
  const response: { success: boolean; error: string; stack?: string } = {
    success: false,
    error: statusCode >= 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error.'
      : error.message || 'Server Error',
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

function capitalize(str: string) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default errorHandler;
