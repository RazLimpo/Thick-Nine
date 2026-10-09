// routes/userRoutes.js — full profile + upload (merge into existing)

const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Profile
router.get("/profile", auth, userController.getUserProfile);
router.put("/profile", auth, userController.updateUserProfile);
router.patch("/profile", auth, userController.updateUserProfile);

// Media upload (avatar, cover, portfolio)
router.post(
  "/upload",
  auth,
  upload.single("file"),
  userController.uploadProfileMedia
);

/* ===========================================================
   AFFILIATE DASHBOARD ROUTES
   =========================================================== */
router.get("/affiliate/me", auth, userController.getAffiliateProfile);
router.get("/affiliate/stats", auth, userController.getAffiliateStats);
router.get("/affiliate/earnings", auth, userController.getAffiliateEarnings);
router.put("/affiliate/store", auth, userController.updateAffiliateStore);
router.get(
  "/affiliate/store/:affiliateId",
  userController.getPublicAffiliateStore
);
router.post(
  "/affiliate/prestige/add-points",
  auth,
  userController.addPrestigePoints
);

module.exports = router;
