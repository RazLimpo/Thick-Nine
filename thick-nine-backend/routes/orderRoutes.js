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


/** Cloudinary on-the-fly watermark preview (no-op for non-Cloudinary URLs) */
function cloudinaryPreviewUrl(url) {
  if (!url || typeof url !== "string") return null;
  if (!/res\.cloudinary\.com/.test(url) || !/\/upload\//.test(url)) return null;
  // Blur + PREVIEW text overlay
  return url.replace(
    "/upload/",
    "/upload/e_blur:300/l_text:Arial_60_bold:PREVIEW,co_rgb:ffffff90,g_center/"
  );
}

function normalizeDeliveryFiles(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((f) => {
      if (typeof f === "string") {
        const url = String(f).slice(0, 500);
        if (!url) return null;
        return {
          url,
          previewUrl: cloudinaryPreviewUrl(url),
          name: url.split("/").pop() || "file",
          mime: "",
        };
      }
      if (f && typeof f === "object" && f.url) {
        const url = String(f.url).slice(0, 500);
        const previewUrl =
          f.previewUrl != null
            ? String(f.previewUrl).slice(0, 500)
            : cloudinaryPreviewUrl(url);
        return {
          url,
          previewUrl: previewUrl || null,
          name: String(f.name || url.split("/").pop() || "file").slice(0, 200),
          mime: String(f.mime || "").slice(0, 120),
        };
      }
      return null;
    })
    .filter(Boolean)
    .slice(0, 20);
}

/** Buyer must not see final URLs until completed */
function filesForRole(order, role) {
  const files = Array.isArray(order.deliveryFiles) ? order.deliveryFiles : [];
  const unlocked =
    role === "seller" || order.status === "completed";

  return files.map((f) => {
    const row = typeof f === "string" ? { url: f, name: f.split("/").pop() } : f || {};
    if (unlocked) {
      return {
        url: row.url,
        previewUrl: row.previewUrl || null,
        name: row.name || "file",
        mime: row.mime || "",
        locked: false,
      };
    }
    // Locked: preview only (or no URL)
    return {
      url: row.previewUrl || null,
      previewUrl: row.previewUrl || null,
      name: row.name || "file",
      mime: row.mime || "",
      locked: true,
    };
  });
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
        deliveredAt: o.deliveredAt || null,
        orderNumber: o.orderNumber || null,
        buyerRating: o.buyerRating != null ? o.buyerRating : null,
        buyerReview: o.buyerReview || "",
        ratedAt: o.ratedAt || null,
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
    const files = normalizeDeliveryFiles(filesRaw);

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
// 6. POST /api/orders/:id/rate — buyer only (after delivery / complete)
//    Body: { rating: 1-5, review?: string }
// =====================================================
router.post("/:id/rate", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const rating = Number(req.body?.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "rating must be a number from 1 to 5.",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.clientId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can rate this order.",
      });
    }

    const allowed = ["in_escrow", "revision_requested", "completed"];
    if (!allowed.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "This order cannot be rated yet.",
      });
    }

    if (order.buyerRating != null && order.ratedAt) {
      return res.status(400).json({
        success: false,
        message: "You already rated this order.",
      });
    }

    order.buyerRating = Math.round(rating);
    order.buyerReview = String(req.body?.review || "").slice(0, 2000);
    order.ratedAt = new Date();

    // Optional: mark completed when buyer rates after delivery
    if (order.status === "in_escrow" || order.status === "revision_requested") {
      if (order.deliveredAt) {
        order.status = "completed";
        if (!order.escrowReleaseDate) {
          const release = new Date();
          release.setDate(release.getDate() + 14);
          order.escrowReleaseDate = release;
        }
      }
    }

    await order.save();

    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        userId: order.sellerId,
        type: "order_rated",
        title: "New order rating",
        message: `A buyer rated an order ${order.buyerRating}/5.`,
        link: `/orders/${order._id}`,
        orderId: order._id,
        read: false,
      });
    } catch (_) {
      /* optional */
    }

    return res.status(200).json({
      success: true,
      message: "Thanks for your rating.",
      order: {
        _id: order._id,
        status: order.status,
        buyerRating: order.buyerRating,
        buyerReview: order.buyerReview,
        ratedAt: order.ratedAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/rate error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save rating.",
    });
  }
});



