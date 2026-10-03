const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { getDB } = require('./config/db');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const locationRoutes = require('./routes/locations');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api', locationRoutes);

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Raise 2 Resolve API Server Running',
    health: '/api/health'
  });
});

// Start Server
async function startServer() {
  try {
    await getDB(); // Ensure DB is ready before listening
    app.listen(PORT, () => {
      console.log(`=================================`);
      console.log(`🏛️ Raise 2 Resolve Backend Running`);
      console.log(`📡 URL: http://localhost:${PORT}`);
      console.log(`=================================`);
    });
  } catch (error) {
    console.error('Failed to start backend server:', error);
    process.exit(1);
  }
}

startServer();
