// Telegram bot implementation (Telegraf) - supports polling and webhook
const { Telegraf, Markup } = require('telegraf');
const botToken = process.env.TELEGRAM_BOT_TOKEN || '';
const { getDb } = require('../config/db');
const bookingService = require('../services/booking.service');
const { syncBotUserByPhone, enqueuePhoneForSync } = require('../services/bot_sync.service');

// in-memory session store (simple)
const sessions = new Map();

function makeKeyboard() {
  return Markup.keyboard([
    ['🚌 Розклад рейсів', '🎟 Забронювати місце'],
    ['📄 Мої бронювання', '🆘 Підтримка']
  ]).resize();
}

function formatTripRow(t) {
  return `#${t.id} ${t.from_city} → ${t.to_city} ${t.date} ${t.time} — ${t.price} UAH`;
}

async function listTripsByDate(dateStr) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    const sql = `SELECT t.id, t.route_id, t.bus_id, t.date, t.time, t.price, r.from_city, r.to_city, b.number as bus_number, b.seats_count
      FROM trips t
      LEFT JOIN routes r ON t.route_id = r.id
      LEFT JOIN buses b ON t.bus_id = b.id
      WHERE t.date = ? AND t.status = 'active'`;
    db.all(sql, [dateStr], (err, rows) => {
      if (err) return reject(err);
      resolve(rows || []);
    });
  });
}

async function saveBotUser({ telegram_id, name, phone }) {
  const db = getDb();
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM bot_users WHERE telegram_id = ?', [telegram_id], (err, row) => {
      if (err) return reject(err);
      if (row) {
        db.run('UPDATE bot_users SET name = ?, phone = ? WHERE telegram_id = ?', [name, phone, telegram_id], (e) => e ? reject(e) : resolve());
      } else {
        db.run('INSERT INTO bot_users (telegram_id, name, phone) VALUES (?,?,?)', [telegram_id, name, phone], (e) => e ? reject(e) : resolve());
      }
    });
  });
}

// After saving bot user, attempt to sync by phone (non-blocking)
async function saveAndSyncBotUser(payload) {
  await saveBotUser(payload);
  if (payload.phone) {
    try {
      // Attempt sync but don't block forever — use timeout and enqueue for retries on failure.
      const timeoutMs = Number(process.env.BOT_SYNC_TIMEOUT_MS || 3000);
      await Promise.race([
        syncBotUserByPhone(payload.phone),
        new Promise((_, rej) => setTimeout(() => rej(new Error('sync_timeout')), timeoutMs))
      ]);
    } catch (e) {
      // non-fatal: log and enqueue for background retry
      try { const logger = require('../config/logger'); logger.error('syncBotUserByPhone_error', e.message || e); } catch (_) {}
      try { enqueuePhoneForSync(payload.phone); } catch (_) {}
    }
  }
}

