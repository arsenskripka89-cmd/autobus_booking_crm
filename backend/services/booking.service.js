const bookingModel = require('../models/booking.model');
const tripModel = require('../models/trip.model');
const busModel = require('../models/bus.model');
const logger = require('../config/logger');

// Book a seat for a trip. If seat_number not provided, pick the first free seat.
async function bookSeat({ trip_id, passenger_name, passenger_phone, seat_number }) {
  const trip = await tripModel.findById(trip_id);
  if (!trip) throw new Error('Trip not found');
  const bus = await busModel.findById(trip.bus_id);
  if (!bus) throw new Error('Bus not found');
  const seats = bus.seats_count || 50;

  const existing = await bookingModel.listByTrip(trip_id);
  const occupied = new Set(existing.map(b => b.seat_number));

  if (seat_number) {
    if (occupied.has(seat_number)) throw new Error('Seat already taken');
    if (seat_number < 1 || seat_number > seats) throw new Error('Invalid seat number');
  } else {
    // find first free seat
    seat_number = null;
    for (let s = 1; s <= seats; s++) {
      if (!occupied.has(s)) { seat_number = s; break; }
    }
    if (!seat_number) throw new Error('No seats available');
  }

  const result = await bookingModel.createBooking({ trip_id, passenger_name, passenger_phone, seat_number });
  logger.info('Booked seat', { trip_id, seat_number, passenger: passenger_name });
  return { id: result.id, trip_id, seat_number };
}

async function listBookingsByTrip(trip_id) {
  return bookingModel.listByTrip(trip_id);
}

async function cancelBooking(id) {
  await bookingModel.updateStatus(id, 'cancelled');
  logger.info('Cancelled booking', { id });
  return { id };
}

async function confirmBooking(id) {
  await bookingModel.updateStatus(id, 'confirmed');
  logger.info('Confirmed booking', { id });
  return { id };
}

async function getFreeSeats(trip_id) {
  const trip = await tripModel.findById(trip_id);
  if (!trip) throw new Error('Trip not found');
  const bus = await busModel.findById(trip.bus_id);
  if (!bus) throw new Error('Bus not found');
  const seats = bus.seats_count || 50;
  const bookings = await bookingModel.listByTrip(trip_id);
  const occupied = bookings.filter(b => b.status !== 'cancelled').map(b => b.seat_number);
  const free = [];
  for (let s = 1; s <= seats; s++) if (!occupied.includes(s)) free.push(s);
  return { seats_total: seats, occupied, free };
}

module.exports = { bookSeat, listBookingsByTrip, cancelBooking };
