import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/thick-nine-backend/models/Order';
import User from '@/thick-nine-backend/models/User';
import AffiliateCommissionConfig from '@/thick-nine-backend/models/AffiliateCommissionConfig';
import { calculateOrderFees } from '@/lib/commissionHelper';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MONGODB_URI = process.env.MONGODB_URI || '';

// Helper to safely check or convert strings to valid MongoDB ObjectIds
function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function connectDB() {
  // If running in StackBlitz or missing URI, avoid freezing the socket
  if (process.env.NEXT_PUBLIC_IS_STACKBLITZ === 'true' || !MONGODB_URI) {
    return;
  }
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
      paymentMethod = 'card',
    } = body;

    // 1. Check basic field presence
    if (!clientId || !serviceId || !sellerId || basePackagePrice === undefined) {
      return NextResponse.json(
        { error: 'Missing required checkout information.' },
        { status: 400 }
      );
    }

    // 2. Validate MongoDB ObjectId format to prevent Mongoose CastErrors
    const validClientId = isValidObjectId(clientId) ? clientId : new mongoose.Types.ObjectId();
    const validServiceId = isValidObjectId(serviceId) ? serviceId : new mongoose.Types.ObjectId();
    const validSellerId = isValidObjectId(sellerId) ? sellerId : new mongoose.Types.ObjectId();

    // 3. Calculate Add-ons total and Subtotal
    const addonsTotal = selectedAddons.reduce(
      (sum: number, addon: { price: number }) => sum + Number(addon.price || 0),
      0
    );
    const subtotal = Number(basePackagePrice) + addonsTotal;

    // 4. Fetch Active Config Rates (with safe fallbacks if DB isn't connected)
    let buyerFeeRate = 0.05;
    let affiliateCutRate = 0.10;
    let sellerFeeRate = 0.15;

    if (mongoose.connection.readyState === 1) {
      const config = await AffiliateCommissionConfig.findOne({ isActive: true });
      if (config) {
        buyerFeeRate = config.buyerFeePercentage ?? 0.05;
        affiliateCutRate = config.defaultAffiliateCutRate ?? 0.10;
        sellerFeeRate = config.platformFeePercentage ?? 0.15;
      }
    }

    // 5. Resolve Affiliate User
    let affiliateUserId = null;
    if (affiliateCode && mongoose.connection.readyState === 1) {
      const affiliate = await User.findOne({ affiliateCode });
      if (affiliate) {
        affiliateUserId = affiliate._id;
      }
    }

    // 6. Run Financial Calculations
    const fees = calculateOrderFees(
      subtotal,
      buyerFeeRate,
      affiliateUserId ? affiliateCutRate : 0,
      sellerFeeRate
    );

    // 7. StackBlitz Fallback Mode (If DB is bypassed)
    if (mongoose.connection.readyState !== 1) {
      const mockOrderId = new mongoose.Types.ObjectId().toString();
      return NextResponse.json({
        success: true,
        message: 'Order created successfully (Sandbox Mode).',
        orderId: mockOrderId,
        grandTotal: fees.grandTotal,
      });
    }

    // 8. Save Order Document to MongoDB
    const newOrder = new Order({
      clientId: validClientId,
      serviceId: validServiceId,
      sellerId: validSellerId,
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