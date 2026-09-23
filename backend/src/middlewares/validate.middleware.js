const Joi = require('joi');

/**
 * Joi validation schemas for all request payloads/params
 * Centralized here so controllers stay clean
 */

// ── Auth ──────────────────────────────────────────────────────────────
exports.signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().email().lowercase().trim().required(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional()
    .messages({ 'string.pattern.base': 'Enter a valid 10-digit Indian mobile number' }),
  password: Joi.string().min(6).max(64).required(),
});

exports.loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().optional(),
  phone: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .optional(),
  password: Joi.string().required(),
}).or('email', 'phone');

exports.refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ── Competition ───────────────────────────────────────────────────────
exports.competitionParamSchema = Joi.object({
  idOrSlug: Joi.string().required(),
});

exports.competitionIdParamSchema = Joi.object({
  id: Joi.string().required(),
});

// ── Registration ──────────────────────────────────────────────────────
exports.initiatePaymentSchema = Joi.object({
  competitionId: Joi.string().hex().length(24).required(),
});

exports.verifyPaymentSchema = Joi.object({
  razorpay_order_id: Joi.string().required(),
  razorpay_payment_id: Joi.string().required(),
  razorpay_signature: Joi.string().required(),
});

// ── Submission ────────────────────────────────────────────────────────
exports.submissionSchema = Joi.object({
  mediaUrl: Joi.string().uri().required(),
  mediaType: Joi.string().valid('video/mp4', 'video/quicktime', 'url').required(),
  thumbnailUrl: Joi.string().uri().optional(),
});

exports.signedUrlSchema = Joi.object({
  fileName: Joi.string().required(),
  fileType: Joi.string().valid('video/mp4', 'video/quicktime').required(),
  competitionId: Joi.string().hex().length(24).required(),
});

// ── Referral ──────────────────────────────────────────────────────────
exports.redeemReferralSchema = Joi.object({
  referralCode: Joi.string().uppercase().trim().required(),
  newUserId: Joi.string().hex().length(24).required(),
});

/**
 * Validation middleware factory
 * Usage: validate(schemas.signupSchema)
 */
exports.validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[target], {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const details = error.details.map((d) => ({
        field: d.context.key,
        message: d.message.replace(/"/g, ''),
      }));
      return res.status(422).json({
        success: false,
        errorCode: 'VALIDATION_FAILED',
        message: 'Request validation failed',
        details,
      });
    }

    req[target] = value;
    next();
  };
};
