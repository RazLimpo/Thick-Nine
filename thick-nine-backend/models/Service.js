const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema(
  {
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    price: {
      type: Number,
      required: true,
      min: 5
    },
    description: {
      type: String,
      required: true,
      maxlength: 1000
    },
    category: {
      type: String,
      required: true
    },
    images: {
      type: [String],
      default: ['/default-service.png'] // Fallback placeholder asset
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'draft'],
      default: 'active'
    }
  },
  {
    timestamps: true // Automatically adds createdAt and updatedAt tracking fields
  }
);

module.exports = mongoose.model('Service', ServiceSchema);