const { getDb } = require('../config/db');

function createRoute({ from_city, to_city }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO routes (from_city, to_city) VALUES (?,?)', [from_city, to_city], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function listRoutes() {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM routes', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function findById(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM routes WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function updateRoute(id, { from_city, to_city }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('UPDATE routes SET from_city = ?, to_city = ? WHERE id = ?', [from_city, to_city, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function deleteRoute(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM routes WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { createRoute, listRoutes, findById, updateRoute, deleteRoute };
