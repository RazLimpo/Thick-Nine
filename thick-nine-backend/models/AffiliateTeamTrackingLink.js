// models/AffiliateTeamTrackingLink.js
// Group member tracking links for partnered freelancers / services
// Distinct from personal referral codes (User.referralCode / referredBy)

const mongoose = require("mongoose");

const AffiliateTeamTrackingLinkSchema = new mongoose.Schema(
  {
    /** Short public code used in /r/:code */
    code: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 32,
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliateTeam",
      required: true,
      index: true,
    },
    /** Active group member who owns / shares this link */
    memberUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    membershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliateTeamMembership",
      default: null,
    },
    partnershipId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FreelancerTeamPartnership",
      required: true,
      index: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    /** Optional — null means freelancer public profile */
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
      index: true,
    },
    name: {
      type: String,
      default: "",
      trim: true,
      maxlength: 80,
    },
    status: {
      type: String,
      enum: ["active", "paused"],
      default: "active",
      index: true,
    },
    clicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    uniqueClicks: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastClickAt: {
      type: Date,
      default: null,
    },
    /** Reserved for Step 7+ money attribution */
    conversions: {
      type: Number,
      default: 0,
      min: 0,
    },
    /** Best-effort unique click finger (ip+ua hash) — not for security */
    _lastFinger: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

AffiliateTeamTrackingLinkSchema.index({ teamId: 1, memberUserId: 1, status: 1 });
AffiliateTeamTrackingLinkSchema.index({ partnershipId: 1, status: 1 });

module.exports =
  (mongoose.models && mongoose.models.AffiliateTeamTrackingLink) ||
  mongoose.model("AffiliateTeamTrackingLink", AffiliateTeamTrackingLinkSchema);
