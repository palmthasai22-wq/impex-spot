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

// Middleware
const { sessionMiddleware } = require('./middleware/session');

// ─── Safe imports: ไม่ให้ crash ถ้า middleware ใหม่ยังโหลดไม่ได้ ───
let requestIdMiddleware, requestLogger, preventXSS, generalApiLimiter;

try {
  const rid = require('./middleware/requestId');
  requestIdMiddleware = rid.requestIdMiddleware || rid;
} catch (e) {
  requestIdMiddleware = (req, res, next) => next();
}

try {
  const rl = require('./middleware/requestLogger');
  requestLogger = rl.requestLogger || rl;
} catch (e) {
  requestLogger = (req, res, next) => next();
}

try {
  const sec = require('./middleware/security');
  preventXSS = sec.preventXSS;
} catch (e) {
  preventXSS = () => (req, res, next) => next();
}

try {
  const rateLimiter = require('./middleware/rateLimiter');
  generalApiLimiter = rateLimiter.generalApiLimiter;
} catch (e) {
  generalApiLimiter = (req, res, next) => next();
}

// Safe notification service import
try {
  const notificationService = require('./services/notificationService');
  if (notificationService.setSocketService) {
    notificationService.setSocketService(socketService);
  }
} catch (e) {
  // Notification service not ready yet
}

// Routes
const pinsRoutes = require('./routes/pins');
const emergencyRoutes = require('./routes/emergency');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const responderRoutes = require('./routes/responder');

// Safe route imports for new routes
let placesDbRoutes, incidentsDbRoutes, healthRoutes, notificationRoutes;

try { placesDbRoutes = require('./routes/placesDb'); } catch (e) { placesDbRoutes = express.Router(); }
try { incidentsDbRoutes = require('./routes/incidentsDb'); } catch (e) { incidentsDbRoutes = express.Router(); }
try { healthRoutes = require('./routes/health'); } catch (e) {
  healthRoutes = express.Router();
  healthRoutes.get('/live', (req, res) => res.json({ status: 'ok' }));
  healthRoutes.get('/ready', (req, res) => res.json({ status: 'ok' }));
}
try { notificationRoutes = require('./routes/notifications'); } catch (e) { notificationRoutes = express.Router(); }

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,https://impex-spot-webapp.vercel.app')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Initialize Socket.IO
socketService.init(server);

// Connect services
pinStore.setSocketService(socketService);
if (typeof socketService.setPinStore === 'function') {
  socketService.setPinStore(pinStore);
}
expiryService.init(pinStore, socketService);

// ── Global Middleware ──────────────────────────────────────────────────

// Request ID for tracing
if (typeof requestIdMiddleware === 'function') {
  app.use(requestIdMiddleware);
}

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false,
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
if (typeof requestLogger === 'function') {
  app.use(requestLogger);
}

// Session ID (anonymous user tracking)
// Camera routes validate structured input directly, preserving literal passwords.
// Mount before generic HTML sanitization and /pins/:id routes.
require('./services/cameraSetup').mountCameras(app);

app.use(sessionMiddleware);

// XSS prevention
if (typeof preventXSS === 'function') {
  app.use(preventXSS());
}

// General rate limiting
if (generalApiLimiter) {
  app.use('/api', generalApiLimiter);
}

// ── Static Files ───────────────────────────────────────────────────────

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// ── API Routes ─────────────────────────────────────────────────────────

// Health checks (no auth)
app.use('/health', healthRoutes);

// Public API routes (ไม่ต้อง login)
app.use('/api/pins', pinsRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);

// Admin routes (auth inside)
app.use('/api/admin', adminRoutes);

// Responder routes
app.use('/api/responder', responderRoutes);

// DB-backed routes
app.use('/api/db/places', placesDbRoutes);
app.use('/api/db/incidents', incidentsDbRoutes);

// ── Fallback Routes ────────────────────────────────────────────────────

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

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
  if (status === 500) console.error(err.stack);

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    requestId: req.requestId,
  });
});

// ── Start Server ───────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`ImpEx Spot Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}] ✅`);
});
