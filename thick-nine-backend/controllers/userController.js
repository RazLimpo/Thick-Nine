// controllers/userController.js
const User = require("../models/User");

/* ===========================================================
   TIER & PRESTIGE GAMIFICATION LOGIC
   =========================================================== */
const TIER_THRESHOLDS = [
  { tier: "Bronze", targetEarnings: 1000, badge: "Rising Marketer" },
  { tier: "Silver", targetEarnings: 5000, badge: "Proven Promoter" },
  { tier: "Gold", targetEarnings: 15000, badge: "Growth Catalyst" },
  { tier: "Platinum", targetEarnings: 50000, badge: "Authority Partner" },
  { tier: "Diamond", targetEarnings: 100000, badge: "Apex Affiliate" },
];

const calculateTierProgress = (totalEarnings) => {
  let currentTier = TIER_THRESHOLDS[0];
  let nextTier = TIER_THRESHOLDS[1];

  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalEarnings >= TIER_THRESHOLDS[i].targetEarnings) {
      currentTier = TIER_THRESHOLDS[i];
      nextTier = TIER_THRESHOLDS[i + 1] || TIER_THRESHOLDS[i];
      break;
    }
  }

  return {
    currentTier: currentTier.tier,
    prestigeBadge: currentTier.badge,
    tierTargetEarnings: nextTier.targetEarnings,
    nextTier: nextTier.tier,
  };
};

/**
 * COMPATIBILITY HELPER: formatUserPayload
 * Ensures user responses consistently deliver complete metadata required by Next.js.
 */
const formatUserPayload = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const userAvatar = userObj.avatar || userObj.profilePicture || "";
  const userProfilePicture = userObj.profilePicture || userObj.avatar || "";

  return {
    id: userObj._id?.toString(),
    _id: userObj._id?.toString(),
    fullName: userObj.fullName,
    displayName: userObj.displayName || userObj.fullName,
    username: userObj.username,
    email: userObj.email,
    gender: userObj.gender,
    role: userObj.role || "client",
    planType: userObj.planType || "free",
    accountStrength: userObj.accountStrength || 80,
    isEmailVerified: Boolean(userObj.isEmailVerified),
    isProfileComplete: Boolean(userObj.isProfileComplete),
    avatar: userAvatar,
    profilePicture: userProfilePicture,
    coverImage: userObj.coverImage || "",
    professionalTitle: userObj.professionalTitle || "",
    bio: userObj.bio || "",
    skills: userObj.skills || [],
    languages: userObj.languages || [],
    education: userObj.education || [],
    onlineStatus: userObj.onlineStatus || "offline",
    availability: userObj.availability || "Full-Time",
    location: userObj.location || { country: "", city: "" },
    payoutDetails: userObj.payoutDetails || {},
    settings: userObj.settings || {},
    legalBusinessName: userObj.legalBusinessName || "",
    taxId: userObj.taxId || "",
    level: userObj.level,
    memberSince: userObj.memberSince,
    source: userObj.affiliateProfile?.source || "direct",
  };
};

function uid(req) {
  return req.user?.id || req.user?._id;
}

/* ===========================================================
   PROFILE — GET / PUT  (Freelancer Settings + general)
   =========================================================== */

/**
 * @route   GET /api/users/profile
 * @desc    Load authenticated user profile for settings page
 * @access  Private
 */
exports.getUserProfile = async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await User.findById(userId).select(
      "-password -verificationToken"
    );
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    return res.status(200).json({
      success: true,
      user: formatUserPayload(user),
    });
  } catch (err) {
    console.error("getUserProfile Error:", err);
    return res.status(500).json({ message: "Server error while loading profile." });
  }
};

