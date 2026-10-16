// thick-nine-backend/routes/presenceRoutes.js
// Universal online / away / offline presence API

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const authMiddleware = require("../middleware/auth");

/** Consider user offline if lastSeen older than this (ms). */
const ONLINE_TTL_MS = 2 * 60 * 1000; // 2 minutes

const VALID_STATUS = ["online", "away", "offline"];

function isValidObjectId(id) {
  return id && mongoose.Types.ObjectId.isValid(id);
}

/**
 * Derive effective status from stored fields.
 * online/away only count if lastSeen is fresh.
 */
function effectiveStatus(user) {
  if (!user) return "offline";
  const raw = user.onlineStatus || "offline";
  if (raw === "offline") return "offline";

  if (!user.lastSeen) {
    // No heartbeat yet — trust stored flag only for a short grace if online
    return raw === "online" || raw === "away" ? raw : "offline";
  }

  const age = Date.now() - new Date(user.lastSeen).getTime();
  if (age > ONLINE_TTL_MS) return "offline";
  return VALID_STATUS.includes(raw) ? raw : "offline";
}

function presencePayload(user) {
  const status = effectiveStatus(user);
  return {
    userId: String(user._id),
    status,
    online: status === "online",
    away: status === "away",
    lastSeen: user.lastSeen || null,
  };
}

// =====================================================
// POST /api/presence/heartbeat  (auth) — tab is active
// =====================================================
router.post("/heartbeat", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const status =
      req.body?.status === "away" ? "away" : "online";

    const user = await User.findByIdAndUpdate(
      userId,
      {
        onlineStatus: status,
        lastSeen: new Date(),
      },
      { new: true }
    ).select("_id onlineStatus lastSeen");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      ...presencePayload(user),
    });
  } catch (error) {
    console.error("POST /api/presence/heartbeat error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update presence.",
    });
  }
});

// =====================================================
// POST /api/presence/offline  (auth) — tab closing / logout
// =====================================================
router.post("/offline", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      {
        onlineStatus: "offline",
        lastSeen: new Date(),
      },
      { new: true }
    ).select("_id onlineStatus lastSeen");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      ...presencePayload(user),
    });
  } catch (error) {
    console.error("POST /api/presence/offline error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to set offline.",
    });
  }
});

// =====================================================
// GET /api/presence/:userId  — single user (public-ish)
// =====================================================
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!isValidObjectId(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user ID." });
    }

    const user = await User.findById(userId)
      .select("_id onlineStatus lastSeen")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.status(200).json({
      success: true,
      ...presencePayload(user),
    });
  } catch (error) {
    console.error("GET /api/presence/:userId error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load presence.",
    });
  }
});

// =====================================================
// GET /api/presence?ids=id1,id2,id3  — batch for cards/inbox
// =====================================================
router.get("/", async (req, res) => {
  try {
    const raw = String(req.query.ids || "").trim();
    if (!raw) {
      return res.status(400).json({
        success: false,
        message: "Query param ids is required (comma-separated user ids).",
      });
    }

    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter((id) => isValidObjectId(id))
      .slice(0, 100);

    if (ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid user ids provided.",
      });
    }

    const users = await User.find({ _id: { $in: ids } })
      .select("_id onlineStatus lastSeen")
      .lean();

    const map = {};
    users.forEach((u) => {
      map[String(u._id)] = presencePayload(u);
    });

    // Fill missing ids as offline
    ids.forEach((id) => {
      if (!map[id]) {
        map[id] = {
          userId: id,
          status: "offline",
          online: false,
          away: false,
          lastSeen: null,
        };
      }
    });

    return res.status(200).json({
      success: true,
      presence: map,
    });
  } catch (error) {
    console.error("GET /api/presence error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load presence batch.",
    });
  }
});

module.exports = router;
module.exports.effectiveStatus = effectiveStatus;
module.exports.ONLINE_TTL_MS = ONLINE_TTL_MS;
