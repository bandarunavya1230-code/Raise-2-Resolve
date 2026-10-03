const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { getDB } = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { calculatePriority } = require('../utils/priority');
const { resolveAuthorityAndDepartment, getDepartmentForCategory } = require('../utils/authorityResolver');
const { resolveVerifiedAuthority } = require('../data/verifiedAuthorityDirectory');

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
function createSimulatedNotifications(complaint, author, nextStatus, updateText, customSubject) {
  const code = complaint.complaint_code || `R2R-2026-${String(complaint.id).padStart(4, '0')}`;
  const citizenName = author ? author.name : 'Valued Citizen';
  const citizenEmail = author ? author.email : 'citizen@raise2resolve.gov';
  const citizenPhone = '+91 (800) 200-3532';

  const statusLabel = nextStatus.toUpperCase().replace('_', ' ');

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
      subject: customSubject || `[Raise 2 Resolve] Ticket #${code} Status Update: ${statusLabel}`,
      body: `Hello ${citizenName},\n\nYour civic complaint #${code} ("${complaint.title}") located at "${complaint.location}" has an official status update.\n\nCurrent Department: ${complaint.department_name || 'Municipal Works'}\nStatus: ${statusLabel}\n\nOfficial Municipal Remark:\n"${updateText}"\n\nYou can track the full resolution timeline on your Raise 2 Resolve Citizen Dashboard.\n\nRegards,\nRaise 2 Resolve Municipal Authority`
    },
    sms: {
      label: '[SIMULATED SMS NOTIFICATION]',
      to: citizenPhone,
      body: `[R2R Alert] Ticket #${code} is now ${statusLabel}. Dept: ${complaint.department_name || 'Municipal'}. Remark: ${updateText.length > 60 ? updateText.slice(0, 60) + '...' : updateText}`
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
    const { department, status, jurisdiction, state, district, city } = req.query;
    const db = await getDB();

    let query = `
      SELECT c.*, u.name as author_name,
        (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id = c.id) as support_count
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (department && department !== 'All') {
      query += ' AND c.department_name = ?';
      params.push(department);
    }
    if (status && status !== 'All') {
      if (status === 'verified') {
        query += ' AND (c.verification_status = "verified" OR c.is_verified = 1)';
      } else if (status === 'unverified') {
        query += ' AND (c.verification_status = "unverified" AND c.is_verified = 0)';
      } else if (status === 'assigned') {
        query += ' AND c.status = "assigned"';
      } else if (status === 'rejected') {
        query += ' AND (c.status = "rejected" OR c.is_flagged = 1)';
      } else {
        query += ' AND c.status = ?';
        params.push(status);
      }
    }
    if (state) {
      query += ' AND c.state = ?';
      params.push(state);
    }
    if (district) {
      query += ' AND c.district = ?';
      params.push(district);
    }
    if (city) {
      query += ' AND c.city_town_village = ?';
      params.push(city);
    }

    query += ' ORDER BY c.priority_score DESC, c.created_at DESC';

    const rawComplaints = await db.all(query, params);

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
    return res.status(500).json({ success: false, message: 'Server error fetching user complaints.' });
  }
});

// POST /api/complaints/check-similar
router.post('/check-similar', async (req, res) => {
  try {
    const { category, location, title, ward_area, city_town_village } = req.body;

    if (!category && !location && !title) {
      return res.json({ success: true, hasSimilar: false, matches: [] });
    }

    const db = await getDB();
    const complaints = await db.all(`
      SELECT c.*, (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id = c.id) as support_count
      FROM complaints c
      WHERE c.status != 'resolved' AND c.status != 'rejected'
      ORDER BY c.created_at DESC
      LIMIT 50
    `);

    const matches = complaints.filter(c => {
      const categoryMatch = c.category && category && (
        c.category.toLowerCase().includes(category.toLowerCase()) || 
        category.toLowerCase().includes(c.category.toLowerCase())
      );
      
      const loc1 = (c.location || '').toLowerCase();
      const loc2 = (location || '').toLowerCase();
      const locMatch = (loc1 && loc2) && (loc1.includes(loc2) || loc2.includes(loc1));

      const wardMatch = ward_area && c.ward_area && (
        c.ward_area.toLowerCase() === ward_area.toLowerCase()
      );

      const titleWords1 = (c.title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const titleWords2 = (title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const titleMatch = titleWords1.some(w => titleWords2.includes(w));

      return (categoryMatch && (locMatch || wardMatch || titleMatch)) || (locMatch && titleMatch);
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

// GET /api/complaints/track/:code
// Dedicated endpoint to track a complaint by its ticket code (e.g. R2R-2026-0001 or numeric ID)
router.get('/track/:code', async (req, res) => {
  try {
    const rawCode = (req.params.code || '').trim();
    if (!rawCode) {
      return res.status(400).json({ success: false, message: 'Complaint tracking code is required.' });
    }

    const db = await getDB();
    const queryTerm = rawCode.toLowerCase();

    // Match by complaint_code, formatted R2R code, or numeric ID
    const complaint = await db.get(`
      SELECT c.*, u.name as author_name, u.email as author_email,
        (SELECT COUNT(*) FROM complaint_support cs WHERE cs.complaint_id = c.id) as support_count
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE LOWER(c.complaint_code) = ?
         OR LOWER(c.complaint_code) = LOWER(?)
         OR c.id = ?
         OR LOWER(c.complaint_code) LIKE ?
      LIMIT 1
    `, [queryTerm, `R2R-2026-${queryTerm.replace(/^r2r-2026-/, '')}`, parseInt(rawCode, 10) || -1, `%${queryTerm}%`]);

    if (!complaint) {
      return res.status(404).json({ 
        success: false, 
        message: `No complaint found matching tracking code "${rawCode}". Please check your Ticket ID.` 
      });
    }

    const updates = await db.all(`
      SELECT au.*, u.name as official_name
      FROM authority_updates au
      JOIN users u ON au.official_id = u.id
      WHERE au.complaint_id = ?
      ORDER BY au.created_at ASC
    `, [complaint.id]);

    const reassignments = await db.all(`
      SELECT cr.*, u.name as reassigned_by_name
      FROM complaint_reassignments cr
      JOIN users u ON cr.reassigned_by = u.id
      WHERE cr.complaint_id = ?
      ORDER BY cr.created_at ASC
    `, [complaint.id]);

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
        updates,
        reassignments
      }
    });
  } catch (error) {
    console.error('Track complaint error:', error);
    return res.status(500).json({ success: false, message: 'Server error while tracking complaint.' });
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

    const reassignments = await db.all(`
      SELECT cr.*, u.name as reassigned_by_name
      FROM complaint_reassignments cr
      JOIN users u ON cr.reassigned_by = u.id
      WHERE cr.complaint_id = ?
      ORDER BY cr.created_at ASC
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
        updates,
        reassignments
      }
    });
  } catch (error) {
    console.error('Fetch detail error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching complaint details.' });
  }
});

