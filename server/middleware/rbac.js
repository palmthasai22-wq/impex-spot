/**
 * Role-based access control middleware factory
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Forbidden: No role assigned' });
    }
    
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden: Insufficient role' });
  };
}

function requirePermission(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Forbidden: Not authenticated' });
    }
    
    const userPermissions = req.user.permissions || [];
    const hasPermission = requiredPermissions.some(perm => userPermissions.includes(perm));
    
    if (hasPermission) {
      return next();
    }
    
    return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
  };
}

function requireOwnerOrRole(getOwnerId, ...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(403).json({ error: 'Forbidden: Not authenticated' });
    }
    
    if (req.user.role && allowedRoles.includes(req.user.role)) {
      return next();
    }
    
    try {
      const ownerId = await getOwnerId(req);
      if (ownerId && String(ownerId) === String(req.user.id)) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden: Not resource owner or insufficient role' });
    } catch (error) {
      console.error('requireOwnerOrRole error:', error);
      return res.status(500).json({ error: 'Internal server error evaluating ownership' });
    }
  };
}

module.exports = {
  requireRole,
  requirePermission,
  requireOwnerOrRole
};
