// models/Transaction.js

const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
        "other",
      ],
      default: "solo_fee_share",
      index: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    commissionRate: {
      type: Number,
      default: null,
    },
    commissionableFee: {
      type: Number,
      default: null,
    },
    orderTotal: {
      type: Number,
      default: null,
    },

    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled", "reversed"],
      default: "completed",
      index: true,
    },

    description: {
      type: String,
      default: "",
    },

    referenceId: {
      type: String,
      default: "",
    },

    idempotencyKey: {
      type: String,
      default: null,
      sparse: true,
    },
  },
  {
    timestamps: true,
  }
);

TransactionSchema.index({ affiliateId: 1, type: 1, status: 1, createdAt: -1 });
TransactionSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } }
);

module.exports =
  (mongoose.models && mongoose.models.Transaction) ||
  mongoose.model("Transaction", TransactionSchema);