/**
 * @route   PUT /api/users/profile  (also PATCH)
 * @desc    Update authenticated user profile, payout, settings, legal
 * @access  Private (Requires JWT auth middleware)
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const body = req.body || {};

    // --- Identity / basic (legacy + settings) ---
    if (body.fullName != null) user.fullName = String(body.fullName).trim();
    if (body.displayName != null) {
      user.displayName = String(body.displayName).trim();
    }
    if (body.gender != null) user.gender = body.gender;
    if (body.role != null) user.role = body.role;
    if (body.referralCode != null) {
      user.referralCode = String(body.referralCode).trim();
    }

    // --- Profile content ---
    if (body.professionalTitle != null) {
      user.professionalTitle = String(body.professionalTitle).trim();
    }
    if (body.bio != null) {
      user.bio = String(body.bio).slice(0, 500);
    }
    if (body.avatar != null && !String(body.avatar).startsWith("data:")) {
      user.avatar = body.avatar;
    }
    if (body.coverImage != null && !String(body.coverImage).startsWith("data:")) {
      user.coverImage = body.coverImage;
    }
    if (body.onlineStatus != null) {
      const s = String(body.onlineStatus).toLowerCase();
      if (["online", "away", "offline"].includes(s)) {
        user.onlineStatus = s;
      }
    }
    if (body.availability != null) {
      user.availability = String(body.availability).trim();
    }
    if (Array.isArray(body.skills)) {
      user.skills = body.skills.map((s) => String(s).trim()).filter(Boolean);
    }
    if (Array.isArray(body.languages)) {
      user.languages = body.languages
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
    if (typeof body.education === "string" && body.education.trim()) {
      user.education = [
        { school: body.education.trim(), degree: "", year: "" },
      ];
    } else if (Array.isArray(body.education)) {
      user.education = body.education;
    }

    // --- Location ---
    if (body.location && typeof body.location === "object") {
      user.location = {
        country:
          body.location.country != null
            ? String(body.location.country)
            : user.location?.country || "",
        city:
          body.location.city != null
            ? String(body.location.city)
            : user.location?.city || "",
      };
    }

    // --- Legal ---
    if (body.legalBusinessName != null) {
      user.legalBusinessName = String(body.legalBusinessName).trim();
    }
    if (body.taxId != null) {
      user.taxId = String(body.taxId).trim();
    }

    // --- Payout (payoutDetails or payout alias) ---
    const pay = body.payoutDetails || body.payout;
    if (pay && typeof pay === "object") {
      if (!user.payoutDetails) user.payoutDetails = {};

      let method = pay.method;
      if (method != null) {
        const m = String(method).toLowerCase();
        if (m === "payoneer" || m === "paypal") method = "Payoneer";
        else if (m === "bank") method = "Bank";
        else if (m === "m-pesa" || m === "mpesa") method = "M-Pesa";
        else if (m === "none") method = "None";
        // Allow enum values as-is if already correct
        if (["Payoneer", "Bank", "M-Pesa", "None"].includes(method)) {
          user.payoutDetails.method = method;
        } else if (["Payoneer", "Bank", "M-Pesa", "None"].includes(String(pay.method))) {
          user.payoutDetails.method = String(pay.method);
        }
      }

      if (pay.accountEmail != null || pay.payoneerEmail != null) {
        user.payoutDetails.accountEmail = String(
          pay.accountEmail || pay.payoneerEmail || ""
        ).trim();
      }
      if (pay.accountName != null) {
        user.payoutDetails.accountName = String(pay.accountName).trim();
      }
      if (pay.bankName != null) {
        user.payoutDetails.bankName = String(pay.bankName).trim();
      }
      if (pay.bankCountry != null) {
        user.payoutDetails.bankCountry = String(pay.bankCountry).trim();
      }
      if (pay.routingNumber != null) {
        user.payoutDetails.routingNumber = String(pay.routingNumber).trim();
      }
      if (pay.accountNumber != null) {
        user.payoutDetails.accountNumber = String(pay.accountNumber).trim();
      }
      if (pay.schedule === "automatic" || pay.schedule === "manual") {
        user.payoutDetails.schedule = pay.schedule;
      }
    }

    // --- Settings / notifications ---
    const notif = body.settings || body.notifications;
    if (notif && typeof notif === "object") {
      if (!user.settings) user.settings = {};
      if (notif.emailNotifications != null || notif.emailMessages != null) {
        user.settings.emailNotifications = !!(
          notif.emailNotifications ?? notif.emailMessages
        );
      }
      if (notif.smsNotifications != null || notif.orderRequests != null) {
        user.settings.smsNotifications = !!(
          notif.smsNotifications ?? notif.orderRequests
        );
      }
      if (notif.marketingEmails != null || notif.promotional != null) {
        user.settings.marketingEmails = !!(
          notif.marketingEmails ?? notif.promotional
        );
      }
      if (notif.publicProfile != null) {
        user.settings.publicProfile = !!notif.publicProfile;
      }
      if (notif.showOnlineStatus != null) {
        user.settings.showOnlineStatus = !!notif.showOnlineStatus;
      }
    }

    // Profile complete flag
    if (
      user.bio ||
      user.professionalTitle ||
      (user.skills && user.skills.length)
    ) {
      user.isProfileComplete = true;
    } else if (body.isProfileComplete === true || body.fullName) {
      // Legacy mandatory flow often only sent fullName
      user.isProfileComplete = true;
    }

    if (typeof user.calculateStrength === "function") {
      user.calculateStrength();
    } else if (body.referralCode) {
      user.accountStrength = 85;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: formatUserPayload(user),
    });
  } catch (err) {
    console.error("Update Profile Error:", err);
    return res
      .status(500)
      .json({ message: "Server error while updating profile." });
  }
};

/* ===========================================================
   AFFILIATE DASHBOARD CONTROLLERS
   =========================================================== */

/**
 * @route   GET /api/users/affiliate/me
 * @desc    Get current user affiliate profile, ranks, and store settings
 * @access  Private
 */