// GET /api/complaints/:id/history (Full Audit Trail)
router.get('/:id/history', async (req, res) => {
  try {
    const db = await getDB();
    const complaintId = req.params.id;

    const updates = await db.all(`
      SELECT au.id, au.created_at, au.update_text, au.status_change, au.action_type, u.name as actor_name, u.role as actor_role
      FROM authority_updates au
      LEFT JOIN users u ON au.official_id = u.id
      WHERE au.complaint_id = ?
      ORDER BY au.created_at ASC
    `, [complaintId]);

    const reassignments = await db.all(`
      SELECT cr.id, cr.created_at, cr.from_department_name, cr.to_department_name, cr.reason, u.name as actor_name, u.role as actor_role
      FROM complaint_reassignments cr
      LEFT JOIN users u ON cr.reassigned_by = u.id
      WHERE cr.complaint_id = ?
      ORDER BY cr.created_at ASC
    `, [complaintId]);

    return res.json({
      success: true,
      updates,
      reassignments
    });
  } catch (error) {
    console.error('Audit history error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching audit history.' });
  }
});

// POST /api/complaints (Create new complaint with automatic department & location routing)
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
    const { 
      title, 
      description, 
      category, 
      severity, 
      location, 
      latitude, 
      longitude,
      state,
      district,
      city_town_village,
      ward_area,
      location_type,
      authority_name,
      authority_contact,
      jurisdiction_level,
      office_address,
      official_portal,
      official_website,
      department_name
    } = req.body;

    if (!title || !description || !category || !location) {
      return res.status(400).json({ success: false, message: 'Title, description, category, and location are required.' });
    }

    const image_url = req.file ? `/uploads/${req.file.filename}` : null;
    const itemSeverity = severity || 'medium';

    const { priorityScore, priorityReason } = calculatePriority(itemSeverity, category, 0);

    const db = await getDB();

    // Check if verified authority was selected or resolve dynamically
    const verifiedAuth = resolveVerifiedAuthority({
      state: state || 'Karnataka',
      district: district || 'Bengaluru Urban',
      ward: ward_area || null,
      category,
      lat: latitude ? parseFloat(latitude) : null,
      lng: longitude ? parseFloat(longitude) : null
    });

    const finalAuthorityName = authority_name || verifiedAuth.authorityName || 'Central Municipal Grievance Desk';
    const finalDepartmentName = department_name || verifiedAuth.department || category;
    const finalContact = authority_contact || verifiedAuth.phone || '1800-200-3532';
    const finalJurisdiction = jurisdiction_level || verifiedAuth.jurisdictionLevel || 'District Level';
    const finalOfficeAddress = office_address || verifiedAuth.address || '';
    const finalPortal = official_portal || verifiedAuth.portalUrl || '';
    const finalWebsite = official_website || verifiedAuth.websiteUrl || '';

    // Match department ID if present
    const deptRecord = await db.get('SELECT id FROM departments WHERE name = ? OR category = ? LIMIT 1', [finalDepartmentName, category]);
    const deptId = deptRecord ? deptRecord.id : null;

    const result = await db.run(`
      INSERT INTO complaints (
        title, description, category, severity, location, latitude, longitude, status, image_url, user_id, 
        priority_score, priority_reason, department_id, department_name, authority_name, 
        authority_contact, jurisdiction_level, state, district, city_town_village, location_type, ward_area, 
        verification_status, office_address, official_portal, official_website
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unverified', ?, ?, ?)
    `, [
      title.trim(), 
      description.trim(), 
      category, 
      itemSeverity, 
      location.trim(), 
      latitude ? parseFloat(latitude) : (verifiedAuth.latitude || null), 
      longitude ? parseFloat(longitude) : (verifiedAuth.longitude || null), 
      image_url, 
      req.user.id, 
      priorityScore, 
      priorityReason,
      deptId,
      finalDepartmentName,
      finalAuthorityName,
      finalContact,
      finalJurisdiction,
      state || 'Karnataka',
      district || 'Bengaluru Urban',
      city_town_village || 'Bengaluru (City)',
      location_type || 'city',
      ward_area || 'Ward 82 - Indiranagar',
      finalOfficeAddress,
      finalPortal,
      finalWebsite
    ]);

    const complaintId = result.lastID;
    const codeNumber = String(complaintId).padStart(4, '0');
    const complaintCode = `R2R-2026-${codeNumber}`;

    const derivedCoords = getCoordinatesForLocation(location, complaintId);
    const finalLat = latitude ? parseFloat(latitude) : (verifiedAuth.latitude || derivedCoords.latitude);
    const finalLng = longitude ? parseFloat(longitude) : (verifiedAuth.longitude || derivedCoords.longitude);

    await db.run(
      'UPDATE complaints SET complaint_code = ?, latitude = ?, longitude = ? WHERE id = ?',
      [complaintCode, finalLat, finalLng, complaintId]
    );

    // Initial Submission audit log
    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, 'pending', 'submission')
    `, [
      complaintId,
      req.user.id,
      `Complaint registered and auto-routed to ${finalDepartmentName} under ${finalJurisdiction} (${finalAuthorityName}).`
    ]);

    const newComplaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);

    return res.status(201).json({
      success: true,
      message: `Complaint submitted and routed to ${finalDepartmentName}!`,
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

// POST /api/complaints/:id/support (Community Upvote)
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

// POST /api/complaints/:id/verify (Authority Verification Step)
router.post('/:id/verify', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { remarks } = req.body;
    const db = await getDB();

    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const author = await db.get('SELECT name, email FROM users WHERE id = ?', [complaint.user_id]);
    
    let newVerifyState = 'verified';
    if (req.body.action === 'revoke' || req.body.action === 'unverify') {
      newVerifyState = 'unverified';
    } else if (req.body.department_id || req.body.department_name) {
      newVerifyState = 'verified';
    } else {
      newVerifyState = complaint.verification_status === 'verified' ? 'unverified' : 'verified';
    }

    const isVerifiedInt = newVerifyState === 'verified' ? 1 : 0;
    const nextStatus = newVerifyState === 'verified' ? (complaint.status === 'pending' ? 'verified' : complaint.status) : 'pending';

    // Assign to a particular department upon verification
    let assignedDeptId = complaint.department_id;
    let assignedDeptName = complaint.department_name;

    if (newVerifyState === 'verified') {
      const { department_id, department_name } = req.body;
      if (department_id) {
        const d = await db.get('SELECT * FROM departments WHERE id = ?', [department_id]);
        if (d) {
          assignedDeptId = d.id;
          assignedDeptName = d.name;
        }
      } else if (department_name) {
        const d = await db.get('SELECT * FROM departments WHERE name = ?', [department_name]);
        if (d) {
          assignedDeptId = d.id;
          assignedDeptName = d.name;
        } else {
          assignedDeptName = department_name;
        }
      }

      // If still not assigned, automatically resolve appropriate department based on category
      if (!assignedDeptName) {
        const defaultDeptName = getDepartmentForCategory(complaint.category);
        const d = await db.get('SELECT * FROM departments WHERE name = ?', [defaultDeptName]);
        if (d) {
          assignedDeptId = d.id;
          assignedDeptName = d.name;
        } else {
          assignedDeptName = defaultDeptName;
        }
      }
    }

    await db.run(`
      UPDATE complaints 
      SET verification_status = ?,
          is_verified = ?,
          verified_at = CURRENT_TIMESTAMP,
          verified_by = ?,
          department_id = ?,
          department_name = ?,
          assigned_to = COALESCE(?, assigned_to, ?),
          assigned_at = CURRENT_TIMESTAMP,
          status = ?
      WHERE id = ?
    `, [
      newVerifyState, 
      isVerifiedInt, 
      req.user.id, 
      newVerifyState === 'verified' ? assignedDeptId : complaint.department_id,
      newVerifyState === 'verified' ? assignedDeptName : complaint.department_name,
      newVerifyState === 'verified' ? assignedDeptName : null,
      newVerifyState === 'verified' ? assignedDeptName : null,
      nextStatus, 
      complaintId
    ]);

    const remarkText = newVerifyState === 'verified'
      ? (remarks || `Official Verification Complete: Civic issue verified by authority and assigned to ${assignedDeptName} for on-ground resolution.`)
      : 'Verification Status Revoked for administrative re-examination.';

    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, ?, 'verification')
    `, [complaintId, req.user.id, remarkText, nextStatus]);

    const simulatedNotification = createSimulatedNotifications(complaint, author, nextStatus, remarkText);

    return res.json({
      success: true,
      verification_status: newVerifyState,
      is_verified: isVerifiedInt === 1,
      assigned_department: assignedDeptName,
      department_id: assignedDeptId,
      status: nextStatus,
      message: newVerifyState === 'verified' 
        ? `Complaint verified by authority and assigned to ${assignedDeptName}!` 
        : 'Complaint marked unverified.',
      simulatedNotification
    });
  } catch (error) {
    console.error('Verify error:', error);
    return res.status(500).json({ success: false, message: 'Server error toggling verification status.' });
  }
});

