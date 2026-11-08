// routes/affiliatePayouts.js
// Mounted at: app.use("/api/affiliate", affiliatePayoutsRouter)

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Transaction = require("../models/Transaction");

const AFFILIATE_CREDIT_TYPES = [
  "solo_fee_share",
  "group_promo",
  "commission", // legacy
];

// GET /api/affiliate/analytics/daily-commissions
router.get("/analytics/daily-commissions", authMiddleware, async (req, res) => {
  try {
    const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 90);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (days - 1));
    startDate.setHours(0, 0, 0, 0);

    const userId = new mongoose.Types.ObjectId(String(req.user.id || req.user._id));

    const dailyData = await Transaction.aggregate([
      {
        $match: {
          affiliateId: userId,
          status: "completed",
          createdAt: { $gte: startDate },
          $or: [
            { type: { $in: AFFILIATE_CREDIT_TYPES } },
            { source: { $in: AFFILIATE_CREDIT_TYPES } },
          ],
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          amount: { $sum: "$amount" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const formattedChartData = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (days - 1 - i));
      const dateStr = d.toISOString().split("T")[0];
      const found = dailyData.find((item) => item._id === dateStr);
      formattedChartData.push({
        date: dateStr,
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        amount: found ? parseFloat(Number(found.amount).toFixed(2)) : 0,
      });
    }

    return res.json({ success: true, chartData: formattedChartData });
  } catch (err) {
    console.error("Error fetching analytics chart data:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
