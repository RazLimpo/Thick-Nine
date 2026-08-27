// models/AffiliateCommissionConfig.js

const mongoose = require('mongoose');

const AffiliateCommissionConfigSchema = new mongoose.Schema(
  {
    platformFeePercentage: {
      type: Number,
      default: 0.15, // 15% seller fee
    },
    buyerFeePercentage: {
      type: Number,
      default: 0.05, // 5% buyer service fee
    },
    defaultAffiliateCutRate: {
      type: Number,
      default: 0.10, // 10% of gross admin revenue goes to affiliate
    },
    minimumPayoutAmount: {
      type: Number,
      default: 50, // $50 minimum payout threshold
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AffiliateCommissionConfig', AffiliateCommissionConfigSchema);