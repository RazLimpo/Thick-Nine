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
  },
  { timestamps: true }
);

ServiceClickSchema.index({ serviceId: 1, createdAt: -1 });

module.exports = mongoose.model("ServiceClick", ServiceClickSchema);