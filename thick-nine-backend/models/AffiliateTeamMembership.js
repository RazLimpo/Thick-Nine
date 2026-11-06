// models/AffiliateTeamMembership.js
// Affiliate ↔ Group membership (invite / request / active)

const mongoose = require("mongoose");

const AffiliateTeamMembershipSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliateTeam",
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["leader", "member"],
      default: "member",
    },
    status: {
      type: String,
      enum: [
        "pending_invite", // team invited this user
        "pending_request", // user asked to join
        "active",
        "declined",
        "left",
        "removed",
      ],
      default: "pending_invite",
      index: true,
    },
    /** Who started the invite/request */
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    leftAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// One membership row per user per team
AffiliateTeamMembershipSchema.index({ teamId: 1, userId: 1 }, { unique: true });
AffiliateTeamMembershipSchema.index({ userId: 1, status: 1 });

module.exports =
  (mongoose.models && mongoose.models.AffiliateTeamMembership) ||
  mongoose.model("AffiliateTeamMembership", AffiliateTeamMembershipSchema);
