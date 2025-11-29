const { getDb } = require('../config/db');

function createBooking({ trip_id, passenger_name, passenger_phone, seat_number, status }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO bookings (trip_id, passenger_name, passenger_phone, seat_number, status) VALUES (?,?,?,?,?)', [trip_id, passenger_name, passenger_phone, seat_number, status || 'new'], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

function findById(id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM bookings WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function listByTrip(trip_id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bookings WHERE trip_id = ?', [trip_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function findByTripAndSeat(trip_id, seat_number) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM bookings WHERE trip_id = ? AND seat_number = ?', [trip_id, seat_number], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function countByTrip(trip_id) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT COUNT(*) as cnt FROM bookings WHERE trip_id = ?', [trip_id], (err, row) => {
      if (err) return reject(err);
      resolve(row ? row.cnt : 0);
    });
  });
}

function updateStatus(id, status) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

module.exports = { createBooking, findById, listByTrip, findByTripAndSeat, countByTrip, updateStatus };
