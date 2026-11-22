// routes/freelancerClientsRoutes.js
// Mount: app.use("/api/freelancer/clients", require("./routes/freelancerClientsRoutes"));

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");

const Order = require("../models/Order");
const User = require("../models/User");
const FreelancerClientRelation = require("../models/FreelancerClientRelation");

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

function locationLabel(user) {
  const loc = user?.location || {};
  return [loc.city, loc.country].filter(Boolean).join(", ") || "";
}

function publicClient(user, presenceFallback) {
  if (!user) return null;
  return {
    _id: user._id,
    fullName: user.fullName || user.displayName || "Client",
    displayName: user.displayName || user.fullName || "Client",
    avatar: user.avatar || "/default-avatar.png",
    location: locationLabel(user),
    onlineStatus: user.onlineStatus || presenceFallback || "offline",
    // email intentionally omitted — keep communication on-platform
  };
}

/**
 * GET /
 * Aggregated clients from seller orders + relation flags
 * Query: relationship=all|friends|saved|blocked, q, minOrders, sort, page, limit
 */
router.get("/", auth, async (req, res) => {
  try {
    const sellerId = oid(req.user.id || req.user._id);
    if (!sellerId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const relationship = String(req.query.relationship || "all").toLowerCase();
    const q = String(req.query.q || "").trim().toLowerCase();
    const minOrders = Math.max(0, parseInt(req.query.minOrders || "0", 10) || 0);
    const sort = String(req.query.sort || "last-order-desc");
    const page = Math.max(1, parseInt(req.query.page || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit || "10", 10) || 10));

    const agg = await Order.aggregate([
      { $match: { sellerId } },
      {
        $group: {
          _id: "$clientId",
          totalOrders: { $sum: 1 },
          lifetimeValue: {
            $sum: {
              $ifNull: ["$sellerEarnings", { $ifNull: ["$grandTotal", 0] }],
            },
          },
          lastOrderAt: { $max: "$createdAt" },
          firstOrderAt: { $min: "$createdAt" },
        },
      },
    ]);

    const clientIds = agg.map((a) => a._id).filter(Boolean);
    const [users, relations] = await Promise.all([
      User.find({ _id: { $in: clientIds } })
        .select("fullName displayName avatar location onlineStatus")
        .lean(),
      FreelancerClientRelation.find({
        sellerId,
        clientId: { $in: clientIds },
      }).lean(),
    ]);

    const userMap = Object.fromEntries(users.map((u) => [String(u._id), u]));
    const relMap = Object.fromEntries(
      relations.map((r) => [String(r.clientId), r])
    );

    let rows = agg.map((a) => {
      const id = String(a._id);
      const u = userMap[id];
      const rel = relMap[id] || {};
      const totalOrders = a.totalOrders || 0;
      const lifetimeValue = money(a.lifetimeValue);
      return {
        _id: id,
        client: publicClient(u),
        totalOrders,
        lifetimeValue,
        avgOrderValue: totalOrders ? money(lifetimeValue / totalOrders) : 0,
        lastOrderAt: a.lastOrderAt || null,
        firstOrderAt: a.firstOrderAt || null,
        isFriend: !!rel.isFriend,
        isSaved: !!rel.isSaved,
        isBlocked: !!rel.isBlocked,
        hasNotes: !!(rel.notes && String(rel.notes).trim()),
      };
    });

    // Filters
    rows = rows.filter((r) => {
      if (relationship === "friends" && !r.isFriend) return false;
      if (relationship === "saved" && !r.isSaved) return false;
      if (relationship === "blocked" && !r.isBlocked) return false;
      if (r.totalOrders < minOrders) return false;
      if (q) {
        const name = (r.client?.displayName || r.client?.fullName || "").toLowerCase();
        if (!name.includes(q)) return false;
      }
      return true;
    });

    rows.sort((a, b) => {
      if (sort === "ltv-desc") return b.lifetimeValue - a.lifetimeValue;
      if (sort === "orders-desc") return b.totalOrders - a.totalOrders;
      const tb = a.lastOrderAt ? new Date(a.lastOrderAt).getTime() : 0;
      const ta = b.lastOrderAt ? new Date(b.lastOrderAt).getTime() : 0;
      return ta - tb;
    });

    const totalClients = rows.length;
    const totalLtv = money(rows.reduce((s, r) => s + r.lifetimeValue, 0));
    const totalOrdersAll = rows.reduce((s, r) => s + r.totalOrders, 0);
    const friendsCount = rows.filter((r) => r.isFriend).length;
    const savedCount = rows.filter((r) => r.isSaved).length;

    const totalPages = Math.max(1, Math.ceil(rows.length / limit));
    const pageSafe = Math.min(page, totalPages);
    const slice = rows.slice((pageSafe - 1) * limit, pageSafe * limit);

    return res.json({
      success: true,
      clients: slice,
      pagination: {
        page: pageSafe,
        limit,
        total: totalClients,
        totalPages,
      },
      summary: {
        totalClients,
        totalLtv,
        totalOrders: totalOrdersAll,
        avgLtv: totalClients ? money(totalLtv / totalClients) : 0,
        friendsCount,
        savedCount,
      },
    });
  } catch (e) {
    console.error("GET /api/freelancer/clients", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to load clients.",
    });
  }
});

