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

  // Initialize Tables
  await dbInstance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'citizen',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
  `);

  // Migrations for existing schema columns
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN severity TEXT DEFAULT 'medium';`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN complaint_code TEXT;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN priority_score INTEGER DEFAULT 0;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN priority_reason TEXT;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN is_verified INTEGER DEFAULT 0;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN is_flagged INTEGER DEFAULT 0;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN flag_reason TEXT;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN latitude REAL;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE complaints ADD COLUMN longitude REAL;`); } catch (e) {}
  try { await dbInstance.exec(`ALTER TABLE authority_updates ADD COLUMN action_type TEXT DEFAULT 'remark';`); } catch (e) {}

  // Seed demo authority user if missing
  const demoAuthority = await dbInstance.get('SELECT * FROM users WHERE email = ?', ['authority@buildion.gov']);
  if (!demoAuthority) {
    const hashedPassword = await bcrypt.hash('authority123', 10);
    await dbInstance.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['Municipal Admin Officer', 'authority@buildion.gov', hashedPassword, 'authority']
    );
  }

  // Seed demo citizen user if missing
  const demoCitizen = await dbInstance.get('SELECT * FROM users WHERE email = ?', ['citizen@buildion.org']);
  if (!demoCitizen) {
    const hashedPassword = await bcrypt.hash('citizen123', 10);
    await dbInstance.run(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      ['John Citizen', 'citizen@buildion.org', hashedPassword, 'citizen']
    );
  }

  return dbInstance;
}

module.exports = { getDB };
