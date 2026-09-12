const auditLogRepository = require('../db/repositories/auditLogRepository');

/**
 * Audit logging middleware factory
 */
function auditLog(action, options = {}) {
  const { targetType = null, getTargetId = null, getBeforeData = null, getAfterData = null } = options;

  return async (req, res, next) => {
    let beforeData = null;
    if (typeof getBeforeData === 'function') {
      try {
        beforeData = await getBeforeData(req);
      } catch (error) {
        console.error(`AuditLog: Failed to get beforeData for action ${action}`, error);
      }
    }

    res.on('finish', async () => {
      if (res.statusCode >= 400 && action !== 'LOGIN_FAILED') {
        return;
      }

      try {
        let targetId = null;
        if (typeof getTargetId === 'function') {
          targetId = await getTargetId(req);
        }

        let afterData = null;
        if (typeof getAfterData === 'function') {
          afterData = await getAfterData(req, res);
        }

        const auditData = {
          actor_id: req.user ? req.user.id : null,
          action: action,
          target_type: targetType,
          target_id: targetId,
          before_data: beforeData ? JSON.stringify(beforeData) : null,
          after_data: afterData ? JSON.stringify(afterData) : null,
          request_id: req.requestId || (req.headers && req.headers['x-request-id']),
          ip_address: req.ip || (req.connection && req.connection.remoteAddress),
          user_agent: req.headers && req.headers['user-agent']
        };

        if (auditLogRepository && typeof auditLogRepository.create === 'function') {
          auditLogRepository.create(auditData).catch(err => {
            console.error('AuditLog: Failed to save audit log', err);
          });
        }
      } catch (error) {
        console.error('AuditLog: Error processing audit log hook', error);
      }
    });

    next();
  };
}

module.exports = auditLog;
