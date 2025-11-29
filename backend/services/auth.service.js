const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { SECRET } = require('../middleware/auth.middleware');

async function login(phone, password) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE phone = ?', [phone], (err, user) => {
      if (err) return reject(err);
      if (!user) return reject(new Error('User not found'));
      const valid = bcrypt.compareSync(password, user.password_hash);
      if (!valid) return reject(new Error('Invalid credentials'));
      const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET, { expiresIn: '7d' });
      resolve({ token, user: { id: user.id, name: user.name, role: user.role, phone: user.phone } });
    });
  });
}

module.exports = { login };
