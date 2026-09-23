const { User } = require('../models');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateReferralCode } = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * POST /api/auth/signup
 */
const signup = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;

  // Check uniqueness
  const existing = await User.findOne({ $or: [{ email }, { phone }] });
  if (existing) {
    throw ApiError.conflict('An account with this email or phone already exists');
  }

  // Generate unique referral code
  let referralCode;
  let isUnique = false;
  while (!isUnique) {
    referralCode = generateReferralCode();
    const exists = await User.findOne({ referralCode });
    if (!exists) isUnique = true;
  }

  const user = await User.create({
    name,
    email,
    phone,
    passwordHash: password, // pre-save hook hashes it
    referralCode,
  });

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  // Persist refresh token (hashed in production — simplified here for assignment)
  user.refreshTokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  return ApiResponse.created(res, {
    user: { id: user._id, name: user.name, email: user.email, referralCode: user.referralCode },
    accessToken,
    refreshToken,
  }, 'Account created successfully');
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  const query = email ? { email } : { phone };
  const user = await User.findOne(query).select('+passwordHash +refreshTokens');

  if (!user) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid credentials');
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  user.refreshTokens.push(refreshToken);
  await user.save({ validateBeforeSave: false });

  return ApiResponse.success(res, {
    user: { id: user._id, name: user.name, email: user.email, referralCode: user.referralCode },
    accessToken,
    refreshToken,
  }, 'Login successful');
});

/**
 * POST /api/auth/refresh-token
 */
const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;

  let decoded;
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.userId).select('+refreshTokens');
  if (!user || !user.refreshTokens.includes(token)) {
    throw ApiError.unauthorized('Refresh token revoked or not found');
  }

  // Rotate refresh token
  user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
  const newAccessToken = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  user.refreshTokens.push(newRefreshToken);
  await user.save({ validateBeforeSave: false });

  return ApiResponse.success(res, {
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
  }, 'Tokens refreshed');
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  const user = await User.findById(req.user._id).select('+refreshTokens');

  if (user && token) {
    user.refreshTokens = user.refreshTokens.filter((t) => t !== token);
    await user.save({ validateBeforeSave: false });
  }

  return ApiResponse.success(res, null, 'Logged out successfully');
});

module.exports = { signup, login, refreshToken, logout };
