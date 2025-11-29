const busService = require('../services/bus.service');

async function createBusHandler(req, res, next) {
  try {
    const data = req.body;
    if (!data.number || !data.seats_count) return res.status(400).json({ error: 'number and seats_count required' });
    const result = await busService.createBus(data);
    const logger = require('../config/logger');
    logger.info('bus_created', { by: req.user ? req.user.id : null, bus: result.id });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function listBusesHandler(req, res, next) {
  try { res.json(await busService.listBuses()); } catch (e) { next(e); }
}

async function getBusHandler(req, res, next) {
  try { const row = await busService.getBus(req.params.id); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); }
}

async function updateBusHandler(req, res, next) {
  try { res.json(await busService.updateBus(req.params.id, req.body)); } catch (e) { next(e); }
}

async function deleteBusHandler(req, res, next) {
  try { res.json(await busService.deleteBus(req.params.id)); } catch (e) { next(e); }
}

module.exports = { createBusHandler, listBusesHandler, getBusHandler, updateBusHandler, deleteBusHandler };
