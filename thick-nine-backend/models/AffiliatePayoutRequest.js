// models/AffiliatePayoutRequest.js
const mongoose = require("mongoose");

const AffiliatePayoutRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: { type: Number, required: true, min: 1 },
    currency: { type: String, default: "USD" },
    method: {
      type: String,
      enum: ["Payoneer", "Bank", "None"],
      default: "Payoneer",
    },
    /** Snapshot of payout destination at request time */
    destination: {
      email: { type: String, default: "" },
      accountName: { type: String, default: "" },
      bankName: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "approved", "paid", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    note: { type: String, default: "", maxlength: 500 },
    adminNote: { type: String, default: "", maxlength: 500 },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AffiliatePayoutRequestSchema.index({ user: 1, createdAt: -1 });

module.exports =
  (mongoose.models && mongoose.models.AffiliatePayoutRequest) ||
  mongoose.model("AffiliatePayoutRequest", AffiliatePayoutRequestSchema);
