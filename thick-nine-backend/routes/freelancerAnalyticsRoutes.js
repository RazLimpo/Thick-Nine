// routes/freelancerAnalyticsRoutes.js
// Mount: app.use("/api/freelancer", require("./routes/freelancerAnalyticsRoutes"));
// GET /api/freelancer/analytics?period=30|7|lifetime

const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Order = require("../models/Order");
const Service = require("../models/Service");
const User = require("../models/User");

function uid(req) {
  return req.user?.id || req.user?._id;
}

function periodStart(period) {
  const now = new Date();
  if (period === "7") {
    const d = new Date(now);
    d.setDate(d.getDate() - 7);
    return d;
  }
  if (period === "lifetime") return null;
  // default 30
  const d = new Date(now);
  d.setDate(d.getDate() - 30);
  return d;
}

router.get("/analytics", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const period = String(req.query.period || "30");
    const since = periodStart(period);

    const orderFilter = { sellerId: userId };
    if (since) orderFilter.createdAt = { $gte: since };

    const [orders, services, user] = await Promise.all([
      Order.find(orderFilter)
        .sort({ createdAt: -1 })
        .limit(500)
        .populate("clientId", "fullName displayName email")
        .lean(),
      Service.find({ sellerId: userId }).lean(),
      User.findById(userId)
        .select(
          "fullName metrics averageRating responseRate level accountStrength sellerAvailableBalance earningsGoal promoLog"
        )
        .lean(),
    ]);

    const completed = orders.filter((o) => o.status === "completed");
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const disputed = orders.filter((o) => o.status === "disputed");
    const activeOrders = orders.filter((o) =>
      ["pending", "in_escrow", "revision_requested"].includes(o.status)
    );

    const earnings = completed.reduce(
      (s, o) => s + (Number(o.sellerEarnings) || Number(o.subtotal) || 0),
      0
    );

    const rated = completed.filter((o) => o.buyerRating != null);
    const avgRating = rated.length
      ? rated.reduce((s, o) => s + Number(o.buyerRating), 0) / rated.length
      : Number(user?.averageRating) ||
        Number(user?.metrics?.rating) ||
        0;

    const activeGigs = services.filter((s) => s.status === "active").length;
    const totalViews = services.reduce((s, x) => s + (Number(x.views) || 0), 0);
    const totalClicks = services.reduce(
      (s, x) => s + (Number(x.clicks) || 0),
      0
    );

    // Delivery timing (when deliveredAt & createdAt exist)
    let avgDeliveryDays = null;
    let lateCount = 0;
    let deliverySamples = 0;
    completed.forEach((o) => {
      if (!o.deliveredAt || !o.createdAt) return;
      const days =
        (new Date(o.deliveredAt).getTime() - new Date(o.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      if (!Number.isFinite(days) || days < 0) return;
      deliverySamples += 1;
      avgDeliveryDays =
        avgDeliveryDays == null ? days : avgDeliveryDays + days;
      if (o.dueAt && new Date(o.deliveredAt) > new Date(o.dueAt)) {
        lateCount += 1;
      }
    });
    if (deliverySamples > 0 && avgDeliveryDays != null) {
      avgDeliveryDays = avgDeliveryDays / deliverySamples;
    }

    const completionRate =
      orders.length > 0
        ? Math.round((completed.length / orders.length) * 1000) / 10
        : 0;
    const cancelRate =
      orders.length > 0
        ? Math.round((cancelled.length / orders.length) * 1000) / 10
        : 0;
    const lateRate =
      deliverySamples > 0
        ? Math.round((lateCount / deliverySamples) * 1000) / 10
        : 0;

    // Earnings by service
    const byService = {};
    completed.forEach((o) => {
      const sid = String(o.serviceId || "unknown");
      if (!byService[sid]) {
        byService[sid] = { serviceId: sid, earnings: 0, orders: 0, title: "" };
      }
      byService[sid].earnings +=
        Number(o.sellerEarnings) || Number(o.subtotal) || 0;
      byService[sid].orders += 1;
    });
    services.forEach((s) => {
      const sid = String(s._id);
      if (byService[sid]) byService[sid].title = s.title;
      else {
        byService[sid] = {
          serviceId: sid,
          title: s.title,
          earnings: 0,
          orders: 0,
          views: s.views || 0,
          clicks: s.clicks || 0,
          status: s.status,
        };
      }
      if (byService[sid]) {
        byService[sid].views = s.views || 0;
        byService[sid].clicks = s.clicks || 0;
        byService[sid].status = s.status;
      }
    });

    const gigBreakdown = Object.values(byService)
      .map((g) => {
        const views = Number(g.views) || 0;
        const clicks = Number(g.clicks) || 0;
        const conv =
          views > 0
            ? Math.round((g.orders / views) * 1000) / 10
            : clicks > 0
              ? Math.round((g.orders / clicks) * 1000) / 10
              : 0;
        let performance = "Average";
        if (g.orders >= 5 && conv >= 10) performance = "TOP PERFORMER";
        else if (g.orders <= 1 && (views > 20 || clicks > 10))
          performance = "UNDERPERFORMING";
        return {
          ...g,
          conversionRate: conv,
          performance,
        };
      })
      .sort((a, b) => b.earnings - a.earnings);

    // Top clients
    const byClient = {};
    completed.forEach((o) => {
      const c = o.clientId || {};
      const cid = String(c._id || o.clientId || "unknown");
      if (!byClient[cid]) {
        byClient[cid] = {
          name: c.displayName || c.fullName || "Client",
          revenue: 0,
          orders: 0,
        };
      }
      byClient[cid].revenue +=
        Number(o.sellerEarnings) || Number(o.subtotal) || 0;
      byClient[cid].orders += 1;
    });
    const topClients = Object.values(byClient)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Repeat clients
    const repeatClients = Object.values(byClient).filter((c) => c.orders > 1)
      .length;
    const uniqueClients = Object.keys(byClient).length;
    const repeatRate =
      uniqueClients > 0
        ? Math.round((repeatClients / uniqueClients) * 1000) / 10
        : 0;

    // Rating distribution
    const ratingBuckets = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    rated.forEach((o) => {
      const r = Math.round(Number(o.buyerRating));
      if (ratingBuckets[r] != null) ratingBuckets[r] += 1;
    });
    const ratingTotal = rated.length || 1;
    const ratingPills = {
      five: Math.round((ratingBuckets[5] / ratingTotal) * 100),
      four: Math.round((ratingBuckets[4] / ratingTotal) * 100),
      threeOrLess: Math.round(
        ((ratingBuckets[3] + ratingBuckets[2] + ratingBuckets[1]) /
          ratingTotal) *
          100
      ),
    };

    // Simple earnings series (by day in range)
    const seriesMap = {};
    completed.forEach((o) => {
      const day = new Date(o.createdAt || o.updatedAt)
        .toISOString()
        .slice(0, 10);
      seriesMap[day] =
        (seriesMap[day] || 0) +
        (Number(o.sellerEarnings) || Number(o.subtotal) || 0);
    });
    const earningsSeries = Object.entries(seriesMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const goalTarget = Number(user?.earningsGoal?.target) > 0
      ? Number(user.earningsGoal.target)
      : 6000;
    const goalPct = Math.min(100, Math.round((earnings / goalTarget) * 1000) / 10);
    const goalTargetDate = user?.earningsGoal?.targetDate || null;

    const ctr =
      totalViews > 0
        ? Math.round((totalClicks / totalViews) * 1000) / 10
        : 0;
    const conversionOverall =
      totalViews > 0
        ? Math.round((completed.length / totalViews) * 1000) / 10
        : 0;

    // Lightweight recommendations
    const recommendations = [];
    const topGig = gigBreakdown[0];
    if (topGig && topGig.conversionRate >= 10) {
      recommendations.push(
        `Strong performer: “${topGig.title || "Top gig"}” — consider a small price increase.`
      );
    }
    const weak = gigBreakdown.find((g) => g.performance === "UNDERPERFORMING");
    if (weak) {
      recommendations.push(
        `Underperforming: “${weak.title || "A service"}” — refresh title, images, or pause it.`
      );
    }
    if (lateRate > 5) {
      recommendations.push(
        "Late deliveries are elevated — tighten delivery times or add an express add-on."
      );
    }
    if (recommendations.length === 0) {
      recommendations.push(
        "Keep response times low and ask happy clients for reviews to lift ranking."
      );
    }

    return res.json({
      success: true,
      period,
      overview: {
        totalEarnings: Math.round(earnings * 100) / 100,
        ordersCompleted: completed.length,
        averageRating: Math.round(avgRating * 100) / 100,
        responseRate: Number(user?.metrics?.responseRate) || null,
        cancellationRate: cancelRate,
        activeGigs,
        orderVolume: orders.length,
        completionRate,
        avgDeliveryDays:
          avgDeliveryDays != null
            ? Math.round(avgDeliveryDays * 10) / 10
            : null,
        lateDeliveryRate: lateRate,
        availableBalance: Number(user?.sellerAvailableBalance) || 0,
      },
      earningsSeries,
      earningsByGig: gigBreakdown.slice(0, 10),
      topClients,
      orderStatus: {
        pending: orders.filter((o) => o.status === "pending").length,
        active: activeOrders.length,
        completed: completed.length,
        cancelled: cancelled.length,
        disputed: disputed.length,
      },
      clients: {
        avgResponseMinutes: null,
        repeatClients,
        repeatRate,
        uniqueClients,
      },
      ratings: {
        overall: Math.round(avgRating * 100) / 100,
        distribution: ratingPills,
        sampleReview:
          rated.find((o) => o.buyerReview)?.buyerReview || null,
      },
      gigs: {
        views: totalViews,
        clicks: totalClicks,
        ctr,
        conversionRate: conversionOverall,
        breakdown: gigBreakdown,
      },
      goals: {
        target: goalTarget,
        current: Math.round(earnings * 100) / 100,
        percent: goalPct,
        targetDate: goalTargetDate,
      },
      promos: Array.isArray(user?.promoLog) ? user.promoLog.slice(-10).reverse() : [],
      recommendations,
      level: user?.level || null,
    });
  } catch (err) {
    console.error("GET freelancer/analytics:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load analytics.",
    });
  }
});

