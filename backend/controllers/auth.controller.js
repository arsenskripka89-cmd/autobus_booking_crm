const authService = require('../services/auth.service');

async function register(req, res, next) {
  try {
    const { email, password } = req.body;
    await authService.register(email, password);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { token, email: normalizedEmail } = await authService.login(email, password);
    res.json({ token, email: normalizedEmail });
  } catch (err) {
    next(err);
  }
}

async function telegramAuth(req, res, next) {
  try {
    const result = await authService.telegramAuth(req.body || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, telegramAuth };
