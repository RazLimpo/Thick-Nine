// utils/profileMetrics.js
// Shared by client / freelancer / affiliate public profiles
//
// lastSeen  — from User.lastSeen (presence heartbeat) → fallbacks
// responseRate — % of inbound DM "threads" answered within RESPONSE_WINDOW_MS
// avgResponseHours — mean first-reply time for answered threads

const mongoose = require("mongoose");

const RESPONSE_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours
const LOOKBACK_DAYS = 90;
const MAX_CONVERSATIONS = 40;
const MAX_MESSAGES_PER_CONV = 80;

function oid(id) {
  try {
    return new mongoose.Types.ObjectId(String(id));
  } catch {
    return null;
  }
}

/**
 * Resolve a displayable last-seen timestamp from a User lean doc.
 * Presence heartbeat writes `lastSeen` — prefer that over profile updatedAt.
 */
function resolveLastSeen(user) {
  if (!user) return null;
  return user.lastSeen || user.lastActiveAt || null;
  // Do NOT fall back to updatedAt here — that is "last profile edit", not activity.
  // Callers may still fall back to updatedAt if they need any date at all.
}

/**
 * Compute communication metrics from DirectMessage history.
 * @param {string|ObjectId} userId
 * @returns {Promise<{ responseRate: number|null, avgResponseHours: number|null, sampleSize: number }>}
 */
async function getCommunicationMetrics(userId) {
  const empty = {
    responseRate: null,
    avgResponseHours: null,
    sampleSize: 0,
  };

  const uid = oid(userId);
  if (!uid) return empty;

  let Conversation;
  let DirectMessage;
  try {
    Conversation = require("../models/Conversation");
    DirectMessage = require("../models/DirectMessage");
  } catch {
    return empty;
  }

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const conversations = await Conversation.find({
    participants: uid,
    lastMessageAt: { $gte: since },
    $or: [
      { type: "direct" },
      { type: { $exists: false } },
      { type: null },
    ],
  })
    .sort({ lastMessageAt: -1 })
    .limit(MAX_CONVERSATIONS)
    .select("_id")
    .lean();

  if (!conversations.length) return empty;

  const convIds = conversations.map((c) => c._id);
  const messages = await DirectMessage.find({
    conversationId: { $in: convIds },
    deletedAt: null,
    createdAt: { $gte: since },
  })
    .sort({ createdAt: 1 })
    .select("conversationId senderId createdAt")
    .lean();

  // Cap per conversation in memory
  const byConv = new Map();
  for (const m of messages) {
    const key = String(m.conversationId);
    if (!byConv.has(key)) byConv.set(key, []);
    const arr = byConv.get(key);
    if (arr.length < MAX_MESSAGES_PER_CONV) arr.push(m);
  }

  const me = String(uid);
  let answered = 0;
  let missed = 0;
  const replyMs = [];

  for (const arr of byConv.values()) {
    for (let i = 0; i < arr.length; i++) {
      const msg = arr[i];
      if (String(msg.senderId) === me) continue;

      // Inbound message from someone else — look for our first reply after it
      let reply = null;
      for (let j = i + 1; j < arr.length; j++) {
        if (String(arr[j].senderId) === me) {
          reply = arr[j];
          break;
        }
      }

      const inboundAt = new Date(msg.createdAt).getTime();
      const age = Date.now() - inboundAt;

      if (reply) {
        const delta =
          new Date(reply.createdAt).getTime() - inboundAt;
        if (delta >= 0 && delta <= RESPONSE_WINDOW_MS) {
          answered++;
          replyMs.push(delta);
        } else if (delta > RESPONSE_WINDOW_MS) {
          missed++;
        }
        // negative delta ignore
      } else if (age > RESPONSE_WINDOW_MS) {
        // No reply and window closed
        missed++;
      }
      // else: still within window, pending — exclude from rate
    }
  }

  const sampleSize = answered + missed;
  if (sampleSize === 0) return empty;

  const responseRate = Math.round((answered / sampleSize) * 100);
  const avgResponseHours =
    replyMs.length > 0
      ? Math.round(
          (replyMs.reduce((a, b) => a + b, 0) / replyMs.length /
            (60 * 60 * 1000)) *
            10
        ) / 10
      : null;

  return { responseRate, avgResponseHours, sampleSize };
}

/**
 * Optionally persist computed metrics onto User.metrics (fire-and-forget safe).
 */
async function refreshUserCommunicationMetrics(userId) {
  const User = require("../models/User");
  const uid = oid(userId);
  if (!uid) return null;
  const metrics = await getCommunicationMetrics(uid);
  if (metrics.sampleSize === 0) return metrics;
  await User.findByIdAndUpdate(uid, {
    $set: {
      "metrics.responseRate": metrics.responseRate,
      ...(metrics.avgResponseHours != null
        ? { responseTime: Math.round(metrics.avgResponseHours * 60) }
        : {}),
    },
  });
  return metrics;
}

module.exports = {
  resolveLastSeen,
  getCommunicationMetrics,
  refreshUserCommunicationMetrics,
  RESPONSE_WINDOW_MS,
};
