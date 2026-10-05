/**
 * routes/messageRoutes.js
 * User-to-user DMs (Conversation + DirectMessage)
 * Mount: app.use("/api/messages", require("./routes/messageRoutes"));
 */

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const authMiddleware = require("../middleware/auth");
const Conversation = require("../models/Conversation");
const DirectMessage = require("../models/DirectMessage");

function uid(req) {
  return req.user?.id || req.user?._id;
}

function hasId(arr, id) {
  return (arr || []).some((x) => String(x) === String(id));
}

// -------------------------------------------------------
// GET /api/messages/conversations
// ?orderId= ?serviceId= ?filter=all|starred|archived
// -------------------------------------------------------
router.get("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
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

    const mode = String(req.query.filter || "all").toLowerCase();
    if (mode === "starred") {
      filter.starredBy = userId;
    } else if (mode === "archived") {
      filter.archivedBy = userId;
    } else {
      // default inbox: hide archived for this user
      filter.archivedBy = { $ne: userId };
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
          starred: hasId(c.starredBy, userId),
          archived: hasId(c.archivedBy, userId),
          blocked: hasId(c.blockedBy, userId),
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
// POST /api/messages/conversations
// -------------------------------------------------------
router.post("/conversations", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
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

    let conversation = await Conversation.findOne({
      participants: { $all: [userId, recipientId], $size: 2 },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [userId, recipientId],
        orderId: orderId || null,
        serviceId: serviceId || null,
      });
    } else if (orderId || serviceId) {
      if (orderId) conversation.orderId = orderId;
      if (serviceId) conversation.serviceId = serviceId;
      await conversation.save();
    }

    // If either party blocked the other
    if (hasId(conversation.blockedBy, userId) || hasId(conversation.blockedBy, recipientId)) {
      return res.status(403).json({
        success: false,
        message: "Messaging is blocked for this conversation.",
        conversationId: conversation._id,
      });
    }

    if (initialMessage) {
      const msg = await DirectMessage.create({
        conversationId: conversation._id,
        senderId: userId,
        body: initialMessage.slice(0, 4000),
        readBy: [userId],
      });
      conversation.lastMessage = initialMessage.slice(0, 200);
      conversation.lastMessageAt = msg.createdAt;
      conversation.lastSenderId = userId;
      await conversation.save();
    }

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
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
// PATCH /api/messages/conversations/:id
// Body: { action: star|unstar|archive|unarchive|block|unblock }
// -------------------------------------------------------
router.patch("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    const action = String(req.body?.action || "").toLowerCase();

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const isParticipant = (conversation.participants || []).some(
      (p) => String(p) === String(userId)
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const ops = {
      star: { $addToSet: { starredBy: userId } },
      unstar: { $pull: { starredBy: userId } },
      archive: { $addToSet: { archivedBy: userId } },
      unarchive: { $pull: { archivedBy: userId } },
      block: { $addToSet: { blockedBy: userId } },
      unblock: { $pull: { blockedBy: userId } },
    };

    if (!ops[action]) {
      return res.status(400).json({
        success: false,
        message: "action must be star|unstar|archive|unarchive|block|unblock",
      });
    }

    await Conversation.updateOne({ _id: id }, ops[action]);
    const updated = await Conversation.findById(id).lean();

    return res.status(200).json({
      success: true,
      action,
      starred: hasId(updated.starredBy, userId),
      archived: hasId(updated.archivedBy, userId),
      blocked: hasId(updated.blockedBy, userId),
    });
  } catch (error) {
    console.error("PATCH conversation error:", error);
    return res.status(500).json({ success: false, message: "Failed to update conversation." });
  }
});

// -------------------------------------------------------
// GET /api/messages/conversations/:id
// -------------------------------------------------------
router.get("/conversations/:id", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
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
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const isParticipant = (conversation.participants || []).some(
      (p) => String(p._id || p) === String(userId)
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "80"), 10) || 80, 1),
      150
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
        starred: hasId(conversation.starredBy, userId),
        archived: hasId(conversation.archivedBy, userId),
        blocked: hasId(conversation.blockedBy, userId),
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
        const isRead = readBy.some((id) => id !== sid);
        return {
          _id: m._id,
          body: m.body || "",
          attachments: Array.isArray(m.attachments) ? m.attachments : [],
          createdAt: m.createdAt,
          senderId: m.senderId?._id || m.senderId,
          senderName: m.senderId?.displayName || m.senderId?.fullName || "User",
          senderAvatar: m.senderId?.avatar || "/default-avatar.png",
          mine,
          status: mine ? (isRead ? "read" : "sent") : "received",
        };
      }),
    });
  } catch (error) {
    console.error("GET conversation thread error:", error);
    return res.status(500).json({ success: false, message: "Failed to load messages." });
  }
});

