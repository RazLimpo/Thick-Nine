// controllers/userController.js
const User = require('../models/User');

/* ===========================================================
   TIER & PRESTIGE GAMIFICATION LOGIC
   =========================================================== */
const TIER_THRESHOLDS = [
  { tier: "Bronze", targetEarnings: 1000, badge: "Rising Marketer" },
  { tier: "Silver", targetEarnings: 5000, badge: "Proven Promoter" },
  { tier: "Gold", targetEarnings: 15000, badge: "Growth Catalyst" },
  { tier: "Platinum", targetEarnings: 50000, badge: "Authority Partner" },
  { tier: "Diamond", targetEarnings: 100000, badge: "Apex Affiliate" }
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
    nextTier: nextTier.tier
  };
};

/**
 * COMPATIBILITY HELPER: formatUserPayload
 * Ensures user responses consistently deliver complete metadata required by Next.js.
 */
const formatUserPayload = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const userAvatar = userObj.avatar || userObj.profilePicture || '';
  const userProfilePicture = userObj.profilePicture || userObj.avatar || '';

  return {
    id: userObj._id?.toString(),
    fullName: userObj.fullName,
    displayName: userObj.displayName || userObj.fullName,
    username: userObj.username,
    email: userObj.email,
    gender: userObj.gender,
    role: userObj.role || 'client',
    planType: userObj.planType || 'free',
    accountStrength: userObj.accountStrength || 80,
    isEmailVerified: Boolean(userObj.isEmailVerified),
    isProfileComplete: Boolean(userObj.isProfileComplete),
    avatar: userAvatar,
    profilePicture: userProfilePicture,
    location: userObj.location || { country: '', city: '' },
    // ADD THIS LINE:
    source: userObj.affiliateProfile?.source || 'direct'
  };
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update authenticated user profile
 * @access  Private (Requires JWT auth middleware)
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const { fullName, gender, role, location, referralCode } = req.body;

    // Merge incoming update fields
    if (fullName) user.fullName = fullName.trim();
    if (gender) user.gender = gender;
    if (role) user.role = role;
    if (referralCode) user.referralCode = referralCode.trim();

    // Safely update location
    if (location) {
      user.location = {
        country: location.country || user.location?.country || '',
        city: location.city || user.location?.city || ''
      };
    }

    user.isProfileComplete = true;

    // Recalculate account strength if method exists
    if (typeof user.calculateStrength === 'function') {
      user.calculateStrength();
    } else {
      user.accountStrength = referralCode ? 85 : 80;
    }

    await user.save();

    const formattedUser = formatUserPayload(user);

    return res.status(200).json({
      message: "Profile updated successfully",
      user: formattedUser
    });

  } catch (err) {
    console.error("Update Profile Error:", err);
    return res.status(500).json({ message: "Server error while updating profile." });
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
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        // Auto-calculate tier progress based on lifetime earnings
        const earnings = user.wallet?.lifetimeEarnings || user.metrics?.totalEarnings || 0;
        const tierData = calculateTierProgress(earnings);

        // Sync with user's affiliateProfile
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
                currentEarnings: earnings
            },
            affiliateProfile: user.affiliateProfile
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
            conversionRate: user.affiliateProfile?.conversionRate || 0
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
            payoutDetails: user.payoutDetails || {}
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
        const { storeTitle, storeDescription, featuredVideoUrl, pinnedServices } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: "User not found" });
        }

        // Initialize affiliateProfile if missing
        if (!user.affiliateProfile) {
            user.affiliateProfile = {};
        }
        if (!user.affiliateProfile.storeConfig) {
            user.affiliateProfile.storeConfig = {};
        }

        // Update provided store settings
        if (storeTitle !== undefined) user.affiliateProfile.storeConfig.storeTitle = storeTitle;
        if (storeDescription !== undefined) user.affiliateProfile.storeConfig.storeDescription = storeDescription;
        if (featuredVideoUrl !== undefined) user.affiliateProfile.storeConfig.featuredVideoUrl = featuredVideoUrl;
        if (pinnedServices !== undefined) user.affiliateProfile.storeConfig.pinnedServices = pinnedServices;

        await user.save();

        res.json({
            success: true,
            message: "Store configuration updated successfully",
            storeConfig: user.affiliateProfile.storeConfig
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
            user = await User.findById(affiliateId).select('-password');
        } else {
            user = await User.findOne({ 
                $or: [{ username: affiliateId.toLowerCase() }, { referralCode: affiliateId }] 
            }).select('-password');
        }

        if (!user) {
            return res.status(404).json({ success: false, msg: "Affiliate store not found" });
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
                referralCode: user.referralCode
            },
            storeConfig: user.affiliateProfile?.storeConfig || {},
            prestigeBadge: user.affiliateProfile?.prestigeBadge || "Rising Marketer",
            currentTier: user.affiliateProfile?.currentTier || "Bronze"
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
            return res.status(400).json({ success: false, msg: "Invalid points value" });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, msg: "User not found" });
        }

        if (!user.affiliateProfile) user.affiliateProfile = {};

        // Accrue points
        const currentPoints = (user.affiliateProfile.prestigePoints || 0) + pointValue;
        user.affiliateProfile.prestigePoints = currentPoints;

        // Formula: 1 Prestige Level for every 500 points
        const newPrestigeLevel = Math.floor(currentPoints / 500) + 1;
        const leveledUp = newPrestigeLevel > (user.affiliateProfile.prestigeLevel || 1);
        user.affiliateProfile.prestigeLevel = newPrestigeLevel;

        await user.save();

        res.json({
            success: true,
            message: leveledUp ? `Prestige Level Up! You reached Level ${newPrestigeLevel}` : `Added ${pointValue} Prestige Points (${action || 'General Activity'})`,
            prestigeLevel: newPrestigeLevel,
            prestigePoints: currentPoints,
            leveledUp
        });
    } catch (err) {
        console.error("Error adding prestige points:", err);
        res.status(500).send("Server Error");
    }
};