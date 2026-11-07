// controllers/userController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

/* ===========================================================
   AFFILIATE REWARDS (rank badge + 90-day commission rate)
   Prefer utils/affiliateRewards.js; fallbacks if missing.
   =========================================================== */
let rewards = null;
try {
  rewards = require("../utils/affiliateRewards");
} catch (_) {
  rewards = null;
}

/** Authority rank — lifetime confirmed commissions (badge only) */
const FALLBACK_RANK_THRESHOLDS = [
  { rank: "Bronze", minLifetime: 0, badge: "Rising Marketer" },
  { rank: "Silver", minLifetime: 100, badge: "Proven Promoter" },
  { rank: "Gold", minLifetime: 500, badge: "Growth Catalyst" },
  { rank: "Platinum", minLifetime: 2500, badge: "Authority Partner" },
  { rank: "Diamond", minLifetime: 10000, badge: "Apex Affiliate" },
];

/** @deprecated kept name for any external require of calculateTierProgress */
const TIER_THRESHOLDS = FALLBACK_RANK_THRESHOLDS.map((t) => ({
  tier: t.rank,
  targetEarnings: t.minLifetime,
  badge: t.badge,
}));

function getRankFromLifetime(lifetime) {
  if (rewards && typeof rewards.getRank === "function") {
    return rewards.getRank(lifetime);
  }
  const value = Math.max(0, Number(lifetime) || 0);
  let current = FALLBACK_RANK_THRESHOLDS[0];
  let next = FALLBACK_RANK_THRESHOLDS[1] || FALLBACK_RANK_THRESHOLDS[0];
  for (let i = FALLBACK_RANK_THRESHOLDS.length - 1; i >= 0; i--) {
    if (value >= FALLBACK_RANK_THRESHOLDS[i].minLifetime) {
      current = FALLBACK_RANK_THRESHOLDS[i];
      next = FALLBACK_RANK_THRESHOLDS[i + 1] || FALLBACK_RANK_THRESHOLDS[i];
      break;
    }
  }
  return {
    rank: current.rank,
    badge: current.badge,
    nextRank: next.rank,
    nextMinLifetime: next.minLifetime,
    lifetimeConfirmed: value,
    progressToNext:
      next.minLifetime <= current.minLifetime
        ? 1
        : Math.min(
            1,
            Math.max(
              0,
              (value - current.minLifetime) /
                (next.minLifetime - current.minLifetime)
            )
          ),
  };
}

function ranksForUi() {
  if (rewards && Array.isArray(rewards.RANK_THRESHOLDS)) {
    return rewards.RANK_THRESHOLDS.map((t) => ({
      name: t.rank,
      target: t.minLifetime,
      badge: t.badge,
    }));
  }
  return FALLBACK_RANK_THRESHOLDS.map((t) => ({
    name: t.rank,
    target: t.minLifetime,
    badge: t.badge,
  }));
}

/** 90-day attributed completed subtotals for rate tier */
async function sales90dFor(affiliateId) {
  if (!mongoose.Types.ObjectId.isValid(String(affiliateId))) return 0;
  try {
    const Order = require("../models/Order");
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const rows = await Order.aggregate([
      {
        $match: {
          affiliateId: new mongoose.Types.ObjectId(String(affiliateId)),
          status: "completed",
          updatedAt: { $gte: since },
        },
      },
      { $group: { _id: null, total: { $sum: "$subtotal" } } },
    ]);
    return Number(rows[0]?.total) || 0;
  } catch (e) {
    console.error("sales90dFor:", e.message);
    return 0;
  }
}

