const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { getDB } = require('./backend/src/config/db');
const healthRoutes = require('./backend/src/routes/health');
const authRoutes = require('./backend/src/routes/auth');
const complaintRoutes = require('./backend/src/routes/complaints');
const locationRoutes = require('./backend/src/routes/locations');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, 'backend/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api', locationRoutes);

// Setup frontend serving
async function setupFrontend() {
  const isDev = process.env.NODE_ENV !== 'production';
  const distDir = path.join(__dirname, 'frontend/dist');

  if (isDev) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        root: path.join(__dirname, 'frontend'),
        server: {
          middlewareMode: true,
          hmr: false
        },
        appType: 'spa'
      });
      app.use(vite.middlewares);
      console.log('⚡ Vite dev middleware mounted');
      return;
    } catch (e) {
      console.warn('⚠️ Could not start Vite dev middleware, falling back to static dist:', e.message);
    }
  }

  // Fallback or Production: Serve built dist
  if (fs.existsSync(distDir)) {
    app.use(express.static(distDir));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
    console.log('📦 Serving static frontend from frontend/dist');
  } else {
    app.get('*', (req, res) => {
      res.status(404).send('Frontend not built. Please run `npm run build`.');
    });
  }
}

// Start Server
async function startServer() {
  try {
    await getDB();
    await setupFrontend();

    app.listen(PORT, HOST, () => {
      console.log(`=================================`);
      console.log(`🏛️ Raise 2 Resolve Server Running`);
      console.log(`📡 URL: http://${HOST}:${PORT}`);
      console.log(`=================================`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
