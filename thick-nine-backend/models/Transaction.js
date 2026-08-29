// models/Transaction.js

const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    type: {
      type: String,
      enum: ['commission', 'withdrawal', 'referral_bonus'],
      default: 'commission',
      required: true
    },

    amount: {
      type: Number,
      required: true,
      min: 0
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'cancelled'],
      default: 'completed',
      index: true
    },

    description: {
      type: String,
      default: ''
    },

    referenceId: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes for high-performance time-range aggregations
TransactionSchema.index({ affiliateId: 1, type: 1, status: 1, createdAt: -1 });

/* ===========================================================
   MODEL EXPORT
   =========================================================== */

module.exports = (mongoose.models && mongoose.models.Transaction) 
  ? mongoose.models.Transaction 
  : mongoose.model('Transaction', TransactionSchema);