const db = require('../config/db');

function listByTrip(trip_id, userId) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bookings WHERE trip_id = ? AND user_id = ?', [trip_id, userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function availableSeats(trip_id, userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT buses.seats_count FROM trips JOIN buses ON buses.id = trips.bus_id WHERE trips.id = ? AND trips.user_id = ?', [trip_id, userId], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve([]);
      const seatsCount = row.seats_count;
      db.all('SELECT seat_number FROM bookings WHERE trip_id = ? AND user_id = ? AND status != "cancelled"', [trip_id, userId], (err2, booked) => {
        if (err2) return reject(err2);
        const taken = booked.map((b) => b.seat_number);
        const available = [];
        for (let i = 1; i <= seatsCount; i++) {
          if (!taken.includes(i)) available.push(i);
        }
        resolve(available);
      });
    });
  });
}

function create(data, userId) {
  return new Promise((resolve, reject) => {
    availableSeats(data.trip_id, userId).then((available) => {
      if (!available.includes(Number(data.seat_number))) {
        return reject(new Error('Seat not available'));
      }
      db.run('INSERT INTO bookings (user_id, trip_id, passenger_name, passenger_phone, seat_number, status) VALUES (?,?,?,?,?,?)', [
        userId,
        data.trip_id,
        data.passenger_name,
        data.passenger_phone,
        data.seat_number,
        data.status || 'new'
      ], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, user_id: userId, ...data });
      });
    }).catch(reject);
  });
}

function updateStatus(id, status, userId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE bookings SET status = ? WHERE id = ? AND user_id = ?', [status, id, userId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id, userId) {
  return updateStatus(id, 'cancelled', userId);
}

module.exports = { listByTrip, availableSeats, create, updateStatus, remove };
