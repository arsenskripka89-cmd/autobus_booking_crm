const broadcastService = require('../services/broadcast.service');

async function sendTelegram(req, res, next) {
  try {
    const { message, route_id, trip_id, status } = req.body;
    const response = await broadcastService.sendTelegram(message, { route_id, trip_id, status });
    res.json({ sent: true, response });
  } catch (err) { next(err); }
}

async function sendViber(req, res, next) {
  try {
    const { message, route_id, trip_id, status } = req.body;
    const response = await broadcastService.sendViber(message, { route_id, trip_id, status });
    res.status(501).json({ sent: false, response });
  } catch (err) { next(err); }
}

module.exports = { sendTelegram, sendViber };
