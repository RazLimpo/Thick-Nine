// app/api/payouts/request/route.ts
// Seller escrow payouts only.
// Affiliate commissions MUST use POST /api/affiliate-settings/payouts (System B).

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import User from "@/thick-nine-backend/models/User";
import Transaction from "@/thick-nine-backend/models/Transaction";
import AffiliateCommissionConfig from "@/thick-nine-backend/models/AffiliateCommissionConfig";

const MONGODB_URI = process.env.MONGODB_URI || "";

async function connectDB() {
  if (process.env.NEXT_PUBLIC_IS_STACKBLITZ === "true" || !MONGODB_URI) return;
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, amount, payoneerEmail, payoutType } = body;
    // Allowed: 'seller_escrow' only. 'affiliate_commission' is rejected (System B).

    if (!userId || !amount || !payoneerEmail || !payoutType) {
      return NextResponse.json(
        { error: "Missing required payout parameters." },
        { status: 400 }
      );
    }

    // --- Block affiliate path (Option B is source of truth) ---
    if (payoutType === "affiliate_commission") {
      return NextResponse.json(
        {
          error:
            "Affiliate payouts are handled by POST /api/affiliate-settings/payouts (wallet balance + AffiliatePayoutRequest). Do not use this route for affiliate_commission.",
          code: "USE_AFFILIATE_SETTINGS_PAYOUTS",
        },
        { status: 410 }
      );
    }

    if (payoutType !== "seller_escrow") {
      return NextResponse.json(
        {
          error: "Invalid payoutType. Only 'seller_escrow' is supported on this route.",
        },
        { status: 400 }
      );
    }

    const requestedAmount = Number(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: "Invalid payout amount." },
        { status: 400 }
      );
    }

    // Minimum threshold (shared config; sellers still use this floor)
    let minPayoutThreshold = 50;
    if (mongoose.connection.readyState === 1) {
      const config = await AffiliateCommissionConfig.findOne({ isActive: true });
      if (config?.minPayoutThreshold) {
        minPayoutThreshold = config.minPayoutThreshold;
      }
    }

    if (requestedAmount < minPayoutThreshold) {
      return NextResponse.json(
        { error: `Minimum payout threshold is $${minPayoutThreshold}.` },
        { status: 400 }
      );
    }

    // Sandbox / StackBlitz
    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json({
        success: true,
        message: "Payout requested successfully (Sandbox Mode).",
        payoutId: new mongoose.Types.ObjectId().toString(),
        amount: requestedAmount,
        payoneerEmail,
        payoutType: "seller_escrow",
        status: "pending_payoneer",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const availableBalance = user.sellerAvailableBalance || 0;

    if (availableBalance < requestedAmount) {
      return NextResponse.json(
        { error: "Insufficient available balance for this payout request." },
        { status: 400 }
      );
    }

    user.sellerAvailableBalance = availableBalance - requestedAmount;
    await user.save();

    const payoutTransaction = new Transaction({
      userId: user._id,
      type: "payout",
      payoutMethod: "payoneer",
      payoneerEmail,
      amount: requestedAmount,
      status: "pending_payoneer",
      payoutType: "seller_escrow",
    });
    await payoutTransaction.save();

    return NextResponse.json({
      success: true,
      message: "Payoneer seller payout request submitted successfully.",
      payoutId: payoutTransaction._id,
      remainingBalance: user.sellerAvailableBalance,
    });
  } catch (error: unknown) {
    console.error("Payoneer Payout Request Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process payout request.",
      },
      { status: 500 }
    );
  }
}
