const bookingService = require('../services/booking.service');

async function create(req, res, next) {
  try { res.status(201).json(await bookingService.create(req.body, req.user?.id)); } catch (err) { next(err); }
}

async function cancel(req, res, next) {
  try { res.json(await bookingService.remove(req.params.id, req.user?.id)); } catch (err) { next(err); }
}

async function listByTrip(req, res, next) {
  try { res.json(await bookingService.listByTrip(req.params.tripId, req.user?.id)); } catch (err) { next(err); }
}

async function available(req, res, next) {
  try { res.json(await bookingService.availableSeats(req.params.tripId, req.user?.id)); } catch (err) { next(err); }
}

module.exports = { create, cancel, listByTrip, available };
