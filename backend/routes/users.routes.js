const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const roleMiddleware = require('../middleware/role.middleware');
const userController = require('../controllers/user.controller');

// Protected endpoints
router.use(auth);

// Current user endpoints (authenticated)
router.get('/me', userController.getMeHandler);
router.put('/me', userController.updateMeHandler);

// List users (admin, manager)
router.get('/', roleMiddleware('manager'), userController.listUsersHandler);

// Create user (admin, manager)
router.post('/', roleMiddleware('manager'), userController.createUserHandler);

// Get user
router.get('/:id', roleMiddleware('manager'), userController.getUserHandler);

// Update user
router.put('/:id', roleMiddleware('manager'), userController.updateUserHandler);

// Delete user
router.delete('/:id', roleMiddleware('manager'), userController.deleteUserHandler);

// Change password: allowed for self or admin
router.post('/:id/password', (req, res, next) => {
	// middleware: must be authenticated (auth applied on router), then run controller
	next();
}, userController.changePasswordHandler);

module.exports = router;
