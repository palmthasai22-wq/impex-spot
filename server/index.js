require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const path = require('path');
const socketService = require('./services/socketService');
const pinStore = require('./services/pinStore');
const expiryService = require('./services/expiryService');
const { sessionMiddleware } = require('./middleware/session');

const pinsRoutes = require('./routes/pins');
const emergencyRoutes = require('./routes/emergency');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const responderRoutes = require('./routes/responder');
const placesDbRoutes = require('./routes/placesDb');
const incidentsDbRoutes = require('./routes/incidentsDb');

const app = express();
const server = http.createServer(app);
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Initialize Socket.IO
socketService.init(server);

// Services callbacks
pinStore.setSocketService(socketService);
socketService.setPinStore(pinStore);
expiryService.init(pinStore, socketService);

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/pins', pinsRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/responder', responderRoutes);
app.use('/api/db/places', placesDbRoutes);
app.use('/api/db/incidents', incidentsDbRoutes);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
