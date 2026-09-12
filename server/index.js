require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');

// Services
const socketService = require('./services/socketService');
const pinStore = require('./services/pinStore');
const expiryService = require('./services/expiryService');
const notificationService = require('./services/notificationService');

// Middleware
const { sessionMiddleware } = require('./middleware/session');
const { requestIdMiddleware } = require('./middleware/requestId');
const { requestLogger } = require('./middleware/requestLogger');
const { preventXSS } = require('./middleware/security');
const { generalApiLimiter } = require('./middleware/rateLimiter');

// Routes
const pinsRoutes = require('./routes/pins');
const emergencyRoutes = require('./routes/emergency');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const responderRoutes = require('./routes/responder');
const placesDbRoutes = require('./routes/placesDb');
const incidentsDbRoutes = require('./routes/incidentsDb');
const healthRoutes = require('./routes/health');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,https://impex-spot-webapp.vercel.app')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Initialize Socket.IO
socketService.init(server);

// Connect services
pinStore.setSocketService(socketService);
socketService.setPinStore(pinStore);
expiryService.init(pinStore, socketService);
notificationService.setSocketService(socketService);

// ── Global Middleware ──────────────────────────────────────────────────

// Request ID for tracing
app.use(requestIdMiddleware);

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // Allow inline scripts for map libraries
}));

// CORS
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use(requestLogger);

// Session ID (anonymous user tracking)
app.use(sessionMiddleware);

// XSS prevention on all request bodies
app.use(preventXSS());

// General rate limiting (applied to all API routes)
app.use('/api', generalApiLimiter);

// ── Static Files ───────────────────────────────────────────────────────

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Serve built client in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// ── API Routes ─────────────────────────────────────────────────────────

// Health checks (no auth, no rate limit)
app.use('/health', healthRoutes);

// Public API routes
app.use('/api/pins', pinsRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Admin routes (auth + RBAC applied internally)
app.use('/api/admin', adminRoutes);

// Responder routes (auth applied internally)
app.use('/api/responder', responderRoutes);

// Database-backed place/incident routes
app.use('/api/db/places', placesDbRoutes);
app.use('/api/db/incidents', incidentsDbRoutes);

// ── Fallback Routes ────────────────────────────────────────────────────

// API 404 handler
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// SPA fallback (serve index.html for client-side routing)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('ImpEx Spot Server is running successfully!');
  });
}

// ── Error Handler ──────────────────────────────────────────────────────

app.use((err, req, res, _next) => {
  const status = err.status || err.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Internal server error'
    : err.message || 'Internal server error';

  console.error(`[ERROR] ${req.method} ${req.url} → ${status}: ${err.message}`);
  if (status === 500) {
    console.error(err.stack);
  }

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    requestId: req.requestId,
  });
});

// ── Start Server ───────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════╗
║   ImpEx Spot Server                        ║
║   Port: ${PORT}                               ║
║   Env:  ${process.env.NODE_ENV || 'development'}                     ║
║   Ready ✅                                  ║
╚════════════════════════════════════════════╝
  `);
});
