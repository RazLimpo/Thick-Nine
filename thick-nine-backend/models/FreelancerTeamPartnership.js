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
        "pending_invite",
        "pending_request",
        "active",
        "paused",
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
    /**
     * Freelancer-funded promo rate for group tracking links (fraction 0.05–0.10).
     * Applied to order subtotal; split 80% member / 20% leader on complete.
     */
    promoRate: {
      type: Number,
      default: 0.08,
      min: 0.05,
      max: 0.1,
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

FreelancerTeamPartnershipSchema.index(
  { teamId: 1, freelancerId: 1 },
  { unique: true }
);
FreelancerTeamPartnershipSchema.index({ freelancerId: 1, status: 1 });

module.exports =
  (mongoose.models && mongoose.models.FreelancerTeamPartnership) ||
  mongoose.model("FreelancerTeamPartnership", FreelancerTeamPartnershipSchema);
