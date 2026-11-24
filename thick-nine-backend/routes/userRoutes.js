// routes/userRoutes.js — profile + upload + affiliate + public profile + report

const express = require("express");
const router = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const userController = require("../controllers/userController");
const auth = require("../middleware/auth");
const User = require("../models/User");
const Order = require("../models/Order");
const ProfileReport = require("../models/ProfileReport");
const jwt = require("jsonwebtoken");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

function oid(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

function money(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Profile (authenticated)
// ---------------------------------------------------------------------------
router.get("/profile", auth, userController.getUserProfile);
router.put("/profile", auth, userController.updateUserProfile);
router.patch("/profile", auth, userController.updateUserProfile);

router.post(
  "/upload",
  auth,
  upload.single("file"),
  userController.uploadProfileMedia
);

// ---------------------------------------------------------------------------
// Affiliate
// ---------------------------------------------------------------------------
router.get("/affiliate/me", auth, userController.getAffiliateProfile);
router.get("/affiliate/stats", auth, userController.getAffiliateStats);
router.get("/affiliate/earnings", auth, userController.getAffiliateEarnings);
router.put("/affiliate/store", auth, userController.updateAffiliateStore);
router.get(
  "/affiliate/store/:affiliateId",
  userController.getPublicAffiliateStore
);
router.post(
  "/affiliate/prestige/add-points",
  auth,
  userController.addPrestigePoints
);

// ---------------------------------------------------------------------------
// Report a user profile (auth required)
// POST /api/users/:id/report  { reason, details }
// ---------------------------------------------------------------------------
router.post("/:id/report", auth, async (req, res) => {
  try {
    const targetId = oid(req.params.id);
    const reporterId = oid(req.user.id || req.user._id);
    if (!targetId || !reporterId) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    if (String(targetId) === String(reporterId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot report yourself.",
      });
    }

    const reason = String(req.body.reason || "").trim();
    const allowed = ["spam", "inappropriate", "fake", "harassment", "other"];
    if (!allowed.includes(reason)) {
      return res.status(400).json({
        success: false,
        message: "Invalid report reason.",
      });
    }
    const details = String(req.body.details || "").slice(0, 2000);

    const target = await User.findById(targetId).select("_id").lean();
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Rate-limit: one pending report per reporter→target per 24h
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await ProfileReport.findOne({
      reporterId,
      targetUserId: targetId,
      status: "pending",
      createdAt: { $gte: dayAgo },
    }).lean();
    if (existing) {
      return res.status(429).json({
        success: false,
        message: "You already submitted a report for this profile recently.",
      });
    }

    const report = await ProfileReport.create({
      reporterId,
      targetUserId: targetId,
      reason,
      details,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted. Our team will review.",
      reportId: report._id,
    });
  } catch (e) {
    console.error("POST /api/users/:id/report", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to submit report.",
    });
  }
});

