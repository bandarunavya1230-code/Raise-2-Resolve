// Helper to map category to department name
function getDepartmentForCategory(category = '') {
  const cat = (category || '').toLowerCase().trim();

  if (cat.includes('electr') && !cat.includes('light')) {
    return 'Electricity Department';
  }
  if (cat.includes('water') || cat.includes('sewage') || cat.includes('pipe')) {
    return 'Water Supply & Sewage Board';
  }
  if (cat.includes('road') || cat.includes('pothole') || cat.includes('pavement') || cat.includes('works')) {
    return 'Roads & Public Works Department';
  }
  if (cat.includes('waste') || cat.includes('garbage') || cat.includes('sanitation') || cat.includes('cleaning')) {
    return 'Sanitation & Solid Waste Management';
  }
  if (cat.includes('light') || cat.includes('street') || cat.includes('lamp')) {
    return 'Streetlights & Electrical Wing';
  }
  if (cat.includes('drain') || cat.includes('flood') || cat.includes('stormwater') || cat.includes('manhole')) {
    return 'Drainage & Stormwater Department';
  }
  if (cat.includes('safety') || cat.includes('hazard') || cat.includes('danger') || cat.includes('stray')) {
    return 'Public Safety & Civil Defense';
  }
  return 'General Municipal Grievances';
}

// Calculate distance in km between two GPS points using Haversine formula
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 999999;
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Resolve appropriate department and authority from database
async function resolveAuthorityAndDepartment(db, {
  category,
  state,
  district,
  city_town_village,
  ward_area,
  location_type,
  latitude,
  longitude
}) {
  const departmentName = getDepartmentForCategory(category);
  
  // Find department record
  let department = await db.get('SELECT * FROM departments WHERE name = ?', [departmentName]);
  if (!department) {
    department = await db.get('SELECT * FROM departments ORDER BY id ASC LIMIT 1');
  }

  const deptId = department ? department.id : null;
  const actualDeptName = department ? department.name : departmentName;

  // 1. Try exact match: Department + City/Town/Village + Ward
  let authority = null;
  if (city_town_village && ward_area) {
    authority = await db.get(`
      SELECT * FROM authorities 
      WHERE is_active = 1 
        AND department_name = ? 
        AND city_town_village = ? 
        AND ward_area = ?
      LIMIT 1
    `, [actualDeptName, city_town_village, ward_area]);
  }

  // 2. Try match: Department + City/Town/Village
  if (!authority && city_town_village) {
    authority = await db.get(`
      SELECT * FROM authorities 
      WHERE is_active = 1 
        AND department_name = ? 
        AND city_town_village = ?
      LIMIT 1
    `, [actualDeptName, city_town_village]);
  }

  // 3. Try match: Location City/Town/Village only (general local authority)
  if (!authority && city_town_village) {
    authority = await db.get(`
      SELECT * FROM authorities 
      WHERE is_active = 1 
        AND city_town_village = ?
      LIMIT 1
    `, [city_town_village]);
  }

  // 4. Try match by District + Department
  if (!authority && district) {
    authority = await db.get(`
      SELECT * FROM authorities 
      WHERE is_active = 1 
        AND district = ? 
        AND department_name = ?
      LIMIT 1
    `, [district, actualDeptName]);
  }

  // 5. Try GPS proximity match if latitude & longitude provided
  if (!authority && latitude && longitude) {
    const allLocations = await db.all('SELECT * FROM locations WHERE latitude IS NOT NULL AND longitude IS NOT NULL');
    let nearestLoc = null;
    let minDistance = Infinity;

    for (const loc of allLocations) {
      const dist = calculateDistanceKm(latitude, longitude, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearestLoc = loc;
      }
    }

    if (nearestLoc) {
      authority = await db.get(`
        SELECT * FROM authorities 
        WHERE is_active = 1 AND city_town_village = ?
        LIMIT 1
      `, [nearestLoc.city_town_village]);
    }
  }

  // 6. Universal fallback: primary active authority
  if (!authority) {
    authority = await db.get('SELECT * FROM authorities WHERE is_active = 1 ORDER BY id ASC LIMIT 1');
  }

  // Derive jurisdiction level label
  let jurisdictionLevel = 'Municipal Ward Level';
  if (location_type === 'village') {
    jurisdictionLevel = 'Village Gram Panchayat';
  } else if (location_type === 'town') {
    jurisdictionLevel = 'Town Municipal Council';
  } else if (authority && authority.jurisdiction_type === 'city') {
    jurisdictionLevel = 'City Municipal Corporation';
  } else if (authority && authority.jurisdiction_type === 'district') {
    jurisdictionLevel = 'District Administrative Office';
  }

  return {
    department_id: deptId,
    department_name: actualDeptName,
    department_contact_email: department ? department.contact_email : 'support@raise2resolve.gov',
    department_contact_phone: department ? department.contact_phone : '1800-200-3532',
    authority_id: authority ? authority.id : null,
    authority_name: authority ? authority.name : 'Central Civic Grievance Cell',
    authority_title: authority ? authority.title : 'Administrative Officer',
    authority_contact: authority ? (authority.contact_phone || authority.contact_email) : '1800-200-3532',
    authority_office: authority ? authority.office_address : 'Municipal Administrative Complex',
    jurisdiction_level: jurisdictionLevel
  };
}

module.exports = {
  getDepartmentForCategory,
  calculateDistanceKm,
  resolveAuthorityAndDepartment
};
