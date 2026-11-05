// models/ServiceClick.js
const mongoose = require("mongoose");

const ServiceClickSchema = new mongoose.Schema(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["continue", "package", "other"],
      default: "continue",
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
    referrer: {
      type: String,
      default: "",
      maxlength: 500,
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

ServiceClickSchema.index({ serviceId: 1, createdAt: -1 });

module.exports =
  (mongoose.models && mongoose.models.ServiceClick) ||
  mongoose.model("ServiceClick", ServiceClickSchema);
