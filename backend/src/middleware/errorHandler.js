const { logger } = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Default error
  let error = {
    message: 'Internal Server Error',
    status: 500
  };

  // Prisma errors
  if (err.code && err.code.startsWith('P')) {
    switch (err.code) {
      case 'P2002':
        error = {
          message: 'A record with this information already exists',
          status: 409
        };
        break;
      case 'P2025':
        error = {
          message: 'Record not found',
          status: 404
        };
        break;
      case 'P2003':
        error = {
          message: 'Foreign key constraint failed',
          status: 400
        };
        break;
      default:
        error = {
          message: 'Database error',
          status: 500
        };
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = {
      message: 'Invalid token',
      status: 401
    };
  }

  if (err.name === 'TokenExpiredError') {
    error = {
      message: 'Token expired',
      status: 401
    };
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    error = {
      message: 'Validation error',
      status: 400,
      details: err.details
    };
  }

  // Rate limit errors
  if (err.status === 429) {
    error = {
      message: 'Too many requests',
      status: 429
    };
  }

  // Don't leak error details in production
  if (process.env.NODE_ENV === 'production' && error.status === 500) {
    error.message = 'Internal Server Error';
  }

  res.status(error.status).json({
    error: error.message,
    ...(error.details && { details: error.details }),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = { errorHandler };
