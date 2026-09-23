const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss');

/**
 * Middleware to sanitize user input against NoSQL query injection
 * Strips out any keys containing prohibited characters ($ or .)
 */
const noSqlSanitizer = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    if (req.logger) {
      req.logger.warn(`[Security] NoSQL injection attempt sanitized: key "${key}" from IP ${req.ip}`);
    } else {
      console.warn(`[Security] NoSQL injection attempt sanitized: key "${key}" from IP ${req.ip}`);
    }
  },
});

/**
 * Recursively clean strings with XSS sanitizer
 */
function cleanXss(value) {
  if (typeof value === 'string') {
    return xss(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(cleanXss);
  }
  if (value !== null && typeof value === 'object') {
    const cleaned = {};
    for (const [k, v] of Object.entries(value)) {
      cleaned[k] = cleanXss(v);
    }
    return cleaned;
  }
  return value;
}

/**
 * Middleware to sanitize rich text / user strings against Cross-Site Scripting (XSS)
 */
const xssSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanXss(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanXss(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanXss(req.params);
  }
  next();
};

module.exports = {
  noSqlSanitizer,
  xssSanitizer,
};
