/**
 * Input validation middleware
 */

function sanitizeHtml(str) {
  if (typeof str !== 'string') return str;
  return str.replace(/<script[^>]*?>.*?<\/script>/gi, '')
            .replace(/<[\/\!]*?[^<>]*?>/gi, '')
            .replace(/<style[^>]*?>.*?<\/style>/gi, '')
            .replace(/<![\s\S]*?--[ \t\n\r]*>/gi, '');
}

function validateSchema(data, schema) {
  const errors = [];
  const validData = {};
  
  if (!data || typeof data !== 'object') {
    errors.push('Payload must be an object');
    return { errors, validData };
  }

  for (const [key, rules] of Object.entries(schema)) {
    let value = data[key];
    
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`Field '${key}' is required`);
      continue;
    }
    
    if (value === undefined || value === null) {
      continue;
    }

    if (rules.type) {
      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`Field '${key}' must be an array`);
        continue;
      } else if (rules.type !== 'array' && typeof value !== rules.type) {
        errors.push(`Field '${key}' must be of type ${rules.type}`);
        continue;
      }
    }

    if (rules.type === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors.push(`Field '${key}' must be at least ${rules.min}`);
      }
      if (rules.max !== undefined && value > rules.max) {
        errors.push(`Field '${key}' must be at most ${rules.max}`);
      }
    }

    if (rules.type === 'string') {
      value = String(value).trim();
      value = sanitizeHtml(value);
      
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`Field '${key}' must be at most ${rules.maxLength} characters`);
      }
      if (rules.pattern && !rules.pattern.test(value)) {
        errors.push(`Field '${key}' format is invalid`);
      }
      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`Field '${key}' must be one of: ${rules.enum.join(', ')}`);
      }
    }
    
    validData[key] = value;
  }
  
  return { errors, validData };
}

function validate(schema) {
  return (req, res, next) => {
    const { errors, validData } = validateSchema(req.body, schema);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = validData;
    next();
  };
}

function validateParams(schema) {
  return (req, res, next) => {
    const { errors, validData } = validateSchema(req.params, schema);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Parameter validation failed', details: errors });
    }
    req.params = validData;
    next();
  };
}

function validateQuery(schema) {
  return (req, res, next) => {
    const { errors, validData } = validateSchema(req.query, schema);
    if (errors.length > 0) {
      return res.status(400).json({ error: 'Query validation failed', details: errors });
    }
    req.query = validData;
    next();
  };
}

module.exports = {
  validate,
  validateParams,
  validateQuery,
  sanitizeHtml
};
