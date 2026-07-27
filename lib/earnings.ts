// lib/earnings.ts
import { MARKETPLACE_FEE_PERCENTAGE } from './constants';

export interface EarningsBreakdown {
  grossPrice: number;
  feeAmount: number;
  netEarnings: number;
}

export function calculateEarnings(rawPrice: number | string): EarningsBreakdown {
  const numericPrice = typeof rawPrice === 'string' ? parseFloat(rawPrice) || 0 : rawPrice;

  if (numericPrice <= 0) {
    return {
      grossPrice: 0,
      feeAmount: 0,
      netEarnings: 0
    };
  }

  const feeAmount = numericPrice * MARKETPLACE_FEE_PERCENTAGE;
  const netEarnings = numericPrice - feeAmount;

  return {
    grossPrice: numericPrice,
    feeAmount: Number(feeAmount.toFixed(2)),
    netEarnings: Number(netEarnings.toFixed(2))
  };
}