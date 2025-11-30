const express = require('express');
const router = express.Router();
const controller = require('../controllers/broadcast.controller');
const auth = require('../middleware/auth');
const role = require('../middleware/role.middleware');

router.use(auth);
router.post('/telegram', role('manager'), controller.sendTelegram);
router.post('/viber', role('manager'), controller.sendViber);

module.exports = router;
