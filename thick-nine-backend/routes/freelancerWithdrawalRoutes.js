// routes/freelancerWithdrawalRoutes.js
// Mount: app.use("/api/freelancer", require("./routes/freelancerWithdrawalRoutes"));
//
// Seller payouts (NOT affiliate System B).
// Uses sellerAvailableBalance + Transaction (payoutType: seller_escrow).

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const User = require("../models/User");
const Transaction = require("../models/Transaction");
const Order = require("../models/Order");

function uid(req) {
  return req.user?.id || req.user?._id;
}

const MIN_PAYOUT = 50;

function calcFee(amount, method) {
  if (method === "bank") return 5;
  if (method === "payoneer") return Math.min(amount * 0.02, 50);
  return 0;
}

/**
 * GET /api/freelancer/withdrawals
 * Summary balances + payout history for the logged-in seller.
 */
router.get("/withdrawals", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const user = await User.findById(userId)
      .select(
        "sellerAvailableBalance sellerPendingBalance fullName email payoutDetails role"
      )
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const available = Number(user.sellerAvailableBalance || 0);

    // Pending clearance: earnings still in escrow (in_escrow / disputed seller share)
    let pendingClearance = Number(user.sellerPendingBalance || 0);
    if (!pendingClearance) {
      try {
        const agg = await Order.aggregate([
          {
            $match: {
              sellerId: user._id,
              status: { $in: ["in_escrow", "revision_requested", "disputed"] },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: { $ifNull: ["$sellerEarnings", 0] } },
            },
          },
        ]);
        pendingClearance = agg[0]?.total || 0;
      } catch (_) {
        pendingClearance = 0;
      }
    }

    // YTD withdrawn from completed seller payout transactions
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    let totalWithdrawnYTD = 0;
    let history = [];

    try {
      const txs = await Transaction.find({
        userId: user._id,
        type: "payout",
        payoutType: "seller_escrow",
      })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      history = txs.map((t) => {
        const amount = Number(t.amount) || 0;
        const fee = Number(t.fee) || 0;
        return {
          id: t._id,
          date: t.createdAt,
          tid: `TXN-${String(t._id).slice(-6).toUpperCase()}`,
          method: t.payoutMethod || "payoneer",
          amount,
          fee,
          net: amount - fee,
          status: t.status || "pending_payoneer",
        };
      });

      totalWithdrawnYTD = txs
        .filter(
          (t) =>
            t.createdAt >= yearStart &&
            ["completed", "paid", "pending_payoneer"].includes(t.status)
        )
        .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    } catch (_) {
      history = [];
    }

    const pd = user.payoutDetails || {};

    return res.json({
      success: true,
      balances: {
        available,
        pendingClearance,
        totalWithdrawnYTD,
        minPayout: MIN_PAYOUT,
      },
      payoutDetails: {
        method: pd.method || "payoneer",
        email: pd.accountEmail || pd.payoneerEmail || user.email || "",
        accountName: pd.accountName || "",
        bankName: pd.bankName || "",
        accountNumberMasked: pd.accountNumber
          ? `**** ${String(pd.accountNumber).slice(-4)}`
          : "",
      },
      history,
    });
  } catch (err) {
    console.error("GET freelancer/withdrawals:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load withdrawals.",
    });
  }
});

/**
 * POST /api/freelancer/withdrawals
 * body: { amount, method?: 'payoneer' | 'bank' }
 * Deducts sellerAvailableBalance and creates Transaction (seller_escrow).
 */
router.post("/withdrawals", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const amount = Number(req.body?.amount);
    let method = String(req.body?.method || "payoneer").toLowerCase();
    if (method === "paypal") method = "payoneer"; // platform standard: no PayPal payouts
    if (!["payoneer", "bank"].includes(method)) method = "payoneer";

    if (!amount || amount < MIN_PAYOUT) {
      return res.status(400).json({
        success: false,
        message: `Minimum withdrawal is $${MIN_PAYOUT}.`,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const available = Number(user.sellerAvailableBalance || 0);
    if (amount > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: $${available.toFixed(2)}.`,
      });
    }

    const pd = user.payoutDetails || {};
    const payoneerEmail =
      pd.accountEmail || pd.payoneerEmail || user.email || "";

    if (method === "payoneer" && !payoneerEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Add a Payoneer email under Freelancer Settings → Payout before withdrawing.",
      });
    }

    if (method === "bank" && !pd.accountName && !pd.bankName) {
      return res.status(400).json({
        success: false,
        message:
          "Complete bank details under Freelancer Settings → Payout before using bank transfer.",
      });
    }

    const fee = calcFee(amount, method);
    const net = amount - fee;

    user.sellerAvailableBalance = available - amount;
    await user.save();

    let txn = null;
    try {
      txn = await Transaction.create({
        userId: user._id,
        type: "payout",
        payoutMethod: method,
        payoneerEmail: method === "payoneer" ? payoneerEmail : "",
        amount,
        fee,
        net,
        status: "pending_payoneer",
        payoutType: "seller_escrow",
        note: `Seller withdrawal via ${method}`,
      });
    } catch (e) {
      // rollback balance if transaction create fails
      user.sellerAvailableBalance = available;
      await user.save();
      console.error("Transaction create failed:", e);
      return res.status(500).json({
        success: false,
        message: "Could not create payout record.",
      });
    }

    return res.status(201).json({
      success: true,
      message: "Withdrawal request submitted. An admin will process payment.",
      withdrawal: {
        id: txn._id,
        tid: `TXN-${String(txn._id).slice(-6).toUpperCase()}`,
        amount,
        fee,
        net,
        method,
        status: "pending_payoneer",
        date: txn.createdAt,
      },
      balances: {
        available: user.sellerAvailableBalance,
      },
    });
  } catch (err) {
    console.error("POST freelancer/withdrawals:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to request withdrawal.",
    });
  }
});

module.exports = router;
