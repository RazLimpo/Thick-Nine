/**
 * routes/notificationRoutes.js
 * Mount: app.use("/api/notifications", require("./routes/notificationRoutes"));
 */

const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/auth");
const Notification = require("../models/Notification");

// GET /api/notifications — current user's notifications (newest first)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "20"), 10) || 20, 1),
      50
    );
    const unreadOnly = String(req.query.unread || "") === "1";

    const filter = { userId };
    if (unreadOnly) filter.read = false;

    const [items, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId, read: false }),
    ]);

    return res.status(200).json({
      success: true,
      unreadCount,
      notifications: items,
    });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load notifications.",
    });
  }
});

// PATCH /api/notifications/:id/read — mark one as read
router.patch("/:id/read", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    const n = await Notification.findOneAndUpdate(
      { _id: id, userId },
      { $set: { read: true } },
      { new: true }
    ).lean();

    if (!n) {
      return res.status(404).json({ success: false, message: "Not found." });
    }

    return res.status(200).json({ success: true, notification: n });
  } catch (error) {
    console.error("PATCH notification read error:", error);
    return res.status(500).json({ success: false, message: "Failed to update." });
  }
});

// POST /api/notifications/read-all — mark all read for user
router.post("/read-all", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    await Notification.updateMany({ userId, read: false }, { $set: { read: true } });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("POST notifications read-all error:", error);
    return res.status(500).json({ success: false, message: "Failed to update." });
  }
});

module.exports = router;
