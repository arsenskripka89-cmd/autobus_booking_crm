const express = require('express');
const router = express.Router();
const controller = require('../controllers/trip.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role.middleware');

router.use(auth);
router.get('/', role('manager'), controller.list);
router.get('/:id', role('manager'), controller.get);
router.post('/', role('manager'), controller.create);
router.post('/generate', role('manager'), controller.generate);
router.put('/:id', role('manager'), controller.update);
router.delete('/:id', role('manager'), controller.remove);
router.get('/:id/passengers', role('driver'), controller.passengers);

module.exports = router;
