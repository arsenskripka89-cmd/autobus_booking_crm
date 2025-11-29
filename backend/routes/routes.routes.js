const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const ctrl = require('../controllers/route.controller');

router.use(auth);
router.get('/', role('manager'), ctrl.listRoutesHandler);
router.post('/', role('manager'), ctrl.createRouteHandler);
router.get('/:id', role('manager'), ctrl.getRouteHandler);
router.put('/:id', role('manager'), ctrl.updateRouteHandler);
router.delete('/:id', role('manager'), ctrl.deleteRouteHandler);

module.exports = router;
