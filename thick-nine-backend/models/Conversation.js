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
    // Optional context links
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
  },
  { timestamps: true }
);

// Exactly two participants for 1:1 DM (sorted for uniqueness helpers)
ConversationSchema.index({ participants: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

module.exports =
  mongoose.models && mongoose.models.Conversation
    ? mongoose.models.Conversation
    : mongoose.model("Conversation", ConversationSchema);
