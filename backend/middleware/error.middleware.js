const logger = require('../config/logger');

function errorHandler(err, req, res, next) {
  logger.error(err.message || 'Unhandled error', { stack: err.stack });
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}

module.exports = errorHandler;