function rateFromSales90d(sales90d) {
  if (rewards && typeof rewards.getCommissionRate === "function") {
    return rewards.getCommissionRate(sales90d);
  }
  const sales = Math.max(0, Number(sales90d) || 0);
  const tiers = [
    { id: "starter", label: "Starter", min: 0, rate: 0.25 },
    { id: "growth", label: "Growth", min: 500, rate: 0.3 },
    { id: "pro", label: "Pro", min: 2000, rate: 0.35 },
    { id: "elite", label: "Elite", min: 5000, rate: 0.4 },
    { id: "top", label: "Top", min: 15000, rate: 0.5 },
  ];
  let tier = tiers[0];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (sales >= tiers[i].min) {
      tier = tiers[i];
      break;
    }
  }
  const idx = tiers.findIndex((t) => t.id === tier.id);
  const next = tiers[idx + 1] || null;
  return {
    rate: tier.rate,
    tierId: tier.id,
    tierLabel: tier.label,
    minSales90d: tier.min,
    sales90d: sales,
    nextTierId: next?.id || null,
    nextTierLabel: next?.label || null,
    nextMinSales90d: next?.min || null,
    nextRate: next?.rate || null,
  };
}

/** Legacy helper — rank only (not commission %) */
const calculateTierProgress = (totalEarnings) => {
  const r = getRankFromLifetime(totalEarnings);
  return {
    currentTier: r.rank,
    prestigeBadge: r.badge,
    tierTargetEarnings: r.nextMinLifetime,
    nextTier: r.nextRank,
  };
};

/**
 * COMPATIBILITY HELPER: formatUserPayload
 * Ensures user responses consistently deliver complete metadata required by Next.js.
 * Includes client-settings flattened fields.
 */
const formatUserPayload = (user) => {
  const userObj = user.toObject ? user.toObject() : user;
  const userAvatar = userObj.avatar || userObj.profilePicture || "";
  const userProfilePicture = userObj.profilePicture || userObj.avatar || "";
  const cp = userObj.clientPreferences || {};
  const settings = userObj.settings || {};

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
    tagline: userObj.tagline || "",
    bio: userObj.bio || "",
    skills: userObj.skills || [],
    languages: userObj.languages || [],
    education: userObj.education || [],
    onlineStatus: userObj.onlineStatus || "offline",
    availability: userObj.availability || "Full-Time",
    location: userObj.location || { country: "", city: "" },
    payoutDetails: userObj.payoutDetails || {},
    settings,
    legalBusinessName: userObj.legalBusinessName || "",
    taxId: userObj.taxId || "",
    portfolio: userObj.portfolio || [],
    skillMedia: userObj.skillMedia || [],
    twoFactorEnabled: Boolean(userObj.twoFactorEnabled),
    level: userObj.level,
    memberSince: userObj.memberSince,
    source: userObj.affiliateProfile?.source || "direct",

    clientPreferences: cp,
    preferredSkills: cp.preferredSkills || [],
    projectTypes: cp.projectTypes || [],
    preferredProjectType: cp.preferredProjectType || "fixed",
    projectScale: cp.projectScale || "medium",
    keyRequirements: cp.keyRequirements || "",
    timezone: cp.timezone || "gmt",
    contactPref: cp.contactPref || "messaging",
    minBudget: cp.minBudget ?? 0,
    maxBudget: cp.maxBudget ?? 0,
    escrowPref: cp.escrowPref || "always",
    profileVisibility: settings.publicProfile !== false,
    orderVisibility: cp.orderVisibility !== false,
    notifications: {
      emailOrders: settings.emailNotifications !== false,
      appOrders: settings.smsNotifications !== false,
      marketing: settings.marketingEmails === true,
      emailMessages: settings.emailNotifications !== false,
      orderRequests: settings.smsNotifications !== false,
      promotional: settings.marketingEmails === true,
    },
  };
};

function uid(req) {
  return req.user?.id || req.user?._id;
}

/* ===========================================================
   PROFILE — GET / PUT  (Freelancer Settings + Client Settings)
   =========================================================== */

