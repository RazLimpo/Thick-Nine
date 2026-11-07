/**
 * utils/creditAffiliateForOrder.js
 *
 * Call ONLY when order status becomes "completed".
 * - Solo: sellerPlatformFee × commissionRate → affiliateId
 * - Group: freelancer-funded pool (subtotal × promoRate) 80/20 (+ 100% if same user)
 * - Full solo rate ALWAYS applies when affiliateId present (including tg orders)
 * - Idempotent via Order.soloAffiliateCreditedAt / groupCommissionCreditedAt
 * - Increments wallet.availableBalance + wallet.lifetimeEarnings
 */

const User = require("../models/User");
const Transaction = require("../models/Transaction");
const AffiliateTeam = require("../models/AffiliateTeam");

let rewards;
try {
  rewards = require("./affiliateRewards");
} catch (_) {
  rewards = null;
}

function round2(n) {
  return Math.round(Number(n) * 100) / 100;
}

async function safeTx(data) {
  try {
    if (data.idempotencyKey) {
      const existing = await Transaction.findOne({
        idempotencyKey: data.idempotencyKey,
      }).lean();
      if (existing) return existing;
    }
    return await Transaction.create(data);
  } catch (e) {
    // duplicate key on idempotencyKey
    if (e && (e.code === 11000 || String(e.message || "").includes("duplicate"))) {
      return Transaction.findOne({ idempotencyKey: data.idempotencyKey }).lean();
    }
    throw e;
  }
}

async function creditWallet(userId, amount) {
  if (!userId || !(amount > 0)) return;
  await User.findByIdAndUpdate(userId, {
    $inc: {
      "wallet.availableBalance": amount,
      "wallet.lifetimeEarnings": amount,
    },
  });
}

/**
 * @param {import("mongoose").Document|object} order - mongoose doc or lean+saveable
 * @returns {Promise<{ solo: number, groupMember: number, groupLeader: number, skipped: string[] }>}
 */
