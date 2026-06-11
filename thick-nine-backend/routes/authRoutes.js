const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Route for Registration
router.post('/register', authController.register);

// Route for Login (Uncomment this now)
router.post('/login', authController.login);

// Route for Finalizing Account Onboarding (Paste it here)
router.post('/finalize-account', authController.finalizeAccount);

// Route for verifying email token via inbox link click
router.post('/verify-email', authController.verifyEmail);

module.exports = router;