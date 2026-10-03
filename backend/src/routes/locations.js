const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { calculateDistanceKm, resolveAuthorityAndDepartment } = require('../utils/authorityResolver');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// GET /api/locations/hierarchy
// Returns full structured hierarchy for cascading dropdowns:
// State -> District -> City/Town/Village -> Ward/Area
router.get('/hierarchy', async (req, res) => {
  try {
    const db = await getDB();
    const rows = await db.all('SELECT * FROM locations ORDER BY state ASC, district ASC, city_town_village ASC, ward_area ASC');

    // Build nested tree
    const hierarchy = {};
    rows.forEach(r => {
      if (!hierarchy[r.state]) {
        hierarchy[r.state] = {};
      }
      if (!hierarchy[r.state][r.district]) {
        hierarchy[r.state][r.district] = {};
      }
      if (!hierarchy[r.state][r.district][r.city_town_village]) {
        hierarchy[r.state][r.district][r.city_town_village] = {
          type: r.location_type,
          wards: []
        };
      }
      hierarchy[r.state][r.district][r.city_town_village].wards.push({
        id: r.id,
        ward_area: r.ward_area,
        pincode: r.pincode,
        latitude: r.latitude,
        longitude: r.longitude
      });
    });

    return res.json({
      success: true,
      data: hierarchy,
      totalLocations: rows.length,
      locations: rows
    });
  } catch (error) {
    console.error('Fetch location hierarchy error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving location hierarchy.' });
  }
});

// GET /api/departments
router.get('/departments', async (req, res) => {
  try {
    const db = await getDB();
    const departments = await db.all('SELECT * FROM departments ORDER BY name ASC');
    return res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Fetch departments error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving departments.' });
  }
});

// GET /api/authorities
router.get('/authorities', async (req, res) => {
  try {
    const { state, district, city, department, ward } = req.query;
    const db = await getDB();

    let query = 'SELECT * FROM authorities WHERE is_active = 1';
    const params = [];

    if (state) {
      query += ' AND state = ?';
      params.push(state);
    }
    if (district) {
      query += ' AND district = ?';
      params.push(district);
    }
    if (city) {
      query += ' AND city_town_village = ?';
      params.push(city);
    }
    if (department) {
      query += ' AND department_name = ?';
      params.push(department);
    }
    if (ward) {
      query += ' AND (ward_area = ? OR ward_area IS NULL)';
      params.push(ward);
    }

    query += ' ORDER BY state ASC, city_town_village ASC, name ASC';
    const authorities = await db.all(query, params);

    return res.json({
      success: true,
      data: authorities
    });
  } catch (error) {
    console.error('Fetch authorities error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving authorities.' });
  }
});

