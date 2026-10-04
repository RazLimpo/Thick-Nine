/**
 * routes/messageRoutes.js
 * User-to-user DMs only (uses Conversation + DirectMessage)
 * Does NOT use models/Message.js (that stays for Contact Us → admin)
 *
 * Mount: app.use("/api/messages", require("./routes/messageRoutes"));
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const DirectMessage = require("../models/DirectMessage");
const User = require("../models/User");

// -------------------------------------------------------
// GET /api/messages/conversations — inbox for current user
// -------------------------------------------------------
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const filter = { participants: userId };
    if (req.query.orderId && mongoose.Types.ObjectId.isValid(String(req.query.orderId))) {
      filter.orderId = req.query.orderId;
    }
    if (req.query.serviceId && mongoose.Types.ObjectId.isValid(String(req.query.serviceId))) {
      filter.serviceId = req.query.serviceId;
    }

    const list = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .populate("participants", "fullName displayName avatar")
      .lean();

    const mapped = await Promise.all(
      list.map(async (c) => {
        const other = (c.participants || []).find(
          (p) => String(p._id) !== String(userId)
        );
        const unread = await DirectMessage.countDocuments({
          conversationId: c._id,
          senderId: { $ne: userId },
          readBy: { $ne: userId },
        });
        return {
          _id: c._id,
          otherUser: other
            ? {
                _id: other._id,
                name: other.displayName || other.fullName || "User",
                avatar: other.avatar || "/default-avatar.png",
              }
            : null,
          lastMessage: c.lastMessage || "",
          lastMessageAt: c.lastMessageAt,
          orderId: c.orderId || null,
          serviceId: c.serviceId || null,
          unread,
        };
      })
    );

    return res.status(200).json({ success: true, conversations: mapped });
  } catch (error) {
    console.error("GET conversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load conversations.",
    });
  }
});

// -------------------------------------------------------
// POST /api/messages/conversations — start or get existing 1:1
// Body: { recipientId, orderId?, serviceId?, initialMessage? }
// -------------------------------------------------------
router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const recipientId = req.body?.recipientId;
    const orderId = req.body?.orderId || null;
    const serviceId = req.body?.serviceId || null;
    const initialMessage = String(req.body?.initialMessage || "").trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!recipientId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      return res.status(400).json({
        success: false,
        message: "recipientId is required.",
      });
    }
    if (String(recipientId) === String(userId)) {
      return res.status(400).json({
        success: false,
        message: "Cannot message yourself.",
      });
    }

    const recipient = await User.findById(recipientId).select("_id");
    if (!recipient) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
        orderId: orderId || null,
        serviceId: serviceId || null,
        lastMessage: "",
        lastMessageAt: new Date(),
        lastSenderId: null,
      });
    } else if (orderId || serviceId) {
      if (orderId) conversation.orderId = orderId;
      if (serviceId) conversation.serviceId = serviceId;
      await conversation.save();
    }

    if (initialMessage) {
      const msg = await DirectMessage.create({
        conversationId: conversation._id,
        senderId: userId,
        body: initialMessage.slice(0, 4000),
        readBy: [userId],
      });
      conversation.lastMessage = msg.body.slice(0, 200);
      conversation.lastMessageAt = msg.createdAt;
      conversation.lastSenderId = userId;
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      conversation,
    });
  } catch (error) {
    console.error("POST conversations error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start conversation.",
    });
  }
});

// -------------------------------------------------------
// GET /api/messages/conversations/:id — messages in thread
// -------------------------------------------------------
router.get("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const conversation = await Conversation.findById(id)
      .populate("participants", "fullName displayName avatar")
      .lean();

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const isParticipant = (conversation.participants || []).some(
      (p) => String(p._id || p) === String(userId)
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "50"), 10) || 50, 1),
      100
    );

    const messages = await DirectMessage.find({ conversationId: id })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("senderId", "fullName displayName avatar")
      .lean();

    await DirectMessage.updateMany(
      {
        conversationId: id,
        senderId: { $ne: userId },
        readBy: { $ne: userId },
      },
      { $addToSet: { readBy: userId } }
    );

    const other = (conversation.participants || []).find(
      (p) => String(p._id) !== String(userId)
    );

    return res.status(200).json({
      success: true,
      conversation: {
        _id: conversation._id,
        orderId: conversation.orderId,
        serviceId: conversation.serviceId,
        otherUser: other
          ? {
              _id: other._id,
              name: other.displayName || other.fullName || "User",
              avatar: other.avatar || "/default-avatar.png",
            }
          : null,
      },
      messages: messages.map((m) => {
        const sid = String(m.senderId?._id || m.senderId);
        const mine = sid === String(userId);
        const readBy = Array.isArray(m.readBy)
          ? m.readBy.map((id) => String(id))
          : [];
        // Read if someone other than the sender has read it
        const isRead = readBy.some((id) => id !== sid);
        return {
          _id: m._id,
          body: m.body,
          createdAt: m.createdAt,
          senderId: m.senderId?._id || m.senderId,
          senderName:
            m.senderId?.displayName || m.senderId?.fullName || "User",
          senderAvatar: m.senderId?.avatar || "/default-avatar.png",
          mine,
          status: mine ? (isRead ? "read" : "sent") : "received",
          readBy,
        };
      }),
    });
  } catch (error) {
    console.error("GET conversation thread error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to load messages.",
    });
  }
});

// -------------------------------------------------------
// POST /api/messages/conversations/:id/messages — send
// Body: { body: string }
// -------------------------------------------------------
router.post("/conversations/:id/messages", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    const { id } = req.params;
    const body = String(req.body?.body || "").trim();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    if (!body) {
      return res.status(400).json({
        success: false,
        message: "Message body required.",
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found.",
      });
    }

    const isParticipant = (conversation.participants || []).some(
      (p) => String(p) === String(userId)
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const msg = await DirectMessage.create({
      conversationId: id,
      senderId: userId,
      body: body.slice(0, 4000),
      readBy: [userId],
    });

    conversation.lastMessage = body.slice(0, 200);
    conversation.lastMessageAt = msg.createdAt;
    conversation.lastSenderId = userId;
    await conversation.save();

    return res.status(201).json({
      success: true,
      message: {
        _id: msg._id,
        body: msg.body,
        createdAt: msg.createdAt,
        senderId: userId,
        mine: true,
      },
    });
  } catch (error) {
    console.error("POST message error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send message.",
    });
  }
});

// -------------------------------------------------------
// GET /api/messages/unread-count — for header badge
// -------------------------------------------------------
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const convos = await Conversation.find({ participants: userId })
      .select("_id")
      .lean();
    const ids = convos.map((c) => c._id);

    const unread = await DirectMessage.countDocuments({
      conversationId: { $in: ids },
      senderId: { $ne: userId },
      readBy: { $ne: userId },
    });

    return res.status(200).json({ success: true, unread });
  } catch (error) {
    console.error("GET unread-count error:", error);
    return res.status(500).json({ success: false, message: "Failed." });
  }
});

module.exports = router;
