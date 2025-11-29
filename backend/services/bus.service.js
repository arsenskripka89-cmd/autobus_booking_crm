const db = require('../config/db');

function getAll() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM buses', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM buses WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function create(data) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO buses (number, seats_count) VALUES (?,?)', [data.number, data.seats_count || 50], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, ...data });
    });
  });
}

function update(id, data) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE buses SET number = ?, seats_count = ? WHERE id = ?', [data.number, data.seats_count, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM buses WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { getAll, getById, create, update, remove };
