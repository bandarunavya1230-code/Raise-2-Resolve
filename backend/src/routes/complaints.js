const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getDB } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { calculatePriority } = require('../utils/priority');

// Helper to derive GIS coordinates
function getCoordinatesForLocation(locationStr = '', id = 1) {
  const baseLat = 12.9716;
  const baseLng = 77.5946;

  let hash = 0;
  for (let i = 0; i < locationStr.length; i++) {
    hash = locationStr.charCodeAt(i) + ((hash << 5) - hash);
  }

  const offsetLat = ((hash % 100) / 1500) + ((id % 10) * 0.003);
  const offsetLng = (((hash >> 2) % 100) / 1500) + ((id % 7) * 0.004);

  return {
    latitude: Number((baseLat + offsetLat).toFixed(6)),
    longitude: Number((baseLng + offsetLng).toFixed(6))
  };
}

// Helper to construct simulated Email & SMS notifications
function createSimulatedNotifications(complaint, author, nextStatus, updateText) {
  const code = complaint.complaint_code || `R2R-2026-${String(complaint.id).padStart(4, '0')}`;
  const citizenName = author ? author.name : 'Valued Citizen';
  const citizenEmail = author ? author.email : 'citizen@buildion.org';
  const citizenPhone = '+1 (555) 019-2834';

  return {
    id: 'SIM-' + Date.now(),
    complaintId: complaint.id,
    complaintCode: code,
    citizenName,
    citizenEmail,
    citizenPhone,
    statusChange: nextStatus,
    updateText,
    timestamp: new Date().toISOString(),
    email: {
      label: '[SIMULATED EMAIL NOTIFICATION]',
      to: citizenEmail,
      subject: `[Raise 2 Resolve] Ticket #${code} Status Update: ${nextStatus.toUpperCase().replace('_', ' ')}`,
      body: `Hello ${citizenName},\n\nThe status of your reported civic complaint #${code} (${complaint.title}) at "${complaint.location}" has been updated to "${nextStatus.toUpperCase().replace('_', ' ')}".\n\nOfficial Municipal Remark:\n"${updateText}"\n\nYou can track step-by-step progress on your Raise 2 Resolve Citizen Dashboard.\n\nRegards,\nBUILDION Municipal Authority`
    },
    sms: {
      label: '[SIMULATED SMS NOTIFICATION]',
      to: citizenPhone,
      body: `[R2R Alert] Ticket #${code} status is now ${nextStatus.toUpperCase().replace('_', ' ')}. Remark: ${updateText.length > 70 ? updateText.slice(0, 70) + '...' : updateText}`
    }
  };
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'civic-' + uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage, 
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// Helper to recalculate priority
async function refreshComplaintPriority(db, complaintId) {
  const c = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
  if (!c) return;

  const support = await db.get('SELECT COUNT(*) as total FROM complaint_support WHERE complaint_id = ?', [complaintId]);
  const supportCount = support ? support.total : 0;

  const { priorityScore, priorityReason } = calculatePriority(c.severity, c.category, supportCount, c.created_at);

  await db.run(
    'UPDATE complaints SET priority_score = ?, priority_reason = ? WHERE id = ?',
    [priorityScore, priorityReason, complaintId]
  );
}

// GET /api/complaints
router.get('/', async (req, res) => {
  try {
    const db = await getDB();
    const rawComplaints = await db.all(`
      SELECT c.*, u.name as author_name,
        (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id = c.id) as support_count
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.priority_score DESC, c.created_at DESC
    `);

    const complaints = rawComplaints.map(c => {
      const p = calculatePriority(c.severity, c.category, c.support_count, c.created_at);
      const coords = (c.latitude && c.longitude) 
        ? { latitude: c.latitude, longitude: c.longitude } 
        : getCoordinatesForLocation(c.location, c.id);

      return {
        ...c,
        latitude: coords.latitude,
        longitude: coords.longitude,
        priority_score: p.priorityScore,
        priority_level: p.priorityLevel,
        priority_reason: p.priorityReason
      };
    });

    return res.json({ success: true, data: complaints });
  } catch (error) {
    console.error('Fetch complaints error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching complaints.' });
  }
});

// GET /api/complaints/my
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const db = await getDB();
    const rawComplaints = await db.all(`
      SELECT c.*, u.name as author_name,
        (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id = c.id) as support_count
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `, [req.user.id]);

    const complaints = rawComplaints.map(c => {
      const p = calculatePriority(c.severity, c.category, c.support_count, c.created_at);
      const coords = (c.latitude && c.longitude) 
        ? { latitude: c.latitude, longitude: c.longitude } 
        : getCoordinatesForLocation(c.location, c.id);

      return {
        ...c,
        latitude: coords.latitude,
        longitude: coords.longitude,
        priority_score: p.priorityScore,
        priority_level: p.priorityLevel,
        priority_reason: p.priorityReason
      };
    });

    return res.json({ success: true, data: complaints });
  } catch (error) {
    console.error('Fetch my complaints error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching your complaints.' });
  }
});

