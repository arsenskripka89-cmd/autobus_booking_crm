const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const ctrl = require('../controllers/broadcast.controller');

router.use(auth);
router.post('/', role('manager'), ctrl.sendBroadcastHandler);

module.exports = router;
