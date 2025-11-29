const db = require('../config/db');

function listByTrip(trip_id) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM bookings WHERE trip_id = ?', [trip_id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function availableSeats(trip_id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT buses.seats_count FROM trips JOIN buses ON buses.id = trips.bus_id WHERE trips.id = ?', [trip_id], (err, row) => {
      if (err) return reject(err);
      if (!row) return resolve([]);
      const seatsCount = row.seats_count;
      db.all('SELECT seat_number FROM bookings WHERE trip_id = ? AND status != "cancelled"', [trip_id], (err2, booked) => {
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

function create(data) {
  return new Promise((resolve, reject) => {
    availableSeats(data.trip_id).then((available) => {
      if (!available.includes(Number(data.seat_number))) {
        return reject(new Error('Seat not available'));
      }
      db.run('INSERT INTO bookings (trip_id, passenger_name, passenger_phone, seat_number, status) VALUES (?,?,?,?,?)', [
        data.trip_id,
        data.passenger_name,
        data.passenger_phone,
        data.seat_number,
        data.status || 'new'
      ], function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, ...data });
      });
    }).catch(reject);
  });
}

function updateStatus(id, status) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE bookings SET status = ? WHERE id = ?', [status, id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id) {
  return updateStatus(id, 'cancelled');
}

module.exports = { listByTrip, availableSeats, create, updateStatus, remove };
