const express = require('express');
const router = express.Router();
const controller = require('../controllers/user.controller');
const auth = require('../middleware/auth.middleware');
const role = require('../middleware/role.middleware');

router.use(auth);

router.get('/', role('manager'), controller.list);
router.get('/:id', role('manager'), controller.get);
router.post('/', role('admin'), controller.create);
router.put('/:id', role('admin'), controller.update);
router.delete('/:id', role('admin'), controller.remove);

module.exports = router;
