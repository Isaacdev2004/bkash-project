const env = require('../config/env');
const AppError = require('../utils/AppError');

function adminMiddleware(req, res, next) {
  const key = req.headers['x-admin-key'] || req.headers['x-api-key'];
  if (!key || key !== env.ADMIN_API_KEY) {
    return next(new AppError('Unauthorized', 401));
  }
  return next();
}

module.exports = { adminMiddleware };
