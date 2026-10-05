// models/Conversation.js

const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema(
  {
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
    // Per-user flags (ObjectId of the user who starred / archived / blocked)
    starredBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    archivedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
    blockedBy: [
      { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    ],
  },
  { timestamps: true }
);

ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

module.exports =
  mongoose.models && mongoose.models.Conversation
    ? mongoose.models.Conversation
    : mongoose.model("Conversation", ConversationSchema);
