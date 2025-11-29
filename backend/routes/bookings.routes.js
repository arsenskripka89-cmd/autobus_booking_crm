const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const ctrl = require('../controllers/booking.controller');

router.use(auth);

// create booking (any logged user can create booking)
router.post('/', ctrl.createBookingHandler);

// list bookings by trip (manager)
router.get('/trip/:tripId', role('manager'), ctrl.listBookingsByTripHandler);

// list passengers by trip - allowed for drivers and managers
router.get('/passengers/:tripId', role(['driver','manager']), ctrl.listBookingsByTripHandler);

// confirm booking
router.post('/:id/confirm', role('manager'), ctrl.confirmBookingHandler);

// free seats for a trip (any authenticated user)
router.get('/trip/:tripId/seats', role(['manager','driver']), ctrl.freeSeatsHandler);

// cancel booking
router.post('/:id/cancel', role('manager'), ctrl.cancelBookingHandler);

module.exports = router;