// -------------------------------------------------------
// POST /api/messages/conversations/:id/messages
// Body: { body?: string, attachments?: [{ url, name, mime, size }] }
// -------------------------------------------------------
router.post("/conversations/:id/messages", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    const { id } = req.params;
    const body = String(req.body?.body || "").trim();
    let attachments = Array.isArray(req.body?.attachments)
      ? req.body.attachments
      : [];

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    // sanitize attachments (cap size / count)
    attachments = attachments
      .slice(0, 5)
      .map((a) => ({
        url: String(a.url || "").slice(0, 2_000_000),
        name: String(a.name || "file").slice(0, 200),
        mime: String(a.mime || "").slice(0, 100),
        size: Number(a.size) || 0,
      }))
      .filter((a) => a.url);

    if (!body && attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message body or attachment required.",
      });
    }

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found." });
    }

    const isParticipant = (conversation.participants || []).some(
      (p) => String(p) === String(userId)
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "Access denied." });
    }

    // Block check: either party blocked
    if (hasId(conversation.blockedBy, userId)) {
      return res.status(403).json({
        success: false,
        message: "You blocked this user. Unblock to send messages.",
        blocked: true,
      });
    }
    const otherId = (conversation.participants || []).find(
      (p) => String(p) !== String(userId)
    );
    if (otherId && hasId(conversation.blockedBy, otherId)) {
      return res.status(403).json({
        success: false,
        message: "You cannot message this user.",
        blocked: true,
      });
    }

    const msg = await DirectMessage.create({
      conversationId: id,
      senderId: userId,
      body: body.slice(0, 4000),
      attachments,
      readBy: [userId],
    });

    const preview =
      body.slice(0, 200) ||
      (attachments[0] ? `📎 ${attachments[0].name}` : "Attachment");
    conversation.lastMessage = preview;
    conversation.lastMessageAt = msg.createdAt;
    conversation.lastSenderId = userId;
    // Sending pulls out of archive for sender
    conversation.archivedBy = (conversation.archivedBy || []).filter(
      (x) => String(x) !== String(userId)
    );
    await conversation.save();

    return res.status(201).json({
      success: true,
      message: {
        _id: msg._id,
        body: msg.body,
        attachments: msg.attachments,
        createdAt: msg.createdAt,
        mine: true,
        status: "sent",
      },
    });
  } catch (error) {
    console.error("POST message error:", error);
    return res.status(500).json({ success: false, message: "Failed to send message." });
  }
});

// -------------------------------------------------------
// GET /api/messages/unread-count
// -------------------------------------------------------
router.get("/unread-count", authMiddleware, async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }

    const convos = await Conversation.find({
      participants: userId,
      archivedBy: { $ne: userId },
    })
      .select("_id")
      .lean();

    const ids = convos.map((c) => c._id);
    if (ids.length === 0) {
      return res.status(200).json({ success: true, unread: 0 });
    }

    const unread = await DirectMessage.countDocuments({
      conversationId: { $in: ids },
      senderId: { $ne: userId },
      readBy: { $ne: userId },
    });

    return res.status(200).json({ success: true, unread });
  } catch (error) {
    console.error("unread-count error:", error);
    return res.status(500).json({ success: false, message: "Failed to count unread." });
  }
});

module.exports = router;
