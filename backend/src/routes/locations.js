const express = require('express');
const router = express.Router();
const { getDB } = require('../config/db');
const { calculateDistanceKm, resolveAuthorityAndDepartment } = require('../utils/authorityResolver');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { 
  INDIAN_STATES_AND_UTS, 
  STATE_DISTRICTS, 
  STATE_COORDINATES, 
  DISTRICT_CENTERS 
} = require('../data/indiaGeographicData');
const { 
  VERIFIED_CATEGORIES, 
  resolveVerifiedAuthority 
} = require('../data/verifiedAuthorityDirectory');

// Helper handlers
const handleStates = (req, res) => {
  return res.json({
    success: true,
    count: INDIAN_STATES_AND_UTS.length,
    states: INDIAN_STATES_AND_UTS
  });
};

const handleDistricts = (req, res) => {
  const { state } = req.query;
  if (!state) {
    return res.status(400).json({ success: false, message: 'State or UT parameter is required.' });
  }

  const districts = STATE_DISTRICTS[state] || [];
  return res.json({
    success: true,
    state,
    count: districts.length,
    districts
  });
};

const handleCategories = (req, res) => {
  return res.json({
    success: true,
    categories: VERIFIED_CATEGORIES
  });
};

const handleReverseGeocode = (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) {
    return res.status(400).json({ success: false, message: 'Latitude and Longitude are required.' });
  }

  const pLat = parseFloat(lat);
  const pLng = parseFloat(lng);

  let closestDistrict = null;
  let minDistrictDist = Infinity;

  Object.entries(DISTRICT_CENTERS).forEach(([distName, coords]) => {
    const d = calculateDistanceKm(pLat, pLng, coords.lat, coords.lng);
    if (d < minDistrictDist) {
      minDistrictDist = d;
      closestDistrict = { district: distName, state: coords.state, distanceKm: d };
    }
  });

  let closestState = null;
  let minStateDist = Infinity;

  Object.entries(STATE_COORDINATES).forEach(([stateName, coords]) => {
    const d = calculateDistanceKm(pLat, pLng, coords.lat, coords.lng);
    if (d < minStateDist) {
      minStateDist = d;
      closestState = { state: stateName, distanceKm: d };
    }
  });

  const state = closestDistrict ? closestDistrict.state : (closestState ? closestState.state : 'Karnataka');
  const district = closestDistrict ? closestDistrict.district : (STATE_DISTRICTS[state]?.[0] || 'Bengaluru Urban');

  return res.json({
    success: true,
    latitude: pLat,
    longitude: pLng,
    state,
    district,
    confidence: minDistrictDist < 100 ? 'high' : 'approximate',
    nearestCenterDistanceKm: minDistrictDist
  });
};

// GET States
router.get('/states', handleStates);
router.get('/locations/states', handleStates);

// GET Districts
router.get('/districts', handleDistricts);
router.get('/locations/districts', handleDistricts);

// GET Categories
router.get('/categories', handleCategories);
router.get('/locations/categories', handleCategories);

