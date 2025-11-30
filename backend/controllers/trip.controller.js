const tripService = require('../services/trip.service');
const bookingService = require('../services/booking.service');

async function list(req, res, next) {
  try {
    const trips = await tripService.getAll(req.userId);
    if (req.user?.role === 'driver') {
      console.log(`[driver] ${req.userId} переглядає рейси`);
    }
    res.json(trips);
  } catch (err) {
    next(err);
  }
}

async function get(req, res, next) {
  try { res.json(await tripService.getById(req.params.id, req.userId)); } catch (err) { next(err); }
}

async function create(req, res, next) {
  try { res.status(201).json(await tripService.create(req.body, req.userId)); } catch (err) { next(err); }
}

async function update(req, res, next) {
  try { res.json(await tripService.update(req.params.id, req.body, req.userId)); } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try { res.json(await tripService.remove(req.params.id, req.userId)); } catch (err) { next(err); }
}

async function generate(req, res, next) {
  try {
    const { route_id, bus_id, startDate, days, time, price } = req.body;
    const results = await tripService.generate(route_id, bus_id, startDate, days, time, price, req.userId);
    res.json(results);
  } catch (err) {
    next(err);
  }
}

async function passengers(req, res, next) {
  try {
    const list = await bookingService.listByTrip(req.params.id, req.userId);
    console.log(`[driver] Пасажири для рейсу ${req.params.id} запитані користувачем ${req.userId}`);
    res.json(list);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, get, create, update, remove, generate, passengers };
