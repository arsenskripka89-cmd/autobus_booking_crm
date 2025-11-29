const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const ctrl = require('../controllers/trip.controller');

router.use(auth);
router.get('/', role('manager'), ctrl.listTripsHandler);
router.post('/', role('manager'), ctrl.createTripHandler);
router.post('/generate', role('manager'), ctrl.generateTripsHandler);
router.get('/:id/seats', role(['manager','driver']), ctrl.getSeatsHandler);
router.get('/:id', role('manager'), ctrl.getTripHandler);
router.put('/:id', role('manager'), ctrl.updateTripHandler);
router.delete('/:id', role('manager'), ctrl.deleteTripHandler);

module.exports = router;
