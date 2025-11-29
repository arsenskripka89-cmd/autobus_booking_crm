const { getDb } = require('../config/db');

function createUser({ name, phone, password_hash, role }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    const stmt = db.prepare('INSERT INTO users (name, phone, password_hash, role) VALUES (?,?,?,?)');
    stmt.run([name, phone, password_hash, role], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function findByPhone(phone) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function findById(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT id, name, phone, role, created_at FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function listUsers() {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name, phone, role, created_at FROM users', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function updateUser(id, { name, phone, role }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET name = ?, phone = ?, role = ? WHERE id = ?', [name, phone, role, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function deleteUser(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function updatePassword(id, password_hash) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET password_hash = ? WHERE id = ?', [password_hash, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { createUser, findByPhone, findById, listUsers, updateUser, deleteUser, updatePassword };
