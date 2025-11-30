const { Telegraf, Markup } = require('telegraf');
const tripService = require('../services/trip.service');
const bookingService = require('../services/booking.service');

// Cache bot instances per user to reuse handlers and chat memory
const botCache = new Map(); // userId -> { bot, knownChats, sessionStore }

function createTelegramBot(token, userId) {
  if (!token) {
    throw new Error('Telegram bot token is required');
  }

  if (botCache.has(userId)) {
    return botCache.get(userId).bot;
  }

  const knownChats = new Map(); // phone -> chatId
  const sessionStore = new Map();

  const bot = new Telegraf(token);

  // Lightweight session middleware to keep booking context in memory
  bot.use((ctx, next) => {
    const key = ctx.from?.id || ctx.chat?.id;
    if (!key) return next();
    ctx.session = sessionStore.get(key) || {};
    return next().then(() => {
      sessionStore.set(key, ctx.session);
    });
  });

  const mainMenu = Markup.keyboard([
    ['🚌 Розклад рейсів', '🎟 Забронювати місце'],
    ['📄 Мої бронювання', '🆘 Підтримка']
  ]).resize();

  bot.start((ctx) => {
    ctx.reply('Вітаємо в автобусній CRM! Оберіть дію:', mainMenu);
    knownChats.set(ctx.from.id.toString(), ctx.chat.id);
  });

  bot.hears('🚌 Розклад рейсів', async (ctx) => {
    const trips = await tripService.getAll(userId);
    if (!trips.length) return ctx.reply('Немає запланованих рейсів.');
    const text = trips
      .map((t) => `${t.id}: ${t.from_city} → ${t.to_city} ${t.date} ${t.time} $${t.price}`)
      .join('\n');
    ctx.reply(text);
  });

  bot.hears('🎟 Забронювати місце', async (ctx) => {
    const trips = await tripService.getAll(userId);
    if (!trips.length) return ctx.reply('Немає доступних рейсів');
    const buttons = trips
      .slice(0, 10)
      .map((t) => [Markup.button.callback(`${t.from_city}→${t.to_city} ${t.date}`, `book_${t.id}`)]);
    ctx.reply('Оберіть рейс для бронювання', Markup.inlineKeyboard(buttons));
  });

  bot.action(/book_(\d+)/, async (ctx) => {
    const tripId = ctx.match[1];
    const seats = await bookingService.availableSeats(tripId, userId);
    const buttons = seats.slice(0, 30).map((s) => Markup.button.callback(`${s}`, `seat_${tripId}_${s}`));
    const chunks = [];
    while (buttons.length) chunks.push(buttons.splice(0, 5));
    ctx.editMessageText('Доступні місця:', Markup.inlineKeyboard(chunks));
  });

  bot.action(/seat_(\d+)_(\d+)/, async (ctx) => {
    const [, tripId, seat] = ctx.match;
    ctx.reply('Вкажіть ваше імʼя:');
    ctx.session = { booking: { trip_id: tripId, seat_number: seat } };
  });

  bot.on('text', async (ctx, next) => {
    if (ctx.session && ctx.session.booking && !ctx.session.booking.passenger_name) {
      ctx.session.booking.passenger_name = ctx.message.text;
      ctx.reply('Вкажіть телефон:');
      return;
    }
    if (ctx.session && ctx.session.booking && ctx.session.booking.passenger_name && !ctx.session.booking.passenger_phone) {
      ctx.session.booking.passenger_phone = ctx.message.text;
      try {
        const booking = await bookingService.create(ctx.session.booking, userId);
        knownChats.set(ctx.session.booking.passenger_phone, ctx.chat.id);
        ctx.reply(`Бронювання створено №${booking.id}. Дякуємо!`);
      } catch (e) {
        ctx.reply('Помилка: ' + e.message);
      }
      ctx.session = null;
      return;
    }
    return next();
  });

  bot.hears('📄 Мої бронювання', async (ctx) => {
    const phone = ctx.session?.booking?.passenger_phone;
    if (!phone) return ctx.reply('Надішліть свій телефон через процес бронювання, щоб побачити список.');
    const trips = await tripService.getAll(userId);
    const bookings = await Promise.all(trips.map((t) => bookingService.listByTrip(t.id, userId)));
    const my = bookings.flat().filter((b) => b.passenger_phone === phone);
    if (!my.length) return ctx.reply('Немає бронювань.');
    const text = my
      .map((b) => `Бронювання ${b.id} місце ${b.seat_number}, статус: ${b.status}`)
      .join('\n');
    ctx.reply(text);
  });

  bot.hears('🆘 Підтримка', (ctx) => ctx.reply('Напишіть адміністратору +10000000000'));

  bot.catch((err) => console.error('Telegram bot error', err));

  botCache.set(userId, { bot, knownChats, sessionStore });
  return bot;
}

function getCachedBot(userId) {
  return botCache.get(userId)?.bot;
}

function getKnownChats(userId) {
  return botCache.get(userId)?.knownChats;
}

function sendBroadcast(phones, message, userId) {
  const bot = getCachedBot(userId);
  const knownChats = getKnownChats(userId);
  if (!bot || !knownChats) return Promise.resolve('Bot not configured');
  const deliveries = phones
    .map((p) => knownChats.get(p))
    .filter(Boolean)
    .map((chatId) => bot.telegram.sendMessage(chatId, message));
  return Promise.all(deliveries);
}

module.exports = { createTelegramBot, sendBroadcast };
