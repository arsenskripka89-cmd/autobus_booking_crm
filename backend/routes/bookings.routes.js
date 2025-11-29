const express = require('express');
const router = express.Router();
const controller = require('../controllers/booking.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role.middleware');

router.post('/', controller.create);
router.get('/:tripId/available', controller.available);
router.get('/:tripId', auth, role('manager'), controller.listByTrip);
router.delete('/:id', auth, role('manager'), controller.cancel);

module.exports = router;
