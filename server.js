require('dotenv').config();
const validateEnv = require('./config/env');
validateEnv();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const app = express();
const fs = require('fs');
const path = require('path');

// Ensure upload directories exist
const dataDir = process.env.DATA_DIR;
const uploadDirs = ['uploads/products', 'uploads/bills', 'uploads/invoices'].map(d => path.join(dataDir, d));

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Raw request logger
// Removed custom raw logger in favor of Morgan

// Serve Static Files (placed before Morgan to avoid logging asset requests)
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

// Health Check Endpoint (Northflank Liveness Probe)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Request logger (Morgan)
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Middleware
app.use(helmet({ contentSecurityPolicy: false })); // Basic security headers, CSP off for static inline script compatibility
app.use(compression()); // Compress responses
app.use(cors()); // Allow cross-origin requests from the frontend
app.use(express.json({ limit: '10mb' })); // Parse incoming JSON payloads
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Import Routes
const authRoutes = require('./routes/auth');
const entitiesRoutes = require('./routes/entities');
const uploadsRoutes = require('./routes/uploads');
const inventoryRoutes = require('./routes/inventory');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const movementsRoutes = require('./routes/movements');
const branchesRoutes = require('./routes/branches');
const transfersRoutes = require('./routes/transfers');
const donationsRoutes = require('./routes/donations');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', entitiesRoutes); // Handles /api/categories, /api/programs, /api/suppliers
app.use('/api/uploads', uploadsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/movements', movementsRoutes);
app.use('/api/branches', branchesRoutes);
app.use('/api/transfers', transfersRoutes);
app.use('/api/donations', donationsRoutes);

// Serve Static Frontend Files
// Handled above before Morgan logging

// 404 Catch-all
app.use((req, res, next) => {
  console.log(`404 NOT FOUND: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${new Date().toISOString()} - ${err.message}`);
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Graceful Shutdown
const shutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    try {
      const db = require('./config/db');
      db.close();
      console.log('Database connection closed.');
    } catch (err) {
      console.error('Error closing database:', err);
    }
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
