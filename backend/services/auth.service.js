const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const JWT_SECRET = process.env.JWT_SECRET || 'secretkey';

function register(email, password) {
  return new Promise((resolve, reject) => {
    const password_hash = bcrypt.hashSync(password, 10);
    db.run(
      'INSERT INTO users (email, password_hash) VALUES (?, ?)',
      [email, password_hash],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID });
      }
    );
  });
}

function login(email, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('User not found'));
      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return reject(new Error('Invalid credentials'));
      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
      resolve(token);
    });
  });
}

module.exports = { register, login, JWT_SECRET };
