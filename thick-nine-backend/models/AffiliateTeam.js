// models/AffiliateTeam.js
// Affiliate Groups (Promotion teams) — distinct from Referral Network (referredBy)

const mongoose = require("mongoose");

const AffiliateTeamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 100,
      index: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },
    /** Creator / primary leader */
    leaderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** public = discoverable; private = invite-only */
    visibility: {
      type: String,
      enum: ["public", "private"],
      default: "private",
    },
    status: {
      type: String,
      enum: ["active", "paused", "archived"],
      default: "active",
      index: true,
    },
    /** One group chat conversation (created when team is created — Step 7 wiring) */
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      default: null,
      index: true,
    },
    /** Soft limits for UI (enforce in routes) */
    maxMembers: {
      type: Number,
      default: 25,
      min: 2,
      max: 100,
    },
    maxFreelancerPartners: {
      type: Number,
      default: 20,
      min: 1,
      max: 50,
    },
  },
  { timestamps: true }
);

AffiliateTeamSchema.index({ leaderId: 1, status: 1 });
AffiliateTeamSchema.index({ name: "text", description: "text" });

module.exports =
  (mongoose.models && mongoose.models.AffiliateTeam) ||
  mongoose.model("AffiliateTeam", AffiliateTeamSchema);