// =====================================================
// POST /api/orders/:id/dispute — buyer only
// Body: { reason: string, evidence?: string[] }
// =====================================================
router.post("/:id/dispute", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const reason = String(req.body?.reason || "").trim().slice(0, 2000);
    if (reason.length < 10) {
      return res.status(400).json({
        success: false,
        message: "Please describe the issue (at least 10 characters).",
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (String(order.clientId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can open a dispute.",
      });
    }

    if (order.status === "disputed") {
      return res.status(400).json({
        success: false,
        message: "A dispute is already open on this order.",
      });
    }
    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot dispute a cancelled order.",
      });
    }
    if (order.status === "completed") {
      return res.status(400).json({
        success: false,
        message: "Completed orders cannot be disputed here. Contact support.",
      });
    }

    const allowed = ["pending", "in_escrow", "revision_requested"];
    if (!allowed.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot dispute an order with status "${order.status}".`,
      });
    }

    const evidenceRaw = req.body?.evidence;
    const evidence = Array.isArray(evidenceRaw)
      ? evidenceRaw.map((u) => String(u).slice(0, 500)).filter(Boolean).slice(0, 10)
      : [];

    order.status = "disputed";
    order.disputeReason = reason;
    order.disputeEvidence = evidence;
    order.disputedAt = new Date();
    order.disputeResolution = "none";
    await order.save();

    try {
      const Notification = require("../models/Notification");
      const short = String(order._id).slice(-6).toUpperCase();
      await Notification.create({
        userId: order.sellerId,
        type: "order_disputed",
        title: "Order disputed",
        message: `Buyer opened a dispute on order #${short}.`,
        link: `/orders/${order._id}`,
        orderId: order._id,
        read: false,
      });
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: "Dispute submitted. Escrow remains held until resolved.",
      order: {
        _id: order._id,
        status: order.status,
        disputeReason: order.disputeReason,
        disputedAt: order.disputedAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/dispute error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to open dispute.",
    });
  }
});

// =====================================================
// 7. POST /api/orders/:id/complete — buyer accepts delivery & closes order
// =====================================================
router.post("/:id/complete", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
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
    if (String(order.clientId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer can accept and complete this order.",
      });
    }

    if (order.status === "completed") {
      return res.status(200).json({
        success: true,
        message: "Order is already completed.",
        order: { _id: order._id, status: order.status, escrowReleaseDate: order.escrowReleaseDate },
      });
    }

    if (order.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "A cancelled order cannot be completed.",
      });
    }
    if (order.status === "disputed") {
      return res.status(400).json({
        success: false,
        message: "This order is under dispute and cannot be completed until resolved.",
      });
    }

    // Prefer delivery submitted; allow complete from in_escrow / revision after work
    const openStatuses = ["in_escrow", "revision_requested", "pending"];
    if (!openStatuses.includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot complete an order with status "${order.status}".`,
      });
    }

    if (!order.deliveredAt) {
      return res.status(400).json({
        success: false,
        message: "The freelancer has not submitted delivery yet.",
      });
    }

    order.status = "completed";
    if (!order.escrowReleaseDate) {
      const release = new Date();
      release.setDate(release.getDate() + 14);
      order.escrowReleaseDate = release;
    }
    await order.save();

    try {
      const Notification = require("../models/Notification");
      const short = String(order._id).slice(-6).toUpperCase();
      await Notification.create({
        userId: order.sellerId,
        type: "order_completed",
        title: "Order completed",
        message: `The buyer accepted delivery and completed order #${short}.`,
        link: `/orders/${order._id}`,
        orderId: order._id,
        read: false,
      });
    } catch (_) {
      /* optional */
    }

    return res.status(200).json({
      success: true,
      message: "Order marked as completed. Thank you!",
      order: {
        _id: order._id,
        status: order.status,
        escrowReleaseDate: order.escrowReleaseDate,
        deliveredAt: order.deliveredAt,
      },
    });
  } catch (error) {
    console.error("POST /api/orders/:id/complete error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to complete order.",
    });
  }
});

// =====================================================
// 5. GET /api/orders/:id — participant only
// =====================================================

