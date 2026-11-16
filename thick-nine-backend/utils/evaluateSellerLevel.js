// utils/evaluateSellerLevel.js
// Auto-promote freelancer User.level from real order + profile metrics.
// Only promotes upward; never demotes.
// Levels: "New Seller" | "Level 1" | "Level 2" | "Top Rated"

const User = require("../models/User");
const Order = require("../models/Order");

const LEVEL_ORDER = ["New Seller", "Level 1", "Level 2", "Top Rated"];

/**
 * Thresholds — keep in sync with freelancer-dashboard Status Scale UI.
 * Adjust here when product changes the ladder.
 */
const RULES = {
  "Level 1": {
    minCompleted: 5,
    minEarnings: 100,
    minRating: 0,
    minResponseRate: 0,
    minOnTime: 0,
  },
  "Level 2": {
    minCompleted: 25,
    minEarnings: 1000,
    minRating: 4.5,
    minResponseRate: 90,
    minOnTime: 0,
  },
  "Top Rated": {
    minCompleted: 50,
    minEarnings: 0,
    minRating: 4.8,
    minResponseRate: 95,
    minOnTime: 90,
  },
};

function rankOf(level) {
  const i = LEVEL_ORDER.indexOf(level);
  return i >= 0 ? i : 0;
}

function meets(stats, rule) {
  if (stats.completed < rule.minCompleted) return false;
  if (stats.earnings < rule.minEarnings) return false;
  if (rule.minRating > 0 && stats.rating < rule.minRating) return false;
  if (rule.minResponseRate > 0 && stats.responseRate < rule.minResponseRate)
    return false;
  if (rule.minOnTime > 0 && stats.onTime < rule.minOnTime) return false;
  return true;
}

/**
 * @param {string|import("mongoose").Types.ObjectId} sellerId
 * @returns {Promise<{
 *   changed: boolean,
 *   previous: string,
 *   level: string,
 *   stats: object,
 *   reason?: string
 * }>}
 */
async function evaluateSellerLevel(sellerId) {
  if (!sellerId) {
    return {
      changed: false,
      previous: "New Seller",
      level: "New Seller",
      stats: {},
      reason: "no_seller",
    };
  }

  const user = await User.findById(sellerId);
  if (!user) {
    return {
      changed: false,
      previous: "New Seller",
      level: "New Seller",
      stats: {},
      reason: "not_found",
    };
  }

  const previous = LEVEL_ORDER.includes(user.level) ? user.level : "New Seller";

  const completedOrders = await Order.find({
    sellerId: user._id,
    status: "completed",
  })
    .select("sellerEarnings buyerRating deliveredAt dueAt createdAt")
    .lean();

  const completed = completedOrders.length;
  const earnings = completedOrders.reduce(
    (s, o) => s + (Number(o.sellerEarnings) || 0),
    0
  );

  const rated = completedOrders.filter(
    (o) => o.buyerRating != null && !Number.isNaN(Number(o.buyerRating))
  );
  let rating = Number(user.averageRating) || 0;
  if (rated.length > 0) {
    rating =
      rated.reduce((s, o) => s + Number(o.buyerRating), 0) / rated.length;
  }

  const responseRate = Number(user.metrics?.responseRate);
  const responseRateSafe = Number.isFinite(responseRate) ? responseRate : 100;

  // On-time: share of completed with deliveredAt <= dueAt (when dueAt exists)
  let onTimeSamples = 0;
  let onTimeHits = 0;
  completedOrders.forEach((o) => {
    if (!o.deliveredAt || !o.dueAt) return;
    onTimeSamples += 1;
    if (new Date(o.deliveredAt) <= new Date(o.dueAt)) onTimeHits += 1;
  });
  let onTime =
    onTimeSamples > 0
      ? Math.round((onTimeHits / onTimeSamples) * 1000) / 10
      : Number(user.metrics?.onTimeDelivery);
  if (!Number.isFinite(onTime)) onTime = 100;

  const stats = {
    completed,
    earnings: Math.round(earnings * 100) / 100,
    rating: Math.round(rating * 100) / 100,
    responseRate: responseRateSafe,
    onTime,
    reviews: rated.length,
  };

  // Highest tier whose rules are fully met
  let achieved = "New Seller";
  if (meets(stats, RULES["Level 1"])) achieved = "Level 1";
  if (meets(stats, RULES["Level 2"])) achieved = "Level 2";
  if (meets(stats, RULES["Top Rated"])) achieved = "Top Rated";

  // Sync denormalized counters (safe even when level unchanged)
  user.completedOrders = completed;
  if (rated.length > 0) {
    user.averageRating = stats.rating;
    user.totalReviews = rated.length;
  }
  if (!user.metrics) user.metrics = {};
  user.metrics.onTimeDelivery = onTime;
  if (user.metrics.totalEarnings == null || user.metrics.totalEarnings < stats.earnings) {
    user.metrics.totalEarnings = stats.earnings;
  }

  const changed = rankOf(achieved) > rankOf(previous);
  if (changed) {
    user.level = achieved;
  }

  await user.save();

  if (changed) {
    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        userId: user._id,
        type: "seller_level_up",
        title: "Level up!",
        message: `Congratulations — you reached ${achieved}. Keep delivering great work.`,
        link: "/freelancer-dashboard",
        read: false,
      });
    } catch (_) {
      /* optional */
    }
  }

  return {
    changed,
    previous,
    level: changed ? achieved : previous,
    stats,
  };
}

module.exports = { evaluateSellerLevel, LEVEL_ORDER, RULES };
