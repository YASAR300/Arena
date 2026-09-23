const jwt = require('jsonwebtoken');
const ApiError = require('../utils/apiError');
const asyncHandler = require('../utils/asyncHandler');
const { User } = require('../models');

/**
 * Protect middleware — verifies JWT access token and attaches user to req.user
 */
const protect = asyncHandler(async (req, _res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(ApiError.unauthorized('No authentication token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');

    if (!user) {
      return next(ApiError.unauthorized('User no longer exists'));
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Access token has expired, please refresh'));
    }
    return next(ApiError.unauthorized('Invalid access token'));
  }
});

/**
 * optionalAuth — attaches user if token is present, otherwise continues unauthenticated.
 * Used on public competition details endpoint so we can compute currentUserState for
 * logged-in users while still serving anonymous visitors.
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.userId).select('-passwordHash -refreshTokens');
    req.user = user || null;
  } catch {
    req.user = null;
  }

  next();
});

module.exports = { protect, optionalAuth };
