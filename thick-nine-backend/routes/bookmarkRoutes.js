// routes/bookmarkRoutes.js
// Mount: app.use("/api/bookmarks", require("./routes/bookmarkRoutes"));

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Bookmark = require("../models/Bookmark");

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

function uid(req) {
  return req.user?.id || req.user?._id || null;
}

/**
 * POST /api/bookmarks
 * body: { itemType: 'Service'|'Job'|'User', itemId: string }
 */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { itemType, itemId } = req.body || {};
    if (!itemType || !itemId) {
      return res
        .status(400)
        .json({ success: false, message: "itemType and itemId are required." });
    }
    if (!["Service", "Job", "User"].includes(String(itemType))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid itemType." });
    }
    if (!isValidObjectId(itemId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid itemId." });
    }

    try {
      const bm = await Bookmark.create({
        user: userId,
        itemType,
        itemId,
      });
      return res.status(201).json({ success: true, bookmark: bm });
    } catch (err) {
      if (err && err.code === 11000) {
        return res
          .status(409)
          .json({ success: false, message: "Already bookmarked." });
      }
      console.error("POST /api/bookmarks error:", err);
      return res
        .status(500)
        .json({ success: false, message: "Failed to create bookmark." });
    }
  } catch (error) {
    console.error("POST /api/bookmarks unexpected:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * DELETE /api/bookmarks
 * body: { itemType, itemId }
 */
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { itemType, itemId } = req.body || {};
    if (!itemType || !itemId) {
      return res
        .status(400)
        .json({ success: false, message: "itemType and itemId are required." });
    }
    if (!["Service", "Job", "User"].includes(String(itemType))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid itemType." });
    }
    if (!isValidObjectId(itemId)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid itemId." });
    }

    const deleted = await Bookmark.findOneAndDelete({
      user: userId,
      itemType,
      itemId,
    });

    if (!deleted) {
      return res
        .status(404)
        .json({ success: false, message: "Bookmark not found." });
    }

    return res
      .status(200)
      .json({ success: true, message: "Bookmark removed." });
  } catch (error) {
    console.error("DELETE /api/bookmarks error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

/**
 * GET /api/bookmarks?itemType=Service
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { itemType } = req.query;
    const filter = { user: userId };
    if (itemType && ["Service", "Job", "User"].includes(String(itemType))) {
      filter.itemType = String(itemType);
    }

    const bookmarks = await Bookmark.find(filter)
      .sort({ savedAt: -1 })
      .lean();

    return res.status(200).json({ success: true, bookmarks });
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookmarks." });
  }
});

/**
 * GET /api/bookmarks/check?itemType=Service&itemId=...
 * Returns { favorited: boolean }
 * IMPORTANT: register /check before any /:id routes if you add those later.
 */
router.get("/check", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const { itemType, itemId } = req.query;
    if (!itemType || !itemId) {
      return res.status(400).json({
        success: false,
        message: "itemType and itemId query params are required.",
      });
    }
    if (!["Service", "Job", "User"].includes(String(itemType))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid itemType." });
    }
    if (!isValidObjectId(String(itemId))) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid itemId." });
    }

    const exists = await Bookmark.exists({
      user: userId,
      itemType: String(itemType),
      itemId: String(itemId),
    });

    return res.status(200).json({ success: true, favorited: Boolean(exists) });
  } catch (error) {
    console.error("GET /api/bookmarks/check error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
});

module.exports = router;
