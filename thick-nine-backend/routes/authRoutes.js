//routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth'); 
const User = require('../models/User'); // Import User model

// 1. Initial Quick Signup (Called by Header.tsx - fires verification email)
router.post('/finalize-account', authController.finalizeAccount);

// 2. Account Login
router.post('/login', authController.login);

// 3. Email Verification Link Handler (Triggered by the inbox button click)
router.post('/verify-email', authController.verifyEmail);

// 4. Resend Verification Request (Protected by your token validation middleware)
router.get('/resend-verification', auth, authController.resendVerification);

// 5. Admin Elevation Endpoint
router.post('/promote-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;
    const configuredKey = process.env.ADMIN_SECRET_KEY || "fe62ffdfa61542b2";

    if (!secretKey || secretKey !== configuredKey) {
      return res.status(403).json({ success: false, message: "Forbidden: Invalid secret key" });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User with this email was not found" });
    }

    return res.status(200).json({
      success: true,
      message: `User ${email} has been successfully promoted to admin!`,
      user: { id: user._id, email: user.email, role: user.role }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Internal Server Error" });
  }
});

module.exports = router;