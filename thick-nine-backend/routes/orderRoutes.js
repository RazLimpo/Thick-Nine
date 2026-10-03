// Add to thick-nine-backend — e.g. routes/orderRoutes.js
// GET /api/orders/:id — participant only (seller or client)
//
// Make sure this router is mounted at app.use("/api/orders", orderRoutes)

const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const authMiddleware = require("../middleware/auth");
const mongoose = require("mongoose");



// =====================================================
// 1. POST /api/orders/:id/remind — seller only
// =====================================================

router.post("/:id/remind", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const mongoose = require("mongoose");
    const Order = require("../models/Order");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.sellerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not your order." });
    }
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Reminders are only for pending orders.",
      });
    }

    order.lastReminderAt = new Date();
    await order.save();

    // Email / in-app notification can be plugged here later

    return res.status(200).json({
      success: true,
      message: "Reminder recorded. Buyer will be notified when messaging is enabled.",
      order: {
        _id: order._id,
        status: order.status,
        lastReminderAt: order.lastReminderAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/remind error:", error);
    return res.status(500).json({ success: false, message: "Failed to send reminder." });
  }
});



// =====================================================
// 2. POST /api/orders/:id/deliver — seller only
//    Body: { note?: string, files?: string[] }
//    Works for in_escrow and revision_requested
// =====================================================

router.post("/:id/deliver", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const mongoose = require("mongoose");
    const Order = require("../models/Order");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.sellerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not your order." });
    }

    const allowed = ["in_escrow", "revision_requested"];
    if (!allowed.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Delivery is only allowed for in-progress or revision orders.",
      });
    }

    const note = String(req.body?.note || "").slice(0, 2000);
    const files = Array.isArray(req.body?.files)
      ? req.body.files.map((f) => String(f).slice(0, 500)).filter(Boolean).slice(0, 20)
      : [];

    order.deliveryNote = note;
    order.deliveryFiles = files;
    order.deliveredAt = new Date();
    // Stay in_escrow until buyer accepts / complete flow; revision goes back to in_escrow
    if (order.status === "revision_requested") {
      order.status = "in_escrow";
    }
    await order.save();

    return res.status(200).json({
      success: true,
      message: "Delivery submitted.",
      order: {
        _id: order._id,
        status: order.status,
        deliveryNote: order.deliveryNote,
        deliveryFiles: order.deliveryFiles,
        deliveredAt: order.deliveredAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/deliver error:", error);
    return res.status(500).json({ success: false, message: "Failed to submit delivery." });
  }
});




// =====================================================
// 3. POST /api/orders/:id/extend — seller only
//    Body: { proposedDate?: string (ISO/date), reason?: string }
// =====================================================
router.post("/:id/extend", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.sellerId) !== String(userId)) {
      return res.status(403).json({ success: false, message: "Not your order." });
    }

    if (order.status !== "in_escrow") {
      return res.status(400).json({
        success: false,
        message: "Extensions are only for orders in escrow / in progress.",
      });
    }

    const reason = String(req.body?.reason || "").slice(0, 2000);
    let proposedDate = null;
    if (req.body?.proposedDate) {
      const d = new Date(req.body.proposedDate);
      if (!Number.isNaN(d.getTime())) proposedDate = d;
    }

    order.extensionRequest = {
      proposedDate,
      reason,
      requestedAt: new Date(),
      status: "pending",
    };
    await order.save();

    // Notify buyer later (email / in-app)

    return res.status(200).json({
      success: true,
      message: "Extension request submitted. Waiting for buyer response.",
      order: {
        _id: order._id,
        status: order.status,
        extensionRequest: order.extensionRequest,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/extend error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to request extension.",
    });
  }
});






// =====================================================
// 4. POST /api/orders/:id/extend/respond — client (buyer) only
//    Body: { action: "approve" | "reject" }
// =====================================================

router.post("/:id/extend/respond", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const action = String(req.body?.action || "").toLowerCase();
    const Notification = require("../models/Notification");

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({
        success: false,
        message: 'action must be "approve" or "reject".',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.clientId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can respond to an extension request.",
      });
    }

    const ext = order.extensionRequest;
    if (!ext || ext.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "There is no pending extension request on this order.",
      });
    }

    if (action === "approve") {
      order.extensionRequest.status = "approved";
      if (ext.proposedDate) {
        order.dueAt = ext.proposedDate;
      }
    } else {
      order.extensionRequest.status = "rejected";
    }

    await order.save();

    // ---- Seller in-app notification ----
    const short = String(order._id).slice(-6).toUpperCase();
    const approved = action === "approve";
    try {
      await Notification.create({
        userId: order.sellerId,
        type: approved ? "extension_approved" : "extension_rejected",
        title: approved ? "Extension approved" : "Extension rejected",
        message: approved
          ? `The buyer approved your time extension on order #${short}.`
          : `The buyer rejected your time extension on order #${short}.`,
        link: `/orders/${order._id}`,
        orderId: order._id,
        read: false,
      });
    } catch (notifyErr) {
      // Do not fail the main action if notification write fails
      console.error("Extension notify error:", notifyErr);
    }

    return res.status(200).json({
      success: true,
      message: approved ? "Extension approved." : "Extension rejected.",
      order: {
        _id: order._id,
        status: order.status,
        extensionRequest: order.extensionRequest,
        dueAt: order.dueAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/extend/respond error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to respond to extension.",
    });
  }
});




// =====================================================
// 5. GET /api/orders/:id
// =====================================================

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
