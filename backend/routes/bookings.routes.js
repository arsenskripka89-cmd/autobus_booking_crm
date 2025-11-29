const express = require('express');
const router = express.Router();
const controller = require('../controllers/booking.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role.middleware');

router.use(auth);

router.post('/', controller.create);
router.get('/:tripId/available', controller.available);
router.get('/:tripId', role('manager'), controller.listByTrip);
router.delete('/:id', role('manager'), controller.cancel);

module.exports = router;
