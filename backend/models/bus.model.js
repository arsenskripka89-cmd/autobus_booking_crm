const { getDb } = require('../config/db');

function createBus({ number, seats_count }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO buses (number, seats_count) VALUES (?,?)', [number, seats_count], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function listBuses() {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM buses', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function findById(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM buses WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function updateBus(id, { number, seats_count }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('UPDATE buses SET number = ?, seats_count = ? WHERE id = ?', [number, seats_count, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function deleteBus(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM buses WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { createBus, listBuses, findById, updateBus, deleteBus };
