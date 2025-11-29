const tripService = require('../services/trip.service');
const bookingService = require('../services/booking.service');

async function list(req, res, next) {
  try { res.json(await tripService.getAll(req.user?.id)); } catch (err) { next(err); }
}

async function get(req, res, next) {
  try { res.json(await tripService.getById(req.params.id, req.user?.id)); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await tripService.create(req.body, req.user?.id)); } catch (err) { next(err); }
}

async function update(req, res, next) {
  try { res.json(await tripService.update(req.params.id, req.body, req.user?.id)); } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { res.json(await tripService.remove(req.params.id, req.user?.id)); } catch (err) { next(err); }
}

async function generate(req, res, next) {
  try {
    const { route_id, bus_id, startDate, days, time, price } = req.body;
    const results = await tripService.generate(route_id, bus_id, startDate, days, time, price, req.user?.id);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

async function passengers(req, res, next) {
  try {
    const list = await bookingService.listByTrip(req.params.id, req.user?.id);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove, generate, passengers };
