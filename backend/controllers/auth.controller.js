const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { phone, password } = req.body;
    const data = await authService.login(phone, password);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { login };
