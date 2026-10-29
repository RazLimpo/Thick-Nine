// utils/creditSellerBalance.js
// Call when an order is completed for the seller (buyer accept or admin pay_seller/partial).
// Idempotent via order.sellerBalanceCreditedAt.

const User = require("../models/User");

/**
 * @param {import("mongoose").Document} order - Order document (must have sellerId, sellerEarnings)
 * @param {object} opts
 * @param {number} [opts.amount] - override credit amount (e.g. partial); default order.sellerEarnings
 * @returns {Promise<{ credited: boolean, amount: number, reason?: string }>}
 */
async function creditSellerBalance(order, opts = {}) {
  if (!order) return { credited: false, amount: 0, reason: "no_order" };

  if (order.sellerBalanceCreditedAt) {
    return { credited: false, amount: 0, reason: "already_credited" };
  }

  const amount = Number(
    opts.amount != null ? opts.amount : order.sellerEarnings || 0
  );
  if (!amount || amount <= 0) {
    return { credited: false, amount: 0, reason: "zero_amount" };
  }

  const sellerId = order.sellerId;
  if (!sellerId) {
    return { credited: false, amount: 0, reason: "no_seller" };
  }

  const user = await User.findById(sellerId);
  if (!user) {
    return { credited: false, amount: 0, reason: "seller_not_found" };
  }

  user.sellerAvailableBalance =
    Number(user.sellerAvailableBalance || 0) + amount;
  await user.save();

  order.sellerBalanceCreditedAt = new Date();
  order.sellerBalanceCreditedAmount = amount;
  // Caller must order.save() if order not yet saved with these fields

  return { credited: true, amount };
}

module.exports = { creditSellerBalance };
