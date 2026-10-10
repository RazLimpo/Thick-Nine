// app/api/checkout/service/route.ts
import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Order from "@/thick-nine-backend/models/Order";
import User from "@/thick-nine-backend/models/User";
import AffiliateCommissionConfig from "@/thick-nine-backend/models/AffiliateCommissionConfig";
import { calculateOrderFees } from "@/lib/commissionHelper";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MONGODB_URI = process.env.MONGODB_URI || "";

function isValidObjectId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

async function connectDB() {
  if (process.env.NEXT_PUBLIC_IS_STACKBLITZ === "true" || !MONGODB_URI) {
    return;
  }
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
}

/** Prefer Service.deliveryTime from DB; fall back to body; default 3 */
async function resolveDeliveryDays(
  serviceId: string,
  bodyDays: unknown
): Promise<number> {
  const fromBody = Number(bodyDays);
  if (Number.isFinite(fromBody) && fromBody >= 1) {
    // still try DB for authoritative value when connected
  }

  if (mongoose.connection.readyState === 1 && isValidObjectId(serviceId)) {
    try {
      // Lazy require to avoid build issues if path differs
      const Service =
        (await import("@/thick-nine-backend/models/Service")).default ||
        (await import("@/thick-nine-backend/models/Service"));
      const service = await (Service as any)
        .findById(serviceId)
        .select("deliveryTime")
        .lean();
      const fromDb = Number(service?.deliveryTime);
      if (Number.isFinite(fromDb) && fromDb >= 1) {
        return Math.floor(fromDb);
      }
    } catch {
      // Service model optional at build time
    }
  }

  if (Number.isFinite(fromBody) && fromBody >= 1) {
    return Math.floor(fromBody);
  }
  return 3;
}

function computeDueAt(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d;
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
      requirements = "",
      affiliateCode = null,
      paymentMethod = "card",
      deliveryTimeDays,
    } = body;

    // 1. Check basic field presence
    if (!clientId || !serviceId || !sellerId || basePackagePrice === undefined) {
      return NextResponse.json(
        { error: "Missing required checkout information." },
        { status: 400 }
      );
    }

    // 2. Validate MongoDB ObjectId format to prevent Mongoose CastErrors
    const validClientId = isValidObjectId(clientId)
      ? clientId
      : new mongoose.Types.ObjectId();
    const validServiceId = isValidObjectId(serviceId)
      ? serviceId
      : new mongoose.Types.ObjectId();
    const validSellerId = isValidObjectId(sellerId)
      ? sellerId
      : new mongoose.Types.ObjectId();

    // 3. Delivery deadline (days → dueAt)
    const days = await resolveDeliveryDays(
      String(serviceId),
      deliveryTimeDays
    );
    const dueAt = computeDueAt(days);

    // 4. Calculate Add-ons total and Subtotal
    const addonsTotal = selectedAddons.reduce(
      (sum: number, addon: { price: number }) => sum + Number(addon.price || 0),
      0
    );
    const subtotal = Number(basePackagePrice) + addonsTotal;

    // 5. Fetch Active Config Rates (with safe fallbacks if DB isn't connected)
    let buyerFeeRate = 0.05;
    let affiliateCutRate = 0.1;
    let sellerFeeRate = 0.15;

    if (mongoose.connection.readyState === 1) {
      const config = await AffiliateCommissionConfig.findOne({ isActive: true });
      if (config) {
        buyerFeeRate = config.buyerFeePercentage ?? 0.05;
        affiliateCutRate = config.defaultAffiliateCutRate ?? 0.1;
        sellerFeeRate = config.platformFeePercentage ?? 0.15;
      }
    }

    // 6. Resolve Affiliate User
    // User model uses referralCode in many places; also try affiliateCode field
    let affiliateUserId = null;
    if (affiliateCode && mongoose.connection.readyState === 1) {
      const affiliate = await User.findOne({
        $or: [
          { referralCode: String(affiliateCode).trim() },
          { affiliateCode: String(affiliateCode).trim() },
        ],
      });
      if (affiliate) {
        affiliateUserId = affiliate._id;
      }
    }

    // 7. Run Financial Calculations
    const fees = calculateOrderFees(
      subtotal,
      buyerFeeRate,
      affiliateUserId ? affiliateCutRate : 0,
      sellerFeeRate
    );

    // 8. StackBlitz Fallback Mode (If DB is bypassed)
    if (mongoose.connection.readyState !== 1) {
      const mockOrderId = new mongoose.Types.ObjectId().toString();
      return NextResponse.json({
        success: true,
        message: "Order created successfully (Sandbox Mode).",
        orderId: mockOrderId,
        grandTotal: fees.grandTotal,
        dueAt: dueAt.toISOString(),
        deliveryTimeDays: days,
      });
    }

    // 9. Save Order Document to MongoDB (includes dueAt)
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
      status: "pending",
      dueAt, // ← countdown source for /freelancer-orders
    });

    await newOrder.save();

    return NextResponse.json({
      success: true,
      message: "Order created successfully.",
      orderId: newOrder._id,
      grandTotal: newOrder.grandTotal,
      dueAt: newOrder.dueAt,
      deliveryTimeDays: days,
    });
  } catch (error: any) {
    console.error("Service Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process checkout." },
      { status: 500 }
    );
  }
}
