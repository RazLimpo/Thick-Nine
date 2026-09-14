//routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth'); 
const User = require('../models/User'); // Import User model
const Admin = require('../models/Admin');

// 1. Initial Quick Signup (Called by Header.tsx - fires verification email)
router.post('/finalize-account', authController.finalizeAccount);

// 2. Account Login
router.post('/login', authController.login);

// 3. Email Verification Link Handler (Triggered by the inbox button click)
router.post('/verify-email', authController.verifyEmail);

// 4. Resend Verification Request (Protected by your token validation middleware)
router.get('/resend-verification', auth, authController.resendVerification);



// 5. Super Admin Bootstrap / Promotion Endpoint
router.post('/promote-admin', async (req, res) => {
  try {
    const { email, secretKey } = req.body;

    const configuredKey = process.env.ADMIN_SECRET_KEY;

    if (!configuredKey) {
      return res.status(500).json({
        success: false,
        message: 'Admin bootstrap is not configured on the server.',
      });
    }

    if (!secretKey || secretKey !== configuredKey) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Invalid secret key',
      });
    }

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    const configuredBootstrapEmail =
      process.env.SUPER_ADMIN_BOOTSTRAP_EMAIL?.toLowerCase().trim();

    if (!configuredBootstrapEmail) {
      return res.status(500).json({
        success: false,
        message: 'Super Admin bootstrap email is not configured.',
      });
    }

    if (normalizedEmail !== configuredBootstrapEmail) {
      return res.status(403).json({
        success: false,
        message: 'This account is not authorized for Super Admin promotion.',
      });
    }
    

    // Find the existing marketplace account.
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User with this email was not found',
      });
    }

    // Find the corresponding Admin identity.
    let admin = await Admin.findOne({ email: normalizedEmail });

    // If no Admin identity exists, create one.
    if (!admin) {
      const crypto = require('crypto');

      const internalAdminPassword = crypto
        .randomBytes(32)
        .toString('hex');

      admin = await Admin.create({
        name: user.fullName || user.displayName || normalizedEmail,
        email: normalizedEmail,
        password: internalAdminPassword,
        role: 'super_admin',
        permissions: ['*'],
        isActive: true,
      });
    } else {
      // Existing Admin identity: upgrade it to Super Admin.
      admin.role = 'super_admin';
      admin.permissions = ['*'];
      admin.isActive = true;

      await admin.save();
    }

    // Promote the existing marketplace User account.
    user.role = 'admin';
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Account successfully promoted to Super Admin.',
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
      },
      admin: {
        id: admin._id,
        email: admin.email,
        role: admin.role,
        permissions: admin.permissions,
        isActive: admin.isActive,
      },
    });

  } catch (err) {
    console.error('Super Admin promotion error:', err);

    return res.status(500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  }
});

module.exports = router;