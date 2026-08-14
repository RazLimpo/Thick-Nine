// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const auth = require('../middleware/auth'); // Matches your auth middleware name in server.js

// PUT /api/users/profile
router.put('/profile', auth, userController.updateUserProfile);

/* ===========================================================
   AFFILIATE DASHBOARD ROUTES
   =========================================================== */

// GET /api/users/affiliate/me
router.get('/affiliate/me', auth, userController.getAffiliateProfile);

// GET /api/users/affiliate/stats
router.get('/affiliate/stats', auth, userController.getAffiliateStats);

// GET /api/users/affiliate/earnings
router.get('/affiliate/earnings', auth, userController.getAffiliateEarnings);

// PUT /api/users/affiliate/store
router.put('/affiliate/store', auth, userController.updateAffiliateStore);

// GET /api/users/affiliate/store/:affiliateId (Public Route - No auth required)
router.get('/affiliate/store/:affiliateId', userController.getPublicAffiliateStore);

// POST /api/users/affiliate/prestige/add-points
router.post('/affiliate/prestige/add-points', auth, userController.addPrestigePoints);

module.exports = router;