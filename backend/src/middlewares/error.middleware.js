const ApiError = require('../utils/apiError');

/**
 * Middleware to catch 404 Not Found requests
 */
const notFoundHandler = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Centralized error-handling middleware
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  // If error is not an instance of ApiError, normalize it
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || (error.name === 'ValidationError' ? 400 : 500);
    const message = error.message || 'An unexpected error occurred';

    // Handle Mongoose duplicate key error (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue || {})[0] || 'field';
      const duplicateMsg = `Duplicate value entered for ${field}. Please use another value.`;
      error = new ApiError(409, duplicateMsg, [{ field, message: duplicateMsg }]);
    }
    // Handle Mongoose validation errors
    else if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors || {}).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      error = new ApiError(400, 'Validation Failed', validationErrors);
    }
    // Handle Mongoose Invalid ObjectId CastError
    else if (error.name === 'CastError') {
      error = new ApiError(400, `Invalid format for resource identifier: ${error.value}`);
    }
    // Handle JWT Errors
    else if (error.name === 'JsonWebTokenError') {
      error = new ApiError(401, 'Invalid authentication token');
    } else if (error.name === 'TokenExpiredError') {
      error = new ApiError(401, 'Authentication token has expired');
    } else {
      error = new ApiError(statusCode, message, error.errors || [], err.stack);
    }
  }

  const response = {
    success: false,
    statusCode: error.statusCode,
    message: error.message,
    ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  };

  // Log 500 server errors
  if (error.statusCode >= 500) {
    console.error(`[Internal Error] ${req.method} ${req.originalUrl}:`, err);
  }

  return res.status(error.statusCode).json(response);
};

module.exports = {
  notFoundHandler,
  errorHandler,
};
