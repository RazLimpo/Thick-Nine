// routes/servicesRoutes.js

const express = require("express");
const router = express.Router();
const Service = require("../models/Service");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

// GET /api/services/locations
// Returns distinct locations of sellers who have active services
router.get("/locations", async (req, res) => {
  try {
    const activeSellerIds = await Service.distinct("sellerId", { status: "active" });

    const users = await User.find(
      { _id: { $in: activeSellerIds } },
      "location"
    ).lean();

    const uniqueLocations = new Set();

    users.forEach((user) => {
      if (!user.location) return;

      const city = user.location.city?.trim();
      const country = user.location.country?.trim();

      let locationStr = "";
      if (city && country) {
        locationStr = `${city}, ${country}`;
      } else if (city || country) {
        locationStr = city || country;
      }

      if (locationStr) {
        uniqueLocations.add(locationStr);
      }
    });

    const locations = Array.from(uniqueLocations)
      .sort((a, b) => a.localeCompare(b))
      .map((loc) => ({ label: loc, value: loc }));

    res.json({ locations });
  } catch (error) {
    console.error("Error fetching filter locations:", error);
    res.status(500).json({ message: "Failed to fetch filter locations" });
  }
});

// POST /api/services/publish
router.post("/publish", authMiddleware, async (req, res) => {
  try {
    const { draftId } = req.body;
    const userId = req.user?.id || req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized. User session not found." });
    }

    // Fetch user and draft from DB
    const user = await User.findById(userId);
    const draft = await Service.findOne({ _id: draftId, sellerId: userId });

    if (!draft) {
      return res.status(404).json({ message: "Service draft not found." });
    }

    const requestedPlan = draft.selectedPlan || "free";

    // Check active subscription plan
    const hasActiveSubscription =
      user.subscription &&
      user.subscription.currentPlan === requestedPlan &&
      (!user.subscription.expiresAt || new Date(user.subscription.expiresAt) > new Date());

    if (requestedPlan !== "free" && !hasActiveSubscription) {
      return res.status(402).json({
        message: `You do not have an active ${requestedPlan.toUpperCase()} subscription. Please complete checkout to upgrade.`,
        requiresCheckout: true,
        redirectUrl: `/checkout/plan?plan=${requestedPlan}&draftId=${draftId}`,
      });
    }

    // Enforce Media Limits using User Model Schema Method
    const canAddImages = user.canUploadMedia("images", draft.images?.length || 0);
    const canAddVideos = user.canUploadMedia("videos", draft.videos?.length || 0);
    const canAddAudio = user.canUploadMedia("audio", draft.audio?.length || 0);

    if (!canAddImages || !canAddVideos || !canAddAudio) {
      return res.status(422).json({
        message: `Your draft exceeds the allowed media uploads for your current plan.`,
      });
    }

    // Publish service
    draft.status = "active";
    await draft.save();

    return res.status(200).json({
      success: true,
      message: "Service published successfully!",
      serviceId: draft._id,
    });
  } catch (error) {
    console.error("Publish error:", error);
    return res.status(500).json({ message: "Server error during publishing." });
  }
});

module.exports = router;