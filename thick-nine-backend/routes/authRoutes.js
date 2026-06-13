const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth'); 

// 1. Initial Quick Signup (Called by Header.tsx - fires verification email)
router.post('/finalize-account', authController.finalizeAccount);

// 2. Account Login
router.post('/login', authController.login);

// 3. Email Verification Link Handler (Triggered by the inbox button click)
router.post('/verify-email', authController.verifyEmail);

// 4. Resend Verification Request (Protected by your token validation middleware)
router.get('/resend-verification', auth, authController.resendVerification);

module.exports = router;