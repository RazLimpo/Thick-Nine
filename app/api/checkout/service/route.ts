// app/api/checkout/service/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/thick-nine-backend/models/Order';
import User from '@/thick-nine-backend/models/User';
import AffiliateCommissionConfig from '@/thick-nine-backend/models/AffiliateCommissionConfig';
import { calculateOrderFees } from '@/lib/commissionHelper';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      clientId,
      serviceId,
      sellerId,
      basePackagePrice,
      selectedAddons = [],
      requirements = '',
      affiliateCode = null,
      paymentMethod = 'card', // 'card' or 'paypal'
    } = body;

    if (!clientId || !serviceId || !sellerId || basePackagePrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required checkout information.' },
        { status: 400 }
      );
    }

    // 1. Calculate Add-ons total and Subtotal
    const addonsTotal = selectedAddons.reduce(
      (sum: number, addon: { price: number }) => sum + Number(addon.price || 0),
      0
    );
    const subtotal = Number(basePackagePrice) + addonsTotal;

    // 2. Fetch Active Config Rates
    const config = await AffiliateCommissionConfig.findOne({ isActive: true });
    const buyerFeeRate = config?.buyerFeePercentage ?? 0.05;
    const affiliateCutRate = config?.defaultAffiliateCutRate ?? 0.10;
    const sellerFeeRate = config?.platformFeePercentage ?? 0.15;

    // 3. Resolve Affiliate User (if code present)
    let affiliateUserId = null;
    if (affiliateCode) {
      const affiliate = await User.findOne({ affiliateCode });
      if (affiliate) {
        affiliateUserId = affiliate._id;
      }
    }

    // 4. Run Financial Calculations via commissionHelper
    const fees = calculateOrderFees(
      subtotal,
      buyerFeeRate,
      affiliateUserId ? affiliateCutRate : 0, // 0 commission if no referred affiliate
      sellerFeeRate
    );

    // 5. Create New Order Document
    const newOrder = new Order({
      clientId,
      serviceId,
      sellerId,
      affiliateId: affiliateUserId,
      affiliateCode: affiliateCode || null,
      requirements,
      basePackagePrice: Number(basePackagePrice),
      selectedAddons,
      subtotal: fees.subtotal,
      buyerServiceFee: fees.buyerServiceFee,
      grandTotal: fees.grandTotal,
      sellerPlatformFee: fees.sellerPlatformFee,
      sellerEarnings: fees.sellerEarnings,
      grossAdminRevenue: fees.grossAdminRevenue,
      affiliateCommission: fees.affiliateCommission,
      netAdminProfit: fees.netAdminProfit,
      paymentMethod,
      status: 'pending',
    });

    await newOrder.save();

    return NextResponse.json({
      success: true,
      message: 'Order created successfully.',
      orderId: newOrder._id,
      grandTotal: newOrder.grandTotal,
    });
  } catch (error: any) {
    console.error('Service Checkout Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process checkout.' },
      { status: 500 }
    );
  }
}