const tripService = require('../services/trip.service');
const bookingService = require('../services/booking.service');
const logger = require('../config/logger');

async function createTripHandler(req, res, next) {
  try { res.status(201).json(await tripService.createTrip(req.body)); } catch (e) { next(e); }
}

async function listTripsHandler(req, res, next) {
  try { res.json(await tripService.listTrips()); } catch (e) { next(e); }
}

async function getTripHandler(req, res, next) {
  try { const row = await tripService.getTrip(req.params.id); if (!row) return res.status(404).json({ error: 'Not found' }); res.json(row); } catch (e) { next(e); }
}

async function updateTripHandler(req, res, next) {
  try { res.json(await tripService.updateTrip(req.params.id, req.body)); } catch (e) { next(e); }
}

async function deleteTripHandler(req, res, next) {
  try { res.json(await tripService.deleteTrip(req.params.id)); } catch (e) { next(e); }
}

async function generateTripsHandler(req, res, next) {
  try {
    const payload = req.body; // { route_id, bus_id, start_date, days, time, price }
    const created = await tripService.generateTrips(payload);
    logger.info('trips_generated', { by: req.user ? req.user.id : null, count: created.length });
    res.json({ created });
  } catch (e) { next(e); }
}

async function getSeatsHandler(req, res, next) {
  try {
    const tripId = req.params.id;
    const data = await bookingService.getFreeSeats(tripId);
    res.json(data);
  } catch (e) { next(e); }
}

module.exports = { createTripHandler, listTripsHandler, getTripHandler, updateTripHandler, deleteTripHandler, generateTripsHandler };
