const { syncBotUsersToUsers } = require('../services/bot_sync.service');

async function syncHandler(req, res, next) {
  try {
    const result = await syncBotUsersToUsers();
    res.json({ ok: true, result });
  } catch (e) { next(e); }
}

module.exports = { syncHandler };
