// routes/presenceRoutes.js
// Shared presence: heartbeat writes onlineStatus + lastSeen;
// GET reads for other users (respects settings.showOnlineStatus).

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const User = require("../models/User");
const auth = require("../middleware/auth");

const STALE_MS = 90 * 1000; // no heartbeat for 90s → treat as offline for readers

function uid(req) {
  return req.user?.id || req.user?._id;
}

function normalizeStatus(s) {
  const v = String(s || "").toLowerCase();
  if (v === "online" || v === "away" || v === "offline") return v;
  return null;
}

/**
 * Effective status for *other* users viewing this person.
 * Hidden privacy → offline. Stale lastSeen → offline.
 */
function effectiveStatus(user) {
  if (!user) return "offline";
  if (user.settings && user.settings.showOnlineStatus === false) {
    return "offline";
  }
  const raw = normalizeStatus(user.onlineStatus) || "offline";
  if (raw === "offline") return "offline";
  const last = user.lastSeen ? new Date(user.lastSeen).getTime() : 0;
  if (!last || Date.now() - last > STALE_MS) return "offline";
  return raw;
}

/**
 * @route   POST /api/presence/heartbeat
 * @body    { status?: "online" | "away" }
 * @access  Private
 */
router.post("/heartbeat", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    let status = normalizeStatus(req.body?.status) || "online";
    if (status === "offline") status = "online"; // use /offline for that

    const user = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          onlineStatus: status,
          lastSeen: new Date(),
        },
      },
      { new: true }
    ).select("onlineStatus lastSeen settings.showOnlineStatus");

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success: true,
      status: user.onlineStatus || status,
      lastSeen: user.lastSeen,
      showOnlineStatus: user.settings?.showOnlineStatus !== false,
    });
  } catch (err) {
    console.error("presence heartbeat:", err.message);
    return res.status(500).json({ success: false, message: "Heartbeat failed." });
  }
});

/**
 * @route   POST /api/presence/offline
 * @access  Private — tab close / logout
 */
router.post("/offline", auth, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    await User.findByIdAndUpdate(userId, {
      $set: {
        onlineStatus: "offline",
        lastSeen: new Date(),
      },
    });

    return res.json({ success: true, status: "offline" });
  } catch (err) {
    console.error("presence offline:", err.message);
    return res.status(500).json({ success: false, message: "Offline update failed." });
  }
});

/**
 * @route   GET /api/presence?ids=id1,id2
 * @access  Public (marketplace / chat avatars)
 */
router.get("/", async (req, res) => {
  try {
    const raw = String(req.query.ids || "").trim();
    if (!raw) {
      return res.json({ success: true, presence: {} });
    }

    const ids = raw
      .split(",")
      .map((s) => s.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, 50);

    if (!ids.length) {
      return res.json({ success: true, presence: {} });
    }

    const users = await User.find({ _id: { $in: ids } })
      .select("onlineStatus lastSeen settings.showOnlineStatus")
      .lean();

    const presence = {};
    for (const u of users) {
      const id = String(u._id);
      presence[id] = {
        status: effectiveStatus(u),
        lastSeen: u.lastSeen || null,
      };
    }
    // Missing ids → offline
    for (const id of ids) {
      if (!presence[id]) {
        presence[id] = { status: "offline", lastSeen: null };
      }
    }

    return res.json({ success: true, presence });
  } catch (err) {
    console.error("presence batch:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load presence." });
  }
});

/**
 * @route   GET /api/presence/:userId
 * @access  Public
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ success: false, message: "Invalid user id." });
    }

    const user = await User.findById(userId)
      .select("onlineStatus lastSeen settings.showOnlineStatus")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    return res.json({
      success: true,
      userId: String(user._id),
      status: effectiveStatus(user),
      lastSeen: user.lastSeen || null,
    });
  } catch (err) {
    console.error("presence one:", err.message);
    return res.status(500).json({ success: false, message: "Failed to load presence." });
  }
});

module.exports = router;
