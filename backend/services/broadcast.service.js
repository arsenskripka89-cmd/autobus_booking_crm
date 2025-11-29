const db = require('../config/db');
const telegramBot = require('../bots/telegram.bot');
const viberBot = require('../bots/viber.bot');

function recipients(filter) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT DISTINCT passenger_phone FROM bookings WHERE status != "cancelled"';
    const params = [];
    if (filter.trip_id) {
      query += ' AND trip_id = ?';
      params.push(filter.trip_id);
    }
    if (filter.route_id) {
      query += ' AND trip_id IN (SELECT id FROM trips WHERE route_id = ?)';
      params.push(filter.route_id);
    }
    if (filter.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows.map((r) => r.passenger_phone));
    });
  });
}

async function sendTelegram(message, filter = {}) {
  const phones = await recipients(filter);
  return telegramBot.sendBroadcast(phones, message);
}

async function sendViber(message, filter = {}) {
  const phones = await recipients(filter);
  return viberBot.sendBroadcast(phones, message);
}

module.exports = { sendTelegram, sendViber, recipients };
