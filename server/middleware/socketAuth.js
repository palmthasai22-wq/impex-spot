const jwt = require('jsonwebtoken');
const userRepo = require('../db/repositories/userRepository');

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
    // Load user from DB
    userRepo.findById(decoded.id).then(user => {
      if (!user || !user.is_active) {
        socket.user = null;
        socket.role = 'anonymous';
      } else {
        socket.user = user;
        socket.role = user.role;
      }
      next();
    }).catch(() => {
      socket.user = null;
      socket.role = 'anonymous';
      next();
    });
  } catch (err) {
    socket.user = null;
    socket.role = 'anonymous';
    next();
  }
}

module.exports = { socketAuth };
