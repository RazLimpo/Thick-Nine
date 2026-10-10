// models/CustomOffer.js
const mongoose = require("mongoose");

const CustomOfferSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
    },
    // Set when buyer pays via checkout
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    title: {
      type: String,
      required: true,
      maxlength: 120,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    price: {
      type: Number,
      required: true,
      min: 1,
    },
    deliveryDays: {
      type: Number,
      default: 3,
      min: 1,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "declined", "expired", "withdrawn"],
      default: "pending",
      index: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models && mongoose.models.CustomOffer
    ? mongoose.models.CustomOffer
    : mongoose.model("CustomOffer", CustomOfferSchema);
