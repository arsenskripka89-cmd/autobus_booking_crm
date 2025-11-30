const db = require('../config/db');

function getAll(userId) {
  return new Promise((resolve, reject) => {
    db.all(`SELECT trips.*, routes.from_city, routes.to_city, buses.bus_number AS bus_number, buses.seats
            FROM trips
            JOIN routes ON routes.id = trips.route_id
            JOIN buses ON buses.id = trips.bus_id
            WHERE trips.user_id = ?`, [userId], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getById(id, userId) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT trips.*, routes.from_city, routes.to_city, buses.bus_number AS bus_number, buses.seats
            FROM trips
            JOIN routes ON routes.id = trips.route_id
            JOIN buses ON buses.id = trips.bus_id
            WHERE trips.id = ? AND trips.user_id = ?`, [id, userId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function create(data, userId) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO trips (user_id, route_id, bus_id, date, time, price, status) VALUES (?,?,?,?,?,?,?)', [
      userId,
      data.route_id,
      data.bus_id,
      data.date,
      data.time,
      data.price,
      data.status || 'active'
    ], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, user_id: userId, ...data });
    });
  });
}

function update(id, data, userId) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE trips SET route_id = ?, bus_id = ?, date = ?, time = ?, price = ?, status = ? WHERE id = ? AND user_id = ?', [
      data.route_id,
      data.bus_id,
      data.date,
      data.time,
      data.price,
      data.status,
      id,
      userId
    ], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function remove(id, userId) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM trips WHERE id = ? AND user_id = ?', [id, userId], function (err) {
      if (err) return reject(err);
      resolve({ changes: this.changes });
    });
  });
}

function bulkInsert(rows, userId) {
  if (!rows.length) return Promise.resolve({ inserted: 0, dates: [] });
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      const stmt = db.prepare('INSERT INTO trips (user_id, route_id, bus_id, date, time, price, status) VALUES (?,?,?,?,?,?,?)');
      rows.forEach((row) => {
        stmt.run([
          userId,
          row.route_id,
          row.bus_id,
          row.date,
          row.time,
          row.price,
          row.status || 'active'
        ]);
      });
      stmt.finalize((err) => {
        if (err) {
          db.run('ROLLBACK');
          return reject(err);
        }
        db.run('COMMIT', (commitErr) => {
          if (commitErr) return reject(commitErr);
          resolve({ inserted: rows.length, dates: rows.map((r) => r.date) });
        });
      });
    });
  });
}

function generate(payload, userId) {
  if (!payload) return Promise.reject(new Error('Невірні параметри генерації'));
  if (!payload.route_id || !payload.bus_id || !payload.startDate || !payload.time || !payload.price) {
    return Promise.reject(new Error('Заповніть усі обовʼязкові поля'));
  }

  const mode = payload.mode || 'simple';
  if (mode === 'weekly') {
    return generateWeekly(payload, userId);
  }
  if (mode === 'monthly') {
    return generateMonthly(payload, userId);
  }
  // Backward compatible simple day-span generation
  const days = Number(payload.days || 0);
  if (!days) return Promise.reject(new Error('Вкажіть кількість днів'));
  const rows = [];
  const start = new Date(payload.startDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (d < today) continue;
    rows.push({ route_id: payload.route_id, bus_id: payload.bus_id, date: d.toISOString().slice(0, 10), time: payload.time, price: payload.price, status: 'active' });
  }
  return bulkInsert(rows, userId);
}

function generateWeekly(payload, userId) {
  const weekdays = (payload.weekdays || []).map((d) => Number(d)).filter((d) => d >= 0 && d <= 6);
  if (!weekdays.length) return Promise.reject(new Error('Оберіть дні тижня'));
  const weeksCount = Number(payload.weeksCount || 0);
  const start = new Date(payload.startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  let endDate = null;
  if (payload.endDate) {
    endDate = new Date(payload.endDate);
    endDate.setHours(0, 0, 0, 0);
  } else if (weeksCount > 0) {
    endDate = new Date(start);
    endDate.setDate(start.getDate() + weeksCount * 7 - 1);
  } else {
    return Promise.reject(new Error('Вкажіть тривалість (кількість тижнів або кінцеву дату)'));
  }

  const rows = [];
  for (let d = new Date(start); d <= endDate; d.setDate(d.getDate() + 1)) {
    if (d < today) continue;
    if (weekdays.includes(d.getDay())) {
      rows.push({ route_id: payload.route_id, bus_id: payload.bus_id, date: d.toISOString().slice(0, 10), time: payload.time, price: payload.price, status: 'active' });
    }
  }
  if (!rows.length) return Promise.reject(new Error('Немає дат для створення рейсів'));
  return bulkInsert(rows, userId);
}

function generateMonthly(payload, userId) {
  const daysOfMonth = (payload.daysOfMonth || []).map((d) => Number(d)).filter((d) => d >= 1 && d <= 31);
  if (!daysOfMonth.length) return Promise.reject(new Error('Оберіть дні місяця'));
  const monthsCount = Number(payload.monthsCount || 0);
  const start = new Date(payload.startDate);
  const today = new Date();
  start.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  let endDate = null;
  if (payload.endDate) {
    endDate = new Date(payload.endDate);
    endDate.setHours(0, 0, 0, 0);
  } else if (monthsCount > 0) {
    endDate = new Date(start);
    endDate.setMonth(start.getMonth() + monthsCount);
    endDate.setDate(0); // last day of previous month after increment
  } else {
    return Promise.reject(new Error('Вкажіть тривалість (кількість місяців або кінцеву дату)'));
  }

  const rows = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor <= endDate) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    daysOfMonth.forEach((day) => {
      const candidate = new Date(year, month, day);
      if (candidate.getMonth() !== month) return; // invalid date for this month
      if (candidate < start || candidate < today) return;
      if (candidate > endDate) return;
      rows.push({ route_id: payload.route_id, bus_id: payload.bus_id, date: candidate.toISOString().slice(0, 10), time: payload.time, price: payload.price, status: 'active' });
    });
    cursor.setMonth(month + 1);
  }
  if (!rows.length) return Promise.reject(new Error('Немає дат для створення рейсів'));
  return bulkInsert(rows, userId);
}

module.exports = { getAll, getById, create, update, remove, generate };
