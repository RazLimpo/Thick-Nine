const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for Registration
router.post('/register', authController.register);

// Route for Login (Uncomment this now)
router.post('/login', authController.login);

module.exports = router;