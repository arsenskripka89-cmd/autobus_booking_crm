const { getDb } = require('../config/db');

function createTrip({ route_id, bus_id, date, time, price, status }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO trips (route_id, bus_id, date, time, price, status) VALUES (?,?,?,?,?,?)', [route_id, bus_id, date, time, price, status || 'active'], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function listTrips() {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM trips', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function findById(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM trips WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function listByRoute(route_id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM trips WHERE route_id = ?', [route_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function updateTrip(id, data) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('UPDATE trips SET route_id=?, bus_id=?, date=?, time=?, price=?, status=? WHERE id=?', [data.route_id, data.bus_id, data.date, data.time, data.price, data.status, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function deleteTrip(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM trips WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { createTrip, listTrips, findById, listByRoute, updateTrip, deleteTrip };
