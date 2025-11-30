const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./config/db');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/users.routes');
const routeRoutes = require('./routes/routes.routes');
const busRoutes = require('./routes/buses.routes');
const tripRoutes = require('./routes/trips.routes');
const bookingRoutes = require('./routes/bookings.routes');
const broadcastRoutes = require('./routes/broadcast.routes');
const { createTelegramBot } = require('./bots/telegram.bot');
const userService = require('./services/user.service');
const auth = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/routes', routeRoutes);
app.use('/buses', busRoutes);
app.use('/trips', tripRoutes);
app.use('/bookings', bookingRoutes);
app.use('/broadcasts', broadcastRoutes);

app.use('/admin', express.static(path.join(__dirname, '..', 'frontend', 'admin')));
app.use('/public', express.static(path.join(__dirname, '..', 'frontend', 'public')));

app.get('/', (req, res) => res.redirect('/admin/login.html'));

async function upsertDefaultAdmin() {
  const email = 'admin@example.com';
  const passwordHash = await bcrypt.hash('Arsen2024!', 10);
  const seedName = 'Default Admin';
  const seedRole = 'manager';

  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE email = ?', [email], (findErr, existing) => {
      if (findErr) return reject(findErr);

      if (existing) {
        db.run(
          'UPDATE users SET name = ?, password_hash = ?, role = ? WHERE id = ?',
          [seedName, passwordHash, seedRole, existing.id],
          (updateErr) => {
            if (updateErr) return reject(updateErr);
            resolve();
          }
        );
        return;
      }

      db.run(
        'INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?,?)',
        [seedName, email, passwordHash, seedRole],
        (insertErr) => {
          if (insertErr) return reject(insertErr);
          resolve();
        }
      );
    });
  });
}

app.post('/webhook/:userId', async (req, res) => {
  const userId = Number(req.params.userId);
  if (Number.isNaN(userId)) return res.sendStatus(400);
  try {
    const user = await userService.getTelegramToken(userId);
    if (!user || !user.telegram_token) return res.status(404).json({ message: 'Bot token not configured' });
    const bot = createTelegramBot(user.telegram_token, userId);
    await bot.handleUpdate(req.body);
    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram webhook error', err);
    res.sendStatus(500);
  }
});

app.get('/debug/bot-status', auth, async (req, res, next) => {
  try {
    const user = await userService.getById(req.userId);
    const serverUrl = (process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const webhookUrl = `${serverUrl}/webhook/${req.userId}`;
    res.json({
      userId: req.userId,
      telegram_token: user?.telegram_token || null,
      webhookUrl,
      botIsReady: Boolean(user?.telegram_token)
    });
  } catch (err) {
    next(err);
  }
});

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(400).json({ message: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on ${PORT}`));

upsertDefaultAdmin().catch((err) => {
  console.error('Failed to upsert default admin', err.message);
});
