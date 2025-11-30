const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const userService = require('./user.service');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

function register(email, password) {
  return new Promise((resolve, reject) => {
    if (!email || !password) {
      return reject(new Error('Email і пароль обов\'язкові'));
    }
    const normalizedEmail = email.trim().toLowerCase();
    const password_hash = bcrypt.hashSync(password, 10);
    db.get('SELECT id FROM users WHERE email = ?', [normalizedEmail], (findErr, existing) => {
      if (findErr) return reject(findErr);
      if (existing) return reject(new Error('Користувач з таким email вже існує'));
      db.run(
        'INSERT INTO users (email, password_hash) VALUES (?, ?)',
        [normalizedEmail, password_hash],
        function (err) {
          if (err) return reject(err);
          resolve({ id: this.lastID });
        }
      );
    });
  });
}

function login(email, password) {
  return new Promise((resolve, reject) => {
    if (!email || !password) return reject(new Error('Email і пароль обов\'язкові'));
    const normalizedEmail = email.trim().toLowerCase();
    db.get('SELECT * FROM users WHERE email = ?', [normalizedEmail], (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('Невірний email або пароль'));
      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return reject(new Error('Невірний email або пароль'));
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, {
        expiresIn: '7d'
      });
      resolve({ token, email: user.email, role: user.role });
    });
  });
}

async function telegramAuth(payload) {
  const telegramId = payload.telegram_id?.toString();
  const telegramUsername = payload.telegram_username?.replace(/^@/, '') || null;
  const displayName = payload.first_name || telegramUsername || 'Telegram user';
  if (!telegramId) throw new Error('telegram_id is required');

  let user = await userService.findByTelegramId(telegramId);
  if (user) {
    if (!user.telegram_username && telegramUsername) {
      await userService.linkTelegramProfile(user.id, telegramId, telegramUsername);
    }
    console.log(`[telegram] Existing user ${user.id} (${user.role}) started bot`);
    return { role: user.role || 'user', userId: user.id, name: user.name };
  }

  if (telegramUsername) {
    const matchedByUsername = await userService.findByTelegramUsername(telegramUsername);
    if (matchedByUsername) {
      await userService.linkTelegramProfile(matchedByUsername.id, telegramId, telegramUsername);
      console.log(`[telegram] Linked @${telegramUsername} to user ${matchedByUsername.id} with role ${matchedByUsername.role}`);
      return { role: matchedByUsername.role || 'user', userId: matchedByUsername.id, name: matchedByUsername.name };
    }
  }

  const created = await userService.create({
    name: displayName,
    telegram_id: telegramId,
    telegram_username: telegramUsername,
    role: 'user'
  });
  console.log(`[telegram] New user registered from bot ${created.id}`);
  return { role: created.role || 'user', userId: created.id, name: displayName };
}

module.exports = { register, login, telegramAuth, JWT_SECRET };
