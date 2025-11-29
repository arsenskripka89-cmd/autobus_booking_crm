const routeService = require('../services/route.service');

async function createRouteHandler(req, res, next) {
  try {
    const data = req.body;
    if (!data.from_city || !data.to_city) return res.status(400).json({ error: 'from_city and to_city are required' });
    const result = await routeService.createRoute(data);
    const logger = require('../config/logger');
    logger.info('route_created', { by: req.user ? req.user.id : null, route: result.id });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function listRoutesHandler(req, res, next) {
  try { res.json(await routeService.listRoutes()); } catch (e) { next(e); }
}

async function getRouteHandler(req, res, next) {
  try { const row = await routeService.getRoute(req.params.id); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); }
}

async function updateRouteHandler(req, res, next) {
  try { res.json(await routeService.updateRoute(req.params.id, req.body)); } catch (e) { next(e); }
}

async function deleteRouteHandler(req, res, next) {
  try { res.json(await routeService.deleteRoute(req.params.id)); } catch (e) { next(e); }
}

module.exports = { createRouteHandler, listRoutesHandler, getRouteHandler, updateRouteHandler, deleteRouteHandler };