// GET /api/authorities/near-me
// Finds authority matching GPS coordinates or manual location
router.get('/authorities/near-me', async (req, res) => {
  try {
    const { lat, lng, state, district, city, ward, category } = req.query;
    const db = await getDB();

    let resolvedLocation = null;
    let distanceKm = null;

    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);

      const allLocations = await db.all('SELECT * FROM locations WHERE latitude IS NOT NULL AND longitude IS NOT NULL');
      let minDistance = Infinity;

      allLocations.forEach(loc => {
        const d = calculateDistanceKm(parsedLat, parsedLng, loc.latitude, loc.longitude);
        if (d < minDistance) {
          minDistance = d;
          resolvedLocation = loc;
          distanceKm = Number(d.toFixed(2));
        }
      });
    }

    // If manual query was passed or GPS didn't find match
    if (!resolvedLocation && city) {
      resolvedLocation = await db.get(
        'SELECT * FROM locations WHERE city_town_village = ? LIMIT 1',
        [city]
      );
    }

    if (!resolvedLocation) {
      // Default to first location in DB
      resolvedLocation = await db.get('SELECT * FROM locations ORDER BY id ASC LIMIT 1');
    }

    // Resolve matching authority for this location & optional category
    const resolved = await resolveAuthorityAndDepartment(db, {
      category: category || 'Roads/Public Works',
      state: resolvedLocation ? resolvedLocation.state : state,
      district: resolvedLocation ? resolvedLocation.district : district,
      city_town_village: resolvedLocation ? resolvedLocation.city_town_village : city,
      ward_area: resolvedLocation ? resolvedLocation.ward_area : ward,
      location_type: resolvedLocation ? resolvedLocation.location_type : 'city',
      latitude: lat ? parseFloat(lat) : null,
      longitude: lng ? parseFloat(lng) : null
    });

    // Also get all department desks active in this local jurisdiction
    const allLocalAuthorities = await db.all(`
      SELECT * FROM authorities 
      WHERE is_active = 1 
        AND (city_town_village = ? OR district = ?)
      ORDER BY department_name ASC
    `, [resolvedLocation.city_town_village, resolvedLocation.district]);

    return res.json({
      success: true,
      resolvedLocation: {
        ...resolvedLocation,
        distanceKm
      },
      primaryAuthority: resolved,
      localAuthorities: allLocalAuthorities
    });
  } catch (error) {
    console.error('Find authority near me error:', error);
    return res.status(500).json({ success: false, message: 'Error identifying nearby authority.' });
  }
});

// POST /api/authorities (Admin configuration)
router.post('/authorities', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const {
      name,
      title,
      role,
      department_name,
      jurisdiction_type,
      state,
      district,
      city_town_village,
      ward_area,
      contact_email,
      contact_phone,
      office_address
    } = req.body;

    if (!name || !title || !state || !district || !city_town_village) {
      return res.status(400).json({ success: false, message: 'Name, title, state, district, and city/town/village are required.' });
    }

    const db = await getDB();
    const dept = department_name ? await db.get('SELECT id FROM departments WHERE name = ?', [department_name]) : null;

    const result = await db.run(`
      INSERT INTO authorities 
        (name, title, role, department_id, department_name, jurisdiction_type, state, district, city_town_village, ward_area, contact_email, contact_phone, office_address, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `, [
      name.trim(),
      title.trim(),
      role || 'local_authority',
      dept ? dept.id : null,
      department_name || 'General Municipal Grievances',
      jurisdiction_type || 'ward',
      state.trim(),
      district.trim(),
      city_town_village.trim(),
      ward_area ? ward_area.trim() : null,
      contact_email || null,
      contact_phone || null,
      office_address || null
    ]);

    const created = await db.get('SELECT * FROM authorities WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      success: true,
      message: 'Authority mapping configured successfully!',
      data: created
    });
  } catch (error) {
    console.error('Create authority error:', error);
    return res.status(500).json({ success: false, message: 'Server error configuring authority.' });
  }
});

// POST /api/locations (Admin configuration)
router.post('/locations', authenticateToken, authorizeRoles('authority'), async (req, res) => {
  try {
    const { state, district, city_town_village, location_type, ward_area, pincode, latitude, longitude } = req.body;

    if (!state || !district || !city_town_village || !ward_area) {
      return res.status(400).json({ success: false, message: 'State, district, city/town/village, and ward/area are required.' });
    }

    const db = await getDB();
    const result = await db.run(`
      INSERT INTO locations (state, district, city_town_village, location_type, ward_area, pincode, latitude, longitude)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      state.trim(),
      district.trim(),
      city_town_village.trim(),
      location_type || 'city',
      ward_area.trim(),
      pincode || null,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null
    ]);

    const created = await db.get('SELECT * FROM locations WHERE id = ?', [result.lastID]);

    return res.status(201).json({
      success: true,
      message: 'Location added to civic hierarchy!',
      data: created
    });
  } catch (error) {
    console.error('Create location error:', error);
    return res.status(500).json({ success: false, message: 'Server error creating location.' });
  }
});

module.exports = router;
