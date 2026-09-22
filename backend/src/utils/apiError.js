/**
 * Custom operational API Error class for standard error formatting across controllers & middlewares
 */
class ApiError extends Error {
  constructor(statusCode, message, errors = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.success = false;
    this.isOperational = true;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(msg = 'Bad Request', errors = []) {
    return new ApiError(400, msg, errors);
  }

  static unauthorized(msg = 'Unauthorized access') {
    return new ApiError(401, msg);
  }

  static forbidden(msg = 'Forbidden: You do not have permission') {
    return new ApiError(403, msg);
  }

  static notFound(msg = 'Resource not found') {
    return new ApiError(404, msg);
  }

  static conflict(msg = 'Resource conflict detected') {
    return new ApiError(409, msg);
  }

  static unprocessable(msg = 'Unprocessable Entity', errors = []) {
    return new ApiError(422, msg, errors);
  }

  static internal(msg = 'Internal Server Error') {
    return new ApiError(500, msg);
  }
}

module.exports = ApiError;
