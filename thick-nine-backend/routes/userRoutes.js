// routes/userRoutes.js — profile section (merge into your existing file)

const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

// GET /api/users/profile  — load current user for settings page
router.get("/profile", auth, userController.getUserProfile);

// PUT /api/users/profile  — update profile / payout / settings / legal
router.put("/profile", auth, userController.updateUserProfile);

// Optional alias used by some clients
router.patch("/profile", auth, userController.updateUserProfile);

/* ===========================================================
   AFFILIATE DASHBOARD ROUTES (keep your existing ones)
   =========================================================== */

router.get("/affiliate/me", auth, userController.getAffiliateProfile);
router.get("/affiliate/stats", auth, userController.getAffiliateStats);
router.get("/affiliate/earnings", auth, userController.getAffiliateEarnings);
router.put("/affiliate/store", auth, userController.updateAffiliateStore);
router.get("/affiliate/store/:affiliateId", userController.getPublicAffiliateStore);
router.post("/affiliate/prestige/add-points", auth, userController.addPrestigePoints);

module.exports = router;
