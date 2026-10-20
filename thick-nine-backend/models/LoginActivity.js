// models/LoginActivity.js
const mongoose = require("mongoose");

const LoginActivitySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    ip: { type: String, default: "" },
    userAgent: { type: String, default: "", maxlength: 500 },
    device: { type: String, default: "unknown" }, // desktop | mobile | tablet | unknown
    locationHint: { type: String, default: "" },
    success: { type: Boolean, default: true },
  },
  { timestamps: true }
);

LoginActivitySchema.index({ user: 1, createdAt: -1 });

module.exports =
  (mongoose.models && mongoose.models.LoginActivity) ||
  mongoose.model("LoginActivity", LoginActivitySchema);
