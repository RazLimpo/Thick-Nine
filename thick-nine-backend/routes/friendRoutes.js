// routes/friendRoutes.js
// Mount: app.use("/api/friends", require("./routes/friendRoutes"));
// Shared by client-profile + freelancer-profile

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const auth = require("../middleware/auth");
const FriendRequest = require("../models/FriendRequest");
const User = require("../models/User");
const Notification = require("../models/Notification");

function oid(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

function uid(req) {
  return req.user?.id || req.user?._id || null;
}

async function safeNotify(payload) {
  try {
    if (!Notification) return;
    await Notification.create(payload);
  } catch (e) {
    console.warn("friend notify skipped:", e.message);
  }
}

/**
 * GET /api/friends/status/:userId
 * Relation between me and target for profile buttons
 */
router.get("/status/:userId", auth, async (req, res) => {
  try {
    const me = oid(uid(req));
    const other = oid(req.params.userId);
    if (!me || !other) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }
    if (String(me) === String(other)) {
      return res.json({
        success: true,
        relation: "self",
        requestId: null,
      });
    }

    const accepted = await FriendRequest.findOne({
      status: "accepted",
      $or: [
        { fromUserId: me, toUserId: other },
        { fromUserId: other, toUserId: me },
      ],
    }).lean();

    if (accepted) {
      return res.json({
        success: true,
        relation: "friends",
        requestId: accepted._id,
      });
    }

    const outgoing = await FriendRequest.findOne({
      fromUserId: me,
      toUserId: other,
      status: "pending",
    }).lean();
    if (outgoing) {
      return res.json({
        success: true,
        relation: "pending_outgoing",
        requestId: outgoing._id,
      });
    }

    const incoming = await FriendRequest.findOne({
      fromUserId: other,
      toUserId: me,
      status: "pending",
    }).lean();
    if (incoming) {
      return res.json({
        success: true,
        relation: "pending_incoming",
        requestId: incoming._id,
      });
    }

    return res.json({
      success: true,
      relation: "none",
      requestId: null,
    });
  } catch (e) {
    console.error("GET /api/friends/status", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to load friend status.",
    });
  }
});

/**
 * GET /api/friends/mine?status=accepted|pending
 */
router.get("/mine", auth, async (req, res) => {
  try {
    const me = oid(uid(req));
    if (!me) {
      return res.status(401).json({ success: false, message: "Unauthorized." });
    }
    const status = String(req.query.status || "accepted");
    const filter =
      status === "pending"
        ? { toUserId: me, status: "pending" }
        : status === "outgoing"
          ? { fromUserId: me, status: "pending" }
          : {
              status: "accepted",
              $or: [{ fromUserId: me }, { toUserId: me }],
            };

    const rows = await FriendRequest.find(filter)
      .sort({ updatedAt: -1 })
      .limit(100)
      .populate("fromUserId", "fullName displayName avatar profilePicture")
      .populate("toUserId", "fullName displayName avatar profilePicture")
      .lean();

    return res.json({ success: true, friends: rows });
  } catch (e) {
    console.error("GET /api/friends/mine", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to list friends.",
    });
  }
});

/**
 * POST /api/friends/request
 * body: { toUserId, message? }
 */
router.post("/request", auth, async (req, res) => {
  try {
    const me = oid(uid(req));
    const toUserId = oid(req.body?.toUserId);
    if (!me || !toUserId) {
      return res.status(400).json({ success: false, message: "Invalid user." });
    }
    if (String(me) === String(toUserId)) {
      return res.status(400).json({
        success: false,
        message: "You cannot friend yourself.",
      });
    }

    const target = await User.findById(toUserId).select("_id fullName").lean();
    if (!target) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const alreadyFriends = await FriendRequest.findOne({
      status: "accepted",
      $or: [
        { fromUserId: me, toUserId },
        { fromUserId: toUserId, toUserId: me },
      ],
    }).lean();
    if (alreadyFriends) {
      return res.status(409).json({
        success: false,
        message: "You are already connected.",
        relation: "friends",
      });
    }

    const pendingEither = await FriendRequest.findOne({
      status: "pending",
      $or: [
        { fromUserId: me, toUserId },
        { fromUserId: toUserId, toUserId: me },
      ],
    }).lean();
    if (pendingEither) {
      return res.status(409).json({
        success: false,
        message: "A friend request is already pending.",
        requestId: pendingEither._id,
        relation:
          String(pendingEither.fromUserId) === String(me)
            ? "pending_outgoing"
            : "pending_incoming",
      });
    }

    const doc = await FriendRequest.create({
      fromUserId: me,
      toUserId,
      status: "pending",
      message: String(req.body?.message || "").slice(0, 300),
    });

    await safeNotify({
      userId: toUserId,
      type: "friend_request",
      title: "New friend request",
      message: "Someone wants to connect with you on the platform.",
      link: `/messages`,
    });

    return res.status(201).json({
      success: true,
      relation: "pending_outgoing",
      requestId: doc._id,
    });
  } catch (e) {
    console.error("POST /api/friends/request", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to send request.",
    });
  }
});

