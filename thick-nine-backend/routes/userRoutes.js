// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth'); // Matches your auth middleware name in server.js

// PUT /api/users/profile
router.put('/profile', auth, userController.updateUserProfile);

module.exports = router;