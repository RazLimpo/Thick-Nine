// models/AuditLog.js

const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    // Who performed the action
    actor: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, default: 'admin' },
    },

    // Who was affected (ref optional to support non-admin targets if needed)
    target: {
      id: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
      name: String,
      email: String,
      role: String,
    },

    action: {
      type: String,
      enum: [
        'admin_created',
        'permissions_updated',
        'status_changed',
        'admin_deleted',
      ],
      required: true,
    },

    oldPermissions: {
      type: [String],
      default: [],
    },

    newPermissions: {
      type: [String],
      default: [],
    },

    details: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // Auto-generates createdAt & updatedAt
  }
);

// Indexes for fast dashboard lookups and filtering
AuditLogSchema.index({ createdAt: -1 }); // Default sorting (newest first)
AuditLogSchema.index({ 'actor.id': 1, createdAt: -1 });
AuditLogSchema.index({ 'target.id': 1, createdAt: -1 });
AuditLogSchema.index({ action: 1, createdAt: -1 });

module.exports =
  mongoose.models && mongoose.models.AuditLog
    ? mongoose.models.AuditLog
    : mongoose.model('AuditLog', AuditLogSchema);