//models/Order.js

const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema(
  {
    // 1. User & Service References
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
    },
    sellerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // 2. Affiliate Attribution
    affiliateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    affiliateCode: {
      type: String,
      default: null,
    },

    // 3. Delivery Instructions (from HTML #instructions)
    requirements: {
      type: String,
      default: '',
    },

    // 4. Line Items Breakdown
    basePackagePrice: {
      type: Number, // e.g., $100
      required: true,
    },
    selectedAddons: [
      {
        title: String, // e.g., "Extra Fast Delivery"
        price: Number, // e.g., $25
      },
    ],
    subtotal: {
      type: Number, // basePackagePrice + addonsTotal (e.g., $150)
      required: true,
    },

    // 5. Fees & Calculations
    buyerServiceFee: {
      type: Number, // 5% of subtotal (e.g., $7.50)
      default: 0,
    },
    grandTotal: {
      type: Number, // subtotal + buyerServiceFee (e.g., $157.50 paid by buyer)
      required: true,
    },
    sellerPlatformFee: {
      type: Number, // 15% deducted from subtotal (e.g., $22.50)
      required: true,
    },
    sellerEarnings: {
      type: Number, // subtotal - sellerPlatformFee (e.g., $127.50)
      required: true,
    },

    // 6. Platform Revenue & Affiliate Cut
    grossAdminRevenue: {
      type: Number, // sellerPlatformFee + buyerServiceFee
      required: true,
    },
    affiliateCommission: {
      type: Number, // Deducted strictly from grossAdminRevenue
      default: 0,
    },
    netAdminProfit: {
      type: Number, // grossAdminRevenue - affiliateCommission
      required: true,
    },

    // 7. Payment & Escrow State
    paymentMethod: {
      type: String,
      enum: ['card', 'paypal'],
      default: 'card',
    },
    status: {
      type: String,
      enum: ['pending', 'in_escrow', 'completed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    escrowReleaseDate: {
      type: Date, // Sets automatically to 14 days after completion
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', OrderSchema);