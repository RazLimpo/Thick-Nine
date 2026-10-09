// routes/orderRoutes.js
// Mount: app.use("/api/orders", orderRoutes);
// IMPORTANT: static paths (/mine) MUST come before /:id routes

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Order = require("../models/Order");
const authMiddleware = require("../middleware/auth");

function uid(req) {
  return req.user?.id || req.user?._id;
}

// =====================================================
// 0. GET /api/orders/mine — seller's orders (all services)
//    MUST be registered BEFORE /:id
// =====================================================
router.get("/mine", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const limit = Math.min(Number(req.query.limit) || 50, 200);

    const orders = await Order.find({ sellerId: userId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .populate("clientId", "fullName displayName avatar")
      .populate("serviceId", "title images")
      .lean();

    const mapped = orders.map((o) => {
      const buyer = o.clientId || {};
      const service = o.serviceId || {};
      return {
        _id: o._id,
        status: o.status,
        packageName:
          o.packageName ||
          (Array.isArray(o.selectedAddons) && o.selectedAddons[0]?.title) ||
          service.title ||
          "Package",
        amount: o.sellerEarnings ?? o.subtotal ?? o.grandTotal ?? 0,
        dueAt: o.dueAt || o.escrowReleaseDate || null,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
        orderNumber: o.orderNumber || null,
        buyer: {
          _id: buyer._id || null,
          name:
            buyer.fullName || buyer.displayName || buyer.name || "Client",
          avatar: buyer.avatar || "/default-avatar.png",
        },
        service: service._id
          ? { _id: service._id, title: service.title || "" }
          : null,
      };
    });

    return res.status(200).json({ success: true, orders: mapped });
  } catch (error) {
    console.error("GET /api/orders/mine error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to load orders." });
  }
});

// =====================================================
// 1. POST /api/orders/:id/remind — seller only
// =====================================================
router.post("/:id/remind", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
    if (String(order.sellerId) !== String(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not your order." });
    }
    if (order.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Reminders are only for pending orders.",
      });
    }

    order.lastReminderAt = new Date();
    await order.save();

    return res.status(200).json({
      success: true,
      message:
        "Reminder recorded. Buyer will be notified when messaging is enabled.",
      order: {
        _id: order._id,
        status: order.status,
        lastReminderAt: order.lastReminderAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/remind error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send reminder." });
  }
});

// =====================================================
// 2. POST /api/orders/:id/deliver — seller only
//    Body: { note?: string, deliveryNote?: string, files?: string[], deliveryFiles?: string[] }
// =====================================================
router.post("/:id/deliver", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
    if (String(order.sellerId) !== String(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not your order." });
    }

    const allowed = ["in_escrow", "revision_requested"];
    if (!allowed.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Delivery is only allowed for in-progress or revision orders.",
      });
    }

    const note = String(
      req.body?.deliveryNote || req.body?.note || ""
    ).slice(0, 2000);
    const filesRaw = req.body?.deliveryFiles || req.body?.files;
    const files = Array.isArray(filesRaw)
      ? filesRaw
          .map((f) => String(f).slice(0, 500))
          .filter(Boolean)
          .slice(0, 20)
      : [];

    order.deliveryNote = note;
    order.deliveryFiles = files;
    order.deliveredAt = new Date();
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
    return res
      .status(500)
      .json({ success: false, message: "Failed to submit delivery." });
  }
});

// =====================================================
// 3. POST /api/orders/:id/extend — seller only
// =====================================================
router.post("/:id/extend", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }
    if (String(order.sellerId) !== String(userId)) {
      return res
        .status(403)
        .json({ success: false, message: "Not your order." });
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
// 4. POST /api/orders/:id/extend/respond — buyer only
// =====================================================
router.post("/:id/extend/respond", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    const action = String(req.body?.action || "").toLowerCase();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID." });
    }
    if (action !== "approve" && action !== "reject") {
      return res.status(400).json({
        success: false,
        message: 'action must be "approve" or "reject".',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
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

    const short = String(order._id).slice(-6).toUpperCase();
    const approved = action === "approve";
    try {
      const Notification = require("../models/Notification");
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
// 5. GET /api/orders/:id — participant only
// =====================================================
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id)
      .populate("clientId", "fullName displayName avatar email")
      .populate("sellerId", "fullName displayName avatar")
      .populate("serviceId", "title images category status")
      .lean();

    if (!order) {
      return res
        .status(404)
        .json({ success: false, message: "Order not found." });
    }

    const sellerId = String(order.sellerId?._id || order.sellerId);
    const clientId = String(order.clientId?._id || order.clientId);
    const uidStr = String(userId);

    let role = null;
    if (sellerId === uidStr) role = "seller";
    else if (clientId === uidStr) role = "client";
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
