const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// This matches the "Submit" action on your Registration Modal
router.post('/register', authController.register);

// We will add the login route next
// router.post('/login', authController.login);

module.exports = router;