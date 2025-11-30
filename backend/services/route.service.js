const db = require('../config/db');

function getAll(userId) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM routes WHERE user_id = ? ORDER BY COALESCE(parent_route_id, id), parent_route_id IS NOT NULL, id',
      [userId],
      (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      }
    );
  });
}

function getById(id, userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM routes WHERE id = ? AND user_id = ?', [id, userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function create(data, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO routes (user_id, from_city, to_city, parent_route_id, tag) VALUES (?,?,?,?,?)',
      [userId, data.from_city, data.to_city, data.parent_route_id || null, data.tag || null],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, user_id: userId, ...data });
      }
    );
  });
}

function update(id, data, userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE routes SET from_city = ?, to_city = ?, parent_route_id = ?, tag = ? WHERE id = ? AND user_id = ?',
      [data.from_city, data.to_city, data.parent_route_id || null, data.tag || null, id, userId],
      function (err) {
        if (err) return reject(err);
        resolve({ changes: this.changes });
      }
    );
  });
}

function remove(id, userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM routes WHERE id = ? AND user_id = ?', [id, userId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { getAll, getById, create, update, remove };
