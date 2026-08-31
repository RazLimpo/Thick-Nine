import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import User from '@/thick-nine-backend/models/User';
import Transaction from '@/thick-nine-backend/models/Transaction';
import AffiliateCommissionConfig from '@/thick-nine-backend/models/AffiliateCommissionConfig';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function connectDB() {
  if (process.env.NEXT_PUBLIC_IS_STACKBLITZ === 'true' || !MONGODB_URI) return;
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { userId, amount, payoneerEmail, payoutType } = body; 
    // payoutType: 'seller_escrow' | 'affiliate_commission'

    if (!userId || !amount || !payoneerEmail || !payoutType) {
      return NextResponse.json(
        { error: 'Missing required payout parameters.' },
        { status: 400 }
      );
    }

    const requestedAmount = Number(amount);
    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid payout amount.' },
        { status: 400 }
      );
    }

    // 1. Fetch minimum payout threshold configuration
    let minPayoutThreshold = 50; // Default fallback
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

    // 2. Sandbox / StackBlitz Fallback Mode
    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json({
        success: true,
        message: 'Payout requested successfully (Sandbox Mode).',
        payoutId: new mongoose.Types.ObjectId().toString(),
        amount: requestedAmount,
        payoneerEmail,
        status: 'pending_payoneer',
      });
    }

    // 3. User & Balance Validation
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    const availableBalance =
      payoutType === 'affiliate_commission'
        ? user.affiliateBalance || 0
        : user.sellerAvailableBalance || 0;

    if (availableBalance < requestedAmount) {
      return NextResponse.json(
        { error: 'Insufficient available balance for this payout request.' },
        { status: 400 }
      );
    }

    // 4. Deduct Balance & Create Audit Transaction
    if (payoutType === 'affiliate_commission') {
      user.affiliateBalance -= requestedAmount;
    } else {
      user.sellerAvailableBalance -= requestedAmount;
    }
    await user.save();

    const payoutTransaction = new Transaction({
      userId: user._id,
      type: 'payout',
      payoutMethod: 'payoneer',
      payoneerEmail,
      amount: requestedAmount,
      status: 'pending_payoneer',
      payoutType,
    });
    await payoutTransaction.save();

    return NextResponse.json({
      success: true,
      message: 'Payoneer payout request submitted successfully.',
      payoutId: payoutTransaction._id,
      remainingBalance:
        payoutType === 'affiliate_commission'
          ? user.affiliateBalance
          : user.sellerAvailableBalance,
    });
  } catch (error: any) {
    console.error('Payoneer Payout Request Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process payout request.' },
      { status: 500 }
    );
  }
}