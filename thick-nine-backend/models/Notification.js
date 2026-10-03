// models/Notification.js
// In-app notifications (seller extension responses, etc.)

const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "extension_approved",
        "extension_rejected",
        "order_reminder",
        "order_delivered",
        "general",
      ],
      default: "general",
      index: true,
    },
    title: {
      type: String,
      required: true,
      maxlength: 120,
    },
    message: {
      type: String,
      default: "",
      maxlength: 500,
    },
    link: {
      type: String,
      default: "",
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

module.exports =
  mongoose.models && mongoose.models.Notification
    ? mongoose.models.Notification
    : mongoose.model("Notification", NotificationSchema);
