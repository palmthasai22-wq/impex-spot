const { v4: uuidv4 } = require('uuid');

/**
 * Middleware to generate or forward a unique request ID.
 */
function requestIdMiddleware(req, res, next) {
  const reqId = req.headers['x-request-id'] || uuidv4();
  req.requestId = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
}

module.exports = requestIdMiddleware;
