const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

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

module.exports = { register, login, JWT_SECRET };
