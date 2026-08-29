// models/Message.js

const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    // Option A: Linked to a registered user account
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Option B: Submitted by a guest/visitor via public contact form
    senderName: {
      type: String,
      trim: true,
      default: '',
    },
    senderEmail: {
      type: String,
      trim: true,
      lowercase: true,
      required: [true, 'Sender email is required'],
    },
    subject: {
      type: String,
      trim: true,
      default: 'General Inquiry',
    },
    message: {
      type: String,
      required: [true, 'Message body is required'],
      trim: true,
    },
    // Admin Reply Fields
    adminReply: {
      type: String,
      default: null,
    },
    repliedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Reference to the admin account who sent the reply
      default: null,
    },
    repliedAt: {
      type: Date,
      default: null,
    },
    // Message Lifecycle Status
    status: {
      type: String,
      enum: ['unread', 'read', 'replied', 'archived'],
      default: 'unread',
    },
  },
  {
    timestamps: true, // Automatically manages createdAt and updatedAt fields
  }
);


/* ===========================================================
   MODEL EXPORT
   =========================================================== */

module.exports = (mongoose.models && mongoose.models.Message) 
  ? mongoose.models.Message 
  : mongoose.model('Message', MessageSchema);