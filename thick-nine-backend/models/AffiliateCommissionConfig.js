// models/AffiliateCommissionConfig.js
// Policy document — rates also live in utils/affiliateRewards.js as code defaults.
// DB row can override fee % and flags without a redeploy.

const mongoose = require("mongoose");

const AffiliateCommissionConfigSchema = new mongoose.Schema(
  {
    /** Seller (freelancer) platform fee as fraction of subtotal */
    platformFeePercentage: {
      type: Number,
      default: 0.15,
      min: 0,
      max: 1,
    },
    /** Buyer service fee as fraction of subtotal — NOT part of affiliate base */
    buyerFeePercentage: {
      type: Number,
      default: 0.05,
      min: 0,
      max: 1,
    },

    /**
     * Legacy flat cut (deprecated).
     * Solo commission now uses 90-day tiers in utils/affiliateRewards.js
     * (25%–50% of seller platform fee only). Kept for migration/read fallback.
     */
    defaultAffiliateCutRate: {
      type: Number,
      default: 0.25,
      min: 0,
      max: 1,
    },

    /** When true, checkout uses tiered rate from affiliateRewards */
    useTieredAffiliateRates: {
      type: Boolean,
      default: true,
    },

    minimumPayoutAmount: {
      type: Number,
      default: 50,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports =
  (mongoose.models && mongoose.models.AffiliateCommissionConfig) ||
  mongoose.model("AffiliateCommissionConfig", AffiliateCommissionConfigSchema);