// POST /api/complaints/check-similar
router.post('/check-similar', async (req, res) => {
  try {
    const { category, location, title } = req.body;
    if (!category && !location && !title) {
      return res.json({ success: true, matches: [] });
    }

    const db = await getDB();
    const allComplaints = await db.all(`
      SELECT c.*, u.name as author_name,
        (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id = c.id) as support_count
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE c.status != 'resolved' AND c.is_flagged = 0
    `);

    const locationKeywords = (location || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const titleKeywords = (title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);

    const matches = allComplaints.filter(c => {
      const categoryMatch = c.category.toLowerCase() === (category || '').toLowerCase();
      const targetLoc = c.location.toLowerCase();
      const targetTitle = c.title.toLowerCase();

      const locMatch = locationKeywords.some(kw => targetLoc.includes(kw));
      const titleMatch = titleKeywords.some(kw => targetTitle.includes(kw));

      return (categoryMatch && (locMatch || titleMatch)) || (locMatch && titleMatch);
    });

    const formattedMatches = matches.map(c => {
      const p = calculatePriority(c.severity, c.category, c.support_count, c.created_at);
      const coords = (c.latitude && c.longitude) 
        ? { latitude: c.latitude, longitude: c.longitude } 
        : getCoordinatesForLocation(c.location, c.id);

      return {
        ...c,
        latitude: coords.latitude,
        longitude: coords.longitude,
        priority_score: p.priorityScore,
        priority_level: p.priorityLevel,
        priority_reason: p.priorityReason
      };
    });

    return res.json({
      success: true,
      hasSimilar: formattedMatches.length > 0,
      matches: formattedMatches
    });
  } catch (error) {
    console.error('Check similar error:', error);
    return res.status(500).json({ success: false, message: 'Error checking duplicate complaints.' });
  }
});

// GET /api/complaints/:id
router.get('/:id', async (req, res) => {
  try {
    const db = await getDB();
    const complaint = await db.get(`
      SELECT c.*, u.name as author_name, u.email as author_email,
        (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id = c.id) as support_count
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const updates = await db.all(`
      SELECT au.*, u.name as official_name
      FROM authority_updates au
      JOIN users u ON au.official_id = u.id
      WHERE au.complaint_id = ?
      ORDER BY au.created_at ASC
    `, [req.params.id]);

    const p = calculatePriority(complaint.severity, complaint.category, complaint.support_count, complaint.created_at);
    const coords = (complaint.latitude && complaint.longitude) 
      ? { latitude: complaint.latitude, longitude: complaint.longitude } 
      : getCoordinatesForLocation(complaint.location, complaint.id);

    return res.json({
      success: true,
      data: {
        ...complaint,
        latitude: coords.latitude,
        longitude: coords.longitude,
        priority_score: p.priorityScore,
        priority_level: p.priorityLevel,
        priority_reason: p.priorityReason,
        updates
      }
    });
  } catch (error) {
    console.error('Fetch detail error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching complaint details.' });
  }
});

// POST /api/complaints
router.post('/', authenticateToken, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Image upload error: ${err.message}` });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const { title, description, category, severity, location, latitude, longitude } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({ success: false, message: 'Title, description, category, and location are required.' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const itemSeverity = severity || 'medium';

    const { priorityScore, priorityReason } = calculatePriority(itemSeverity, category, 0);

    const db = await getDB();

    const result = await db.run(`
      INSERT INTO complaints (title, description, category, severity, location, latitude, longitude, status, image_url, user_id, priority_score, priority_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `, [
      title.trim(), 
      description.trim(), 
      category, 
      itemSeverity, 
      location.trim(), 
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      image_url, 
      req.user.id, 
      priorityScore, 
      priorityReason
    ]);

    const complaintId = result.lastID;
    const codeNumber = String(complaintId).padStart(4, '0');
    const complaintCode = `R2R-2026-${codeNumber}`;

    const derivedCoords = getCoordinatesForLocation(location, complaintId);
    const finalLat = latitude ? parseFloat(latitude) : derivedCoords.latitude;
    const finalLng = longitude ? parseFloat(longitude) : derivedCoords.longitude;

    await db.run(
      'UPDATE complaints SET complaint_code = ?, latitude = ?, longitude = ? WHERE id = ?',
      [complaintCode, finalLat, finalLng, complaintId]
    );

    const newComplaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);

    return res.status(201).json({
      success: true,
      message: 'Complaint submitted with automated priority calculation & GIS coordinates!',
      data: {
        ...newComplaint,
        latitude: finalLat,
        longitude: finalLng,
        priority_score: priorityScore,
        priority_reason: priorityReason
      }
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating complaint.' });
  }
});

// POST /api/complaints/:id/support
router.post('/:id/support', authenticateToken, async (req, res) => {
  try {
    const complaintId = req.params.id;
    const userId = req.user.id;
    const db = await getDB();

    const existingSupport = await db.get(
      'SELECT * FROM complaint_support WHERE complaint_id = ? AND user_id = ?',
      [complaintId, userId]
    );

    let supported = false;
    if (existingSupport) {
      await db.run('DELETE FROM complaint_support WHERE complaint_id = ? AND user_id = ?', [complaintId, userId]);
      supported = false;
    } else {
      await db.run('INSERT INTO complaint_support (complaint_id, user_id) VALUES (?, ?)', [complaintId, userId]);
      supported = true;
    }

    await refreshComplaintPriority(db, complaintId);

    const count = await db.get('SELECT COUNT(*) as total FROM complaint_support WHERE complaint_id = ?', [complaintId]);
    const updatedComplaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);

    const p = calculatePriority(updatedComplaint.severity, updatedComplaint.category, count.total, updatedComplaint.created_at);

    return res.json({ 
      success: true, 
      supported, 
      support_count: count.total,
      priority_score: p.priorityScore,
      priority_level: p.priorityLevel,
      priority_reason: p.priorityReason
    });
  } catch (error) {
    console.error('Support complaint error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating support.' });
  }
});

// POST /api/complaints/:id/verify (With simulated notification)
router.post('/:id/verify', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const complaintId = req.params.id;
    const db = await getDB();

    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const author = await db.get('SELECT name, email FROM users WHERE id = ?', [complaint.user_id]);
    const newVerifyState = complaint.is_verified ? 0 : 1;
    await db.run('UPDATE complaints SET is_verified = ? WHERE id = ?', [newVerifyState, complaintId]);

    const remarkText = newVerifyState 
      ? 'Official Verification Complete: Field inspection verified civic issue validity.'
      : 'Official Verification Status Revoked for review.';

    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, ?, 'verification')
    `, [complaintId, req.user.id, remarkText, complaint.status]);

    const simulatedNotification = createSimulatedNotifications(complaint, author, complaint.status, remarkText);

    return res.json({
      success: true,
      is_verified: newVerifyState === 1,
      message: newVerifyState ? 'Report verified by municipal authority!' : 'Report verification revoked.',
      simulatedNotification
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling verification status.' });
  }
});

// POST /api/complaints/:id/flag (With simulated notification)
router.post('/:id/flag', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { flag_reason } = req.body;

    const db = await getDB();
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const author = await db.get('SELECT name, email FROM users WHERE id = ?', [complaint.user_id]);
    const newFlagState = complaint.is_flagged ? 0 : 1;
    const statusText = newFlagState ? 'flagged' : 'pending';

    await db.run(
      'UPDATE complaints SET is_flagged = ?, flag_reason = ?, status = ? WHERE id = ?',
      [newFlagState, flag_reason || 'Flagged by authority as invalid or duplicate', statusText, complaintId]
    );

    const remarkText = newFlagState 
      ? `Report Flagged: ${flag_reason || 'Inaccurate or duplicate entry.'}`
      : 'Flag status cleared by municipal authority.';

    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, ?, 'flagged')
    `, [complaintId, req.user.id, remarkText, statusText]);

    const simulatedNotification = createSimulatedNotifications(complaint, author, statusText, remarkText);

    return res.json({
      success: true,
      is_flagged: newFlagState === 1,
      message: newFlagState ? 'Report flagged as invalid.' : 'Report flag cleared.',
      simulatedNotification
    });
  } catch (error) {
    console.error('Flag error:', error);
    return res.status(500).json({ success: false, message: 'Server error flagging report.' });
  }
});

// POST /api/complaints/:id/authority-update (With simulated notification)
router.post('/:id/authority-update', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { update_text, status_change, action_type } = req.body;

    if (!update_text) {
      return res.status(400).json({ success: false, message: 'Authority remarks are required.' });
    }

    const db = await getDB();
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const author = await db.get('SELECT name, email FROM users WHERE id = ?', [complaint.user_id]);
    const nextStatus = status_change || complaint.status;

    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, ?, ?)
    `, [complaintId, req.user.id, update_text, nextStatus, action_type || 'remark']);

    if (nextStatus !== complaint.status) {
      await db.run('UPDATE complaints SET status = ? WHERE id = ?', [nextStatus, complaintId]);
    }

    // Create simulated notifications for Email & SMS demo
    const simulatedNotification = createSimulatedNotifications(complaint, author, nextStatus, update_text);

    return res.json({
      success: true,
      message: 'Authority remarks & status update saved to SQLite!',
      simulatedNotification
    });
  } catch (error) {
    console.error('Authority update error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving authority update.' });
  }
});

module.exports = router;
