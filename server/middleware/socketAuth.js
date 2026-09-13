const jwt = require('jsonwebtoken');

/**
 * Socket.IO middleware for JWT authentication
 * Checks socket.handshake.auth.token
 * Sets socket.user if valid, allows anonymous connections to 'public' room
 */
function socketAuth(socket, next) {
  const token = socket.handshake.auth?.token;
  
  if (!token) {
    // Allow anonymous connections (public users viewing map)
    socket.user = null;
    socket.role = 'anonymous';
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    // Try to load user from DB, fall back to decoded token
    let userRepo;
    try {
      userRepo = require('../db/repositories/userRepository');
    } catch (e) {
      // DB not available — use decoded token directly
      socket.user = { id: decoded.id, username: decoded.username, role: decoded.role };
      socket.role = decoded.role || 'anonymous';
      return next();
    }

    userRepo.findById(decoded.id).then(user => {
      if (!user || user.is_active === false) {
        // User not found in DB — fall back to decoded token
        socket.user = { id: decoded.id, username: decoded.username, role: decoded.role };
        socket.role = decoded.role || 'anonymous';
      } else {
        socket.user = user;
        socket.role = user.role;
      }
      next();
    }).catch(() => {
      // DB error — fall back to decoded token
      socket.user = { id: decoded.id, username: decoded.username, role: decoded.role };
      socket.role = decoded.role || 'anonymous';
      next();
    });
  } catch (err) {
    socket.user = null;
    socket.role = 'anonymous';
    next();
  }
}

module.exports = { socketAuth };
