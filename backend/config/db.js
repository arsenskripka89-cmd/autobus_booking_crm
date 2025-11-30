const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const dbPath = path.join(__dirname, '..', 'db', 'database.sqlite');

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'user',
    telegram_id TEXT,
    telegram_username TEXT,
    phone TEXT,
    telegram_token TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    from_city TEXT NOT NULL,
    to_city TEXT NOT NULL,
    parent_route_id INTEGER,
    tag TEXT,
    FOREIGN KEY(parent_route_id) REFERENCES routes(id)
  );`);

  db.run(`CREATE TABLE IF NOT EXISTS buses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    bus_number TEXT NOT NULL,
    driver_name TEXT NOT NULL,
    seats INTEGER NOT NULL,
    note TEXT
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
  db.run('ALTER TABLE users ADD COLUMN telegram_id TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add telegram_id column', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN telegram_username TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add telegram_username column', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN phone TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add phone column', err.message);
    }
  });
  db.run('ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT "user"', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to backfill role column', err.message);
    }
  });
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)');
  db.run('CREATE INDEX IF NOT EXISTS idx_users_telegram ON users(telegram_id, telegram_username)');

  db.run('ALTER TABLE routes ADD COLUMN parent_route_id INTEGER', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add parent_route_id column', err.message);
    }
  });
  db.run('ALTER TABLE routes ADD COLUMN tag TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add tag column', err.message);
    }
  });

  db.run('ALTER TABLE buses ADD COLUMN bus_number TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add bus_number column', err.message);
    }
  });
  db.run('ALTER TABLE buses ADD COLUMN driver_name TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add driver_name column', err.message);
    }
  });
  db.run('ALTER TABLE buses ADD COLUMN seats INTEGER', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add seats column', err.message);
    }
  });
  db.run('ALTER TABLE buses ADD COLUMN note TEXT', (err) => {
    if (err && !String(err.message).includes('duplicate column')) {
      console.error('Failed to add note column', err.message);
    }
  });

  // Seed required admin users if database is empty
  const bcrypt = require('bcryptjs');
  const seeds = [
    { name: 'Owner Admin', email: 'arsenskripka89@gmail.com', password: 'Arsen2024!', role: 'admin' },
    { name: 'Default Admin', email: 'admin@example.com', password: 'Arsen2024!', role: 'manager' }
  ];

  db.get('SELECT COUNT(*) as total FROM users', (countErr, row) => {
    if (countErr) return console.error('Failed to count users', countErr.message);
    if ((row?.total || 0) > 0) return; // only seed when empty

    seeds.forEach((seed) => {
      const password_hash = bcrypt.hashSync(seed.password, 10);
      db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
        [seed.name, seed.email, password_hash, seed.role],
        (insertErr) => {
          if (insertErr) console.error('Failed to seed user', seed.email, insertErr.message);
        }
      );
    });
  });
});

module.exports = db;
