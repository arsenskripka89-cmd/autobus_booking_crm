const { getDb } = require('../config/db');
const logger = require('../config/logger');
const telegramBot = require('../bots/telegram.bot');
const viberBot = require('../bots/viber.bot');

// Very simple broadcast: select recipients based on filter and send message (logs for now).
// Filter can be: all, route:<id>, trip:<id>, active_bookings
async function sendBroadcast({ filter, message }) {
  const db = getDb();
  let recipients = [];

  if (!filter || filter === 'all') {
    recipients = await new Promise((res, rej) => db.all('SELECT phone, name FROM users WHERE phone IS NOT NULL', [], (e, r) => e ? rej(e) : res(r)));
  } else if (filter.startsWith('route:')) {
    const routeId = filter.split(':')[1];
    recipients = await new Promise((res, rej) => db.all('SELECT DISTINCT b.passenger_phone as phone, b.passenger_name as name FROM bookings b JOIN trips t ON b.trip_id = t.id WHERE t.route_id = ?', [routeId], (e, r) => e ? rej(e) : res(r)));
  } else if (filter.startsWith('trip:')) {
    const tripId = filter.split(':')[1];
    recipients = await new Promise((res, rej) => db.all('SELECT passenger_phone as phone, passenger_name as name FROM bookings WHERE trip_id = ?', [tripId], (e, r) => e ? rej(e) : res(r)));
  } else if (filter === 'active_bookings') {
    recipients = await new Promise((res, rej) => db.all("SELECT passenger_phone as phone, passenger_name as name FROM bookings WHERE status='confirmed' OR status='new'", [], (e, r) => e ? rej(e) : res(r)));
  }

  // Send via available bots (best-effort). We don't have mapping phone->chatId, so log and return count.
  for (const r of recipients) {
    logger.info('Broadcast to', { to: r.phone, name: r.name, message });
    // If telegramBot available and r.telegram_id exists (not implemented), we would do: telegramBot.telegram.sendMessage(r.telegram_id, message)
  }

  return { sent: recipients.length };
}

module.exports = { sendBroadcast };
