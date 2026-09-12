const { sanitizeHtml } = require('./inputValidator');
const path = require('path');

function sanitizeObjectStrings(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeHtml(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitizeObjectStrings(obj[key]);
      }
    }
  }
  return obj;
}

function preventXSS() {
  return (req, res, next) => {
    if (req.body) {
      sanitizeObjectStrings(req.body);
    }
    if (req.query) {
      sanitizeObjectStrings(req.query);
    }
    next();
  };
}

function preventIDOR(getResourceOwnerId) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    try {
      const ownerId = await getResourceOwnerId(req);
      if (String(ownerId) !== String(req.user.id) && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Forbidden: Access denied to this resource' });
      }
      next();
    } catch (error) {
      console.error('preventIDOR error:', error);
      return res.status(500).json({ error: 'Internal server error checking access' });
    }
  };
}

function sanitizeFilePath(paramName) {
  return (req, res, next) => {
    const value = req.params[paramName] || req.query[paramName] || (req.body && req.body[paramName]);
    if (value && typeof value === 'string') {
      const sanitized = path.normalize(value).replace(/^(\.\.[\/\\])+/, '');
      if (req.params[paramName]) req.params[paramName] = sanitized;
      else if (req.query[paramName]) req.query[paramName] = sanitized;
      else if (req.body && req.body[paramName]) req.body[paramName] = sanitized;
    }
    next();
  };
}

function stripSensitiveFields(...fields) {
  return (req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
      if (body && typeof body === 'object') {
        const stripObj = (obj) => {
          if (Array.isArray(obj)) {
            obj.forEach(stripObj);
          } else if (obj && typeof obj === 'object') {
            for (const field of fields) {
              if (field in obj) {
                delete obj[field];
              }
            }
            for (const key in obj) {
              if (typeof obj[key] === 'object') {
                stripObj(obj[key]);
              }
            }
          }
        };
        
        let cloneBody;
        try {
          cloneBody = JSON.parse(JSON.stringify(body));
          stripObj(cloneBody);
        } catch (e) {
          cloneBody = body;
        }
        return originalJson.call(this, cloneBody);
      }
      return originalJson.call(this, body);
    };
    next();
  };
}

module.exports = {
  preventXSS,
  preventIDOR,
  sanitizeFilePath,
  stripSensitiveFields
};
