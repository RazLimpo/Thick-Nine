// models/Admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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
      select: false, // Security: Excludes password hash from queries by default
    },
    role: {
      type: String,
      enum: [
        'super_admin',
        'admin',
        'support',
        'moderator',
        'senior_support',
        'custom',
        'sub_admin',
      ],
      default: 'custom',
    },
    permissions: [
      {
        type: String,
        trim: true,
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

// Password hashing before save
// ✅ CORRECT: Clean async/await hook (No next parameter or next() calls)
AdminSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password helper method
AdminSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports =
  mongoose.models && mongoose.models.Admin
    ? mongoose.models.Admin
    : mongoose.model('Admin', AdminSchema);