exports.getAffiliateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const earnings =
      user.wallet?.lifetimeEarnings || user.metrics?.totalEarnings || 0;
    const tierData = calculateTierProgress(earnings);

    if (!user.affiliateProfile) user.affiliateProfile = {};
    user.affiliateProfile.currentTier = tierData.currentTier;
    user.affiliateProfile.tierTargetEarnings = tierData.tierTargetEarnings;
    user.affiliateProfile.prestigeBadge = tierData.prestigeBadge;

    await user.save();

    res.json({
      success: true,
      affiliateId: user._id,
      referralCode: user.referralCode,
      role: user.role,
      tierInfo: {
        currentTier: tierData.currentTier,
        nextTier: tierData.nextTier,
        tierTargetEarnings: tierData.tierTargetEarnings,
        prestigeBadge: tierData.prestigeBadge,
        currentEarnings: earnings,
      },
      affiliateProfile: user.affiliateProfile,
    });
  } catch (err) {
    console.error("Error fetching affiliate profile:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   GET /api/users/affiliate/stats
 * @desc    Get affiliate metrics, clicks, and conversions
 * @access  Private
 */
exports.getAffiliateStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      success: true,
      metrics: user.metrics || {},
      analytics: user.analytics || {},
      lifetimeClicks: user.affiliateProfile?.lifetimeClicks || 0,
      conversionRate: user.affiliateProfile?.conversionRate || 0,
    });
  } catch (err) {
    console.error("Error fetching affiliate stats:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   GET /api/users/affiliate/earnings
 * @desc    Get wallet balances and payout details
 * @access  Private
 */
exports.getAffiliateEarnings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    res.json({
      success: true,
      wallet: user.wallet || {},
      payoutDetails: user.payoutDetails || {},
    });
  } catch (err) {
    console.error("Error fetching affiliate earnings:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   PUT /api/users/affiliate/store
 * @desc    Update affiliate store settings (video, description, pinned services)
 * @access  Private
 */
exports.updateAffiliateStore = async (req, res) => {
  try {
    const { storeTitle, storeDescription, featuredVideoUrl, pinnedServices } =
      req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    if (!user.affiliateProfile) {
      user.affiliateProfile = {};
    }
    if (!user.affiliateProfile.storeConfig) {
      user.affiliateProfile.storeConfig = {};
    }

    if (storeTitle !== undefined)
      user.affiliateProfile.storeConfig.storeTitle = storeTitle;
    if (storeDescription !== undefined)
      user.affiliateProfile.storeConfig.storeDescription = storeDescription;
    if (featuredVideoUrl !== undefined)
      user.affiliateProfile.storeConfig.featuredVideoUrl = featuredVideoUrl;
    if (pinnedServices !== undefined)
      user.affiliateProfile.storeConfig.pinnedServices = pinnedServices;

    await user.save();

    res.json({
      success: true,
      message: "Store configuration updated successfully",
      storeConfig: user.affiliateProfile.storeConfig,
    });
  } catch (err) {
    console.error("Error updating affiliate store config:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   GET /api/users/affiliate/store/:affiliateId
 * @desc    Get public storefront profile & config by Affiliate User ID or Username
 * @access  Public
 */
exports.getPublicAffiliateStore = async (req, res) => {
  try {
    const { affiliateId } = req.params;

    let user;
    if (affiliateId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(affiliateId).select("-password");
    } else {
      user = await User.findOne({
        $or: [
          { username: affiliateId.toLowerCase() },
          { referralCode: affiliateId },
        ],
      }).select("-password");
    }

    if (!user) {
      return res
        .status(404)
        .json({ success: false, msg: "Affiliate store not found" });
    }

    res.json({
      success: true,
      storeOwner: {
        id: user._id,
        fullName: user.fullName,
        displayName: user.displayName || user.fullName,
        avatar: user.avatar,
        coverImage: user.coverImage,
        bio: user.bio,
        referralCode: user.referralCode,
      },
      storeConfig: user.affiliateProfile?.storeConfig || {},
      prestigeBadge: user.affiliateProfile?.prestigeBadge || "Rising Marketer",
      currentTier: user.affiliateProfile?.currentTier || "Bronze",
    });
  } catch (err) {
    console.error("Error fetching public store config:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   POST /api/users/affiliate/prestige/add-points
 * @desc    Accrue prestige points for affiliate actions and calculate level ups
 * @access  Private
 */
exports.addPrestigePoints = async (req, res) => {
  try {
    const { points, action } = req.body;
    const pointValue = Number(points) || 0;

    if (pointValue <= 0) {
      return res
        .status(400)
        .json({ success: false, msg: "Invalid points value" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    if (!user.affiliateProfile) user.affiliateProfile = {};

    const currentPoints =
      (user.affiliateProfile.prestigePoints || 0) + pointValue;
    user.affiliateProfile.prestigePoints = currentPoints;

    const newPrestigeLevel = Math.floor(currentPoints / 500) + 1;
    const leveledUp =
      newPrestigeLevel > (user.affiliateProfile.prestigeLevel || 1);
    user.affiliateProfile.prestigeLevel = newPrestigeLevel;

    await user.save();

    res.json({
      success: true,
      message: leveledUp
        ? `Prestige Level Up! You reached Level ${newPrestigeLevel}`
        : `Added ${pointValue} Prestige Points (${action || "General Activity"})`,
      prestigeLevel: newPrestigeLevel,
      prestigePoints: currentPoints,
      leveledUp,
    });
  } catch (err) {
    console.error("Error adding prestige points:", err);
    res.status(500).send("Server Error");
  }
};
