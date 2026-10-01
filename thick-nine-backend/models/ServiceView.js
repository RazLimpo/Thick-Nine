// thick-nine-backend/models/ServiceView.js

const mongoose = require("mongoose");

const ServiceViewSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    source: {
      type: String,
      enum: ["direct", "social", "external", "search", "unknown"],
      default: "unknown",
    },
    device: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
      default: "unknown",
    },
    // optional, useful later
    referrer: { type: String, default: "" },
  },
  { timestamps: true }
);

// Fast lookups for dashboard aggregates
ServiceViewSchema.index({ serviceId: 1, createdAt: -1 });

module.exports = mongoose.model("ServiceView", ServiceViewSchema);