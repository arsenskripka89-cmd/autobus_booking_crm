const axios = require('axios');
const userService = require('../services/user.service');

async function list(req, res, next) {
  try {
    const users = await userService.getAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const user = await userService.create(req.body);
    if (user.role === 'driver') {
      console.log(`[driver] Додано нового водія id=${user.id} ${user.name || ''}`);
    }
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const result = await userService.update(req.params.id, req.body);
    if (req.body.role === 'driver') {
      console.log(`[driver] Оновлено користувача ${req.params.id} як водія`);
    }
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await userService.remove(req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try {
    const user = await userService.getById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const user = await userService.getById(req.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

async function updateTelegramToken(req, res, next) {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token is required' });
    await userService.updateTelegramToken(req.userId, token);
    const serverUrl = (process.env.SERVER_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
    const webhookUrl = `${serverUrl}/webhook/${req.userId}`;
    await axios.get(`https://api.telegram.org/bot${token}/setWebhook`, { params: { url: webhookUrl } });
    console.log(`[admin] Telegram бот прив'язаний адміністратором user=${req.userId}`);
    res.json({ success: true, webhookUrl, message: 'Бота активовано успішно' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, create, update, remove, get, me, updateTelegramToken };