async function creditAffiliateForOrder(order) {
  const result = {
    solo: 0,
    groupMember: 0,
    groupLeader: 0,
    skipped: [],
  };

  if (!order) {
    result.skipped.push("no_order");
    return result;
  }

  const status = String(order.status || "");
  if (status !== "completed") {
    result.skipped.push("not_completed");
    return result;
  }

  const orderId = order._id;

  // ---------- SOLO (seller fee × rate) ----------
  if (order.soloAffiliateCreditedAt) {
    result.skipped.push("solo_already");
  } else if (order.affiliateId && Number(order.affiliateCommission) > 0) {
    const amount = round2(order.affiliateCommission);
    const rate =
      Number(order.commissionRate) ||
      (Number(order.commissionableFee) > 0
        ? amount / Number(order.commissionableFee)
        : 0);

    await creditWallet(order.affiliateId, amount);
    await safeTx({
      affiliateId: order.affiliateId,
      orderId,
      type: "solo_fee_share",
      source: "solo_fee_share",
      amount,
      commissionRate: rate,
      commissionableFee: Number(order.commissionableFee) || Number(order.sellerPlatformFee) || 0,
      orderTotal: Number(order.grandTotal) || 0,
      status: "completed",
      description: `Solo affiliate commission (seller fee share) · Order ${orderId}`,
      referenceId: String(orderId),
      idempotencyKey: `solo:${orderId}`,
    });

    order.soloAffiliateCreditedAt = new Date();
    result.solo = amount;
  } else {
    result.skipped.push("no_solo_affiliate");
  }

  // ---------- GROUP POOL (freelancer-funded) ----------
  if (order.groupCommissionCreditedAt) {
    result.skipped.push("group_already");
  } else if (order.teamTrackingCode && order.teamMemberUserId) {
    let pool = Number(order.groupPromoPool) || 0;
    if (!(pool > 0) && order.groupPromoRate != null) {
      pool = round2(
        Math.max(0, Number(order.subtotal) || 0) * Number(order.groupPromoRate)
      );
    }
    // fallback default 8% if rate missing but tg present
    if (!(pool > 0) && order.groupPromoRate == null) {
      const rate =
        rewards && rewards.GROUP_PROMO_DEFAULT
          ? rewards.GROUP_PROMO_DEFAULT
          : 0.08;
      pool = round2(Math.max(0, Number(order.subtotal) || 0) * rate);
      order.groupPromoRate = rate;
      order.groupPromoPool = pool;
    }

    if (pool > 0) {
      let leaderId = null;
      if (order.teamId) {
        try {
          const team = await AffiliateTeam.findById(order.teamId)
            .select("leaderId")
            .lean();
          leaderId = team?.leaderId || null;
        } catch (_) {}
      }

      let memberAmount;
      let leaderAmount;
      if (
        leaderId &&
        String(leaderId) === String(order.teamMemberUserId)
      ) {
        memberAmount = pool;
        leaderAmount = 0;
      } else if (rewards && typeof rewards.calcGroupPromoPool === "function") {
        const split = rewards.calcGroupPromoPool(
          order.subtotal,
          order.groupPromoRate,
          order.teamMemberUserId,
          leaderId
        );
        // Prefer pool already on order if set
        if (Number(order.groupPromoPool) > 0) {
          memberAmount = round2(pool * 0.8);
          leaderAmount = round2(pool - memberAmount);
          if (leaderId && String(leaderId) === String(order.teamMemberUserId)) {
            memberAmount = pool;
            leaderAmount = 0;
          }
        } else {
          memberAmount = split.memberAmount;
          leaderAmount = split.leaderAmount;
          pool = split.pool;
        }
      } else {
        memberAmount = round2(pool * 0.8);
        leaderAmount = round2(pool - memberAmount);
      }

      if (memberAmount > 0) {
        await creditWallet(order.teamMemberUserId, memberAmount);
        await safeTx({
          affiliateId: order.teamMemberUserId,
          orderId,
          type: "group_promo",
          source: "group_promo",
          amount: memberAmount,
          commissionRate: Number(order.groupPromoRate) || null,
          orderTotal: Number(order.subtotal) || 0,
          status: "completed",
          description: `Group promo pool (member) · ${order.teamTrackingCode} · Order ${orderId}`,
          referenceId: String(orderId),
          idempotencyKey: `group_member:${orderId}`,
        });
        result.groupMember = memberAmount;
      }

      if (leaderAmount > 0 && leaderId) {
        await creditWallet(leaderId, leaderAmount);
        await safeTx({
          affiliateId: leaderId,
          orderId,
          type: "group_promo",
          source: "group_promo",
          amount: leaderAmount,
          commissionRate: Number(order.groupPromoRate) || null,
          orderTotal: Number(order.subtotal) || 0,
          status: "completed",
          description: `Group promo pool (leader) · ${order.teamTrackingCode} · Order ${orderId}`,
          referenceId: String(orderId),
          idempotencyKey: `group_leader:${orderId}`,
        });
        result.groupLeader = leaderAmount;
      }

      order.groupCommissionCreditedAt = new Date();
      order.groupPromoPool = pool;

      // Bump tracking link conversions (best-effort)
      try {
        const Link = require("../models/AffiliateTeamTrackingLink");
        await Link.updateOne(
          { code: order.teamTrackingCode },
          { $inc: { conversions: 1 } }
        );
      } catch (_) {}
    } else {
      result.skipped.push("group_pool_zero");
    }
  } else {
    result.skipped.push("no_group_tracking");
  }

  // Persist credit timestamps if mongoose document
  if (typeof order.save === "function") {
    await order.save();
  } else if (orderId) {
    const Order = require("../models/Order");
    await Order.updateOne(
      { _id: orderId },
      {
        $set: {
          soloAffiliateCreditedAt: order.soloAffiliateCreditedAt || undefined,
          groupCommissionCreditedAt:
            order.groupCommissionCreditedAt || undefined,
          groupPromoPool: order.groupPromoPool,
          groupPromoRate: order.groupPromoRate,
        },
      }
    );
  }

  return result;
}

/**
 * Reverse credits on full refund (best-effort).
 */
async function reverseAffiliateForOrder(order, note = "refund") {
  if (!order?._id) return { reversed: 0 };

  const Order = require("../models/Order");
  let reversed = 0;

  const txs = await Transaction.find({
    orderId: order._id,
    status: "completed",
    source: { $in: ["solo_fee_share", "group_promo"] },
  });

  for (const tx of txs) {
    const amount = Number(tx.amount) || 0;
    if (amount > 0) {
      await User.findByIdAndUpdate(tx.affiliateId, {
        $inc: {
          "wallet.availableBalance": -amount,
          "wallet.lifetimeEarnings": -amount,
        },
      });
    }
    tx.status = "reversed";
    tx.description = `${tx.description || ""} · reversed (${note})`.trim();
    await tx.save();
    reversed += 1;
  }

  await Order.updateOne(
    { _id: order._id },
    {
      $set: {
        soloAffiliateCreditedAt: null,
        groupCommissionCreditedAt: null,
      },
    }
  );

  return { reversed };
}

module.exports = {
  creditAffiliateForOrder,
  reverseAffiliateForOrder,
};
