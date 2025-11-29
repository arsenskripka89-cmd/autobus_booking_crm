const db = require('../config/db');

function getAll(userId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM buses WHERE user_id = ?', [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getById(id, userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM buses WHERE id = ? AND user_id = ?', [id, userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function create(data, userId) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO buses (user_id, number, seats_count) VALUES (?,?,?)', [userId, data.number, data.seats_count || 50], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, user_id: userId, ...data });
    });
  });
}

function update(id, data, userId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE buses SET number = ?, seats_count = ? WHERE id = ? AND user_id = ?', [data.number, data.seats_count, id, userId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id, userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM buses WHERE id = ? AND user_id = ?', [id, userId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { getAll, getById, create, update, remove };
