const notificationRepo = require('../db/repositories/notificationRepository');

let socketService = null;

function setSocketService(svc) {
  socketService = svc;
}

/**
 * Create and deliver an in-app notification
 * @param {object} params
 * @param {string} params.userId - Target user ID (for admin/moderator notifications)
 * @param {string} params.sessionId - Target session ID (for anonymous user notifications)
 * @param {string} params.type - 'incident_new'|'incident_assigned'|'pin_verified'|'pin_flagged'|'system'
 * @param {string} params.title
 * @param {string} params.body
 * @param {object} params.data - Additional data payload
 */
async function notify({ userId, sessionId, type, title, body, data }) {
  try {
    const notification = await notificationRepo.create({
      userId, sessionId, type, title, body, data
    });

    // Deliver via Socket.IO in real-time
    if (socketService && userId) {
      socketService.emitToUser(userId, 'notification:new', notification);
    }

    return notification;
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
    // Don't throw - notifications should not break the main flow
    return null;
  }
}

/**
 * Notify all admins about an event
 */
async function notifyAdmins({ type, title, body, data }) {
  try {
    const userRepo = require('../db/repositories/userRepository');
    const admins = await userRepo.list({ role: 'admin', isActive: true });
    const moderators = await userRepo.list({ role: 'moderator', isActive: true });
    const allAdmins = [...admins.users, ...moderators.users];

    const notifications = await Promise.all(
      allAdmins.map(admin => notify({
        userId: admin.id, type, title, body, data
      }))
    );

    // Also broadcast to admin room via socket
    if (socketService) {
      socketService.emitToRoom('admin', 'notification:new', { type, title, body, data });
    }

    return notifications.filter(Boolean);
  } catch (err) {
    console.error('[NotificationService] Failed to notify admins:', err.message);
    return [];
  }
}

module.exports = { notify, notifyAdmins, setSocketService };
