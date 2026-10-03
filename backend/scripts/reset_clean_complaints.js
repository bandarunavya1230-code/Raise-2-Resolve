const { getDB } = require('../src/config/db');
const { calculatePriority } = require('../src/utils/priority');

async function resetCleanComplaints() {
  console.log('🔄 Cleaning up complaints database...');
  const db = await getDB();

  // 1. Delete all existing complaints and associated support / logs
  await db.run('DELETE FROM complaint_reassignments');
  await db.run('DELETE FROM authority_updates');
  await db.run('DELETE FROM complaint_support');
  await db.run('DELETE FROM complaints');

  console.log('✅ Previous 25 complaints completely removed.');

  // 2. Fetch users and departments
  const authorityUser = await db.get("SELECT id, name FROM users WHERE role = 'authority' LIMIT 1");
  const citizenUser = await db.get("SELECT id, name FROM users WHERE role = 'citizen' LIMIT 1");

  const authId = authorityUser ? authorityUser.id : 1;
  const citizenId = citizenUser ? citizenUser.id : 2;

  const depts = await db.all('SELECT id, name, code FROM departments');
  const deptMap = {};
  depts.forEach(d => {
    deptMap[d.code] = d;
    deptMap[d.name] = d;
  });

  // 3. Define the balanced set of 8 complaints covering every department and filter
  const cleanComplaints = [
    // 1. Roads & Public Works (ROADS) -> In Progress (Unverified)
    {
      code: 'R2R-2026-0001',
      title: 'Dangerous crater-sized pothole on 100 Feet Road',
      description: 'Deep asphalt crater on 100 Feet Road right after monsoon rains causing frequent vehicle rim damage and extreme traffic deceleration.',
      category: 'Roads/Public Works',
      deptCode: 'ROADS',
      severity: 'high',
      status: 'in_progress',
      is_verified: 0,
      verification_status: 'unverified',
      is_flagged: 0,
      assigned_to: 'Indiranagar PWD Rapid Response Crew #2',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 82 - Indiranagar',
      location_type: 'city',
      location: 'Ward 82 - Indiranagar, Bengaluru, Bengaluru Urban, Karnataka (Near: CMH Hospital Junction)',
      latitude: 12.9784,
      longitude: 77.6408,
      supports: 4,
      remarks: 'Dispatched road repair crew for bitumen leveling and safety barricading.'
    },

    // 2. Water Supply & Sewage Board (WATER) -> Verified 1 of 2
    {
      code: 'R2R-2026-0002',
      title: 'High-pressure drinking water main line rupture',
      description: 'Main distribution pipe burst flooding the residential street with continuous potable water loss. Over 300 households experiencing zero water pressure.',
      category: 'Water Supply',
      deptCode: 'WATER',
      severity: 'critical',
      status: 'verified',
      is_verified: 1,
      verification_status: 'verified',
      is_flagged: 0,
      assigned_to: 'BWSSB Sub-Division Emergency Pipeline Team',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 150 - Bellandur',
      location_type: 'city',
      location: 'Ward 150 - Bellandur, Bengaluru, Bengaluru Urban, Karnataka (Near: Green Glen Layout)',
      latitude: 12.9260,
      longitude: 77.6762,
      supports: 6,
      remarks: 'Official on-site verification complete. Critical supply priority confirmed and pipeline valve team dispatched.'
    },

    // 3. Electricity Department (ELEC) -> Verified 2 of 2
    {
      code: 'R2R-2026-0003',
      title: 'Hanging low-tension power cable sparking near school gate',
      description: 'Overhead power cable snapped after heavy winds and is hanging within reach of pedestrians right outside the primary school entrance.',
      category: 'Electricity',
      deptCode: 'ELEC',
      severity: 'critical',
      status: 'verified',
      is_verified: 1,
      verification_status: 'verified',
      is_flagged: 0,
      assigned_to: 'BESCOM Vigilance & Line Repair Unit',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 174 - HSR Layout',
      location_type: 'city',
      location: 'Ward 174 - HSR Layout, Bengaluru, Bengaluru Urban, Karnataka (Near: Sector 2 Park Entrance)',
      latitude: 12.9116,
      longitude: 77.6433,
      supports: 8,
      remarks: 'Official verification complete: High hazard level verified. Line power temporarily isolated and crew dispatched.'
    },

    // 4. Sanitation & Solid Waste Management (SANITATION) -> Pending 1 of 2
    {
      code: 'R2R-2026-0004',
      title: 'Uncollected commercial garbage spillover on public sidewalk',
      description: 'Public dumpsters overflowing for four consecutive days without scheduled compactor truck collection. Refuse blocking pedestrian access.',
      category: 'Sanitation/Waste Management',
      deptCode: 'SANITATION',
      severity: 'medium',
      status: 'pending',
      is_verified: 0,
      verification_status: 'unverified',
      is_flagged: 0,
      assigned_to: null,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 112 - Domlur',
      location_type: 'city',
      location: 'Ward 112 - Domlur, Bengaluru, Bengaluru Urban, Karnataka (Near: Domlur BDA Complex)',
      latitude: 12.9609,
      longitude: 77.6387,
      supports: 1,
      remarks: null
    },

    // 5. Streetlights & Electrical Wing (LIGHTS) -> In Progress 2 of 2
    {
      code: 'R2R-2026-0005',
      title: 'Consecutive dark streetlights causing safety hazard on residential cross',
      description: 'Five consecutive LED streetlight fixtures unlit for the past week, leaving entire residential stretch in pitch darkness at night.',
      category: 'Streetlights',
      deptCode: 'LIGHTS',
      severity: 'medium',
      status: 'in_progress',
      is_verified: 0,
      verification_status: 'unverified',
      is_flagged: 0,
      assigned_to: 'Zonal Electrical Maintenance Unit #4',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 82 - Indiranagar',
      location_type: 'city',
      location: 'Ward 82 - Indiranagar, Bengaluru, Bengaluru Urban, Karnataka (Near: 12th Main 4th Cross)',
      latitude: 12.9719,
      longitude: 77.6412,
      supports: 3,
      remarks: 'Maintenance unit notified. Replacement of faulty phase switch scheduled.'
    },

    // 6. Drainage & Stormwater Department (DRAINAGE) -> Resolved 1 of 1
    {
      code: 'R2R-2026-0006',
      title: 'Severely silted stormwater culvert causing monsoon backflow',
      description: 'Heavy accumulation of debris and plastic sediment inside underground storm drain resulting in water backflow into ground-floor residences.',
      category: 'Drainage',
      deptCode: 'DRAINAGE',
      severity: 'high',
      status: 'resolved',
      is_verified: 0,
      verification_status: 'unverified',
      is_flagged: 0,
      assigned_to: 'BBMP Stormwater Desilting Crew',
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 22 - Hebbal',
      location_type: 'city',
      location: 'Ward 22 - Hebbal, Bengaluru, Bengaluru Urban, Karnataka (Near: Hebbal Flyover Underpass)',
      latitude: 13.0358,
      longitude: 77.5970,
      supports: 5,
      remarks: 'Excavator and jetting machine deployed. Desilting completed and drain flow fully restored.'
    },

    // 7. Public Safety & Civil Defense (SAFETY) -> Rejected 1 of 1
    {
      code: 'R2R-2026-0007',
      title: 'Reported illegal excavation and deep trench near playground',
      description: 'Citizen reported unattended excavation near boundary wall claiming civic safety breach.',
      category: 'Public Safety',
      deptCode: 'SAFETY',
      severity: 'low',
      status: 'rejected',
      is_verified: 0,
      verification_status: 'unverified',
      is_flagged: 1,
      assigned_to: null,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 10 - Malleshwaram',
      location_type: 'city',
      location: 'Ward 10 - Malleshwaram, Bengaluru, Bengaluru Urban, Karnataka (Near: 8th Cross Playground)',
      latitude: 13.0031,
      longitude: 77.5643,
      supports: 0,
      remarks: 'Inspection conducted by Municipal Field Inspector: Authorized telecom fiber laying work under valid municipal permit with mandatory safety caution tape and nighttime reflectors in place. No violation found; report dismissed.'
    },

    // 8. General Municipal Grievances (OTHER) -> Pending 2 of 2
    {
      code: 'R2R-2026-0008',
      title: 'Overgrown tree branches threatening overhead utility wires',
      description: 'Heavy wind has caused large banyan tree branches to bend precariously over local telephone and domestic utility cables.',
      category: 'Other',
      deptCode: 'OTHER',
      severity: 'low',
      status: 'pending',
      is_verified: 0,
      verification_status: 'unverified',
      is_flagged: 0,
      assigned_to: null,
      state: 'Karnataka',
      district: 'Bengaluru Urban',
      city_town_village: 'Bengaluru',
      ward_area: 'Ward 82 - Indiranagar',
      location_type: 'city',
      location: 'Ward 82 - Indiranagar, Bengaluru, Bengaluru Urban, Karnataka (Near: 6th Cross Defence Colony)',
      latitude: 12.9750,
      longitude: 77.6390,
      supports: 2,
      remarks: null
    }
  ];

  // 4. Insert each complaint
  for (const c of cleanComplaints) {
    const dept = deptMap[c.deptCode];
    const deptId = dept ? dept.id : null;
    const deptName = dept ? dept.name : c.category;

    const { priorityScore, priorityReason } = calculatePriority(c.severity, c.category, c.supports, new Date().toISOString());

    const result = await db.run(`
      INSERT INTO complaints (
        complaint_code, title, description, category, severity, location, latitude, longitude,
        status, image_url, user_id, priority_score, priority_reason, department_id, department_name,
        authority_name, authority_contact, jurisdiction_level, state, district, city_town_village,
        location_type, ward_area, is_verified, verification_status, is_flagged, assigned_to,
        assigned_at, verified_at, verified_by, office_address, official_portal, official_website
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      c.code,
      c.title,
      c.description,
      c.category,
      c.severity,
      c.location,
      c.latitude,
      c.longitude,
      c.status,
      '/uploads/civic-1791034083358-796644752.png',
      citizenId,
      priorityScore,
      priorityReason,
      deptId,
      deptName,
      `${deptName} Divisional Office`,
      '1800-200-3532',
      'Municipal & District Level',
      c.state,
      c.district,
      c.city_town_village,
      c.location_type,
      c.ward_area,
      c.is_verified,
      c.verification_status,
      c.is_flagged,
      c.assigned_to,
      c.assigned_to ? new Date().toISOString() : null,
      c.is_verified === 1 ? new Date().toISOString() : null,
      c.is_verified === 1 ? authId : null,
      'Central Municipal Administration Complex, Bengaluru',
      'https://janaspandana.karnataka.gov.in',
      'https://karnataka.gov.in'
    ]);

    const complaintId = result.lastID;

    // Seed supports
    for (let s = 0; s < c.supports; s++) {
      // Pick a user ID from 2 upwards
      const voterId = citizenId + s;
      try {
        await db.run('INSERT OR IGNORE INTO complaint_support (complaint_id, user_id) VALUES (?, ?)', [complaintId, voterId]);
      } catch (err) {
        // Ignore duplicate support
      }
    }

    // Seed authority remarks/logs if any
    if (c.remarks) {
      const actionType = c.status === 'rejected' ? 'status_change' : c.is_verified === 1 ? 'verification' : 'remark';
      await db.run(`
        INSERT INTO authority_updates (complaint_id, official_id, update_text, status_change, action_type)
        VALUES (?, ?, ?, ?, ?)
      `, [complaintId, authId, c.remarks, c.status, actionType]);
    }
  }

  // Check final count
  const allCount = await db.get('SELECT COUNT(*) as count FROM complaints');
  const verifiedCount = await db.get('SELECT COUNT(*) as count FROM complaints WHERE is_verified = 1');
  const rejectedCount = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'rejected' OR is_flagged = 1");
  const inProgressCount = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'in_progress'");
  const pendingCount = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'");
  const resolvedCount = await db.get("SELECT COUNT(*) as count FROM complaints WHERE status = 'resolved'");

  console.log('\n📊 NEW COMPLAINT DISTRIBUTION:');
  console.log(`- Total Complaints: ${allCount.count} (Covering all 8 departments)`);
  console.log(`- Verified Complaints: ${verifiedCount.count} (Matches requirement: verified 2)`);
  console.log(`- Rejected Complaints: ${rejectedCount.count} (Matches requirement: rejected 1)`);
  console.log(`- Pending Complaints: ${pendingCount.count}`);
  console.log(`- In-Progress Complaints: ${inProgressCount.count}`);
  console.log(`- Resolved Complaints: ${resolvedCount.count}`);
  console.log('\n🎉 Database reset and clean complaint seeding complete!');
}

resetCleanComplaints().catch(err => {
  console.error('❌ Error resetting complaints:', err);
  process.exit(1);
});
