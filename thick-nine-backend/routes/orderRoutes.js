// Add to thick-nine-backend — e.g. routes/orderRoutes.js
// GET /api/orders/:id — participant only (seller or client)
//
// Make sure this router is mounted at app.use("/api/orders", orderRoutes)

const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const authMiddleware = require("../middleware/auth");
const mongoose = require("mongoose");

// GET /api/orders/:id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id)
      .populate("clientId", "fullName displayName avatar email")
      .populate("sellerId", "fullName displayName avatar")
      .populate("serviceId", "title images category status")
      .lean();

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const sellerId = String(order.sellerId?._id || order.sellerId);
    const clientId = String(order.clientId?._id || order.clientId);
    const uid = String(userId);

    let role = null;
    if (sellerId === uid) role = "seller";
    else if (clientId === uid) role = "client";
    else {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this order.",
      });
    }

    return res.status(200).json({
      success: true,
      role,
      order,
    });
  } catch (error) {
    console.error("GET /api/orders/:id error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load order.",
    });
  }
});

module.exports = router;

// If you already have orderRoutes.js, paste only the router.get("/:id", ...)
// handler into that file — do not create a second router mount.
