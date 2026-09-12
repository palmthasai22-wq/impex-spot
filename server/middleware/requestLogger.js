/**
 * Structured request logging middleware
 */

function requestLogger(req, res, next) {
  const startTime = process.hrtime();
  
  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const responseTime = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    
    const logData = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.originalUrl || req.url,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      requestId: req.requestId || (req.headers && req.headers['x-request-id']) || '-',
      userId: req.user ? req.user.id : '-',
      ip: req.ip || (req.connection && req.connection.remoteAddress) || '-'
    };

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify(logData));
    } else {
      console.log(`[${logData.timestamp}] ${logData.method} ${logData.url} ${logData.statusCode} - ${logData.responseTime} - ID: ${logData.requestId} User: ${logData.userId}`);
    }
  });
  
  next();
}

module.exports = requestLogger;