/**
 * @route   GET /api/users/profile
 * @desc    Load authenticated user profile for settings pages
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
    return res
      .status(500)
      .json({ message: "Server error while loading profile." });
  }
};

/**
 * @route   PUT /api/users/profile  (also PATCH)
 * @desc    Update authenticated user profile, payout, settings, legal, client prefs
 * @access  Private (Requires JWT auth middleware)
 */
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized." });
    }

    const needsPassword = !!(req.body && req.body.newPassword);
    const user = needsPassword
      ? await User.findById(userId).select("+password")
      : await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User account not found." });
    }

    const body = req.body || {};

    if (body.fullName != null) user.fullName = String(body.fullName).trim();
    if (body.displayName != null) {
      user.displayName = String(body.displayName).trim();
    }
    if (body.gender != null) user.gender = body.gender;
    if (body.role != null) user.role = body.role;
    if (body.referralCode != null) {
      user.referralCode = String(body.referralCode).trim();
    }

    if (body.professionalTitle != null) {
      user.professionalTitle = String(body.professionalTitle).trim();
    }
    if (body.tagline != null) {
      user.tagline = String(body.tagline).trim().slice(0, 150);
    }
    if (body.bio != null) {
      user.bio = String(body.bio).slice(0, 500);
    }
    if (body.avatar != null && !String(body.avatar).startsWith("data:")) {
      user.avatar = body.avatar;
    }
    if (
      body.coverImage != null &&
      !String(body.coverImage).startsWith("data:")
    ) {
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

    if (body.location != null) {
      if (typeof body.location === "string") {
        const parts = body.location
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean);
        user.location = user.location || {};
        if (parts.length >= 2) {
          user.location.city = parts[0];
          user.location.country = parts.slice(1).join(", ");
        } else if (parts[0]) {
          user.location.city = parts[0];
        }
      } else if (typeof body.location === "object") {
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
    }

    if (!user.clientPreferences) user.clientPreferences = {};
    const cp = user.clientPreferences;

    if (Array.isArray(body.preferredSkills)) {
      cp.preferredSkills = body.preferredSkills
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
    if (Array.isArray(body.projectTypes)) {
      cp.projectTypes = body.projectTypes
        .map((s) => String(s).trim())
        .filter(Boolean);
    }
    if (body.preferredProjectType != null) {
      cp.preferredProjectType = String(body.preferredProjectType).trim();
    }
    if (body.projectScale != null) {
      const ps = String(body.projectScale);
      if (["small", "medium", "large", ""].includes(ps)) cp.projectScale = ps;
    }
    if (body.keyRequirements != null) {
      cp.keyRequirements = String(body.keyRequirements).trim();
    }
    if (body.timezone != null) {
      cp.timezone = String(body.timezone).trim();
    }
    if (body.contactPref != null) {
      const c = String(body.contactPref);
      if (["messaging", "email", "both"].includes(c)) cp.contactPref = c;
    }
    if (body.minBudget != null) {
      const n = Number(body.minBudget);
      if (!Number.isNaN(n) && n >= 0) cp.minBudget = n;
    }
    if (body.maxBudget != null) {
      const n = Number(body.maxBudget);
      if (!Number.isNaN(n) && n >= 0) cp.maxBudget = n;
    }
    if (body.escrowPref != null) {
      const e = String(body.escrowPref);
      if (["always", "sometimes", "never"].includes(e)) cp.escrowPref = e;
    }
    if (body.orderVisibility != null) {
      cp.orderVisibility = !!body.orderVisibility;
    }
    user.clientPreferences = cp;

    if (body.legalBusinessName != null) {
      user.legalBusinessName = String(body.legalBusinessName).trim();
    }
    if (body.taxId != null) {
      user.taxId = String(body.taxId).trim();
    }

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
        if (["Payoneer", "Bank", "M-Pesa", "None"].includes(method)) {
          user.payoutDetails.method = method;
        } else if (
          ["Payoneer", "Bank", "M-Pesa", "None"].includes(String(pay.method))
        ) {
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

    if (!user.settings) user.settings = {};

    if (body.profileVisibility != null) {
      user.settings.publicProfile = !!body.profileVisibility;
    }

    const notif = body.notifications || body.settings;
    if (notif && typeof notif === "object") {
      if (
        notif.emailNotifications != null ||
        notif.emailMessages != null ||
        notif.emailOrders != null
      ) {
        user.settings.emailNotifications = !!(
          notif.emailNotifications ??
          notif.emailMessages ??
          notif.emailOrders
        );
      }
      if (
        notif.smsNotifications != null ||
        notif.orderRequests != null ||
        notif.appOrders != null
      ) {
        user.settings.smsNotifications = !!(
          notif.smsNotifications ??
          notif.orderRequests ??
          notif.appOrders
        );
      }
      if (
        notif.marketingEmails != null ||
        notif.promotional != null ||
        notif.marketing != null
      ) {
        user.settings.marketingEmails = !!(
          notif.marketingEmails ??
          notif.promotional ??
          notif.marketing
        );
      }
      if (notif.publicProfile != null) {
        user.settings.publicProfile = !!notif.publicProfile;
      }
      if (notif.showOnlineStatus != null) {
        user.settings.showOnlineStatus = !!notif.showOnlineStatus;
      }
    }

    if (Array.isArray(body.portfolio)) {
      user.portfolio = body.portfolio
        .map((item) => ({
          title: String(item.title || "").trim().slice(0, 120),
          image: String(item.image || "").trim(),
          url: String(item.url || "").trim(),
        }))
        .filter((item) => item.title || item.image || item.url)
        .slice(0, 30);
    }

    if (Array.isArray(body.skillMedia)) {
      user.skillMedia = body.skillMedia
        .map((item) => ({
          title: String(item.title || "").trim().slice(0, 120),
          url: String(item.url || "").trim(),
          type: ["video", "audio", "image", "link"].includes(item.type)
            ? item.type
            : "link",
        }))
        .filter((item) => item.url)
        .slice(0, 20);
    }

    if (typeof body.twoFactorEnabled === "boolean") {
      user.twoFactorEnabled = body.twoFactorEnabled;
    }

    if (body.newPassword) {
      if (!body.currentPassword) {
        return res
          .status(400)
          .json({ message: "Current password is required." });
      }
      if (!user.password) {
        return res.status(400).json({
          message: "Password change is not available for this account.",
        });
      }
      const ok = await bcrypt.compare(
        String(body.currentPassword),
        user.password
      );
      if (!ok) {
        return res
          .status(400)
          .json({ message: "Current password is incorrect." });
      }
      if (String(body.newPassword).length < 8) {
        return res
          .status(400)
          .json({ message: "New password must be at least 8 characters." });
      }
      user.password = await bcrypt.hash(String(body.newPassword), 10);
    }

    if (
      user.bio ||
      user.professionalTitle ||
      user.displayName ||
      (user.skills && user.skills.length)
    ) {
      user.isProfileComplete = true;
    } else if (body.isProfileComplete === true || body.fullName) {
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
 * Rank (badge) = lifetime confirmed commissions
 * Rate (%) = 90-day attributed sales → share of seller platform fee only
 */
exports.getAffiliateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const lifetime =
      user.wallet?.lifetimeEarnings || user.metrics?.totalEarnings || 0;
    const rankInfo = getRankFromLifetime(lifetime);
    const sales90d = await sales90dFor(user._id);
    const rateInfo = rateFromSales90d(sales90d);
    const tiersForUi = ranksForUi();

    if (!user.affiliateProfile) user.affiliateProfile = {};
    user.affiliateProfile.currentTier = rankInfo.rank;
    user.affiliateProfile.tierTargetEarnings = rankInfo.nextMinLifetime;
    user.affiliateProfile.prestigeBadge = rankInfo.badge;
    await user.save();

    res.json({
      success: true,
      affiliateId: user._id,
      referralCode: user.referralCode,
      role: user.role,
      tierInfo: {
        currentTier: rankInfo.rank,
        nextTier: rankInfo.nextRank,
        tierTargetEarnings: rankInfo.nextMinLifetime,
        prestigeBadge: rankInfo.badge,
        currentEarnings: lifetime,
        progressToNext: rankInfo.progressToNext,
        tiers: tiersForUi,
      },
      tiers: tiersForUi,
      commissionRateInfo: {
        rate: rateInfo.rate,
        ratePercent: Math.round((rateInfo.rate || 0) * 100),
        tierId: rateInfo.tierId,
        tierLabel: rateInfo.tierLabel,
        sales90d: rateInfo.sales90d,
        nextTierLabel: rateInfo.nextTierLabel,
        nextMinSales90d: rateInfo.nextMinSales90d,
        nextRatePercent: rateInfo.nextRate
          ? Math.round(rateInfo.nextRate * 100)
          : null,
        base: "seller_platform_fee",
        note:
          "Your commission rate is a share of the freelancer platform fee only (not the buyer fee). Group-tracked sales also pay the freelancer promo pool on top of this rate.",
      },
      affiliateProfile: user.affiliateProfile,
      wallet: {
        availableBalance: user.wallet?.availableBalance || 0,
        pendingBalance: user.wallet?.pendingBalance || 0,
        lifetimeEarnings: lifetime,
      },
    });
  } catch (err) {
    console.error("Error fetching affiliate profile:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   GET /api/users/affiliate/stats
 */
exports.getAffiliateStats = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    const sales90d = await sales90dFor(user._id);
    const rateInfo = rateFromSales90d(sales90d);

    res.json({
      success: true,
      metrics: user.metrics || {},
      analytics: user.analytics || {},
      lifetimeClicks: user.affiliateProfile?.lifetimeClicks || 0,
      conversionRate: user.affiliateProfile?.conversionRate || 0,
      sales90d: rateInfo.sales90d ?? sales90d,
      commissionRate: rateInfo.rate,
      commissionRatePercent: Math.round((rateInfo.rate || 0) * 100),
      commissionTierLabel: rateInfo.tierLabel,
    });
  } catch (err) {
    console.error("Error fetching affiliate stats:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   GET /api/users/affiliate/earnings
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

    const lifetime =
      user.wallet?.lifetimeEarnings || user.metrics?.totalEarnings || 0;
    const rankInfo = getRankFromLifetime(lifetime);

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
      prestigeBadge:
        user.affiliateProfile?.prestigeBadge || rankInfo.badge || "Rising Marketer",
      currentTier:
        user.affiliateProfile?.currentTier || rankInfo.rank || "Bronze",
    });
  } catch (err) {
    console.error("Error fetching public store config:", err);
    res.status(500).send("Server Error");
  }
};

/**
 * @route   POST /api/users/affiliate/prestige/add-points
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

/* ===========================================================
   PROFILE MEDIA UPLOAD (Cloudinary)
   =========================================================== */
const cloudinary = require("cloudinary").v2;

function ensureCloudinary() {
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  if (!cloudinary.config().cloud_name) {
    const err = new Error("Cloudinary is not configured.");
    err.code = "CLOUDINARY_MISSING";
    throw err;
  }
}

/**
 * @route   POST /api/users/upload
 * @desc    Upload avatar / cover / portfolio media to Cloudinary
 * @access  Private — multipart field "file", optional "kind"
 */
exports.uploadProfileMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No file uploaded." });
    }

    ensureCloudinary();

    const mime = req.file.mimetype || "";
    const isImage = mime.startsWith("image/");
    const isVideo = mime.startsWith("video/");
    if (!isImage && !isVideo) {
      return res.status(400).json({
        success: false,
        message: "Only image or video files are allowed for profile media.",
      });
    }

    const max = isImage ? 5 * 1024 * 1024 : 20 * 1024 * 1024;
    if (req.file.size > max) {
      return res.status(400).json({
        success: false,
        message: isImage ? "Image max 5MB." : "Video max 20MB.",
      });
    }

    const kind = String(req.body?.kind || "avatar");
    const folder =
      kind === "cover"
        ? "thick-nine/covers"
        : kind === "portfolio" || kind === "media"
          ? "thick-nine/portfolio"
          : "thick-nine/avatars";

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: isImage ? "image" : "video",
          use_filename: true,
          unique_filename: true,
          overwrite: false,
          ...(isImage ? { quality: "auto", fetch_format: "auto" } : {}),
        },
        (err, uploaded) => (err ? reject(err) : resolve(uploaded))
      );
      stream.end(req.file.buffer);
    });

    return res.status(200).json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
      kind,
    });
  } catch (error) {
    console.error("uploadProfileMedia error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Upload failed.",
    });
  }
};