// POST /api/complaints/:id/assign (Assign Field Crew / Department Staff)
router.post('/:id/assign', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { assigned_to, instructions } = req.body;

    if (!assigned_to) {
      return res.status(400).json({ success: false, message: 'Assigned personnel or team name is required.' });
    }

    const db = await getDB();
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const author = await db.get('SELECT name, email FROM users WHERE id = ?', [complaint.user_id]);

    await db.run(`
      UPDATE complaints 
      SET assigned_to = ?,
          assigned_at = CURRENT_TIMESTAMP,
          status = 'assigned'
      WHERE id = ?
    `, [assigned_to.trim(), complaintId]);

    const remarkText = `Work Assigned to: ${assigned_to.trim()}. Instructions: ${instructions || 'Field inspection & resolution dispatched.'}`;

    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, 'assigned', 'assignment')
    `, [complaintId, req.user.id, remarkText]);

    const simulatedNotification = createSimulatedNotifications(complaint, author, 'assigned', remarkText);

    return res.json({
      success: true,
      message: `Work crew successfully assigned to ${assigned_to}!`,
      status: 'assigned',
      assigned_to: assigned_to.trim(),
      simulatedNotification
    });
  } catch (error) {
    console.error('Assign error:', error);
    return res.status(500).json({ success: false, message: 'Server error assigning work crew.' });
  }
});

// POST /api/complaints/:id/reassign (Reassign to different department with Audit Trail)
router.post('/:id/reassign', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const complaintId = req.params.id;
    const { target_department_id, target_department_name, reason } = req.body;

    if (!reason || (!target_department_id && !target_department_name)) {
      return res.status(400).json({ success: false, message: 'Target department and reason for reassignment are required.' });
    }

    const db = await getDB();
    const complaint = await db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    // Determine target department
    let targetDept = null;
    if (target_department_id) {
      targetDept = await db.get('SELECT * FROM departments WHERE id = ?', [target_department_id]);
    } else {
      targetDept = await db.get('SELECT * FROM departments WHERE name = ?', [target_department_name]);
    }

    if (!targetDept) {
      return res.status(400).json({ success: false, message: 'Selected target department is invalid.' });
    }

    // Re-resolve authority for new department in same location
    const newAuthority = await db.get(`
      SELECT * FROM authorities 
      WHERE is_active = 1 
        AND department_name = ? 
        AND (city_town_village = ? OR district = ?)
      LIMIT 1
    `, [targetDept.name, complaint.city_town_village, complaint.district]) ||
    await db.get('SELECT * FROM authorities WHERE department_name = ? LIMIT 1', [targetDept.name]) ||
    await db.get('SELECT * FROM authorities WHERE is_active = 1 LIMIT 1');

    const currentUser = await db.get('SELECT name FROM users WHERE id = ?', [req.user.id]);
    const currentUserName = currentUser ? currentUser.name : 'Municipal Authority';

    // 1. Record Audit Trail in complaint_reassignments
    await db.run(`
      INSERT INTO complaint_reassignments (
        complaint_id, from_department_id, from_department_name, to_department_id, to_department_name, 
        from_authority_id, to_authority_id, reassigned_by, reassigned_by_name, reason
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      complaintId,
      complaint.department_id,
      complaint.department_name || 'Unassigned',
      targetDept.id,
      targetDept.name,
      complaint.authority_id,
      newAuthority ? newAuthority.id : null,
      req.user.id,
      currentUserName,
      reason.trim()
    ]);

    // 2. Update Complaint
    const newReassignmentCount = (complaint.reassignment_count || 0) + 1;
    await db.run(`
      UPDATE complaints
      SET department_id = ?,
          department_name = ?,
          authority_id = ?,
          authority_name = ?,
          authority_contact = ?,
          reassignment_count = ?,
          status = 'pending'
      WHERE id = ?
    `, [
      targetDept.id,
      targetDept.name,
      newAuthority ? newAuthority.id : null,
      newAuthority ? newAuthority.name : complaint.authority_name,
      newAuthority ? (newAuthority.contact_phone || newAuthority.contact_email) : complaint.authority_contact,
      newReassignmentCount,
      complaintId
    ]);

    // 3. Log Authority Update
    const auditRemark = `Department Reassignment: Transferred from [${complaint.department_name || 'General'}] to [${targetDept.name}]. Reason: "${reason.trim()}" (Authorized by: ${currentUserName})`;
    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, 'pending', 'reassignment')
    `, [complaintId, req.user.id, auditRemark]);

    const author = await db.get('SELECT name, email FROM users WHERE id = ?', [complaint.user_id]);
    const simulatedNotification = createSimulatedNotifications(
      { ...complaint, department_name: targetDept.name },
      author,
      'pending',
      auditRemark,
      `[Raise 2 Resolve] Ticket #${complaint.complaint_code || complaint.id} Reassigned to ${targetDept.name}`
    );

    return res.json({
      success: true,
      message: `Complaint reassigned to ${targetDept.name}! Audit trail recorded.`,
      new_department: targetDept.name,
      reassignment_count: newReassignmentCount,
      simulatedNotification
    });
  } catch (error) {
    console.error('Reassign error:', error);
    return res.status(500).json({ success: false, message: 'Server error reassigning complaint.' });
  }
});

