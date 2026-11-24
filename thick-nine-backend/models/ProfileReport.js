// models/ProfileReport.js
// Reports against a user profile (client or freelancer)

const mongoose = require("mongoose");

const ProfileReportSchema = new mongoose.Schema(
  {
    reporterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      enum: ["spam", "inappropriate", "fake", "harassment", "other"],
    },
    details: { type: String, default: "", maxlength: 2000 },
    status: {
      type: String,
      enum: ["pending", "reviewed", "dismissed", "actioned"],
      default: "pending",
      index: true,
    },
    adminNote: { type: String, default: "", maxlength: 2000 },
    reviewedAt: { type: Date, default: null },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

ProfileReportSchema.index({ targetUserId: 1, reporterId: 1, createdAt: -1 });

module.exports =
  (mongoose.models && mongoose.models.ProfileReport) ||
  mongoose.model("ProfileReport", ProfileReportSchema);
