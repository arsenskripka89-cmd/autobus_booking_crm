const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');
const logger = require('../config/logger');

async function createUser(data) {
  const password = data.password || 'changeme';
  const hash = await bcrypt.hash(password, 10);
  return userModel.createUser({ name: data.name, phone: data.phone, password_hash: hash, role: data.role || 'manager' });
}

async function listUsers() {
  return userModel.listUsers();
}

async function listUsersPaginated({ page = 1, limit = 50 } = {}) {
  const all = await userModel.listUsers();
  const p = Number(page) || 1;
  const l = Number(limit) || 50;
  const start = (p - 1) * l;
  const items = all.slice(start, start + l);
  return { items, total: all.length, page: p, limit: l };
}

async function getUser(id) {
  return userModel.findById(id);
}

async function updateUser(id, data) {
  return userModel.updateUser(id, data);
}

async function deleteUser(id) {
  return userModel.deleteUser(id);
}

async function changePassword(requester, id, newPassword) {
  // requester: { id, role }
  if (requester.role !== 'admin' && requester.id !== Number(id)) {
    throw new Error('Forbidden');
  }
  const hash = await bcrypt.hash(newPassword, 10);
  const res = await userModel.updatePassword(id, hash);
  logger.info('password_changed', { by: requester.id, for: id });
  return res;
}

module.exports = { createUser, listUsers, getUser, updateUser, deleteUser, changePassword };
