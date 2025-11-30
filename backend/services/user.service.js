const bcrypt = require('bcryptjs');
const db = require('../config/db');

function getAll() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, name, email, role, telegram_token, created_at FROM users', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, name, email, role, telegram_token, created_at FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function getTelegramToken(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, telegram_token FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function create(data) {
  const password_hash = bcrypt.hashSync(data.password, 10);
  const email = data.email?.trim().toLowerCase();
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)', [
      data.name,
      email,
      password_hash,
      data.role || 'manager'
    ], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, ...data, role: data.role || 'manager' });
    });
  });
}

function update(id, data) {
  const fields = ['name', 'email', 'role'];
  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (data[f]) {
      updates.push(`${f} = ?`);
      params.push(f === 'email' ? data[f].trim().toLowerCase() : data[f]);
    }
  });
  if (data.password) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(data.password, 10));
  }
  params.push(id);
  return new Promise((resolve, reject) => {
    db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function updateTelegramToken(userId, token) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE users SET telegram_token = ? WHERE id = ?', [token, userId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { getAll, getById, getTelegramToken, create, update, updateTelegramToken, remove };
