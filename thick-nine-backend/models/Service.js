const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    price: {
      type: Number,
      required: true,
      min: 5,
    },

    description: {
      type: String,
      required: true,
      maxlength: 1000,
    },

    category: {
      type: String,
      required: true,
    },

    images: {
      type: [String],
      default: ["/default-service.png"],
    },

    // NEW
    deliveryTime: {
      type: Number,
      default: 3,
      min: 1,
    },

    // NEW
    views: {
      type: Number,
      default: 0,
    },

    // NEW
    orders: {
      type: Number,
      default: 0,
    },

    // NEW
    featured: {
      type: Boolean,
      default: false,
    },

    // NEW
    sponsored: {
      type: Boolean,
      default: false,
    },

    status: {
      type: String,
      enum: ["active", "paused", "draft"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Service", ServiceSchema);