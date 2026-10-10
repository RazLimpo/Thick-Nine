/**
 * routes/offerRoutes.js
 * Mount: app.use("/api/offers", require("./routes/offerRoutes"));
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const CustomOffer = require("../models/CustomOffer");
const Service = require("../models/Service");
const Conversation = require("../models/Conversation");
const DirectMessage = require("../models/DirectMessage");

function uid(req) {
  return req.user?.id || req.user?._id;
}

// GET /api/offers?serviceId=  — seller's / buyer's offers
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const filter = {
      $or: [{ sellerId: userId }, { buyerId: userId }],
    };
    if (req.query.serviceId && mongoose.Types.ObjectId.isValid(String(req.query.serviceId))) {
      filter.serviceId = req.query.serviceId;
    }

    const offers = await CustomOffer.find(filter)
      .sort({ createdAt: -1 })
      .limit(40)
      .populate("buyerId", "fullName displayName avatar")
      .populate("sellerId", "fullName displayName avatar")
      .lean();

    return res.status(200).json({ success: true, offers });
  } catch (error) {
    console.error("GET offers error:", error);
    return res.status(500).json({ success: false, message: "Failed to load offers." });
  }
});

// POST /api/offers — seller creates custom offer for a buyer
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });

    const buyerId = req.body?.buyerId;
    const serviceId = req.body?.serviceId || null;
    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const price = Number(req.body?.price);
    const deliveryDays = Number(req.body?.deliveryDays) || 3;
    const expiresInDays = Number(req.body?.expiresInDays) || 7;

    if (!buyerId || !mongoose.Types.ObjectId.isValid(buyerId)) {
      return res.status(400).json({ success: false, message: "buyerId required." });
    }
    if (!title) {
      return res.status(400).json({ success: false, message: "title required." });
    }
    if (!price || price < 1) {
      return res.status(400).json({ success: false, message: "price must be ≥ 1." });
    }
    if (String(buyerId) === String(userId)) {
      return res.status(400).json({ success: false, message: "Cannot offer to yourself." });
    }

    if (serviceId) {
      if (!mongoose.Types.ObjectId.isValid(serviceId)) {
        return res.status(400).json({ success: false, message: "Invalid serviceId." });
      }
      const svc = await Service.findById(serviceId).select("sellerId title").lean();
      const owner = svc?.sellerId?._id || svc?.sellerId;
      if (!svc || String(owner) !== String(userId)) {
        return res.status(403).json({ success: false, message: "Not your service." });
      }
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, buyerId], $size: 2 },
    });
    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, buyerId],
        serviceId: serviceId || null,
      });
    }

    const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);

    const offer = await CustomOffer.create({
      sellerId: userId,
      buyerId,
      serviceId,
      conversationId: conversation._id,
      title: title.slice(0, 120),
      description: description.slice(0, 2000),
      price,
      deliveryDays,
      status: "pending",
      expiresAt,
    });

    // OFFER_ID line is required for messages "Accept & Pay" button
    const body = [
      `📋 Custom offer: ${offer.title}`,
      `OFFER_ID:${offer._id}`,
      `Price: $${offer.price}`,
      `Delivery: ${offer.deliveryDays} day(s)`,
      description ? `\n${description.slice(0, 500)}` : "",
      `\nExpires: ${expiresAt.toLocaleDateString()}`,
    ]
      .filter(Boolean)
      .join("\n");

    await DirectMessage.create({
      conversationId: conversation._id,
      senderId: userId,
      body: body.slice(0, 4000),
      readBy: [userId],
    });
    conversation.lastMessage = `Custom offer: ${offer.title} — $${offer.price}`;
    conversation.lastMessageAt = new Date();
    conversation.lastSenderId = userId;
    if (serviceId) conversation.serviceId = serviceId;
    await conversation.save();

    try {
      const Notification = require("../models/Notification");
      await Notification.create({
        userId: buyerId,
        type: "custom_offer",
        title: "New custom offer",
        message: `${title} — $${price}`,
        link: `/messages?c=${conversation._id}`,
        meta: { offerId: offer._id },
      });
    } catch (_) {
      /* notification model optional */
    }

    return res.status(201).json({
      success: true,
      offer,
      conversationId: conversation._id,
    });
  } catch (error) {
    console.error("POST offer error:", error);
    return res.status(500).json({ success: false, message: "Failed to create offer." });
  }
});

// PATCH /api/offers/:id — accept / decline / withdraw
router.patch("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    const action = String(req.body?.action || "").toLowerCase();

    if (!userId) return res.status(401).json({ success: false, message: "Unauthorized." });
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const offer = await CustomOffer.findById(id);
    if (!offer) {
      return res.status(404).json({ success: false, message: "Offer not found." });
    }

    if (offer.status !== "pending") {
      return res.status(400).json({ success: false, message: `Offer is already ${offer.status}.` });
    }
    if (offer.expiresAt && new Date() > offer.expiresAt) {
      offer.status = "expired";
      await offer.save();
      return res.status(400).json({ success: false, message: "Offer expired." });
    }

    if (action === "accept" && String(offer.buyerId) === String(userId)) {
      offer.status = "accepted";
    } else if (action === "decline" && String(offer.buyerId) === String(userId)) {
      offer.status = "declined";
    } else if (action === "withdraw" && String(offer.sellerId) === String(userId)) {
      offer.status = "withdrawn";
    } else {
      return res.status(403).json({ success: false, message: "Not allowed for this action." });
    }

    await offer.save();
    return res.status(200).json({ success: true, offer });
  } catch (error) {
    console.error("PATCH offer error:", error);
    return res.status(500).json({ success: false, message: "Failed to update offer." });
  }
});

module.exports = router;
