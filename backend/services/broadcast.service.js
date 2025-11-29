const db = require('../config/db');
const telegramBot = require('../bots/telegram.bot');

function recipients(filter, userId) {
  return new Promise((resolve, reject) => {
    let query = 'SELECT DISTINCT passenger_phone FROM bookings WHERE status != "cancelled" AND user_id = ?';
    const params = [userId];
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

async function sendTelegram(message, filter = {}, userId) {
  const phones = await recipients(filter, userId);
  return telegramBot.sendBroadcast(phones, message, userId);
}

async function sendViber(message, filter = {}, userId) {
  const phones = await recipients(filter, userId);
  return { sent: false, phones, error: 'Viber bot support has been removed.' };
}

module.exports = { sendTelegram, sendViber, recipients };
