const rateLimit = require('express-rate-limit');

const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many login attempts, please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200, 
  message: { error: 'Too many admin API requests.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many search requests, please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const pinCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20, 
  message: { error: 'Too many PINs created from this IP, please try again after an hour.' },
});

const emergencyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: 'Emergency endpoint rate limit exceeded.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50,
  message: { error: 'Too many uploads from this IP, please try again after an hour.' },
});

const wsRateLimits = new Map();

function wsRateLimiter(socket, maxEventsPerSecond) {
  socket.use((event, next) => {
    const now = Date.now();
    const id = socket.id;
    
    if (!wsRateLimits.has(id)) {
      wsRateLimits.set(id, { count: 1, lastTime: now });
      return next();
    }
    
    const clientLimit = wsRateLimits.get(id);
    const timePassed = now - clientLimit.lastTime;
    
    if (timePassed > 1000) {
      clientLimit.count = 1;
      clientLimit.lastTime = now;
      return next();
    }
    
    clientLimit.count++;
    
    if (clientLimit.count > maxEventsPerSecond) {
      socket.emit('error', 'Rate limit exceeded');
      socket.disconnect(true);
      return;
    }
    
    next();
  });
  
  socket.on('disconnect', () => {
    wsRateLimits.delete(socket.id);
  });
}

module.exports = {
  generalApiLimiter,
  loginLimiter,
  adminApiLimiter,
  searchLimiter,
  pinCreationLimiter,
  emergencyLimiter,
  uploadLimiter,
  wsRateLimiter
};
