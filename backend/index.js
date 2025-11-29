require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const winston = require('winston');

const { initDb } = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const routesRoutes = require('./routes/routes.routes');
const busesRoutes = require('./routes/buses.routes');
const tripsRoutes = require('./routes/trips.routes');
const bookingsRoutes = require('./routes/bookings.routes');
const broadcastRoutes = require('./routes/broadcast.routes');
const botsRoutes = require('./routes/bots.routes');
const telegramBot = require('./bots/telegram.bot');
const viberBot = require('./bots/viber.bot');
const { startReminders } = require('./services/reminder.service');
const { startSyncQueueWorker } = require('./services/bot_sync.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.prettyPrint()
  ),
  transports: [new winston.transports.Console()]
});

app.use(cors());
app.use(bodyParser.json());

// Initialize DB and create tables
initDb().then(() => logger.info('Database initialized')).catch(err => logger.error(err));

// Start bot-user sync retry worker
try {
  startSyncQueueWorker();
} catch (e) { console.error('Failed to start bot sync queue worker', e); }

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/routes', routesRoutes);
app.use('/buses', busesRoutes);
app.use('/trips', tripsRoutes);
app.use('/bookings', bookingsRoutes);
app.use('/broadcasts', broadcastRoutes);
app.use('/bots', botsRoutes);

// Telegram bot: webhook or launch
if (telegramBot) {
  const TELEGRAM_WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || '';
  if (TELEGRAM_WEBHOOK_URL) {
    // set webhook and mount callback
    telegramBot.telegram.setWebhook(TELEGRAM_WEBHOOK_URL + '/telegram/webhook').then(() => {
      app.use('/telegram/webhook', telegramBot.webhookCallback('/telegram/webhook'));
    }).catch(err => console.error('Failed to set webhook', err));
  } else {
    telegramBot.launch().then(() => console.log('Telegram bot launched (polling)')).catch(() => {});
  }
}

// Start reminder scheduler (uses bot instances if available)
try {
  startReminders({ telegram: telegramBot, viber: viberBot });
} catch (e) {
  console.error('Failed to start reminders', e);
}

// Viber webhook mount / set
if (viberBot) {
  const VIBER_WEBHOOK_URL = process.env.VIBER_WEBHOOK_URL || '';
  try {
    if (VIBER_WEBHOOK_URL && typeof viberBot.setWebhook === 'function') {
      viberBot.setWebhook(VIBER_WEBHOOK_URL).then(() => {
        app.use('/viber/webhook', viberBot.middleware());
        console.log('Viber webhook set and mounted at /viber/webhook');
      }).catch(err => console.error('Failed to set Viber webhook', err));
    } else if (typeof viberBot.middleware === 'function') {
      // still mount middleware to receive callbacks if hosting
      app.use('/viber/webhook', viberBot.middleware());
    }
  } catch (e) { console.error('Viber bot init error', e); }
}

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Centralized error handler
const errorHandler = require('./middleware/error.middleware');
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
