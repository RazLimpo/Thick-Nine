// models/FreelancerTeamPartnership.js
// Freelancer ↔ Affiliate Group partnership (promote this seller's services)

const mongoose = require("mongoose");

const FreelancerTeamPartnershipSchema = new mongoose.Schema(
  {
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliateTeam",
      required: true,
      index: true,
    },
    freelancerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "pending_invite", // team invited freelancer
        "pending_request", // freelancer requested to join roster
        "active",
        "paused", // freelancer overbooked / soft stop
        "declined",
        "ended",
      ],
      default: "pending_invite",
      index: true,
    },
    initiatedBy: {
      type: String,
      enum: ["team", "freelancer"],
      default: "team",
    },
    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    pausedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    note: {
      type: String,
      default: "",
      maxlength: 300,
    },
  },
  { timestamps: true }
);

// One partnership row per freelancer per team
FreelancerTeamPartnershipSchema.index(
  { teamId: 1, freelancerId: 1 },
  { unique: true }
);
FreelancerTeamPartnershipSchema.index({ freelancerId: 1, status: 1 });

module.exports =
  (mongoose.models && mongoose.models.FreelancerTeamPartnership) ||
  mongoose.model("FreelancerTeamPartnership", FreelancerTeamPartnershipSchema);
