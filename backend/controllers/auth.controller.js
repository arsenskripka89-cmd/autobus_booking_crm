const { login } = require('../services/auth.service');

async function loginHandler(req, res, next) {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ error: 'phone and password required' });
    const result = await login(phone, password);
    if (!result) return res.status(401).json({ error: 'Invalid credentials' });
    res.json(result);
  } catch (e) {
    next(e);
  }
}

module.exports = { loginHandler };
