const express = require('express');
const router = express.Router();
const { loginHandler } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

router.post('/login', loginHandler);

// get current user info
router.get('/me', authMiddleware, (req, res) => {
	res.json({ user: req.user });
});

module.exports = router;
