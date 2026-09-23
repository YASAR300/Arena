/**
 * asyncHandler — wraps async controller functions to catch errors
 * and pass them to Express's centralized error middleware.
 * Eliminates repetitive try/catch boilerplate in every controller.
 *
 * Usage:
 *   router.get('/resource', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
