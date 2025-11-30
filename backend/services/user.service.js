const bcrypt = require('bcryptjs');
const db = require('../config/db');

function getAll() {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT id, name, email, role, telegram_token, telegram_id, telegram_username, phone, created_at FROM users',
      [],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getById(id) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, name, email, role, telegram_token, telegram_id, telegram_username, phone, created_at FROM users WHERE id = ?',
      [id],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });
}

function findByTelegramId(telegramId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE telegram_id = ?', [telegramId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function findByTelegramUsername(username) {
  const normalized = username?.toLowerCase();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE lower(telegram_username) = ?', [normalized], (err, row) => {
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
  const password_hash = data.password ? bcrypt.hashSync(data.password, 10) : null;
  const email = data.email?.trim().toLowerCase();
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (name, email, password_hash, role, telegram_id, telegram_username, phone) VALUES (?,?,?,?,?,?,?)',
      [
        data.name || data.email || 'Новий користувач',
        email || null,
        password_hash,
        data.role || 'user',
        data.telegram_id || null,
        data.telegram_username || null,
        data.phone || null
      ],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...data, role: data.role || 'user' });
      }
    );
  });
}

function update(id, data) {
  const fields = ['name', 'email', 'role', 'telegram_id', 'telegram_username', 'phone'];
  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (typeof data[f] !== 'undefined') {
      updates.push(`${f} = ?`);
      params.push(f === 'email' && data[f] ? data[f].trim().toLowerCase() : data[f]);
    }
  });
  if (data.password) {
    updates.push('password_hash = ?');
    params.push(bcrypt.hashSync(data.password, 10));
  }
  if (!updates.length) return Promise.resolve({ changes: 0 });
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

function linkTelegramProfile(id, telegramId, telegramUsername) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE users SET telegram_id = ?, telegram_username = COALESCE(telegram_username, ?) WHERE id = ?',
      [telegramId, telegramUsername, id],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
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

module.exports = {
  getAll,
  getById,
  getTelegramToken,
  create,
  update,
  updateTelegramToken,
  remove,
  findByTelegramId,
  findByTelegramUsername,
  linkTelegramProfile
};
