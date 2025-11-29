// Viber bot implementation - supports webhook
try {
  const ViberBot = require('viber-bot').Bot;
  const BotEvents = require('viber-bot').Events;
  const TextMessage = require('viber-bot').Message.Text;
  const Keyboard = require('viber-bot').Message.Keyboard;
  const viberToken = process.env.VIBER_BOT_TOKEN || '';
  const { getDb } = require('../config/db');
  const bookingService = require('../services/booking.service');

  if (!viberToken) module.exports = null;
  else {
    const bot = new ViberBot({ authToken: viberToken, name: 'BusCRM', avatar: '' });
    const sessions = new Map();

    const { syncBotUserByPhone, enqueuePhoneForSync } = require('../services/bot_sync.service');

    async function saveBotUser({ viber_id, name, phone }) {
      const db = getDb();
      return new Promise((resolve, reject) => {
        db.get('SELECT id FROM bot_users WHERE viber_id = ?', [viber_id], (err, row) => {
          if (err) return reject(err);
          if (row) {
            db.run('UPDATE bot_users SET name = ?, phone = ? WHERE viber_id = ?', [name, phone, viber_id], (e) => e ? reject(e) : resolve());
          } else {
            db.run('INSERT INTO bot_users (viber_id, name, phone) VALUES (?,?,?)', [viber_id, name, phone], (e) => e ? reject(e) : resolve());
          }
        });
      });
    }

    async function saveAndSyncBotUser(payload) {
      await saveBotUser(payload);
      if (payload.phone) {
        try {
          const timeoutMs = Number(process.env.BOT_SYNC_TIMEOUT_MS || 3000);
          await Promise.race([
            syncBotUserByPhone(payload.phone),
            new Promise((_, rej) => setTimeout(() => rej(new Error('sync_timeout')), timeoutMs))
          ]);
        } catch (e) {
          try { const logger = require('../config/logger'); logger.error('syncBotUserByPhone_error', e.message || e); } catch (_) {}
          try { enqueuePhoneForSync(payload.phone); } catch (_) {}
        }
      }
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

    function makeMainKeyboard() {
      const buttons = [
        { ActionBody: 'Розклад рейсів', ActionType: 'reply', Text: 'Розклад рейсів' },
        { ActionBody: 'Забронювати місце', ActionType: 'reply', Text: 'Забронювати місце' },
        { ActionBody: 'Мої бронювання', ActionType: 'reply', Text: 'Мої бронювання' },
        { ActionBody: 'Підтримка', ActionType: 'reply', Text: 'Підтримка' }
      ];
      return new Keyboard({ Type: 'keyboard', DefaultHeight: true, Buttons: buttons });
    }

    bot.on(BotEvents.SUBSCRIBED, async (response) => {
      try {
        const user = response.user || response.userProfile || {};
        const viberId = user.id || user.userId || null;
        if (viberId) {
          await saveBotUser({ viber_id: viberId, name: user.name || '', phone: null });
        }
        response.send(new TextMessage({ text: 'Вас вітає Bus CRM (Viber)! Використайте меню.', keyboard: makeMainKeyboard() }));
      } catch (e) { console.error(e); }
    });

    bot.on(BotEvents.MESSAGE_RECEIVED, async (message, response) => {
      try {
        const text = (message.text || '').trim();
        const userId = (message.userProfile && message.userProfile.id) || (message.sender && message.sender.id) || null;
        if (!userId) return response.send(new TextMessage('Не вдалося визначити ваш ідентифікатор.'));
        let s = sessions.get(userId) || {};

        if (/^(menu|меню|start|старт)$/i.test(text)) {
          s = {};
          sessions.set(userId, s);
          return response.send(new TextMessage({ text: 'Меню: оберіть дію', keyboard: makeMainKeyboard() }));
        }

        if (/^(розклад рейсів|1)$/i.test(text)) {
          // ask date
          const days = [];
          const d0 = new Date();
          for (let i = 0; i < 7; i++) { const d = new Date(d0); d.setDate(d0.getDate() + i); days.push(d.toISOString().split('T')[0]); }
          sessions.set(userId, { state: 'browsing_dates' });
          // build keyboard of dates
          const dateButtons = days.map(d => ({ ActionBody: d, ActionType: 'reply', Text: d }));
          return response.send(new TextMessage({ text: 'Оберіть дату:', keyboard: new Keyboard({ Type: 'keyboard', DefaultHeight: true, Buttons: dateButtons }) }));
        }

        if (/^\d{4}-\d{2}-\d{2}$/.test(text) && (s.state === 'browsing_dates' || !s.state)) {
          const date = text;
          const trips = await listTripsByDate(date);
          if (!trips.length) return response.send(new TextMessage('Рейси на цю дату відсутні.'));
          const list = trips.map(t => `#${t.id} ${t.from_city}→${t.to_city} ${t.time} (${t.price} UAH)`).join('\n');
          sessions.set(userId, { state: 'browsing_trips', date });
          // create keyboard with trip ids as buttons
          const tripButtons = trips.map(t => ({ ActionBody: String(t.id), ActionType: 'reply', Text: `#${t.id} ${t.from_city}→${t.to_city}` }));
          return response.send(new TextMessage({ text: 'Рейси:\n' + list, keyboard: new Keyboard({ Type: 'keyboard', DefaultHeight: true, Buttons: tripButtons }) }));
        }

        if (/^\d+$/.test(text) && s.state === 'browsing_trips') {
          const tripId = Number(text);
          const db = getDb();
          const trip = await new Promise((res, rej) => db.get('SELECT t.*, r.from_city, r.to_city, b.seats_count FROM trips t LEFT JOIN routes r ON t.route_id = r.id LEFT JOIN buses b ON t.bus_id = b.id WHERE t.id = ?', [tripId], (e, row) => e ? rej(e) : res(row)));
          if (!trip) return response.send(new TextMessage('Рейс не знайдено.')); 
          const bookings = await new Promise((res, rej) => db.all('SELECT seat_number FROM bookings WHERE trip_id = ? AND status != "cancelled"', [tripId], (e, rows) => e ? rej(e) : res(rows)));
          const occupied = bookings.map(b => b.seat_number);
          sessions.set(userId, { state: 'select_seat', tripId });
          return response.send(new TextMessage(`Рейс #${tripId} ${trip.from_city}→${trip.to_city} ${trip.date} ${trip.time}\nЗайняті місця: ${occupied.join(', ') || 'немає'}\nВведіть номер місця яке хочете забронювати:`));
        }

        if (/^\d+$/.test(text) && s.state === 'select_seat') {
          const seat = Number(text);
          s.seat = seat;
          s.state = 'booking_fill';
          sessions.set(userId, s);
          return response.send(new TextMessage('Введіть ваше імʼя:'));
        }

        if (s.state === 'booking_fill' && !s.name) {
          s.name = text;
          sessions.set(userId, s);
          return response.send(new TextMessage('Введіть телефон (наприклад +380501234567):'));
        }

        if (s.state === 'booking_fill' && s.name && !s.phone) {
          s.phone = text;
          try {
            const resBooking = await bookingService.bookSeat({ trip_id: s.tripId, passenger_name: s.name, passenger_phone: s.phone, seat_number: s.seat });
            await saveAndSyncBotUser({ viber_id: userId, name: s.name, phone: s.phone });
            sessions.delete(userId);
            return response.send(new TextMessage(`Бронювання успішне! Номер броні: ${resBooking.id}. Місце: ${resBooking.seat_number}`));
          } catch (e) {
            sessions.delete(userId);
            return response.send(new TextMessage('Не вдалося забронювати місце: ' + (e.message || e)));
          }
        }

        if (/^(мої бронювання|3)$/i.test(text)) {
          const db = getDb();
          const bu = await new Promise((res, rej) => db.get('SELECT * FROM bot_users WHERE viber_id = ?', [userId], (e, r) => e ? rej(e) : res(r)));
          if (!bu || !bu.phone) return response.send(new TextMessage('Не знайдено ваших контактів. Бронюйте хоча б одне місце.'));
          const bookings = await new Promise((res, rej) => db.all('SELECT b.*, t.date, t.time, r.from_city, r.to_city FROM bookings b JOIN trips t ON b.trip_id = t.id JOIN routes r ON t.route_id = r.id WHERE b.passenger_phone = ? ORDER BY b.created_at DESC', [bu.phone], (e, rows) => e ? rej(e) : res(rows)));
          if (!bookings.length) return response.send(new TextMessage('Бронювань не знайдено.'));
          for (const b of bookings) response.send(new TextMessage(`Бронь #${b.id}: ${b.from_city}→${b.to_city} ${b.date} ${b.time} Місце: ${b.seat_number} Статус: ${b.status}`));
          return;
        }

        if (/^(підтримка|4)$/i.test(text)) {
          return response.send(new TextMessage('Напишіть ваше питання тут, менеджер звʼяжеться з вами.'));
        }

        // fallback
        return response.send(new TextMessage('Не розпізнано. Напишіть "Меню" щоб побачити опції.'));
      } catch (e) {
        console.error('viber handler error', e);
        return response.send(new TextMessage('Виникла помилка. Спробуйте пізніше.'));
      }
    });

    module.exports = bot;
  }
} catch (e) {
  console.error('Failed to init viber bot', e);
  module.exports = null;
}
