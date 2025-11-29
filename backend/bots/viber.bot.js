const ViberBot = require('viber-bot').Bot;
const TextMessage = require('viber-bot').Message.Text;
const tripService = require('../services/trip.service');
const bookingService = require('../services/booking.service');

const token = process.env.VIBER_BOT_TOKEN;
let bot;
const knownUsers = new Map(); // phone -> userId

if (token) {
  bot = new ViberBot({
    authToken: token,
    name: 'BusCRM',
    avatar: ''
  });

  bot.onSubscribe(async (response) => {
    knownUsers.set(response.userProfile.id, response.userProfile.id);
    response.send(new TextMessage('Вітаємо! Використовуйте меню щоб переглянути рейси.'));
  });

  bot.onTextMessage(/Розклад|Меню|Start/i, async (message, response) => {
    const trips = await tripService.getAll();
    if (!trips.length) return response.send(new TextMessage('Немає рейсів'));
    const text = trips.slice(0, 5).map((t) => `${t.id}: ${t.from_city}→${t.to_city} ${t.date} ${t.time}`).join('\n');
    response.send(new TextMessage('Доступні рейси:\n' + text));
  });

  bot.onTextMessage(/Бронювання (\d+) (\d+)/i, async (message, response, matched) => {
    const [ , tripId, seat ] = matched;
    response.send(new TextMessage('Ваше імʼя?'));
    bot.once('message', async (nameMessage, res) => {
      const passenger_name = nameMessage.text;
      res.send(new TextMessage('Ваш телефон?'));
      bot.once('message', async (phoneMessage) => {
        const passenger_phone = phoneMessage.text;
        try {
          await bookingService.create({ trip_id: tripId, seat_number: seat, passenger_name, passenger_phone });
          knownUsers.set(passenger_phone, response.userProfile.id);
          response.send(new TextMessage('Бронювання збережено!'));
        } catch (e) {
          response.send(new TextMessage('Помилка: ' + e.message));
        }
      });
    });
  });

  bot.onError((err) => console.error('Viber bot error', err));
}

function launch(app) {
  if (!bot) return;
  if (process.env.WEBHOOK_URL) {
    bot.setWebhook(`${process.env.WEBHOOK_URL}/viber/webhook`);
    app.use('/viber/webhook', bot.middleware());
  }
}

function sendBroadcast(phones, message) {
  if (!bot) return Promise.resolve('Bot not configured');
  const deliveries = phones
    .map((p) => knownUsers.get(p))
    .filter(Boolean)
    .map((id) => bot.sendMessage({ id }, [new TextMessage(message)]));
  return Promise.all(deliveries);
}

module.exports = { launch, sendBroadcast };
