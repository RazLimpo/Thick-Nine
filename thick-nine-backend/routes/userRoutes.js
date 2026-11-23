// routes/userRoutes.js — full profile + upload + public profile + affiliate

const express = require("express");
const router = express.Router();
const multer = require("multer");
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const User = require("../models/User");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// ---------------------------------------------------------------------------
// Profile (authenticated)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Affiliate dashboard
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Public profile (NO email) — used by /client-profile/[id] and freelancer-clients modal
// IMPORTANT: register BEFORE any generic /:id catch-all
// ---------------------------------------------------------------------------
router.get("/:id/public", async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select(
        [
          "fullName",
          "displayName",
          "tagline",
          "bio",
          "avatar",
          "profilePicture",
          "coverImage",
          "location",
          "timezone",
          "languages",
          "preferredSkills",
          "projectTypes",
          "preferredProjectType",
          "projectScale",
          "keyRequirements",
          "contactPref",
          "minBudget",
          "maxBudget",
          "escrowPref",
          "profileVisibility",
          "orderVisibility",
          "twoFactorEnabled",
          "isVerified",
          "emailVerified",
          "onlineStatus",
          "memberSince",
          "createdAt",
          "role",
        ].join(" ")
      )
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    // Soft-hide if profileVisibility is explicitly false
    if (user.profileVisibility === false) {
      return res.status(403).json({
        success: false,
        message: "This profile is not public.",
      });
    }

    const loc = user.location;
    const location =
      typeof loc === "string"
        ? loc
        : loc
          ? [loc.city, loc.country].filter(Boolean).join(", ")
          : "";

    return res.json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        displayName: user.displayName || user.fullName,
        tagline: user.tagline || "",
        bio: user.bio || "",
        avatar: user.avatar || user.profilePicture || "/default-avatar.png",
        coverImage: user.coverImage || "",
        location,
        timezone: user.timezone || "",
        languages: user.languages || [],
        preferredSkills: user.preferredSkills || [],
        projectTypes: user.projectTypes || [],
        preferredProjectType: user.preferredProjectType || "fixed",
        projectScale: user.projectScale || "",
        keyRequirements: user.keyRequirements || "",
        contactPref: user.contactPref || "messaging",
        minBudget: user.minBudget ?? null,
        maxBudget: user.maxBudget ?? null,
        escrowPref: user.escrowPref || "always",
        twoFactorEnabled: !!user.twoFactorEnabled,
        isVerified: !!(user.isVerified || user.emailVerified),
        onlineStatus: user.onlineStatus || "offline",
        memberSince: user.memberSince || user.createdAt,
        role: user.role,
      },
    });
  } catch (e) {
    console.error("GET /api/users/:id/public", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to load profile.",
    });
  }
});

module.exports = router;