// GET Reverse Geocode
router.get('/reverse-geocode', handleReverseGeocode);
router.get('/locations/reverse-geocode', handleReverseGeocode);

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
// Finds authority matching GPS coordinates or manual location hierarchy
router.get('/authorities/near-me', async (req, res) => {
  try {
    const { 
      lat, 
      lng, 
      state, 
      district, 
      city, 
      ward, 
      village, 
      local_area, 
      municipality, 
      mandal_taluk, 
      pincode, 
      category 
    } = req.query;

    const db = await getDB();

    let resolvedState = (state || '').trim();
    let resolvedDistrict = (district || '').trim();
    let distanceKm = null;

    // 1. If GPS coordinates provided, determine geographic jurisdiction first
    if (lat && lng) {
      const parsedLat = parseFloat(lat);
      const parsedLng = parseFloat(lng);

      if (!resolvedState || !resolvedDistrict) {
        // Find closest district from coordinates
        let closestDistrict = null;
        let minDistrictDist = Infinity;

        Object.entries(DISTRICT_CENTERS).forEach(([distName, coords]) => {
          const d = calculateDistanceKm(parsedLat, parsedLng, coords.lat, coords.lng);
          if (d < minDistrictDist) {
            minDistrictDist = d;
            closestDistrict = { district: distName, state: coords.state, distanceKm: d };
          }
        });

        // Find closest state if district not pinpointed
        let closestState = null;
        let minStateDist = Infinity;
        Object.entries(STATE_COORDINATES).forEach(([stName, coords]) => {
          const d = calculateDistanceKm(parsedLat, parsedLng, coords.lat, coords.lng);
          if (d < minStateDist) {
            minStateDist = d;
            closestState = { state: stName, distanceKm: d };
          }
        });

        if (!resolvedState) {
          resolvedState = closestDistrict ? closestDistrict.state : (closestState ? closestState.state : 'Karnataka');
        }
        if (!resolvedDistrict) {
          resolvedDistrict = closestDistrict ? closestDistrict.district : (STATE_DISTRICTS[resolvedState]?.[0] || 'Bengaluru Urban');
        }
      }
    }

    if (!resolvedState) resolvedState = 'Karnataka';
    if (!resolvedDistrict) resolvedDistrict = STATE_DISTRICTS[resolvedState]?.[0] || 'Bengaluru Urban';

    // 2. Resolve verified Indian Government Authority
    const verifiedAuthority = resolveVerifiedAuthority({
      state: resolvedState,
      district: resolvedDistrict,
      ward: ward || null,
      village: village || null,
      local_area: local_area || null,
      municipality: municipality || city || null,
      mandal_taluk: mandal_taluk || null,
      pincode: pincode || null,
      category: category || 'Roads',
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null
    });

    // 3. Database matching (for custom administrative overrides if present)
    let dbAuthority = null;
    if (resolvedDistrict) {
      dbAuthority = await db.get(
        'SELECT * FROM authorities WHERE is_active = 1 AND district = ? LIMIT 1',
        [resolvedDistrict]
      );
    }
    if (!dbAuthority && city) {
      dbAuthority = await db.get(
        'SELECT * FROM authorities WHERE is_active = 1 AND city_town_village = ? LIMIT 1',
        [city]
      );
    }

    // 4. Backward-compatible resolvedLocation object
    const resolvedLocation = {
      state: resolvedState,
      district: resolvedDistrict,
      city_town_village: city || municipality || village || resolvedDistrict,
      ward_area: ward || local_area || 'Central Administrative Zone',
      location_type: village ? 'village' : municipality ? 'town' : 'city',
      pincode: pincode || null,
      latitude: verifiedAuthority.latitude,
      longitude: verifiedAuthority.longitude,
      distanceKm: verifiedAuthority.distanceKm
    };

    // 5. Build merged primary authority payload
    const primaryAuthority = {
      department_name: verifiedAuthority.department,
      authority_name: verifiedAuthority.authorityName,
      authority_title: verifiedAuthority.office,
      authority_office: verifiedAuthority.office,
      office_address: verifiedAuthority.address,
      authority_contact: verifiedAuthority.phone,
      department_contact_phone: verifiedAuthority.phone,
      department_contact_email: 'support@raise2resolve.gov',
      official_website: verifiedAuthority.websiteUrl,
      official_portal: verifiedAuthority.portalUrl,
      jurisdiction_level: verifiedAuthority.jurisdictionLevel,
      exact_match_available: verifiedAuthority.exactMatchAvailable,
      fallback_note: verifiedAuthority.fallbackNote,
      directions_url: verifiedAuthority.directionsUrl,
      distance_km: verifiedAuthority.distanceKm
    };

    // Local desks active in this district
    const localAuthorities = await db.all(`
      SELECT * FROM authorities 
      WHERE is_active = 1 
        AND (district = ? OR state = ?)
      ORDER BY department_name ASC
    `, [resolvedDistrict, resolvedState]);

    return res.json({
      success: true,
      authority: verifiedAuthority,
      primaryAuthority,
      resolvedLocation,
      localAuthorities: localAuthorities.length > 0 ? localAuthorities : [
        {
          id: 1,
          name: verifiedAuthority.authorityName,
          title: verifiedAuthority.office,
          department_name: verifiedAuthority.department,
          contact_phone: verifiedAuthority.phone,
          office_address: verifiedAuthority.address,
          website_url: verifiedAuthority.websiteUrl,
          portal_url: verifiedAuthority.portalUrl
        }
      ]
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
