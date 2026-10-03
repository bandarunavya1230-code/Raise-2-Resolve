const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');

// @route   GET /api/health
// @desc    Check system & DB health status
// @access  Public
router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const userCount = await db.get('SELECT COUNT(*) as count FROM users');
    return res.json({
      success: true,
      status: 'online',
      app: 'Raise 2 Resolve API',
      timestamp: new Date().toISOString(),
      database: 'connected',
      usersTotal: userCount.count
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'degraded',
      error: error.message
    });
  }
});

module.exports = router;
