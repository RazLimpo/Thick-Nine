// routes/affiliateNetwork.js
// Mounted at: app.use("/api/affiliate", affiliateNetworkRouter)

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

function uid(req) {
  return req.user?.id || req.user?._id;
}

/** Match users referred by this affiliate (ObjectId string or referralCode) */
async function referredQuery(affiliateUser) {
  const id = String(affiliateUser._id);
  const code = String(affiliateUser.referralCode || "").trim();
  const or = [
    { referredBy: id },
    { referredBy: mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id },
  ];
  if (code) {
    or.push({ referredBy: code });
    or.push({ "affiliateProfile.referredByCode": code });
  }
  return { $or: or };
}

function mapPerson(u) {
  return {
    _id: u._id,
    id: u._id,
    name: u.displayName || u.fullName || "Member",
    displayName: u.displayName || u.fullName,
    fullName: u.fullName,
    email: u.email,
    avatar: u.avatar,
    status: u.isActive === false ? "inactive" : "active",
    role: u.role,
    joinedAt: u.createdAt,
    memberSince: u.createdAt,
    createdAt: u.createdAt,
    completedOrders: u.completedOrders || 0,
    earnings: u.wallet?.lifetimeEarnings || u.metrics?.totalEarnings || 0,
    totalSpent: u.metrics?.totalSpent || 0,
    commissionEarned: 0,
  };
}

// GET /api/affiliate/network/partners — sub-affiliates (referred users now in affiliate role)
router.get("/network/partners", authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(uid(req)).select("referralCode");
    if (!me) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    const q = await referredQuery(me);
    const partners = await User.find({
      ...q,
      role: "affiliate",
      _id: { $ne: me._id },
    })
      .select(
        "fullName displayName email avatar isActive role createdAt wallet metrics completedOrders"
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      partners: partners.map(mapPerson),
    });
  } catch (err) {
    console.error("Error fetching partners:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET /api/affiliate/network/freelancers
router.get("/network/freelancers", authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(uid(req)).select("referralCode");
    if (!me) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    const q = await referredQuery(me);
    const freelancers = await User.find({
      ...q,
      role: "freelancer",
    })
      .select(
        "fullName displayName email avatar isActive role createdAt wallet metrics completedOrders"
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      freelancers: freelancers.map(mapPerson),
    });
  } catch (err) {
    console.error("Error fetching freelancers:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET /api/affiliate/network/customers — buyers (role: client)
router.get("/network/customers", authMiddleware, async (req, res) => {
  try {
    const me = await User.findById(uid(req)).select("referralCode");
    if (!me) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    const q = await referredQuery(me);
    const customers = await User.find({
      ...q,
      role: "client",
    })
      .select(
        "fullName displayName email avatar isActive role createdAt metrics completedOrders"
      )
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({
      success: true,
      customers: customers.map((u) => ({
        ...mapPerson(u),
        totalSpent: u.metrics?.totalSpent || 0,
        ordersCount: u.completedOrders || 0,
        joinedDate: u.createdAt,
      })),
    });
  } catch (err) {
    console.error("Error fetching customers:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
