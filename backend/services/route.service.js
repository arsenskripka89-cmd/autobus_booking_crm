const db = require('../config/db');

function getAll() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM routes', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM routes WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function create(data) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO routes (from_city, to_city) VALUES (?,?)', [data.from_city, data.to_city], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, ...data });
    });
  });
}

function update(id, data) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE routes SET from_city = ?, to_city = ? WHERE id = ?', [data.from_city, data.to_city, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM routes WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { getAll, getById, create, update, remove };
