const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');
const ctrl = require('../controllers/bot.controller');

router.use(auth);

// sync bot users to users table (manager+)
router.post('/sync', role('manager'), ctrl.syncHandler);

module.exports = router;
