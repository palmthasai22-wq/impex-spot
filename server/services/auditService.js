const auditLogRepository = require('../db/repositories/auditLogRepository');

/**
 * Service for programmatic audit logging
 */

async function log(params) {
  const {
    actorId = null,
    actorUsername = null,
    action,
    targetType = null,
    targetId = null,
    before = null,
    after = null,
    requestId = null,
    ipAddress = null,
    userAgent = null
  } = params;

  if (!action) {
    throw new Error('Action is required for audit logging');
  }

  const auditData = {
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    before_data: before ? JSON.stringify(before) : null,
    after_data: after ? JSON.stringify(after) : null,
    request_id: requestId,
    ip_address: ipAddress,
    user_agent: userAgent
  };

  try {
    if (auditLogRepository && typeof auditLogRepository.create === 'function') {
      return await auditLogRepository.create(auditData);
    }
    return null;
  } catch (error) {
    console.error('AuditService log error:', error);
    return null;
  }
}

async function logFromRequest(req, params) {
  const {
    action,
    targetType = null,
    targetId = null,
    before = null,
    after = null
  } = params;

  return log({
    actorId: req.user ? req.user.id : null,
    actorUsername: req.user ? req.user.username : null,
    action,
    targetType,
    targetId,
    before,
    after,
    requestId: req.requestId || (req.headers && req.headers['x-request-id']),
    ipAddress: req.ip || (req.connection && req.connection.remoteAddress),
    userAgent: req.headers && req.headers['user-agent']
  });
}

module.exports = {
  log,
  logFromRequest
};