// POST /api/complaints/:id/flag / reject
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
    const statusText = newFlagState ? 'rejected' : 'pending';

    await db.run(
      'UPDATE complaints SET is_flagged = ?, flag_reason = ?, status = ?, verification_status = ? WHERE id = ?',
      [newFlagState, flag_reason || 'Rejected by authority after review', statusText, newFlagState ? 'rejected' : 'unverified', complaintId]
    );

    const remarkText = newFlagState 
      ? `Report Rejected / Flagged: ${flag_reason || 'Inaccurate or outside civic scope.'}`
      : 'Flag status cleared by municipal authority.';

    await db.run(`
      INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
      VALUES (?, ?, ?, ?, 'flagged')
    `, [complaintId, req.user.id, remarkText, statusText]);

    const simulatedNotification = createSimulatedNotifications(complaint, author, statusText, remarkText);

    return res.json({
      success: true,
      is_flagged: newFlagState === 1,
      status: statusText,
      message: newFlagState ? 'Report rejected/flagged.' : 'Report flag cleared.',
      simulatedNotification
    });
  } catch (error) {
    console.error('Flag error:', error);
    return res.status(500).json({ success: false, message: 'Server error flagging report.' });
  }
});

// POST /api/complaints/:id/authority-update
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

    const simulatedNotification = createSimulatedNotifications(complaint, author, nextStatus, update_text);

    return res.json({
      success: true,
      message: 'Authority remarks & status update saved to database!',
      status: nextStatus,
      simulatedNotification
    });
  } catch (error) {
    console.error('Authority update error:', error);
    return res.status(500).json({ success: false, message: 'Server error saving authority update.' });
  }
});

module.exports = router;
