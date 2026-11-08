// routes/affiliateGrowth.js
// Mounted at: app.use("/api/affiliate", affiliateGrowthRouter)

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Transaction = require("../models/Transaction");

const AFFILIATE_CREDIT_TYPES = ["solo_fee_share", "group_promo", "commission"];

/**
 * GET /api/affiliate/progression/monthly-sales
 * Progress widget: this month's confirmed affiliate commissions (credits),
 * not order GMV — label in UI should say "commission this month".
 * Optional query: target=5000
 */
router.get("/progression/monthly-sales", authMiddleware, async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const userId = new mongoose.Types.ObjectId(String(req.user.id || req.user._id));

    // Prefer attributed order subtotals (true "sales") when Order model available
    let monthlySales = 0;
    let metric = "commission_credits";
    try {
      const Order = require("../models/Order");
      const salesAgg = await Order.aggregate([
        {
          $match: {
            affiliateId: userId,
            status: "completed",
            updatedAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: "$subtotal" }, count: { $sum: 1 } } },
      ]);
      if (salesAgg.length) {
        monthlySales = Number(salesAgg[0].total) || 0;
        metric = "referred_order_subtotal";
      }
    } catch (_) {
      /* fall through to transactions */
    }

    if (metric === "commission_credits") {
      const monthlyStats = await Transaction.aggregate([
        {
          $match: {
            affiliateId: userId,
            status: "completed",
            createdAt: { $gte: startOfMonth },
            $or: [
              { type: { $in: AFFILIATE_CREDIT_TYPES } },
              { source: { $in: AFFILIATE_CREDIT_TYPES } },
            ],
          },
        },
        {
          $group: {
            _id: null,
            totalSales: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ]);
      monthlySales =
        monthlyStats.length > 0 ? Number(monthlyStats[0].totalSales) || 0 : 0;
    }

    const monthlyTarget = Math.max(Number(req.query.target) || 5000, 1);

    return res.json({
      success: true,
      monthlySales,
      targetSales: monthlyTarget,
      progressPercentage: Math.min(
        Math.round((monthlySales / monthlyTarget) * 100),
        100
      ),
      metric,
      label:
        metric === "referred_order_subtotal"
          ? "Referred order sales (this month)"
          : "Affiliate commissions (this month)",
    });
  } catch (err) {
    console.error("Error fetching monthly sales progression:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
