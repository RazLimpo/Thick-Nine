/**
 * utils/affiliateRewards.js
 *
 * Single policy module for:
 *  - Authority Rank (badge) from lifetime CONFIRMED affiliate commissions
 *  - Active solo commission RATE from 90-day attributed completed sales
 *  - Group promo pool rules (freelancer-funded; stacks WITH full solo rate)
 *
 * Commission base (solo): SELLER platform fee only — never buyer fee.
 * Group path: full solo rate on seller fee + promo pool from subtotal.
 */

/* ------------------------------------------------------------------ */
/* Rank — lifetime confirmed affiliate commissions (badge only)       */
/* ------------------------------------------------------------------ */
const RANK_THRESHOLDS = [
    { rank: "Bronze", minLifetime: 0, badge: "Rising Marketer" },
    { rank: "Silver", minLifetime: 100, badge: "Proven Promoter" },
    { rank: "Gold", minLifetime: 500, badge: "Growth Catalyst" },
    { rank: "Platinum", minLifetime: 2500, badge: "Authority Partner" },
    { rank: "Diamond", minLifetime: 10000, badge: "Apex Affiliate" },
  ];
  
  /* ------------------------------------------------------------------ */
  /* Solo rate — % of SELLER platform fee, by 90-day attributed sales   */
  /* sales90d = sum of service subtotals on completed attributed orders */
  /* ------------------------------------------------------------------ */
  const COMMISSION_RATE_TIERS = [
    { id: "starter", label: "Starter", minSales90d: 0, rate: 0.25 },
    { id: "growth", label: "Growth", minSales90d: 500, rate: 0.3 },
    { id: "pro", label: "Pro", minSales90d: 2000, rate: 0.35 },
    { id: "elite", label: "Elite", minSales90d: 5000, rate: 0.4 },
    { id: "top", label: "Top", minSales90d: 15000, rate: 0.5 },
  ];
  
  /* ------------------------------------------------------------------ */
  /* Platform fee defaults (overridable via AffiliateCommissionConfig)  */
  /* ------------------------------------------------------------------ */
  const DEFAULT_SELLER_FEE_RATE = 0.15; // 15% of subtotal
  const DEFAULT_BUYER_FEE_RATE = 0.05; // 5% of subtotal
  
  /* ------------------------------------------------------------------ */
  /* Group promo (freelancer-funded). Stacks with full solo rate.       */
  /* ------------------------------------------------------------------ */
  const GROUP_PROMO_MIN = 0.05;
  const GROUP_PROMO_MAX = 0.1;
  const GROUP_PROMO_DEFAULT = 0.08;
  const GROUP_POOL_MEMBER_SHARE = 0.8;
  const GROUP_POOL_LEADER_SHARE = 0.2;
  
  function clamp(n, lo, hi) {
    return Math.min(hi, Math.max(lo, n));
  }
  
  function round2(n) {
    return Math.round(Number(n) * 100) / 100;
  }
  
  /**
   * Authority rank from lifetime confirmed commissions.
   */
  function getRank(lifetimeConfirmed) {
    const lifetime = Math.max(0, Number(lifetimeConfirmed) || 0);
    let current = RANK_THRESHOLDS[0];
    let next = RANK_THRESHOLDS[1] || RANK_THRESHOLDS[0];
  
    for (let i = RANK_THRESHOLDS.length - 1; i >= 0; i--) {
      if (lifetime >= RANK_THRESHOLDS[i].minLifetime) {
        current = RANK_THRESHOLDS[i];
        next = RANK_THRESHOLDS[i + 1] || RANK_THRESHOLDS[i];
        break;
      }
    }
  
    const progressToNext =
      next.minLifetime <= current.minLifetime
        ? 1
        : clamp(
            (lifetime - current.minLifetime) /
              (next.minLifetime - current.minLifetime),
            0,
            1
          );
  
    return {
      rank: current.rank,
      badge: current.badge,
      minLifetime: current.minLifetime,
      nextRank: next.rank,
      nextBadge: next.badge,
      nextMinLifetime: next.minLifetime,
      lifetimeConfirmed: lifetime,
      progressToNext,
    };
  }
  
  /**
   * Solo commission rate from 90-day attributed service sales (subtotals).
   */
  function getCommissionRate(sales90d) {
    const sales = Math.max(0, Number(sales90d) || 0);
    let tier = COMMISSION_RATE_TIERS[0];
  
    for (let i = COMMISSION_RATE_TIERS.length - 1; i >= 0; i--) {
      if (sales >= COMMISSION_RATE_TIERS[i].minSales90d) {
        tier = COMMISSION_RATE_TIERS[i];
        break;
      }
    }
  
    const idx = COMMISSION_RATE_TIERS.findIndex((t) => t.id === tier.id);
    const nextTier = COMMISSION_RATE_TIERS[idx + 1] || null;
  
    return {
      rate: tier.rate,
      tierId: tier.id,
      tierLabel: tier.label,
      minSales90d: tier.minSales90d,
      sales90d: sales,
      nextTierId: nextTier?.id || null,
      nextTierLabel: nextTier?.label || null,
      nextMinSales90d: nextTier?.minSales90d || null,
      nextRate: nextTier?.rate || null,
    };
  }
  
  /**
   * Solo commission amount = sellerPlatformFee × rate (buyer fee excluded).
   */
  function calcSoloCommission(sellerPlatformFee, rate) {
    const fee = Math.max(0, Number(sellerPlatformFee) || 0);
    const r = clamp(Number(rate) || 0, 0, 1);
    return round2(fee * r);
  }
  
  /**
   * Normalize partnership promo rate to 5%–10%.
   */
  function normalizePromoRate(rate) {
    if (rate == null || rate === "") return GROUP_PROMO_DEFAULT;
    let r = Number(rate);
    if (!Number.isFinite(r)) return GROUP_PROMO_DEFAULT;
    // allow 5 meaning 5% or 0.05
    if (r > 1) r = r / 100;
    return clamp(r, GROUP_PROMO_MIN, GROUP_PROMO_MAX);
  }
  
  /**
   * Group promo pool from subtotal (freelancer-funded).
   * If memberUserId === leaderUserId → 100% to member.
   */
  function calcGroupPromoPool(subtotal, promoRate, memberUserId, leaderUserId) {
    const pool = round2(
      Math.max(0, Number(subtotal) || 0) * normalizePromoRate(promoRate)
    );
    const same =
      memberUserId &&
      leaderUserId &&
      String(memberUserId) === String(leaderUserId);
  
    if (same) {
      return {
        pool,
        memberAmount: pool,
        leaderAmount: 0,
        memberShare: 1,
        leaderShare: 0,
      };
    }
  
    const memberAmount = round2(pool * GROUP_POOL_MEMBER_SHARE);
    const leaderAmount = round2(pool - memberAmount);
    return {
      pool,
      memberAmount,
      leaderAmount,
      memberShare: GROUP_POOL_MEMBER_SHARE,
      leaderShare: GROUP_POOL_LEADER_SHARE,
    };
  }
  
  /**
   * Fee line items from subtotal (no affiliate cut here — solo cut is on seller fee only).
   */
  function calcFeeLines(
    subtotal,
    sellerFeeRate = DEFAULT_SELLER_FEE_RATE,
    buyerFeeRate = DEFAULT_BUYER_FEE_RATE
  ) {
    const sub = Math.max(0, Number(subtotal) || 0);
    const sRate = clamp(Number(sellerFeeRate) || DEFAULT_SELLER_FEE_RATE, 0, 1);
    const bRate = clamp(Number(buyerFeeRate) || DEFAULT_BUYER_FEE_RATE, 0, 1);
  
    const buyerServiceFee = round2(sub * bRate);
    const grandTotal = round2(sub + buyerServiceFee);
    const sellerPlatformFee = round2(sub * sRate);
    const sellerEarnings = round2(sub - sellerPlatformFee);
    const grossAdminRevenue = round2(sellerPlatformFee + buyerServiceFee);
  
    return {
      subtotal: sub,
      buyerServiceFee,
      grandTotal,
      sellerPlatformFee,
      sellerEarnings,
      grossAdminRevenue,
      sellerFeeRate: sRate,
      buyerFeeRate: bRate,
    };
  }
  
  /**
   * Full checkout snapshot for an attributed order (solo and/or group).
   * affiliateCommission = solo slice only (seller fee × rate); group pool credited on complete.
   */
  function buildCheckoutCommissionSnapshot({
    subtotal,
    sellerFeeRate,
    buyerFeeRate,
    sales90d,
    hasAffiliate,
    hasGroupTracking,
  }) {
    const fees = calcFeeLines(subtotal, sellerFeeRate, buyerFeeRate);
    const rateInfo = hasAffiliate
      ? getCommissionRate(sales90d)
      : { rate: 0, tierId: null, tierLabel: null, sales90d: 0 };
  
    const affiliateCommission = hasAffiliate
      ? calcSoloCommission(fees.sellerPlatformFee, rateInfo.rate)
      : 0;
  
    const netAdminProfit = round2(fees.grossAdminRevenue - affiliateCommission);
  
    return {
      ...fees,
      commissionRate: rateInfo.rate,
      commissionTierId: rateInfo.tierId,
      commissionTierLabel: rateInfo.tierLabel,
      commissionableFee: fees.sellerPlatformFee, // explicit: seller fee only
      affiliateCommission,
      netAdminProfit,
      hasGroupTracking: !!hasGroupTracking,
      // Group pool is NOT deducted from admin here; freelancer funds it on complete
    };
  }
  
  module.exports = {
    RANK_THRESHOLDS,
    COMMISSION_RATE_TIERS,
    DEFAULT_SELLER_FEE_RATE,
    DEFAULT_BUYER_FEE_RATE,
    GROUP_PROMO_MIN,
    GROUP_PROMO_MAX,
    GROUP_PROMO_DEFAULT,
    GROUP_POOL_MEMBER_SHARE,
    GROUP_POOL_LEADER_SHARE,
    getRank,
    getCommissionRate,
    calcSoloCommission,
    normalizePromoRate,
    calcGroupPromoPool,
    calcFeeLines,
    buildCheckoutCommissionSnapshot,
    round2,
    clamp,
  };
  