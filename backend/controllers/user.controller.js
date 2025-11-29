const userService = require('../services/user.service');
const logger = require('../config/logger');

function sanitizeUser(u) {
  if (!u) return u;
  const { password_hash, ...rest } = u;
  return rest;
}

async function createUserHandler(req, res, next) {
  try {
    const payload = req.body;
    // admin only can set role; manager default to manager
    if (req.user.role !== 'admin' && payload.role && payload.role !== 'manager') {
      return res.status(403).json({ error: 'Only admin can set roles' });
    }
    const result = await userService.createUser(payload);
    logger.info('user_created', { by: req.user.id, user: result.id });
    res.status(201).json(result);
  } catch (e) {
    next(e);
  }
}

async function listUsersHandler(req, res, next) {
  try {
    const { page, limit } = req.query;
    const data = await userService.listUsersPaginated({ page, limit });
    res.json(data);
  } catch (e) { next(e); }
}

async function getUserHandler(req, res, next) {
  try {
    const id = req.params.id;
    const row = await userService.getUser(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(sanitizeUser(row));
  } catch (e) { next(e); }
}

async function updateUserHandler(req, res, next) {
  try {
    const id = req.params.id;
    const data = req.body;
    // manager cannot change roles
    if (req.user.role === 'manager' && data.role) return res.status(403).json({ error: 'Managers cannot change roles' });
    const result = await userService.updateUser(id, data);
    logger.info('user_updated', { by: req.user.id, user: id });
    res.json(result);
  } catch (e) { next(e); }
}

async function deleteUserHandler(req, res, next) {
  try {
    const id = req.params.id;
    const result = await userService.deleteUser(id);
    logger.info('user_deleted', { by: req.user.id, user: id });
    res.json(result);
  } catch (e) { next(e); }
}

async function changePasswordHandler(req, res, next) {
  try {
    const id = req.params.id;
    const { newPassword } = req.body;
    if (!newPassword) return res.status(400).json({ error: 'newPassword required' });
    await userService.changePassword(req.user, id, newPassword);
    res.json({ ok: true });
  } catch (e) { next(e); }
}

// Get current user profile
async function getMeHandler(req, res, next) {
  try {
    const id = req.user.id;
    const row = await userService.getUser(id);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(sanitizeUser(row));
  } catch (e) { next(e); }
}

// Update current user (name, phone)
async function updateMeHandler(req, res, next) {
  try {
    const id = req.user.id;
    const data = req.body;
    // prevent role changes here
    if (data.role && req.user.role !== 'admin') return res.status(403).json({ error: 'Cannot change role' });
    const result = await userService.updateUser(id, data);
    logger.info('user_self_updated', { by: id });
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { createUserHandler, listUsersHandler, getUserHandler, updateUserHandler, deleteUserHandler };
