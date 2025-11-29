const db = require('../config/db');

function getAll() {
  return new Promise((resolve, reject) => {
    db.all(`SELECT trips.*, routes.from_city, routes.to_city, buses.number AS bus_number, buses.seats_count
            FROM trips 
            JOIN routes ON routes.id = trips.route_id
            JOIN buses ON buses.id = trips.bus_id`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getById(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT trips.*, routes.from_city, routes.to_city, buses.number AS bus_number, buses.seats_count
            FROM trips 
            JOIN routes ON routes.id = trips.route_id
            JOIN buses ON buses.id = trips.bus_id
            WHERE trips.id = ?`, [id], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function create(data) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO trips (route_id, bus_id, date, time, price, status) VALUES (?,?,?,?,?,?)', [
      data.route_id,
      data.bus_id,
      data.date,
      data.time,
      data.price,
      data.status || 'active'
    ], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, ...data });
    });
  });
}

function update(id, data) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE trips SET route_id = ?, bus_id = ?, date = ?, time = ?, price = ?, status = ? WHERE id = ?', [
      data.route_id,
      data.bus_id,
      data.date,
      data.time,
      data.price,
      data.status,
      id
    ], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM trips WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function generate(route_id, bus_id, startDate, days, time, price) {
  const inserts = [];
  const start = new Date(startDate);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    inserts.push(create({ route_id, bus_id, date: d.toISOString().slice(0, 10), time, price, status: 'active' }));
  }
  return Promise.all(inserts);
}

module.exports = { getAll, getById, create, update, remove, generate };