// =====================================================
// GET /api/orders/:id/invoice — buyer or seller; HTML invoice (PDF engine later)
// =====================================================
router.get("/:id/invoice", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid order ID." });
    }

    const order = await Order.findById(id)
      .populate("clientId", "fullName displayName email")
      .populate("sellerId", "fullName displayName email")
      .populate("serviceId", "title");

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }

    const isClient = String(order.clientId?._id || order.clientId) === String(userId);
    const isSeller = String(order.sellerId?._id || order.sellerId) === String(userId);
    if (!isClient && !isSeller) {
      return res.status(403).json({
        success: false,
        message: "Only the buyer or seller can download this invoice.",
      });
    }

    // Prefer completed; allow download after delivery for transparency
    const okStatus = ["completed", "in_escrow", "revision_requested", "disputed", "cancelled"];
    if (!okStatus.includes(order.status) && !order.deliveredAt) {
      return res.status(400).json({
        success: false,
        message: "Invoice is available after delivery or completion.",
      });
    }

    if (!order.invoiceNumber) {
      const y = new Date().getFullYear();
      const seq = String(order._id).slice(-6).toUpperCase();
      order.invoiceNumber = `INV-${y}-${seq}`;
      order.invoicedAt = order.invoicedAt || new Date();
      await order.save();
    }

    const client = order.clientId || {};
    const seller = order.sellerId || {};
    const serviceTitle =
      (order.serviceId && order.serviceId.title) ||
      "Service";
    const buyerName = client.displayName || client.fullName || "Buyer";
    const sellerName = seller.displayName || seller.fullName || "Seller";
    const money = (n) =>
      `$${Number(n || 0).toFixed(2)}`;
    const d = (iso) =>
      iso ? new Date(iso).toLocaleString() : "—";

    const addons = Array.isArray(order.selectedAddons)
      ? order.selectedAddons
          .map(
            (a) =>
              `<tr><td style="padding:6px 8px;border-bottom:1px solid #eee">${String(
                a.title || "Add-on"
              )}</td><td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(
                a.price
              )}</td></tr>`
          )
          .join("")
      : "";

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${order.invoiceNumber} — Thick 9</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #222; max-width: 720px; margin: 32px auto; padding: 0 16px; }
    h1 { font-size: 1.5rem; margin: 0 0 4px; }
    .muted { color: #666; font-size: 0.9rem; }
    .row { display: flex; justify-content: space-between; gap: 24px; margin: 24px 0; flex-wrap: wrap; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th { text-align: left; border-bottom: 2px solid #222; padding: 8px; }
    .totals td { padding: 6px 8px; }
    .totals .grand { font-weight: 700; font-size: 1.1rem; }
    @media print { body { margin: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <p class="no-print muted"><button onclick="window.print()">Print / Save as PDF</button></p>
  <h1>Invoice ${order.invoiceNumber}</h1>
  <p class="muted">Thick 9 · Platform receipt</p>
  <p class="muted">Issued ${d(order.invoicedAt)} · Order ${String(order._id)}</p>
  <div class="row">
    <div>
      <strong>Bill to</strong><br/>
      ${buyerName}<br/>
      <span class="muted">${client.email || ""}</span>
    </div>
    <div>
      <strong>Provider</strong><br/>
      ${sellerName}<br/>
      <span class="muted">${seller.email || ""}</span>
    </div>
  </div>
  <table>
    <thead>
      <tr><th>Description</th><th style="text-align:right">Amount</th></tr>
    </thead>
    <tbody>
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${serviceTitle}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">${money(
          order.basePackagePrice
        )}</td>
      </tr>
      ${addons}
    </tbody>
  </table>
  <table class="totals" style="margin-top:20px;max-width:320px;margin-left:auto">
    <tr><td>Subtotal</td><td style="text-align:right">${money(order.subtotal)}</td></tr>
    <tr><td>Buyer service fee</td><td style="text-align:right">${money(
      order.buyerServiceFee
    )}</td></tr>
    <tr class="grand"><td>Total paid</td><td style="text-align:right">${money(
      order.grandTotal
    )}</td></tr>
    <tr><td class="muted">Seller earnings (ref)</td><td class="muted" style="text-align:right">${money(
      order.sellerEarnings
    )}</td></tr>
  </table>
  <p class="muted" style="margin-top:32px">Status: ${String(
    order.status
  )} · Payment: ${String(order.paymentMethod || "—")}</p>
  <p class="muted">This document is a platform receipt for the amounts recorded on the order.</p>
</body>
</html>`;

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${order.invoiceNumber}.html"`
    );
    return res.status(200).send(html);
  } catch (error) {
    console.error("GET /api/orders/:id/invoice error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to generate invoice.",
    });
  }
});

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

    const orderOut = { ...order };
    orderOut.deliveryFiles = filesForRole(order, role);
    // Hide final-only paths already handled; keep dispute fields visible

    return res.status(200).json({
      success: true,
      role,
      order: orderOut,
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