if (!botToken) {
  module.exports = null;
} else {
  const bot = new Telegraf(botToken);

  bot.start(async (ctx) => {
    const chatId = ctx.chat.id;
    sessions.delete(chatId);
    await ctx.reply('Вас вітає Bus CRM бот! Виберіть дію:', makeKeyboard());
  });

  bot.hears('🚌 Розклад рейсів', async (ctx) => {
    const chatId = ctx.chat.id;
    // show next 7 days
    const days = [];
    const d0 = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(d0);
      d.setDate(d0.getDate() + i);
      days.push(d.toISOString().split('T')[0]);
    }
    const buttons = days.map(dt => Markup.button.callback(dt, `date:${dt}`));
    await ctx.reply('Оберіть дату:', Markup.inlineKeyboard(buttons, { columns: 2 }));
    sessions.set(chatId, { state: 'browsing_dates' });
  });

  bot.action(/date:(.+)/, async (ctx) => {
    const date = ctx.match[1];
    const chatId = ctx.chat.id;
    const trips = await listTripsByDate(date);
    if (!trips.length) return ctx.reply('Рейси на цю дату відсутні.');
    const keyboard = trips.map(t => Markup.button.callback(formatTripRow(t), `trip:${t.id}`));
    await ctx.reply(`Рейси на ${date}:`, Markup.inlineKeyboard(keyboard, { columns: 1 }));
    sessions.set(chatId, { state: 'browsing_trips', date });
  });

  bot.action(/trip:(\d+)/, async (ctx) => {
    const tripId = Number(ctx.match[1]);
    const chatId = ctx.chat.id;
    // fetch trip details and seats
    const db = getDb();
    const trip = await new Promise((res, rej) => db.get('SELECT t.*, r.from_city, r.to_city, b.seats_count FROM trips t LEFT JOIN routes r ON t.route_id = r.id LEFT JOIN buses b ON t.bus_id = b.id WHERE t.id = ?', [tripId], (e, row) => e ? rej(e) : res(row)));
    if (!trip) return ctx.reply('Рейс не знайдено.');
    const seats = trip.seats_count || 50;
    const bookings = await new Promise((res, rej) => db.all('SELECT seat_number FROM bookings WHERE trip_id = ? AND status != "cancelled"', [tripId], (e, rows) => e ? rej(e) : res(rows)));
    const occupied = new Set(bookings.map(b => b.seat_number));
    // build inline keyboard for first 30 seats (UI constraints) and another message to list rest
    const seatButtons = [];
    for (let s = 1; s <= Math.min(seats, 50); s++) {
      const text = occupied.has(s) ? `❌${s}` : `✅${s}`;
      seatButtons.push(Markup.button.callback(text, `book:${tripId}:${s}`));
    }
    await ctx.reply`Схема місць для рейсу #${tripId} (${trip.from_city}→${trip.to_city} ${trip.date} ${trip.time}):`;
    await ctx.reply('Оберіть місце (✅ вільне, ❌ зайняте):', Markup.inlineKeyboard(seatButtons, { columns: 5 }));
    sessions.set(chatId, { state: 'select_seat', tripId });
  });

  bot.action(/book:(\d+):(\d+)/, async (ctx) => {
    const tripId = Number(ctx.match[1]);
    const seat = Number(ctx.match[2]);
    const chatId = ctx.chat.id;
    const s = sessions.get(chatId) || {};
    // check seat free
    const db = getDb();
    const existing = await new Promise((res, rej) => db.get('SELECT * FROM bookings WHERE trip_id = ? AND seat_number = ? AND status != "cancelled"', [tripId, seat], (e, row) => e ? rej(e) : res(row)));
    if (existing) return ctx.reply('Вибране місце вже зайняте, спробуйте інше.');

    // ask for passenger name and phone
    sessions.set(chatId, { state: 'booking_fill', tripId, seat });
    await ctx.reply('Введіть ваше імʼя (латиницею або кирилицею):');
  });

  bot.on('text', async (ctx) => {
    const chatId = ctx.chat.id;
    const s = sessions.get(chatId);
    if (!s) return ctx.reply('Оберіть дію з меню.', makeKeyboard());

    if (s.state === 'booking_fill') {
      if (!s.name) {
        s.name = ctx.message.text.trim();
        sessions.set(chatId, s);
        return ctx.reply('Введіть, будь ласка, ваш телефон (наприклад +380501234567):');
      }
      if (!s.phone) {
        s.phone = ctx.message.text.trim();
        // perform booking
          try {
          const res = await bookingService.bookSeat({ trip_id: s.tripId, passenger_name: s.name, passenger_phone: s.phone, seat_number: s.seat });
          await saveAndSyncBotUser({ telegram_id: chatId.toString(), name: s.name, phone: s.phone });
          sessions.delete(chatId);
          return ctx.reply(`Бронювання успішне! Номер броні: ${res.id}. Місце: ${res.seat_number}`);
        } catch (e) {
          sessions.delete(chatId);
          return ctx.reply('Не вдалося забронювати місце: ' + (e.message || e));
        }
      }
    }

    if (s.state === 'browsing_dates' || s.state === 'browsing_trips') {
      return ctx.reply('Будь ласка, використовуйте кнопки в інтерфейсі.');
    }

    // default fallback
    await ctx.reply('Команда не розпізнана. Оберіть дію з меню.', makeKeyboard());
  });

  bot.hears('📄 Мої бронювання', async (ctx) => {
    const chatId = ctx.chat.id;
    const db = getDb();
    const bu = await new Promise((res, rej) => db.get('SELECT * FROM bot_users WHERE telegram_id = ?', [chatId.toString()], (e, r) => e ? rej(e) : res(r)));
    if (!bu || !bu.phone) return ctx.reply('Не знайдено ваших контактів. Будь ласка, забронюйте хоча б одне місце через бота.');
    const bookings = await new Promise((res, rej) => db.all('SELECT b.* , t.date, t.time, r.from_city, r.to_city FROM bookings b JOIN trips t ON b.trip_id = t.id JOIN routes r ON t.route_id = r.id WHERE b.passenger_phone = ? ORDER BY b.created_at DESC', [bu.phone], (e, rows) => e ? rej(e) : res(rows)));
    if (!bookings.length) return ctx.reply('Бронювань не знайдено.');
    for (const b of bookings) {
      await ctx.reply(`Бронь #${b.id}: ${b.from_city}→${b.to_city} ${b.date} ${b.time} Місце: ${b.seat_number} Статус: ${b.status}`);
    }
  });

  bot.hears('🆘 Підтримка', async (ctx) => {
    await ctx.reply('Напишіть ваше питання тут, і менеджер звʼяжеться з вами.');
  });

  module.exports = bot;
}
