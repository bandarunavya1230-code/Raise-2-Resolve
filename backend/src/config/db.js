const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const bcrypt = require('bcryptjs');

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;

  const dbPath = path.join(__dirname, '../../database.sqlite');
  
  dbInstance = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await dbInstance.exec('PRAGMA foreign_keys = ON;');

  // Initialize Core Tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      department TEXT,
      jurisdiction TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      sla_hours INTEGER DEFAULT 48,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      city_town_village TEXT NOT NULL,
      location_type TEXT NOT NULL DEFAULT 'city' CHECK(location_type IN ('village', 'town', 'city')),
      ward_area TEXT NOT NULL,
      pincode TEXT,
      latitude REAL,
      longitude REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authorities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      title TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'local_authority',
      department_id INTEGER,
      department_name TEXT,
      jurisdiction_type TEXT NOT NULL DEFAULT 'ward' CHECK(jurisdiction_type IN ('village', 'town', 'ward', 'city', 'district')),
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      city_town_village TEXT NOT NULL,
      ward_area TEXT,
      contact_email TEXT,
      contact_phone TEXT,
      office_address TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_code TEXT UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      location TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      status TEXT NOT NULL DEFAULT 'pending',
      image_url TEXT,
      user_id INTEGER NOT NULL,
      priority_score INTEGER DEFAULT 0,
      priority_reason TEXT,
      is_verified INTEGER DEFAULT 0,
      is_flagged INTEGER DEFAULT 0,
      flag_reason TEXT,
      department_id INTEGER,
      department_name TEXT,
      authority_id INTEGER,
      authority_name TEXT,
      authority_contact TEXT,
      jurisdiction_level TEXT,
      state TEXT,
      district TEXT,
      city_town_village TEXT,
      location_type TEXT DEFAULT 'city',
      ward_area TEXT,
      verification_status TEXT DEFAULT 'unverified',
      verified_at DATETIME,
      verified_by INTEGER,
      assigned_to TEXT,
      assigned_at DATETIME,
      reassignment_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
      FOREIGN KEY (authority_id) REFERENCES authorities(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS complaint_support (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(complaint_id, user_id),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS authority_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      official_id INTEGER NOT NULL,
      update_text TEXT NOT NULL,
      status_change TEXT,
      action_type TEXT DEFAULT 'remark',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (official_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS complaint_reassignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      from_department_id INTEGER,
      from_department_name TEXT,
      to_department_id INTEGER NOT NULL,
      to_department_name TEXT NOT NULL,
      from_authority_id INTEGER,
      to_authority_id INTEGER,
      reassigned_by INTEGER NOT NULL,
      reassigned_by_name TEXT,
      reason TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (reassigned_by) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Column Migrations for complaints
  const complaintColumns = [
    { name: 'severity', def: 'TEXT DEFAULT "medium"' },
    { name: 'complaint_code', def: 'TEXT' },
    { name: 'priority_score', def: 'INTEGER DEFAULT 0' },
    { name: 'priority_reason', def: 'TEXT' },
    { name: 'is_verified', def: 'INTEGER DEFAULT 0' },
    { name: 'is_flagged', def: 'INTEGER DEFAULT 0' },
    { name: 'flag_reason', def: 'TEXT' },
    { name: 'latitude', def: 'REAL' },
    { name: 'longitude', def: 'REAL' },
    { name: 'department_id', def: 'INTEGER' },
    { name: 'department_name', def: 'TEXT' },
    { name: 'authority_id', def: 'INTEGER' },
    { name: 'authority_name', def: 'TEXT' },
    { name: 'authority_contact', def: 'TEXT' },
    { name: 'jurisdiction_level', def: 'TEXT' },
    { name: 'state', def: 'TEXT' },
    { name: 'district', def: 'TEXT' },
    { name: 'city_town_village', def: 'TEXT' },
    { name: 'location_type', def: 'TEXT DEFAULT "city"' },
    { name: 'ward_area', def: 'TEXT' },
    { name: 'verification_status', def: 'TEXT DEFAULT "unverified"' },
    { name: 'verified_at', def: 'DATETIME' },
    { name: 'verified_by', def: 'INTEGER' },
    { name: 'assigned_to', def: 'TEXT' },
    { name: 'assigned_at', def: 'DATETIME' },
    { name: 'reassignment_count', def: 'INTEGER DEFAULT 0' }
  ];

  for (const col of complaintColumns) {
    try {
      await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN ${col.name} ${col.def};`);
    } catch (e) {
      // Column already exists
    }
  }

  // Column Migrations for users
  try { await dbInstance.exec(`ALTER TABLE users ADD COLUMN department TEXT;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE users ADD COLUMN jurisdiction TEXT;`); } catch (e) {}

  // 1. Seed Departments
  const deptCount = await dbInstance.get('SELECT COUNT(*) as count FROM departments');
  if (!deptCount || deptCount.count === 0) {
    const defaultDepartments = [
      { code: 'ELEC', name: 'Electricity Department', category: 'Electricity', description: 'Power supply, grid maintenance, transformer faults, meter issues', contact_email: 'elec-desk@raise2resolve.gov', contact_phone: '1800-200-3532', sla_hours: 24 },
      { code: 'WATER', name: 'Water Supply & Sewage Board', category: 'Water Supply', description: 'Drinking water pipelines, municipal supply scheduling, contaminated water, main leaks', contact_email: 'water-board@raise2resolve.gov', contact_phone: '1800-200-9283', sla_hours: 36 },
      { code: 'ROADS', name: 'Roads & Public Works Department', category: 'Roads/Public Works', description: 'Pothole repairs, asphalt resurfacing, pedestrian sidewalks, road dividers', contact_email: 'pwd-roads@raise2resolve.gov', contact_phone: '1800-200-7623', sla_hours: 72 },
      { code: 'SANITATION', name: 'Sanitation & Solid Waste Management', category: 'Sanitation/Waste Management', description: 'Daily garbage collection, overflowing public dumpsters, segregation, street sweeping', contact_email: 'sanitation@raise2resolve.gov', contact_phone: '1800-200-4272', sla_hours: 24 },
      { code: 'LIGHTS', name: 'Streetlights & Electrical Wing', category: 'Streetlights', description: 'Dark road illumination, blown bulbs, faulty timers, damaged lampposts', contact_email: 'streetlights@raise2resolve.gov', contact_phone: '1800-200-5444', sla_hours: 48 },
      { code: 'DRAINAGE', name: 'Drainage & Stormwater Department', category: 'Drainage', description: 'Clogged storm drains, monsoon overflow, manhole desilting, open sewer lines', contact_email: 'drainage-cell@raise2resolve.gov', contact_phone: '1800-200-3724', sla_hours: 36 },
      { code: 'SAFETY', name: 'Public Safety & Civil Defense', category: 'Public Safety', description: 'Hazardous building structures, stray animals, park safety, open excavations', contact_email: 'publicsafety@raise2resolve.gov', contact_phone: '1800-200-9111', sla_hours: 12 },
      { code: 'OTHER', name: 'General Municipal Grievances', category: 'Other', description: 'Public encroachment, civic signage, tree trimming, community welfare', contact_email: 'grievance-cell@raise2resolve.gov', contact_phone: '1800-200-1100', sla_hours: 72 }
    ];

    for (const d of defaultDepartments) {
      await dbInstance.run(
        'INSERT INTO departments (code, name, category, description, contact_email, contact_phone, sla_hours) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [d.code, d.name, d.category, d.description, d.contact_email, d.contact_phone, d.sla_hours]
      );
    }
  }

  // 2. Seed Locations Hierarchy (Cities, Towns, Villages)
  const locCount = await dbInstance.get('SELECT COUNT(*) as count FROM locations');
  if (!locCount || locCount.count === 0) {
    const defaultLocations = [
      // Karnataka - Cities
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 82 - Indiranagar', pincode: '560038', latitude: 12.9719, longitude: 77.6412 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 151 - Koramangala', pincode: '560034', latitude: 12.9352, longitude: 77.6245 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 112 - Domlur', pincode: '560071', latitude: 12.9609, longitude: 77.6387 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 75 - MG Road / Central', pincode: '560001', latitude: 12.9754, longitude: 77.6067 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 22 - Hebbal', pincode: '560024', latitude: 13.0358, longitude: 77.5970 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 174 - HSR Layout', pincode: '560102', latitude: 12.9121, longitude: 77.6446 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 160 - Jayanagar', pincode: '560041', latitude: 12.9250, longitude: 77.5938 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Bengaluru (City)', location_type: 'city', ward_area: 'Ward 198 - Electronic City', pincode: '560100', latitude: 12.8399, longitude: 77.6770 },
      
      // Karnataka - Towns
      { state: 'Karnataka', district: 'Ramanagara', city_town_village: 'Ramanagara Town', location_type: 'town', ward_area: 'Ward 4 - Market Street', pincode: '562159', latitude: 12.7209, longitude: 77.2799 },
      { state: 'Karnataka', district: 'Ramanagara', city_town_village: 'Ramanagara Town', location_type: 'town', ward_area: 'Ward 7 - Bus Station Road', pincode: '562159', latitude: 12.7235, longitude: 77.2840 },
      { state: 'Karnataka', district: 'Udupi', city_town_village: 'Udupi Town', location_type: 'town', ward_area: 'Ward 5 - Car Street', pincode: '576101', latitude: 13.3409, longitude: 74.7421 },
      { state: 'Karnataka', district: 'Udupi', city_town_village: 'Udupi Town', location_type: 'town', ward_area: 'Ward 9 - Manipal Road', pincode: '576104', latitude: 13.3512, longitude: 74.7865 },

      // Karnataka - Villages
      { state: 'Karnataka', district: 'Bengaluru Rural', city_town_village: 'Nelamangala Village', location_type: 'village', ward_area: 'Gram Panchayat Area - North Hamlet', pincode: '562123', latitude: 13.0988, longitude: 77.3888 },
      { state: 'Karnataka', district: 'Bengaluru Rural', city_town_village: 'Nelamangala Village', location_type: 'village', ward_area: 'Gram Panchayat Area - Main Village Square', pincode: '562123', latitude: 13.1020, longitude: 77.3910 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Sarjapura Village', location_type: 'village', ward_area: 'Gram Sabha Ward 1 - Old Town', pincode: '562125', latitude: 12.8601, longitude: 77.7850 },
      { state: 'Karnataka', district: 'Bengaluru Urban', city_town_village: 'Sarjapura Village', location_type: 'village', ward_area: 'Gram Sabha Ward 2 - Sompura Colony', pincode: '562125', latitude: 12.8655, longitude: 77.7910 },
      { state: 'Karnataka', district: 'Bengaluru Rural', city_town_village: 'Devangonthi Village', location_type: 'village', ward_area: 'Panchayat Block A - Village Square', pincode: '560067', latitude: 12.9904, longitude: 77.7981 },

      // Maharashtra - City
      { state: 'Maharashtra', district: 'Mumbai Suburban', city_town_village: 'Mumbai (City)', location_type: 'city', ward_area: 'Ward K/East - Andheri East', pincode: '400069', latitude: 19.1136, longitude: 72.8697 },
      { state: 'Maharashtra', district: 'Mumbai Suburban', city_town_village: 'Mumbai (City)', location_type: 'city', ward_area: 'Ward H/West - Bandra West', pincode: '400050', latitude: 19.0596, longitude: 72.8295 },
      
      // Telangana - City
      { state: 'Telangana', district: 'Hyderabad', city_town_village: 'Hyderabad (City)', location_type: 'city', ward_area: 'Ward 10 - Banjara Hills', pincode: '500034', latitude: 17.4156, longitude: 78.4357 },
      { state: 'Telangana', district: 'Hyderabad', city_town_village: 'Hyderabad (City)', location_type: 'city', ward_area: 'Ward 95 - Gachibowli', pincode: '500032', latitude: 17.4401, longitude: 78.3489 }
    ];

    for (const l of defaultLocations) {
      await dbInstance.run(
        'INSERT INTO locations (state, district, city_town_village, location_type, ward_area, pincode, latitude, longitude) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [l.state, l.district, l.city_town_village, l.location_type, l.ward_area, l.pincode, l.latitude, l.longitude]
      );
    }
  }

  // 3. Seed Authorities
  const authCount = await dbInstance.get('SELECT COUNT(*) as count FROM authorities');
  if (!authCount || authCount.count === 0) {
    const defaultAuthorities = [
      // City Authorities - Bengaluru
      {
        name: 'Indiranagar Zonal Municipal Office',
        title: 'Assistant Executive Engineer (AEE)',
        role: 'zonal_engineer',
        department_name: 'Roads & Public Works Department',
        jurisdiction_type: 'ward',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        city_town_village: 'Bengaluru (City)',
        ward_area: 'Ward 82 - Indiranagar',
        contact_email: 'aee.indiranagar@raise2resolve.gov',
        contact_phone: '+91 80 2297 5882',
        office_address: 'BBMP Zonal Complex, 100ft Road, Indiranagar, Bengaluru'
      },
      {
        name: 'Koramangala Ward Municipal Division',
        title: 'Ward Revenue & Civic Officer',
        role: 'ward_officer',
        department_name: 'Sanitation & Solid Waste Management',
        jurisdiction_type: 'ward',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        city_town_village: 'Bengaluru (City)',
        ward_area: 'Ward 151 - Koramangala',
        contact_email: 'ward151.officer@raise2resolve.gov',
        contact_phone: '+91 80 2297 5151',
        office_address: 'Ward 151 Office, 80ft Road, 4th Block Koramangala, Bengaluru'
      },
      {
        name: 'Central Bengaluru Water Board Cell',
        title: 'Executive Engineer - Water & Sewerage',
        role: 'department_engineer',
        department_name: 'Water Supply & Sewage Board',
        jurisdiction_type: 'ward',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        city_town_village: 'Bengaluru (City)',
        ward_area: 'Ward 75 - MG Road / Central',
        contact_email: 'bwssb.central@raise2resolve.gov',
        contact_phone: '+91 80 2294 5100',
        office_address: 'BWSSB Sub-division Office, Cauvery Bhavan, MG Road, Bengaluru'
      },
      {
        name: 'HSR Layout Electrical Sub-station Desk',
        title: 'Senior Section Engineer - Power & Lighting',
        role: 'electrical_engineer',
        department_name: 'Streetlights & Electrical Wing',
        jurisdiction_type: 'ward',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        city_town_village: 'Bengaluru (City)',
        ward_area: 'Ward 174 - HSR Layout',
        contact_email: 'bescom.hsr@raise2resolve.gov',
        contact_phone: '+91 80 2297 7174',
        office_address: 'BESCOM Sub-division, 27th Main, Sector 1, HSR Layout, Bengaluru'
      },
      {
        name: 'Hebbal Drainage & Flood Management Desk',
        title: 'Stormwater Drainage Inspector',
        role: 'drainage_officer',
        department_name: 'Drainage & Stormwater Department',
        jurisdiction_type: 'ward',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        city_town_village: 'Bengaluru (City)',
        ward_area: 'Ward 22 - Hebbal',
        contact_email: 'drainage.hebbal@raise2resolve.gov',
        contact_phone: '+91 80 2297 2222',
        office_address: 'BBMP Storm Water Cell, Near Hebbal Flyover, Bengaluru'
      },

      // Town Authorities - Ramanagara
      {
        name: 'Ramanagara Town Municipal Council (TMC)',
        title: 'Chief Municipal Officer (CMO)',
        role: 'town_municipal_officer',
        department_name: 'Roads & Public Works Department',
        jurisdiction_type: 'town',
        state: 'Karnataka',
        district: 'Ramanagara',
        city_town_village: 'Ramanagara Town',
        ward_area: 'Ward 4 - Market Street',
        contact_email: 'cmo.ramanagara@raise2resolve.gov',
        contact_phone: '+91 8113 222 301',
        office_address: 'TMC Administrative Building, BM Road, Ramanagara'
      },
      {
        name: 'Udupi Town Municipality Public Works Wing',
        title: 'Municipal Engineer',
        role: 'town_engineer',
        department_name: 'Water Supply & Sewage Board',
        jurisdiction_type: 'town',
        state: 'Karnataka',
        district: 'Udupi',
        city_town_village: 'Udupi Town',
        ward_area: 'Ward 5 - Car Street',
        contact_email: 'udupi.municipality@raise2resolve.gov',
        contact_phone: '+91 820 252 0306',
        office_address: 'City Municipal Council Building, K.M. Marg, Udupi'
      },

      // Village Authorities - Gram Panchayats
      {
        name: 'Nelamangala Gram Panchayat Secretariat',
        title: 'Panchayat Development Officer (PDO)',
        role: 'village_panchayat',
        department_name: 'Sanitation & Solid Waste Management',
        jurisdiction_type: 'village',
        state: 'Karnataka',
        district: 'Bengaluru Rural',
        city_town_village: 'Nelamangala Village',
        ward_area: 'Gram Panchayat Area - Main Village Square',
        contact_email: 'pdo.nelamangala@raise2resolve.gov',
        contact_phone: '+91 80 2772 2100',
        office_address: 'Gram Panchayat Bhavan, B.H. Road, Nelamangala Rural'
      },
      {
        name: 'Sarjapura Gram Panchayat Public Desk',
        title: 'Village Administrative Officer (VAO)',
        role: 'village_panchayat',
        department_name: 'Electricity Department',
        jurisdiction_type: 'village',
        state: 'Karnataka',
        district: 'Bengaluru Urban',
        city_town_village: 'Sarjapura Village',
        ward_area: 'Gram Sabha Ward 1 - Old Town',
        contact_email: 'vao.sarjapura@raise2resolve.gov',
        contact_phone: '+91 80 2782 3200',
        office_address: 'Panchayat Office, Main Circle, Sarjapura Village'
      },
      {
        name: 'Devangonthi Rural Civic Council',
        title: 'Panchayat Secretary',
        role: 'village_panchayat',
        department_name: 'Water Supply & Sewage Board',
        jurisdiction_type: 'village',
        state: 'Karnataka',
        district: 'Bengaluru Rural',
        city_town_village: 'Devangonthi Village',
        ward_area: 'Panchayat Block A - Village Square',
        contact_email: 'panchayat.devangonthi@raise2resolve.gov',
        contact_phone: '+91 80 2790 4100',
        office_address: 'Devangonthi Gram Panchayat Office, Railway Station Road'
      },

      // Mumbai
      {
        name: 'MCGM K-East Ward Municipal Commissioner Office',
        title: 'Assistant Municipal Commissioner (AMC)',
        role: 'zonal_commissioner',
        department_name: 'Roads & Public Works Department',
        jurisdiction_type: 'ward',
        state: 'Maharashtra',
        district: 'Mumbai Suburban',
        city_town_village: 'Mumbai (City)',
        ward_area: 'Ward K/East - Andheri East',
        contact_email: 'amc.keast@raise2resolve.gov',
        contact_phone: '+91 22 2684 0103',
        office_address: 'MCGM Ward Office, Gundavali, Andheri East, Mumbai'
      },

      // Hyderabad
      {
        name: 'GHMC Khairatabad Zonal Office',
        title: 'Zonal Commissioner - Civic Grievances',
        role: 'zonal_commissioner',
        department_name: 'Sanitation & Solid Waste Management',
        jurisdiction_type: 'ward',
        state: 'Telangana',
        district: 'Hyderabad',
        city_town_village: 'Hyderabad (City)',
        ward_area: 'Ward 10 - Banjara Hills',
        contact_email: 'ghmc.khairatabad@raise2resolve.gov',
        contact_phone: '+91 40 2111 1111',
        office_address: 'GHMC Zonal Complex, Khairatabad Circle, Hyderabad'
      }
    ];

    for (const a of defaultAuthorities) {
      const dept = await dbInstance.get('SELECT id FROM departments WHERE name = ?', [a.department_name]);
      const deptId = dept ? dept.id : null;
      await dbInstance.run(
        `INSERT INTO authorities 
          (name, title, role, department_id, department_name, jurisdiction_type, state, district, city_town_village, ward_area, contact_email, contact_phone, office_address, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [a.name, a.title, a.role, deptId, a.department_name, a.jurisdiction_type, a.state, a.district, a.city_town_village, a.ward_area, a.contact_email, a.contact_phone, a.office_address]
      );
    }
  }

  // Backfill existing complaints with default department & authority mapping if missing
  const unassigned = await dbInstance.all('SELECT id, category, location FROM complaints WHERE department_name IS NULL');
  for (const c of unassigned) {
    let deptName = 'General Municipal Grievances';
    let catLower = (c.category || '').toLowerCase();
    if (catLower.includes('road') || catLower.includes('pothole')) deptName = 'Roads & Public Works Department';
    else if (catLower.includes('water')) deptName = 'Water Supply & Sewage Board';
    else if (catLower.includes('waste') || catLower.includes('garbage') || catLower.includes('sanitation')) deptName = 'Sanitation & Solid Waste Management';
    else if (catLower.includes('light') || catLower.includes('street')) deptName = 'Streetlights & Electrical Wing';
    else if (catLower.includes('drain') || catLower.includes('sewage')) deptName = 'Drainage & Stormwater Department';
    else if (catLower.includes('elec') || catLower.includes('power')) deptName = 'Electricity Department';
    else if (catLower.includes('safety') || catLower.includes('hazard')) deptName = 'Public Safety & Civil Defense';

    const dept = await dbInstance.get('SELECT id, name FROM departments WHERE name = ?', [deptName]);
    const deptId = dept ? dept.id : null;

    // Pick matching authority
    const auth = await dbInstance.get(
      'SELECT id, name, contact_phone, jurisdiction_type FROM authorities WHERE department_name = ? LIMIT 1',
      [deptName]
    ) || await dbInstance.get('SELECT id, name, contact_phone, jurisdiction_type FROM authorities LIMIT 1');

    await dbInstance.run(`
      UPDATE complaints 
      SET department_id = ?,
          department_name = ?,
          authority_id = ?,
          authority_name = ?,
          authority_contact = ?,
          jurisdiction_level = ?,
          state = COALESCE(state, 'Karnataka'),
          district = COALESCE(district, 'Bengaluru Urban'),
          city_town_village = COALESCE(city_town_village, 'Bengaluru (City)'),
          ward_area = COALESCE(ward_area, 'Ward 82 - Indiranagar'),
          verification_status = CASE WHEN status = 'pending' THEN 'unverified' ELSE 'verified' END
      WHERE id = ?
    `, [
      deptId,
      deptName,
      auth ? auth.id : null,
      auth ? auth.name : 'Municipal Grievance Officer',
      auth ? auth.contact_phone : '1800-200-3532',
      auth ? auth.jurisdiction_type : 'ward',
      c.id
    ]);
  }

  // Migrate any legacy buildion email to raise2resolve.gov
  await dbInstance.run("UPDATE users SET email = 'authority@raise2resolve.gov' WHERE email = 'authority@buildion.gov'");
  await dbInstance.run("UPDATE users SET email = 'citizen@raise2resolve.gov' WHERE email = 'citizen@buildion.org'");

  // Seed demo authority user if missing
  const demoAuthority = await dbInstance.get('SELECT * FROM users WHERE email = ? OR email = ?', ['authority@raise2resolve.gov', 'authority@buildion.gov']);
  if (!demoAuthority) {
    const hashedPassword = await bcrypt.hash('authority123', 10);
    await dbInstance.run(
      'INSERT INTO users (name, email, password, role, department, jurisdiction) VALUES (?, ?, ?, ?, ?, ?)',
      ['Municipal Admin Officer', 'authority@raise2resolve.gov', hashedPassword, 'authority', 'Roads & Public Works Department', 'Bengaluru Urban']
    );
  }

  // Seed demo citizen user if missing
  const demoCitizen = await dbInstance.get('SELECT * FROM users WHERE email = ? OR email = ?', ['citizen@raise2resolve.gov', 'citizen@buildion.org']);
  if (!demoCitizen) {
    const hashedPassword = await bcrypt.hash('citizen123', 10);
    await dbInstance.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['John Citizen', 'citizen@raise2resolve.gov', hashedPassword, 'citizen']
    );
  }

  return dbInstance;
}

module.exports = { getDB };
