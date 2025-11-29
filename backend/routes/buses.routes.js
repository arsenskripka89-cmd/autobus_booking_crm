const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const ctrl = require('../controllers/bus.controller');

router.use(auth);
router.get('/', role('manager'), ctrl.listBusesHandler);
router.post('/', role('manager'), ctrl.createBusHandler);
router.get('/:id', role('manager'), ctrl.getBusHandler);
router.put('/:id', role('manager'), ctrl.updateBusHandler);
router.delete('/:id', role('manager'), ctrl.deleteBusHandler);

module.exports = router;
