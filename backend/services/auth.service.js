const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { findByPhone } = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

async function login(phone, password) {
  const user = await findByPhone(phone);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash || '');
  if (!ok) return null;
  const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
  return { token, user: { id: user.id, name: user.name, phone: user.phone, role: user.role } };
}

module.exports = { login };
