const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_DIR = path.join(__dirname, '..', 'db');
const DB_FILE = path.join(DB_DIR, 'database.sqlite');

function ensureDbDir() {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

function runSql(db, sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, (err) => (err ? reject(err) : resolve()));
  });
}

async function initDb() {
  ensureDbDir();
  const db = new sqlite3.Database(DB_FILE);

  // Wrap into promises: create tables if not exists
  const usersTable = `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE,
    password_hash TEXT,
    role TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`;

  const routesTable = `CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_city TEXT,
    to_city TEXT
  );`;

  const busesTable = `CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT,
    seats_count INTEGER
  );`;

  const tripsTable = `CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    bus_id INTEGER,
    date TEXT,
    time TEXT,
    price REAL,
    status TEXT DEFAULT 'active',
    FOREIGN KEY(route_id) REFERENCES routes(id),
    FOREIGN KEY(bus_id) REFERENCES buses(id)
  );`;

  const bookingsTable = `CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trip_id INTEGER,
    passenger_name TEXT,
    passenger_phone TEXT,
    seat_number INTEGER,
    status TEXT DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(trip_id) REFERENCES trips(id)
  );`;

  const botUsersTable = `CREATE TABLE IF NOT EXISTS bot_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT,
    viber_id TEXT,
    name TEXT,
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`;

  const remindersTable = `CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_id INTEGER,
    offset_hours INTEGER,
    sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(booking_id) REFERENCES bookings(id)
  );`;

  // Execute serially
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        await runSql(db, usersTable);
        await runSql(db, routesTable);
        await runSql(db, busesTable);
        await runSql(db, tripsTable);
        await runSql(db, bookingsTable);
        await runSql(db, botUsersTable);
        await runSql(db, remindersTable);
        // Ensure bot_users has user_id column for mapping to users table
        db.all("PRAGMA table_info(bot_users)", [], (err, cols) => {
          if (err) {
            // ignore
          } else {
            const hasUserId = (cols || []).some(c => c && c.name === 'user_id');
            if (!hasUserId) {
              try {
                db.run('ALTER TABLE bot_users ADD COLUMN user_id INTEGER', (e) => { if (e) console.error('Failed to add user_id to bot_users', e); });
              } catch (e) { console.error('Alter table error', e); }
            }
          }
        });

        // Seed admin if not exists
        db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1", (err, row) => {
          if (err) return reject(err);
          if (!row) {
            // create a default admin with phone=admin@example.com and password=admin
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            bcrypt.hash('admin', saltRounds).then(hash => {
              db.run('INSERT INTO users (name, phone, password_hash, role) VALUES (?,?,?,?)', ['Admin', 'admin', hash, 'admin']);
            });
          }
          resolve();
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Export a helper to get DB connection for queries elsewhere
function getDb() {
  ensureDbDir();
  const db = new sqlite3.Database(DB_FILE);
  return db;
}

module.exports = { initDb, getDb, DB_FILE };
