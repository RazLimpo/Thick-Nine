// models/Transaction.js
// Affiliate commissions + seller (freelancer) escrow withdrawals

const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "commission",
        "solo_fee_share",
        "group_promo",
        "withdrawal",
        "referral_bonus",
        "payout",
        "earning",
        "fee",
        "refund",
      ],
      default: "commission",
      required: true,
      index: true,
    },

    source: {
      type: String,
      enum: [
        "solo_fee_share",
        "group_promo",
        "referral_bonus",
        "withdrawal",
        "seller_escrow",
        "other",
      ],
      default: "other",
      index: true,
    },

    payoutType: {
      type: String,
      enum: ["seller_escrow", "affiliate_wallet", null],
      default: null,
      index: true,
    },

    payoutMethod: {
      type: String,
      enum: ["payoneer", "bank", "momo", "mpesa", "other", ""],
      default: "",
    },

    payoneerEmail: { type: String, default: "" },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    fee: {
      type: Number,
      default: 0,
      min: 0,
    },

    net: {
      type: Number,
      default: null,
    },

    commissionRate: { type: Number, default: null },
    commissionableFee: { type: Number, default: null },
    orderTotal: { type: Number, default: null },

    status: {
      type: String,
      enum: [
        "pending",
        "pending_payoneer",
        "completed",
        "paid",
        "failed",
        "cancelled",
        "reversed",
      ],
      default: "completed",
      index: true,
    },

    description: { type: String, default: "" },
    note: { type: String, default: "" },
    referenceId: { type: String, default: "" },

    idempotencyKey: {
      type: String,
      default: null,
      sparse: true,
    },
  },
  { timestamps: true }
);

TransactionSchema.index({ affiliateId: 1, type: 1, status: 1, createdAt: -1 });
TransactionSchema.index({ userId: 1, type: 1, payoutType: 1, createdAt: -1 });
TransactionSchema.index(
  { idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $type: "string" } },
  }
);

module.exports =
  (mongoose.models && mongoose.models.Transaction) ||
  mongoose.model("Transaction", TransactionSchema);
