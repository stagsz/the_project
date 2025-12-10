const fs = require('fs');

const content = `import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.js';
import facilitiesRoutes from './routes/facilities.js';
import devicesRoutes from './routes/devices.js';
import deviceGroupsRoutes from './routes/deviceGroups.js';
import modelsRoutes from './routes/models.js';
import trainingRoutes from './routes/training.js';
import simulationRoutes from './routes/simulation.js';
import anomaliesRoutes from './routes/anomalies.js';
import maintenanceRoutes from './routes/maintenance.js';
import qualityRoutes from './routes/quality.js';
import aiRoutes from './routes/ai.js';
import reportsRoutes from './routes/reports.js';
import notificationsRoutes from './routes/notifications.js';
import auditRoutes from './routes/audit.js';

// Import WebSocket handlers
import { setupWebSocket } from './services/websocket.js';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

// Middleware - Allow all localhost ports for development
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow all localhost origins for development
    if (origin.match(/^http:\\/\\/localhost:\\d+$/)) {
      return callback(null, true);
    }
    // Also allow specific CORS_ORIGIN if set
    if (process.env.CORS_ORIGIN && origin === process.env.CORS_ORIGIN) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/facilities', facilitiesRoutes);
app.use('/api/devices', devicesRoutes);
app.use('/api/device-groups', deviceGroupsRoutes);
app.use('/api/models', modelsRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/anomalies', anomaliesRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/quality', qualityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/audit', auditRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      message: 'Not found',
      code: 'NOT_FOUND'
    }
  });
});

// Setup WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Start server
server.listen(PORT, () => {
  console.log('========================================');
  console.log('FedLearn Industrial Server');
  console.log('========================================');
  console.log(\`Server running on port \${PORT}\`);
  console.log(\`API: http://localhost:\${PORT}/api\`);
  console.log(\`WebSocket: ws://localhost:\${PORT}/ws\`);
  console.log('========================================');
});

export { app, server, wss };
`;

fs.writeFileSync('./server/src/index.js', content);
console.log('Server index.js updated with flexible CORS');
