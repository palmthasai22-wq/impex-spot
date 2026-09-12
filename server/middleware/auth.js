const jwt = require('jsonwebtoken');
const userRepo = require('../db/repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

/**
 * Middleware to verify JWT and load full user details.
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    const userId = decoded.id || decoded.userId; // handle both old and new payload structures
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
    }

    // Load full user from database
    const user = await userRepo.findById(userId);
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    if (user.is_active === false) {
      return res.status(401).json({ error: 'Unauthorized: User is inactive' });
    }

    // Load user permissions
    let permissions = [];
    try {
      if (typeof userRepo.getPermissions === 'function') {
        permissions = await userRepo.getPermissions(userId);
      }
    } catch (e) {
      console.warn('Could not load permissions for user:', e.message);
    }

    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.display_name || user.username,
      role: user.role,
      permissions: permissions || [],
      isActive: user.is_active
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Internal server error during authentication' });
  }
}

module.exports = authMiddleware;
