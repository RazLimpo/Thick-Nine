// models/DirectMessage.js
// User-to-user chat only — does NOT replace models/Message.js (Contact Us)

const mongoose = require("mongoose");

const DirectMessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: 4000,
    },
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

DirectMessageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports =
  mongoose.models && mongoose.models.DirectMessage
    ? mongoose.models.DirectMessage
    : mongoose.model("DirectMessage", DirectMessageSchema);
