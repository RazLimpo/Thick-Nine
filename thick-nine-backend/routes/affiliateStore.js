// routes/affiliateStore.js
// Mounted at: app.use("/api/affiliate/store", affiliateStoreRouter)
// Canonical path: user.affiliateProfile.storeConfig (also mirrors top-level storeConfig)

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const User = require("../models/User");

function ensureStore(user) {
  if (!user.affiliateProfile) user.affiliateProfile = {};
  if (!user.affiliateProfile.storeConfig) user.affiliateProfile.storeConfig = {};
  if (!user.storeConfig) user.storeConfig = {};
  return user.affiliateProfile.storeConfig;
}

// POST /api/affiliate/store/video
router.post("/video", authMiddleware, async (req, res) => {
  try {
    const { videoUrl, featuredVideoUrl } = req.body || {};
    const url = videoUrl != null ? videoUrl : featuredVideoUrl;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const cfg = ensureStore(user);
    cfg.featuredVideoUrl = url || "";
    // keep legacy top-level in sync for any old readers
    user.storeConfig.featuredVideoUrl = cfg.featuredVideoUrl;

    await user.save();
    return res.json({
      success: true,
      msg: "Video URL saved successfully",
      featuredVideoUrl: cfg.featuredVideoUrl,
      storeConfig: cfg,
    });
  } catch (err) {
    console.error("Error saving store video:", err);
    return res
      .status(500)
      .json({ success: false, msg: "Server error saving video" });
  }
});

// POST /api/affiliate/store/services
router.post("/services", authMiddleware, async (req, res) => {
  try {
    const { services } = req.body || {};

    if (!Array.isArray(services)) {
      return res
        .status(400)
        .json({ success: false, msg: "Services payload must be an array" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const cfg = ensureStore(user);
    cfg.pinnedServices = services.map((s, index) => ({
      serviceId: s.serviceId || s.id || s._id,
      displayOrder:
        typeof s.displayOrder === "number" ? s.displayOrder : index,
    }));
    user.storeConfig.pinnedServices = cfg.pinnedServices;

    await user.save();
    return res.json({
      success: true,
      msg: "Handpicked services saved successfully",
      pinnedServices: cfg.pinnedServices,
      storeConfig: cfg,
    });
  } catch (err) {
    console.error("Error saving handpicked services:", err);
    return res
      .status(500)
      .json({ success: false, msg: "Server error saving services" });
  }
});

module.exports = router;
