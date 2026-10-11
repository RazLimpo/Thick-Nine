// models/Order.js

const mongoose = require("mongoose");

const DeliveryFileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true }, // final asset
    previewUrl: { type: String, default: null }, // watermarked / safe preview
    name: { type: String, default: "" },
    mime: { type: String, default: "" },
  },
  { _id: false }
);

const OrderSchema = new mongoose.Schema(
  {
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    affiliateCode: {
      type: String,
      default: null,
    },

    requirements: {
      type: String,
      default: "",
    },

    lastReminderAt: { type: Date, default: null },
    deliveryNote: { type: String, default: "" },
    // Final + optional preview; buyer only gets finals after completed
    deliveryFiles: { type: [DeliveryFileSchema], default: [] },
    deliveredAt: { type: Date, default: null },

    extensionRequest: {
      proposedDate: { type: Date, default: null },
      reason: { type: String, default: "" },
      requestedAt: { type: Date, default: null },
      status: {
        type: String,
        enum: ["none", "pending", "approved", "rejected"],
        default: "none",
      },
    },

    dueAt: { type: Date, default: null },

    basePackagePrice: { type: Number, required: true },
    selectedAddons: [{ title: String, price: Number }],
    subtotal: { type: Number, required: true },

    buyerServiceFee: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    sellerPlatformFee: { type: Number, required: true },
    sellerEarnings: { type: Number, required: true },

    grossAdminRevenue: { type: Number, required: true },
    affiliateCommission: { type: Number, default: 0 },
    netAdminProfit: { type: Number, required: true },

    paymentMethod: {
      type: String,
      enum: ["card", "paypal"],
      default: "card",
    },
    status: {
      type: String,
      enum: [
        "pending",
        "in_escrow",
        "revision_requested",
        "completed",
        "cancelled",
        "disputed",
      ],
      default: "pending",
      index: true,
    },
    escrowReleaseDate: { type: Date, default: null },

    // Dispute (buyer)
    disputeReason: { type: String, default: "", maxlength: 2000 },
    disputeEvidence: { type: [String], default: [] },
    disputedAt: { type: Date, default: null },
    disputeResolvedAt: { type: Date, default: null },
    disputeResolution: {
      type: String,
      enum: ["none", "refund_buyer", "pay_seller", "partial", "withdrawn"],
      default: "none",
    },

    buyerRating: { type: Number, min: 1, max: 5, default: null },
    buyerReview: { type: String, default: "", maxlength: 2000 },
    ratedAt: { type: Date, default: null },

    // Invoice (issued on first download / after complete)
    invoiceNumber: { type: String, default: null, index: true },
    invoicedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models && mongoose.models.Order
    ? mongoose.models.Order
    : mongoose.model("Order", OrderSchema);
