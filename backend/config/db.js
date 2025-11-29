const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'manager',
    telegram_token TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    from_city TEXT NOT NULL,
    to_city TEXT NOT NULL
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    number TEXT NOT NULL,
    seats_count INTEGER NOT NULL DEFAULT 50
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    route_id INTEGER NOT NULL,
    bus_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    price REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    FOREIGN KEY(route_id) REFERENCES routes(id),
    FOREIGN KEY(bus_id) REFERENCES buses(id)
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    trip_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    passenger_phone TEXT NOT NULL,
    seat_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'new',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(trip_id) REFERENCES trips(id)
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS bot_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL,
    user_id TEXT NOT NULL,
    state TEXT,
    payload TEXT
  );`);

  // Attempt to backfill columns for existing databases
  db.run('ALTER TABLE users ADD COLUMN email TEXT UNIQUE', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add email column', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN telegram_token TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add telegram_token column', err.message);
    }
  });

  // Seed admin user if none exists
  db.get('SELECT COUNT(*) as count FROM users', (err, row) => {
    if (err) return console.error('DB seed error', err);
    if (row.count === 0) {
      const bcrypt = require('bcryptjs');
      const password_hash = bcrypt.hashSync('admin123', 10);
      db.run('INSERT INTO users (name, phone, email, password_hash, role) VALUES (?,?,?,?,?)', [
        'Admin',
        '+10000000000',
        'admin@example.com',
        password_hash,
        'admin'
      ]);
      console.log('Seeded default admin user +10000000000 / admin123');
    }
  });
});

module.exports = db;
