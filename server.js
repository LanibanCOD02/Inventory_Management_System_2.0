require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const fs = require('fs');
const path = require('path');

// Ensure upload directories exist
const dataDir = process.env.DATA_DIR || __dirname;
const uploadDirs = ['uploads/products', 'uploads/bills', 'uploads/invoices'].map(d => path.join(dataDir, d));

uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Raw request logger
app.use((req, res, next) => {
  console.log(`[RAW] ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors()); // Allow cross-origin requests from the frontend
app.use(express.json()); // Parse incoming JSON payloads
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(dataDir, 'uploads')));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Import Routes
const authRoutes = require('./routes/auth');
const entitiesRoutes = require('./routes/entities');
const uploadsRoutes = require('./routes/uploads');
const inventoryRoutes = require('./routes/inventory');
const dashboardRoutes = require('./routes/dashboard');
const reportsRoutes = require('./routes/reports');
const movementsRoutes = require('./routes/movements');
const branchesRoutes = require('./routes/branches');

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api', entitiesRoutes); // Handles /api/categories, /api/programs, /api/suppliers
app.use('/api/uploads', uploadsRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/movements', movementsRoutes);
app.use('/api/branches', branchesRoutes);

// Serve Static Frontend Files
app.use(express.static(__dirname));

// 404 Catch-all
app.use((req, res, next) => {
  console.log(`404 NOT FOUND: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found' });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