// ---------------------------------------------------------------------------
// Public profile + order aggregates (NO email)
// GET /api/users/:id/public
// ---------------------------------------------------------------------------
router.get("/:id/public", async (req, res) => {
  try {
    const clientOid = oid(req.params.id);
    if (!clientOid) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const user = await User.findById(clientOid)
      .select(
        [
          "fullName",
          "displayName",
          "tagline",
          "bio",
          "avatar",
          "profilePicture",
          "coverImage",
          "location",
          "timezone",
          "languages",
          "preferredSkills",
          "projectTypes",
          "preferredProjectType",
          "projectScale",
          "keyRequirements",
          "contactPref",
          "minBudget",
          "maxBudget",
          "escrowPref",
          "profileVisibility",
          "orderVisibility",
          "twoFactorEnabled",
          "isVerified",
          "emailVerified",
          "onlineStatus",
          "memberSince",
          "createdAt",
          "updatedAt",
          "lastActiveAt",
          "role",
          "paymentMethods",
          "metrics",
          "responseTime",
        ].join(" ")
      )
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found." });
    }

    if (user.profileVisibility === false) {
      return res.status(403).json({
        success: false,
        message: "This profile is not public.",
      });
    }

    const loc = user.location;
    const location =
      typeof loc === "string"
        ? loc
        : loc
          ? [loc.city, loc.country].filter(Boolean).join(", ")
          : "";

    // --- Order aggregates (always computed) ---
    const activeStatuses = ["pending", "in_escrow", "revision_requested", "disputed"];
    const [agg] = await Order.aggregate([
      { $match: { clientId: clientOid } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          completedOrders: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          activeOrders: {
            $sum: {
              $cond: [{ $in: ["$status", activeStatuses] }, 1, 0],
            },
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $in: ["$status", ["completed", "in_escrow", "revision_requested", "disputed"]] },
                { $ifNull: ["$grandTotal", 0] },
                0,
              ],
            },
          },
          ratingSum: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$buyerRating", null] }, { $gte: ["$buyerRating", 1] }] },
                "$buyerRating",
                0,
              ],
            },
          },
          ratingCount: {
            $sum: {
              $cond: [
                { $and: [{ $ne: ["$buyerRating", null] }, { $gte: ["$buyerRating", 1] }] },
                1,
                0,
              ],
            },
          },
        },
      },
    ]);

    const totalOrders = agg?.totalOrders || 0;
    const completedOrders = agg?.completedOrders || 0;
    const cancelledOrders = agg?.cancelledOrders || 0;
    const activeOrderCount = agg?.activeOrders || 0;
    const totalSpent = money(agg?.totalSpent);
    const decided = completedOrders + cancelledOrders;
    const reliability =
      decided > 0 ? Math.round((completedOrders / decided) * 100) : null;
    const avgBuyerRating =
      agg?.ratingCount > 0
        ? Math.round((agg.ratingSum / agg.ratingCount) * 10) / 10
        : null;

    // Active orders list (always returned; empty array if none)
    const activeOrdersRaw = await Order.find({
      clientId: clientOid,
      status: { $in: activeStatuses },
    })
      .sort({ updatedAt: -1 })
      .limit(8)
      .populate("serviceId", "title")
      .select("status grandTotal createdAt orderNumber serviceId basePackagePrice")
      .lean();

    const activeOrders = activeOrdersRaw.map((o) => ({
      _id: o._id,
      orderNumber: o.orderNumber || String(o._id).slice(-6),
      status: o.status,
      title:
        (o.serviceId && o.serviceId.title) ||
        "Service order",
      amount: money(o.grandTotal != null ? o.grandTotal : o.basePackagePrice),
      createdAt: o.createdAt,
    }));

    // Recent reviews this client left (on completed orders)
    const reviewsRaw = await Order.find({
      clientId: clientOid,
      status: "completed",
      buyerRating: { $ne: null, $gte: 1 },
    })
      .sort({ ratedAt: -1, updatedAt: -1 })
      .limit(5)
      .populate("sellerId", "fullName displayName")
      .populate("serviceId", "title")
      .select("buyerRating buyerReview ratedAt serviceId sellerId")
      .lean();

    const reviewsGiven = reviewsRaw.map((o) => ({
      rating: o.buyerRating,
      review: o.buyerReview || "",
      ratedAt: o.ratedAt || null,
      serviceTitle: (o.serviceId && o.serviceId.title) || "Service",
      sellerName:
        (o.sellerId && (o.sellerId.displayName || o.sellerId.fullName)) ||
        "Freelancer",
    }));

    // Recent freelancers this client worked with (for mutual / collaborators UI)
    const collabOrders = await Order.find({ clientId: clientOid })
      .sort({ updatedAt: -1 })
      .limit(40)
      .populate("sellerId", "fullName displayName avatar profilePicture")
      .select("sellerId")
      .lean();

    const seen = new Set();
    const collaborators = [];
    for (const o of collabOrders) {
      const s = o.sellerId;
      if (!s || !s._id) continue;
      const sid = String(s._id);
      if (seen.has(sid)) continue;
      seen.add(sid);
      collaborators.push({
        _id: s._id,
        displayName: s.displayName || s.fullName || "Freelancer",
        avatar: s.avatar || s.profilePicture || "/default-avatar.png",
      });
      if (collaborators.length >= 8) break;
    }

    // Mutual: freelancers viewer and this client both connected to (optional JWT)
    let mutual = [];
    try {
      let viewerId = null;
      const h = req.headers.authorization || "";
      const token = h.startsWith("Bearer ") ? h.slice(7) : null;
      if (token && process.env.JWT_SECRET) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          viewerId = decoded.id || decoded._id || decoded.userId || null;
        } catch {
          viewerId = null;
        }
      }
      if (viewerId && String(viewerId) !== String(clientOid)) {
        const viewerOid = oid(viewerId);
        if (viewerOid) {
          // Sellers the viewer hired as a client
          const hiredAsClient = await Order.distinct("sellerId", {
            clientId: viewerOid,
          });
          // Sellers who also worked with the viewer as peer on same clients is hard;
          // also include freelancers the viewer worked alongside: sellers on orders where viewer was seller on same client — skip
          // Practical mutual: sellers this client used that the viewer also hired
          const mutualSet = new Set(hiredAsClient.map((id) => String(id)));
          mutual = collaborators.filter(
            (c) =>
              mutualSet.has(String(c._id)) &&
              String(c._id) !== String(viewerId)
          );
        }
      }
    } catch {
      mutual = [];
    }

    return res.json({
      success: true,
      user: {
        _id: user._id,
        fullName: user.fullName,
        displayName: user.displayName || user.fullName,
        tagline: user.tagline || "",
        bio: user.bio || "",
        avatar: user.avatar || user.profilePicture || "/default-avatar.png",
        coverImage: user.coverImage || "",
        location,
        timezone: user.timezone || "",
        languages: user.languages || [],
        preferredSkills: user.preferredSkills || [],
        projectTypes: user.projectTypes || [],
        preferredProjectType: user.preferredProjectType || "fixed",
        projectScale: user.projectScale || "",
        keyRequirements: user.keyRequirements || "",
        contactPref: user.contactPref || "messaging",
        minBudget: user.minBudget ?? null,
        maxBudget: user.maxBudget ?? null,
        escrowPref: user.escrowPref || "always",
        twoFactorEnabled: !!user.twoFactorEnabled,
        isVerified: !!(user.isVerified || user.emailVerified),
        emailVerified: !!user.emailVerified,
        onlineStatus: user.onlineStatus || "offline",
        memberSince: user.memberSince || user.createdAt,
        lastActiveAt: user.lastActiveAt || user.updatedAt || null,
        role: user.role,
        orderVisibility: user.orderVisibility !== false,
        responseRate:
          user.metrics && user.metrics.responseRate != null
            ? Number(user.metrics.responseRate)
            : null,
        responseTimeMinutes:
          user.responseTime != null ? Number(user.responseTime) : null,
        paymentMethodLabels: Array.from(
          new Set(
            (user.paymentMethods || [])
              .map((pm) =>
                String(pm.label || pm.brand || "").trim()
              )
              .filter(Boolean)
          )
        ).slice(0, 6),
      },
      stats: {
        totalOrders,
        completedOrders,
        cancelledOrders,
        activeOrders: activeOrderCount,
        totalSpent,
        reliability,
        avgBuyerRating,
        // Avg response needs messaging timestamps — not available yet
        avgResponseHours: null,
      },
      activeOrders,
      reviewsGiven,
      collaborators,
      mutual,
    });
  } catch (e) {
    console.error("GET /api/users/:id/public", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to load profile.",
    });
  }
});

module.exports = router;
