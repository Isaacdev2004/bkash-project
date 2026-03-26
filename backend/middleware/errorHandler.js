const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let status = 500;
  if (err instanceof AppError && err.statusCode) {
    status = err.statusCode;
  } else if (err.name === 'ValidationError') {
    status = 400;
  } else if (err.code === 11000) {
    status = 409;
  } else if (err.statusCode >= 400 && err.statusCode < 600) {
    status = err.statusCode;
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401;
  }

  const message =
    status === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'error';

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ success: false, message });
}

module.exports = { errorHandler };
