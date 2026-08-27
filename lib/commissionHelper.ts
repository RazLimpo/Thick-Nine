// lib/commissionHelper.ts

import { MARKETPLACE_FEE_PERCENTAGE } from './constants';

export interface FeeBreakdown {
  subtotal: number;
  buyerServiceFee: number;
  grandTotal: number;
  sellerPlatformFee: number;
  sellerEarnings: number;
  grossAdminRevenue: number;
  affiliateCommission: number;
  netAdminProfit: number;
}

/**
 * Calculates marketplace buyer/seller fees and affiliate cuts.
 * 
 * @param subtotal - Base package price + selected add-ons
 * @param buyerFeeRate - Buyer processing rate (defaults to 0.05 for 5%)
 * @param affiliateCutRate - Rate taken out of gross admin revenue (defaults to 0.10 for 10%)
 * @param overridePlatformFeeRate - Optional seller fee override (defaults to MARKETPLACE_FEE_PERCENTAGE / 0.15)
 */
export function calculateOrderFees(
  subtotal: number,
  buyerFeeRate: number = 0.05,
  affiliateCutRate: number = 0.10,
  overridePlatformFeeRate?: number
): FeeBreakdown {
  const sellerFeeRate = overridePlatformFeeRate ?? MARKETPLACE_FEE_PERCENTAGE;

  // 1. Line Item Calculations
  const buyerServiceFee = Number((subtotal * buyerFeeRate).toFixed(2));
  const grandTotal = Number((subtotal + buyerServiceFee).toFixed(2));

  // 2. Seller Earnings & Fee (15% deducted from subtotal)
  const sellerPlatformFee = Number((subtotal * sellerFeeRate).toFixed(2));
  const sellerEarnings = Number((subtotal - sellerPlatformFee).toFixed(2));

  // 3. Gross Admin Revenue (Seller 15% Fee + Buyer 5% Fee)
  const grossAdminRevenue = Number((sellerPlatformFee + buyerServiceFee).toFixed(2));

  // 4. Affiliate Cut (Deducted strictly out of Gross Admin Revenue)
  const affiliateCommission = Number((grossAdminRevenue * affiliateCutRate).toFixed(2));

  // 5. Net Admin Profit
  const netAdminProfit = Number((grossAdminRevenue - affiliateCommission).toFixed(2));

  return {
    subtotal,
    buyerServiceFee,
    grandTotal,
    sellerPlatformFee,
    sellerEarnings,
    grossAdminRevenue,
    affiliateCommission,
    netAdminProfit,
  };
}