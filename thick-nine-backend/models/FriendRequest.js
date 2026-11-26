// models/FriendRequest.js
// Shared social graph for client-profile + freelancer-profile (+ affiliate later)

const mongoose = require("mongoose");

const FriendRequestSchema = new mongoose.Schema(
  {
    fromUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    toUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    message: {
      type: String,
      default: "",
      maxlength: 300,
    },
    respondedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// One open request per direction pair
FriendRequestSchema.index(
  { fromUserId: 1, toUserId: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } }
);

module.exports =
  (mongoose.models && mongoose.models.FriendRequest) ||
  mongoose.model("FriendRequest", FriendRequestSchema);
