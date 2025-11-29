const bookingService = require('../services/booking.service');

async function createBookingHandler(req, res, next) {
  try {
    const payload = req.body; // trip_id, passenger_name, passenger_phone, optional seat_number
    if (!payload.trip_id || !payload.passenger_name || !payload.passenger_phone) return res.status(400).json({ error: 'trip_id, passenger_name and passenger_phone required' });
    const result = await bookingService.bookSeat(payload);
    const logger = require('../config/logger');
    logger.info('booking_created', { by: req.user ? req.user.id : null, booking: result });
    res.status(201).json(result);
  } catch (e) { next(e); }
}

async function listBookingsByTripHandler(req, res, next) {
  try { const tripId = req.params.tripId; res.json(await bookingService.listBookingsByTrip(tripId)); } catch (e) { next(e); }
}

async function cancelBookingHandler(req, res, next) {
  try { const id = req.params.id; res.json(await bookingService.cancelBooking(id)); } catch (e) { next(e); }
}

async function confirmBookingHandler(req, res, next) {
  try {
    const id = req.params.id;
    const result = await bookingService.confirmBooking(id);
    res.json(result);
  } catch (e) { next(e); }
}

async function freeSeatsHandler(req, res, next) {
  try {
    const tripId = req.params.tripId;
    const data = await bookingService.getFreeSeats(tripId);
    res.json(data);
  } catch (e) { next(e); }
}

module.exports = { createBookingHandler, listBookingsByTripHandler, cancelBookingHandler };
