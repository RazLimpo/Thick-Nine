// models/Admin.js

const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Admin name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Admin email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    // Core Role Identifier
    role: {
      type: String,
      enum: ['super_admin', 'sub_admin'],
      default: 'sub_admin',
    },
    // Granular Permissions Array (e.g. ['messages:read', 'messages:reply'])
    permissions: [
      {
        type: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);


/* ===========================================================
   MODEL EXPORT
   =========================================================== */

module.exports = (mongoose.models && mongoose.models.Admin) 
  ? mongoose.models.Admin 
  : mongoose.model('Admin', AdminSchema);