/**
 * GET /:clientId — profile + relation + recent orders (no email)
 */
router.get("/:clientId", auth, async (req, res) => {
  try {
    const sellerId = oid(req.user.id || req.user._id);
    const clientId = oid(req.params.clientId);
    if (!sellerId || !clientId) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const orderCount = await Order.countDocuments({ sellerId, clientId });
    if (!orderCount) {
      return res.status(404).json({
        success: false,
        message: "No shared orders with this client.",
      });
    }

    const [user, rel, orders, stats] = await Promise.all([
      User.findById(clientId)
        .select("fullName displayName avatar location onlineStatus memberSince createdAt")
        .lean(),
      FreelancerClientRelation.findOne({ sellerId, clientId }).lean(),
      Order.find({ sellerId, clientId })
        .sort({ createdAt: -1 })
        .limit(20)
        .select(
          "orderNumber status grandTotal sellerEarnings serviceTitle createdAt dueAt"
        )
        .lean(),
      Order.aggregate([
        { $match: { sellerId, clientId } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            lifetimeValue: {
              $sum: {
                $ifNull: ["$sellerEarnings", { $ifNull: ["$grandTotal", 0] }],
              },
            },
            completed: {
              $sum: {
                $cond: [{ $eq: ["$status", "completed"] }, 1, 0],
              },
            },
            lastOrderAt: { $max: "$createdAt" },
          },
        },
      ]),
    ]);

    const s = stats[0] || {};
    const totalOrders = s.totalOrders || 0;
    const lifetimeValue = money(s.lifetimeValue);

    return res.json({
      success: true,
      client: publicClient(user),
      relation: {
        isFriend: !!rel?.isFriend,
        isSaved: !!rel?.isSaved,
        isBlocked: !!rel?.isBlocked,
        notes: rel?.notes || "",
      },
      metrics: {
        totalOrders,
        lifetimeValue,
        avgOrderValue: totalOrders ? money(lifetimeValue / totalOrders) : 0,
        completedOrders: s.completed || 0,
        lastOrderAt: s.lastOrderAt || null,
        memberSince: user?.memberSince || user?.createdAt || null,
      },
      orders: orders.map((o) => ({
        _id: o._id,
        orderNumber: o.orderNumber || String(o._id).slice(-6),
        status: o.status,
        serviceTitle: o.serviceTitle || "Service",
        payout: money(o.sellerEarnings != null ? o.sellerEarnings : o.grandTotal),
        createdAt: o.createdAt,
      })),
    });
  } catch (e) {
    console.error("GET /api/freelancer/clients/:id", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to load client.",
    });
  }
});

/**
 * PATCH /:clientId — update relation flags / notes
 * Body: { isFriend?, isSaved?, isBlocked?, notes? }
 */
router.patch("/:clientId", auth, async (req, res) => {
  try {
    const sellerId = oid(req.user.id || req.user._id);
    const clientId = oid(req.params.clientId);
    if (!sellerId || !clientId) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    // Must have at least one order together
    const shared = await Order.exists({ sellerId, clientId });
    if (!shared) {
      return res.status(404).json({
        success: false,
        message: "No shared orders with this client.",
      });
    }

    const update = {};
    if (typeof req.body.isFriend === "boolean") update.isFriend = req.body.isFriend;
    if (typeof req.body.isSaved === "boolean") update.isSaved = req.body.isSaved;
    if (typeof req.body.isBlocked === "boolean") update.isBlocked = req.body.isBlocked;
    if (typeof req.body.notes === "string") {
      update.notes = String(req.body.notes).slice(0, 5000);
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ success: false, message: "Nothing to update." });
    }

    const rel = await FreelancerClientRelation.findOneAndUpdate(
      { sellerId, clientId },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({
      success: true,
      relation: {
        isFriend: !!rel.isFriend,
        isSaved: !!rel.isSaved,
        isBlocked: !!rel.isBlocked,
        notes: rel.notes || "",
      },
    });
  } catch (e) {
    console.error("PATCH /api/freelancer/clients/:id", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to update relation.",
    });
  }
});

module.exports = router;
