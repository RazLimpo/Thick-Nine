// lib/commissionHelper.ts
// Affiliate commission base = SELLER platform fee only (buyer fee excluded).
// Rate is passed in from checkout (90-day tier via affiliateRewards / API).

import { MARKETPLACE_FEE_PERCENTAGE } from "./constants";

export interface FeeBreakdown {
  subtotal: number;
  buyerServiceFee: number;
  grandTotal: number;
  sellerPlatformFee: number;
  sellerEarnings: number;
  grossAdminRevenue: number;
  /** Solo affiliate commission = sellerPlatformFee × affiliateCutRate */
  affiliateCommission: number;
  netAdminProfit: number;
  /** Snapshot fields */
  commissionRate: number;
  commissionableFee: number;
}

/**
 * Calculates marketplace fees and solo affiliate commission.
 *
 * @param subtotal - Package + add-ons − discounts
 * @param buyerFeeRate - Buyer fee fraction (default 0.05)
 * @param affiliateCutRate - Affiliate share of SELLER fee only (0–0.5 tiered)
 * @param overridePlatformFeeRate - Seller fee fraction (default MARKETPLACE_FEE_PERCENTAGE)
 */
export function calculateOrderFees(
  subtotal: number,
  buyerFeeRate: number = 0.05,
  affiliateCutRate: number = 0,
  overridePlatformFeeRate?: number
): FeeBreakdown {
  const sellerFeeRate =
    overridePlatformFeeRate ?? MARKETPLACE_FEE_PERCENTAGE ?? 0.15;

  const sub = Math.max(0, Number(subtotal) || 0);
  const bRate = Math.min(1, Math.max(0, Number(buyerFeeRate) || 0));
  const sRate = Math.min(1, Math.max(0, Number(sellerFeeRate) || 0.15));
  const aRate = Math.min(1, Math.max(0, Number(affiliateCutRate) || 0));

  const buyerServiceFee = Number((sub * bRate).toFixed(2));
  const grandTotal = Number((sub + buyerServiceFee).toFixed(2));

  const sellerPlatformFee = Number((sub * sRate).toFixed(2));
  const sellerEarnings = Number((sub - sellerPlatformFee).toFixed(2));

  const grossAdminRevenue = Number(
    (sellerPlatformFee + buyerServiceFee).toFixed(2)
  );

  // Solo commission from SELLER fee only — not gross admin / not buyer fee
  const affiliateCommission = Number((sellerPlatformFee * aRate).toFixed(2));
  const netAdminProfit = Number(
    (grossAdminRevenue - affiliateCommission).toFixed(2)
  );

  return {
    subtotal: sub,
    buyerServiceFee,
    grandTotal,
    sellerPlatformFee,
    sellerEarnings,
    grossAdminRevenue,
    affiliateCommission,
    netAdminProfit,
    commissionRate: aRate,
    commissionableFee: sellerPlatformFee,
  };
}
