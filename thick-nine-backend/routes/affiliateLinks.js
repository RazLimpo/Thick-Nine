// routes/affiliateLinks.js
// Mounted at: app.use("/api/affiliate/links", affiliateLinksRouter)

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const User = require("../models/User");

function uid(req) {
  return req.user?.id || req.user?._id;
}

function formatLink(link) {
  const id = link._id || link.id;
  const dateStr =
    link.date ||
    (link.createdAt
      ? new Date(link.createdAt).toLocaleDateString()
      : new Date().toLocaleDateString());
  return {
    _id: id,
    id,
    name: link.name || "Untitled Link",
    url: link.url,
    clicks: Number(link.clicks) || 0,
    conversions: Number(link.conversions) || 0,
    date: dateStr,
    createdAt: link.createdAt || null,
  };
}

// GET /api/affiliate/links
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(uid(req)).select("savedLinks");
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }
    const links = (user.savedLinks || []).map(formatLink);
    return res.json({ success: true, links });
  } catch (err) {
    console.error("Error fetching links:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

// GET /api/affiliate/links/performance  (must stay before /:id)
router.get("/performance", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(uid(req)).select(
      "savedLinks metrics analytics"
    );
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const links = user.savedLinks || [];
    let totalClicks = links.reduce((acc, link) => acc + (Number(link.clicks) || 0), 0);
    let totalConversions = links.reduce(
      (acc, link) => acc + (Number(link.conversions) || 0),
      0
    );

    // Fallback to profile-level metrics when per-link counters are still 0
    if (totalClicks === 0) {
      totalClicks =
        Number(user.metrics?.affiliateClicks) ||
        Number(user.analytics?.totalClicks) ||
        0;
    }

    const conversionRate =
      totalClicks > 0
        ? parseFloat(((totalConversions / totalClicks) * 100).toFixed(2))
        : 0;

    return res.json({
      success: true,
      performance: {
        totalClicks,
        totalConversions,
        conversionRate,
        links: links.map((link) => formatLink(link)),
      },
    });
  } catch (err) {
    console.error("Error fetching link performance:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

// POST /api/affiliate/links
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { name, url } = req.body || {};

    if (!url || !String(url).trim()) {
      return res.status(400).json({ success: false, msg: "URL is required" });
    }

    const user = await User.findById(uid(req));
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const now = new Date();
    const newLink = {
      _id: new mongoose.Types.ObjectId(),
      name: String(name || "Untitled Link").trim().slice(0, 120),
      url: String(url).trim(),
      clicks: 0,
      conversions: 0,
      date: now.toLocaleDateString(),
      createdAt: now,
    };

    user.savedLinks = user.savedLinks || [];
    user.savedLinks.push(newLink);
    await user.save();

    return res.json({ success: true, link: formatLink(newLink) });
  } catch (err) {
    console.error("Error saving link:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

// DELETE /api/affiliate/links/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(uid(req));
    if (!user) {
      return res.status(404).json({ success: false, msg: "User not found" });
    }

    const before = (user.savedLinks || []).length;
    user.savedLinks = (user.savedLinks || []).filter((link) => {
      const lid = String(link._id || link.id || "");
      return lid !== String(id);
    });

    if (user.savedLinks.length === before) {
      return res.status(404).json({ success: false, msg: "Link not found" });
    }

    await user.save();
    return res.json({ success: true, msg: "Link removed successfully" });
  } catch (err) {
    console.error("Error deleting link:", err);
    return res.status(500).json({ success: false, msg: "Server error" });
  }
});

module.exports = router;
