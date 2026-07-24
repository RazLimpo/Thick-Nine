// thick-nine-backend/models/Service.js

const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema(
  {
    // ----------------------------------------------------
    // SECTION 1: Ownership & Primary Info
    // ----------------------------------------------------
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
      maxlength: 2000,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    subcategory: {
      type: String,
      trim: true,
      default: "",
    },

    tags: {
      type: [String],
      default: [],
    },

    images: {
      type: [String],
      default: ["/default-service.png"],
    },

    // ----------------------------------------------------
    // SECTION 2: Fulfillment & Performance
    // ----------------------------------------------------
    deliveryTime: {
      type: Number, // In days
      default: 3,
      min: 1,
    },

    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    orders: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Rating aggregations (for search and sorting)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewsCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // ----------------------------------------------------
    // SECTION 3: Flags & Status
    // ----------------------------------------------------
    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    sponsored: {
      type: Boolean,
      default: false,
      index: true,
    },

    status: {
      type: String,
      enum: ["active", "paused", "draft"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ----------------------------------------------------
// SECTION 4: Compound Indexes for Common Queries
// ----------------------------------------------------
// Compound index for category listings with pagination & price filtering
ServiceSchema.index({ category: 1, status: 1, price: 1 });

// Compound index for sponsored and featured marketplace carousels
ServiceSchema.index({ sponsored: 1, status: 1, createdAt: -1 });
ServiceSchema.index({ featured: 1, status: 1, rating: -1 });

module.exports = mongoose.model("Service", ServiceSchema);