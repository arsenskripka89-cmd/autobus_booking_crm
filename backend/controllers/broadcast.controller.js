const broadcastService = require('../services/broadcast.service');

async function sendBroadcastHandler(req, res, next) {
  try {
    const { filter, message } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const result = await broadcastService.sendBroadcast({ filter, message });
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { sendBroadcastHandler };
