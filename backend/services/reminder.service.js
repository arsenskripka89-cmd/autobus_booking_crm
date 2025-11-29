const { getDb } = require('../config/db');
const logger = require('../config/logger');

// Reminder scheduler: will send reminders before trips for bookings with status new/confirmed
// Offsets in hours: default [24,3,1]
const DEFAULT_OFFSETS = (process.env.REMINDER_OFFSETS || '24,3,1').split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
const CHECK_INTERVAL_MS = Number(process.env.REMINDER_CHECK_INTERVAL_MS) || 60 * 1000; // check every minute

function parseTripDateTime(dateStr, timeStr) {
  // expects date 'YYYY-MM-DD' and time 'HH:MM' or 'HH:MM:SS'
  try {
    const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
    // produce ISO-like string
    const iso = `${dateStr}T${t}`;
    return new Date(iso);
  } catch (e) {
    return null;
  }
}

async function fetchPendingBookings() {
  const db = getDb();
  return new Promise((resolve, reject) => {
    const sql = `SELECT b.id as booking_id, b.passenger_name, b.passenger_phone, b.seat_number, b.status, t.id as trip_id, t.date, t.time, t.price, r.from_city, r.to_city
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN routes r ON t.route_id = r.id
      WHERE b.status IN ('new','confirmed')`;
    db.all(sql, [], (err, rows) => err ? reject(err) : resolve(rows || []));
  });
}

async function reminderAlreadySent(bookingId, offset) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT 1 FROM reminders WHERE booking_id = ? AND offset_hours = ? LIMIT 1', [bookingId, offset], (err, row) => {
      if (err) return reject(err);
      resolve(!!row);
    });
  });
}

async function recordReminder(bookingId, offset) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO reminders (booking_id, offset_hours) VALUES (?,?)', [bookingId, offset], function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID });
    });
  });
}

async function findBotUserByPhone(phone) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM bot_users WHERE phone = ? LIMIT 1', [phone], (err, row) => err ? reject(err) : resolve(row));
  });
}

async function sendViaTelegram(bot, chatId, text) {
  if (!bot || !bot.telegram) return false;
  try {
    await bot.telegram.sendMessage(chatId, text);
    return true;
  } catch (e) {
    logger.error('telegram_send_error', { chatId, error: e.message });
    return false;
  }
}

async function sendViaViber(bot, viberId, text) {
  // best-effort: viber-bot library usage varies; try common method
  if (!bot) return false;
  try {
    if (typeof bot.sendMessage === 'function') {
      await bot.sendMessage(viberId, text);
      return true;
    }
    // fallback: log only
    logger.info('viber_send_fallback', { viberId, text });
    return false;
  } catch (e) {
    logger.error('viber_send_error', { viberId, error: e.message });
    return false;
  }
}

function makeMessage(offset, booking, trip) {
  return `Нагадування: через ${offset} годин рейс ${trip.from_city} → ${trip.to_city} ${trip.date} ${trip.time}. Пасажир: ${booking.passenger_name}, місце ${booking.seat_number}. Номер броні: ${booking.booking_id}`;
}

function startReminders(botInstances = {}) {
  const telegramBot = botInstances.telegram;
  const viberBot = botInstances.viber;
  const offsets = DEFAULT_OFFSETS.slice().sort((a,b) => b - a); // process largest first

  async function checkAndSend() {
    try {
      const bookings = await fetchPendingBookings();
      const now = new Date();
      for (const b of bookings) {
        const tripDT = parseTripDateTime(b.date, b.time);
        if (!tripDT) continue;
        const diffMs = tripDT - now;
        if (diffMs <= 0) continue; // trip in past
        const diffHours = diffMs / (1000 * 60 * 60);
        for (const offset of offsets) {
          // if trip is within offset hours and reminder not yet sent
          if (diffHours <= offset && diffHours > (offset - 1)) {
            const already = await reminderAlreadySent(b.booking_id, offset);
            if (already) continue;
            const botUser = await findBotUserByPhone(b.passenger_phone || b.passenger_phone);
            const text = makeMessage(offset, b, b);
            let sentAny = false;
            if (botUser && botUser.telegram_id) {
              sentAny = await sendViaTelegram(telegramBot, botUser.telegram_id, text) || sentAny;
            }
            if (botUser && botUser.viber_id) {
              sentAny = await sendViaViber(viberBot, botUser.viber_id, text) || sentAny;
            }
            // fallback: log
            if (!sentAny) logger.info('reminder_logged', { booking: b.booking_id, offset, text });
            await recordReminder(b.booking_id, offset);
          }
        }
      }
    } catch (e) {
      logger.error('reminder_check_error', e.message || e);
    }
  }

  // initial run and interval
  checkAndSend();
  const id = setInterval(checkAndSend, CHECK_INTERVAL_MS);
  logger.info('reminder_scheduler_started', { checkIntervalMs: CHECK_INTERVAL_MS, offsets: DEFAULT_OFFSETS });
  return { stop: () => clearInterval(id) };
}

module.exports = { startReminders };
