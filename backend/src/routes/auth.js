const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDB } = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'raise2resolve_super_secret_jwt_key_2026';

// Helper to generate JWT token
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// @route   POST /api/auth/register
// @desc    Register a new citizen
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide name, email, and password.' });
    }

    const db = await getDB();

    // Check if email already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists.' });
    }

    // Default role is citizen unless specified as authority (in standard flow citizens register)
    const userRole = role === 'authority' ? 'authority' : 'citizen';

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into SQLite DB
    const result = await db.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.toLowerCase().trim(), hashedPassword, userRole]
    );

    const newUser = {
      id: result.lastID,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      role: userRole
    };

    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully!',
      token,
      user: newUser
    });
  } catch (error) {
    console.error('Registration Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during registration.' });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const db = await getDB();
    const user = await db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Compare password with bcrypt
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    const token = generateToken(userData);

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during login.' });
  }
});

// @route   POST /api/auth/demo-authority
// @desc    Quick demo login for Authority role
// @access  Public
router.post('/demo-authority', async (req, res) => {
  try {
    const db = await getDB();
    let authorityUser = await db.get('SELECT * FROM users WHERE email = ? OR email = ?', ['authority@raise2resolve.gov', 'authority@buildion.gov']);

    if (!authorityUser) {
      const hashedPassword = await bcrypt.hash('authority123', 10);
      const result = await db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Municipal Admin Officer', 'authority@raise2resolve.gov', hashedPassword, 'authority']
      );
      authorityUser = {
        id: result.lastID,
        name: 'Municipal Admin Officer',
        email: 'authority@raise2resolve.gov',
        role: 'authority'
      };
    }

    const userData = {
      id: authorityUser.id,
      name: authorityUser.name,
      email: authorityUser.email,
      role: authorityUser.role
    };

    const token = generateToken(userData);

    return res.json({
      success: true,
      message: 'Demo Authority Login successful!',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Demo Authority Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during demo login.' });
  }
});

// @route   POST /api/auth/demo-citizen
// @desc    Quick demo login for Citizen role
// @access  Public
router.post('/demo-citizen', async (req, res) => {
  try {
    const db = await getDB();
    let citizenUser = await db.get('SELECT * FROM users WHERE email = ?', ['citizen@raise2resolve.gov']);

    if (!citizenUser) {
      const hashedPassword = await bcrypt.hash('citizen123', 10);
      const result = await db.run(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        ['Demo Citizen', 'citizen@raise2resolve.gov', hashedPassword, 'citizen']
      );
      citizenUser = {
        id: result.lastID,
        name: 'Demo Citizen',
        email: 'citizen@raise2resolve.gov',
        role: 'citizen'
      };
    }

    const userData = {
      id: citizenUser.id,
      name: citizenUser.name,
      email: citizenUser.email,
      role: citizenUser.role
    };

    const token = generateToken(userData);

    return res.json({
      success: true,
      message: 'Demo Citizen Login successful!',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Demo Citizen Login Error:', error);
    return res.status(500).json({ success: false, message: 'Server error during demo login.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get logged in user details
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const user = await db.get('SELECT id, name, email, role, created_at FROM users WHERE id = ?', [req.user.id]);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving user data.' });
  }
});

module.exports = router;