module.exports = router;

// PATCH /api/freelancer/analytics/goals — custom earnings goal
router.patch("/analytics/goals", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const target = Number(req.body?.target);
    const targetDate = req.body?.targetDate
      ? new Date(req.body.targetDate)
      : null;

    if (!Number.isFinite(target) || target <= 0) {
      return res.status(400).json({
        success: false,
        message: "target must be a positive number.",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.earningsGoal = {
      target,
      targetDate: targetDate && !Number.isNaN(targetDate.getTime()) ? targetDate : null,
      updatedAt: new Date(),
    };
    await user.save();

    return res.json({
      success: true,
      goals: {
        target: user.earningsGoal.target,
        targetDate: user.earningsGoal.targetDate,
      },
    });
  } catch (err) {
    console.error("PATCH analytics/goals:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to save goal.",
    });
  }
});

// GET/POST light promo log (manual boost tracking until paid boosts exist)
router.get("/analytics/promos", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const user = await User.findById(userId).select("promoLog").lean();
    return res.json({
      success: true,
      promos: Array.isArray(user?.promoLog) ? user.promoLog : [],
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Failed to load promos." });
  }
});

router.post("/analytics/promos", auth, async (req, res) => {
  try {
    const userId = uid(req);
    const { name, cost, views, orders, notes, ended } = req.body || {};
    if (!name || String(name).trim().length < 2) {
      return res.status(400).json({ success: false, message: "Promo name required." });
    }

    const entry = {
      _id: new (require("mongoose").Types.ObjectId)(),
      name: String(name).trim().slice(0, 120),
      cost: Number(cost) || 0,
      views: Number(views) || 0,
      orders: Number(orders) || 0,
      notes: String(notes || "").slice(0, 500),
      ended: Boolean(ended),
      createdAt: new Date(),
    };

    await User.updateOne(
      { _id: userId },
      { $push: { promoLog: { $each: [entry], $slice: -40 } } }
    );

    const roas =
      entry.cost > 0 && entry.orders > 0
        ? Math.round(((entry.orders * 50) / entry.cost) * 100) // rough if order value unknown
        : null;

    return res.status(201).json({ success: true, promo: entry, roasHint: roas });
  } catch (err) {
    console.error("POST analytics/promos:", err);
    return res.status(500).json({ success: false, message: "Failed to save promo." });
  }
});