/**
 * POST /api/friends/:id/accept
 */
router.post("/:id/accept", auth, async (req, res) => {
  try {
    const me = oid(uid(req));
    const id = oid(req.params.id);
    if (!me || !id) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const doc = await FriendRequest.findById(id);
    if (!doc || doc.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Request not found or already handled.",
      });
    }
    if (String(doc.toUserId) !== String(me)) {
      return res.status(403).json({
        success: false,
        message: "Only the recipient can accept.",
      });
    }

    doc.status = "accepted";
    doc.respondedAt = new Date();
    await doc.save();

    await safeNotify({
      userId: doc.fromUserId,
      type: "friend_accepted",
      title: "Friend request accepted",
      message: "Your connection request was accepted.",
      link: `/client-profile/${me}`,
    });

    return res.json({
      success: true,
      relation: "friends",
      requestId: doc._id,
    });
  } catch (e) {
    console.error("POST /api/friends/:id/accept", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to accept.",
    });
  }
});

/**
 * POST /api/friends/:id/reject
 */
router.post("/:id/reject", auth, async (req, res) => {
  try {
    const me = oid(uid(req));
    const id = oid(req.params.id);
    if (!me || !id) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const doc = await FriendRequest.findById(id);
    if (!doc || doc.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Request not found or already handled.",
      });
    }
    if (String(doc.toUserId) !== String(me)) {
      return res.status(403).json({
        success: false,
        message: "Only the recipient can reject.",
      });
    }

    doc.status = "rejected";
    doc.respondedAt = new Date();
    await doc.save();

    return res.json({ success: true, relation: "none", requestId: doc._id });
  } catch (e) {
    console.error("POST /api/friends/:id/reject", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to reject.",
    });
  }
});

/**
 * POST /api/friends/:id/cancel — sender cancels pending
 */
router.post("/:id/cancel", auth, async (req, res) => {
  try {
    const me = oid(uid(req));
    const id = oid(req.params.id);
    if (!me || !id) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const doc = await FriendRequest.findById(id);
    if (!doc || doc.status !== "pending") {
      return res.status(404).json({
        success: false,
        message: "Request not found or already handled.",
      });
    }
    if (String(doc.fromUserId) !== String(me)) {
      return res.status(403).json({
        success: false,
        message: "Only the sender can cancel.",
      });
    }

    doc.status = "cancelled";
    doc.respondedAt = new Date();
    await doc.save();

    return res.json({ success: true, relation: "none", requestId: doc._id });
  } catch (e) {
    console.error("POST /api/friends/:id/cancel", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to cancel.",
    });
  }
});

/**
 * DELETE /api/friends/:userId — unfriend (accepted only)
 */
router.delete("/:userId", auth, async (req, res) => {
  try {
    const me = oid(uid(req));
    const other = oid(req.params.userId);
    if (!me || !other) {
      return res.status(400).json({ success: false, message: "Invalid id." });
    }

    const result = await FriendRequest.updateMany(
      {
        status: "accepted",
        $or: [
          { fromUserId: me, toUserId: other },
          { fromUserId: other, toUserId: me },
        ],
      },
      { $set: { status: "cancelled", respondedAt: new Date() } }
    );

    return res.json({
      success: true,
      relation: "none",
      modified: result.modifiedCount || 0,
    });
  } catch (e) {
    console.error("DELETE /api/friends/:userId", e);
    return res.status(500).json({
      success: false,
      message: e.message || "Failed to remove connection.",
    });
  }
});

module.exports = router;
