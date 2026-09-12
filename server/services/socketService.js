const { Server } = require('socket.io');
const { socketAuth } = require('../middleware/socketAuth');
//const pinRepo = require('../db/repositories/pinRepository'); // Assuming this exists based on context

let io;
let connectionCount = 0;
let adminCount = 0;

// Rate limiting and state tracking maps
const rateLimits = new Map();
const lastEvents = new Map();

/**
 * Validates payload size to prevent DOS (max 10KB)
 */
function validatePayload(args) {
  try {
    const size = Buffer.byteLength(JSON.stringify(args));
    return size <= 10240; // 10KB limit
  } catch (err) {
    return false;
  }
}

function init(server) {
  io = new Server(server, {
    cors: {
      origin: 'https://impex-spot-webapp.vercel.app',
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Apply authentication middleware
  io.use(socketAuth);
  
  // Rate limiter and validation middleware for all incoming events
  io.use((socket, next) => {
    socket.use(([event, ...args], nextEvent) => {
      // Size validation
      if (!validatePayload(args)) {
        return nextEvent(new Error('Payload too large'));
      }

      // Rate limiting
      const now = Date.now();
      let limitData = rateLimits.get(socket.id);
      
      if (!limitData) {
        limitData = { count: 1, resetTime: now + 1000 };
        rateLimits.set(socket.id, limitData);
      } else {
        if (now > limitData.resetTime) {
          limitData.count = 1;
          limitData.resetTime = now + 1000;
        } else {
          limitData.count++;
          if (limitData.count > 30) {
            console.warn(`[Socket] Disconnecting socket ${socket.id} due to rate limiting.`);
            socket.disconnect(true);
            return nextEvent(new Error('Rate limit exceeded'));
          }
        }
      }
      
      // Track last event for catch-up potential
      lastEvents.set(socket.id, now);
      
      nextEvent();
    });
    next();
  });

  io.on('connection', async (socket) => {
    connectionCount++;
    console.log(`[Socket] Client connected: ${socket.id} (Total: ${connectionCount}) Role: ${socket.role}`);

    // Join appropriate rooms based on role
    socket.join('public'); // Everyone joins public
    
    if (socket.role === 'admin' || socket.role === 'moderator') {
      socket.join('admin');
      adminCount++;
    } else if (socket.role === 'responder') {
      socket.join('responder');
    }
    
    // User-specific room
    if (socket.user && socket.user.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Send initial active pins to the connected client
    try {
      if (pinRepo && typeof pinRepo.findAll === 'function') {
        const activePins = await pinRepo.findAll({ is_active: true });
        socket.emit('pins:initial', activePins);
      }
    } catch (err) {
      console.error('[Socket] Error fetching initial pins:', err.message);
    }

    // Responder events
    socket.on('responder:update_location', (data) => {
      if (socket.role !== 'responder') return;
      
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        // Broadcast location to admins
        io.to('admin').emit('responder:location_update', {
          responderId: socket.user.id,
          name: socket.user.name || socket.user.username,
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date().toISOString()
        });
      }
    });

    socket.on('responder:accept_incident', (data) => {
      if (socket.role !== 'responder') return;
      io.to('admin').emit('incident:dispatch_update', {
        incidentId: data?.incidentId,
        responderId: socket.user.id,
        action: 'accepted',
        timestamp: new Date().toISOString()
      });
    });

    socket.on('responder:update_status', (data) => {
      if (socket.role !== 'responder') return;
      io.to('admin').emit('incident:dispatch_update', {
        incidentId: data?.incidentId,
        responderId: socket.user.id,
        status: data?.status,
        timestamp: new Date().toISOString()
      });
    });

    socket.on('disconnect', () => {
      connectionCount--;
      if (socket.role === 'admin' || socket.role === 'moderator') {
        adminCount--;
      }
      
      // Cleanup tracking maps
      rateLimits.delete(socket.id);
      lastEvents.delete(socket.id);
      
      console.log(`[Socket] Client disconnected: ${socket.id} (Total: ${connectionCount})`);
    });
  });

  return io;
}

/**
 * Emit event to all connected clients (usually 'public')
 */
function emit(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

/**
 * Emit event to a specific room
 */
function emitToRoom(room, event, data) {
  if (io) {
    io.to(room).emit(event, data);
  }
}

/**
 * Emit event to a specific user
 */
function emitToUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

function getConnectionCount() {
  return connectionCount;
}

function getAdminCount() {
  return adminCount;
}

module.exports = {
  init,
  emit,
  emitToRoom,
  emitToUser,
  getConnectionCount,
  getAdminCount
};
