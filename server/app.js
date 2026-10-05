const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize database schema and ensure seed
const db = require('./db/database');
const schemaPath = path.join(__dirname, 'db/schema.sql');
if (fs.existsSync(schemaPath)) {
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);
}

// Route handlers
const authRoutes = require('./routes/auth.routes');
const campusesRoutes = require('./routes/campuses.routes');
const facultiesRoutes = require('./routes/faculties.routes');
const departmentsRoutes = require('./routes/departments.routes');
const buildingsRoutes = require('./routes/buildings.routes');
const floorsRoutes = require('./routes/floors.routes');
const roomsRoutes = require('./routes/rooms.routes');
const staffRoutes = require('./routes/staff.routes');
const categoriesRoutes = require('./routes/categories.routes');
const suppliersRoutes = require('./routes/suppliers.routes');
const assetsRoutes = require('./routes/assets.routes');
const transfersRoutes = require('./routes/transfers.routes');
const verificationsRoutes = require('./routes/verifications.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const warrantiesRoutes = require('./routes/warranties.routes');
const disposalsRoutes = require('./routes/disposals.routes');
const depreciationRoutes = require('./routes/depreciation.routes');
const reportsRoutes = require('./routes/reports.routes');
const importExportRoutes = require('./routes/importExport.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationsRoutes = require('./routes/notifications.routes');
const auditRoutes = require('./routes/audit.routes');
const settingsRoutes = require('./routes/settings.routes');

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'MoCU Enterprise Asset Management System',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mount API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/campuses', campusesRoutes);
app.use('/api/v1/faculties', facultiesRoutes);
app.use('/api/v1/departments', departmentsRoutes);
app.use('/api/v1/buildings', buildingsRoutes);
app.use('/api/v1/floors', floorsRoutes);
app.use('/api/v1/rooms', roomsRoutes);
app.use('/api/v1/staff', staffRoutes);
app.use('/api/v1/categories', categoriesRoutes);
app.use('/api/v1/suppliers', suppliersRoutes);
app.use('/api/v1/assets', assetsRoutes);
app.use('/api/v1/transfers', transfersRoutes);
app.use('/api/v1/verifications', verificationsRoutes);
app.use('/api/v1/maintenance', maintenanceRoutes);
app.use('/api/v1/warranties', warrantiesRoutes);
app.use('/api/v1/disposals', disposalsRoutes);
app.use('/api/v1/depreciation', depreciationRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/import', importExportRoutes);
app.use('/api/v1/export', importExportRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/audit-logs', auditRoutes);
app.use('/api/v1/settings', settingsRoutes);

// Client static build serving (SPA)
const clientDistPath = path.join(__dirname, '../dist/client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
      return res.sendFile(path.join(clientDistPath, 'index.html'));
    }
    next();
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

module.exports = app;
