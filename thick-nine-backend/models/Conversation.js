// models/Conversation.js
// Direct (1:1) + Affiliate Group chats (type: affiliate_team)

const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
    /**
     * direct — existing buyer/seller (or general) DM
     * affiliate_team — one group room per AffiliateTeam
     */
    type: {
      type: String,
      enum: ["direct", "affiliate_team"],
      default: "direct",
      index: true,
    },
    /** Set when type === "affiliate_team" */
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AffiliateTeam",
      default: null,
      index: true,
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Service",
      default: null,
    },
    lastMessage: {
      type: String,
      default: "",
      maxlength: 500,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    starredBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });
// At most one open group conversation per team
ConversationSchema.index(
  { teamId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      teamId: { $type: "objectId" },
      type: "affiliate_team",
    },
  }
);

module.exports =
  mongoose.models && mongoose.models.Conversation
    ? mongoose.models.Conversation
    : mongoose.model("Conversation", ConversationSchema);
