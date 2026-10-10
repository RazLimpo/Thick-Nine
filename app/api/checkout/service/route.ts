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

async function resolveDeliveryDays(
  serviceId: string,
  bodyDays: unknown
): Promise<number> {
  const fromBody = Number(bodyDays);
  if (mongoose.connection.readyState === 1 && isValidObjectId(serviceId)) {
    try {
      const ServiceMod = await import("@/thick-nine-backend/models/Service");
      const Service = (ServiceMod as any).default || ServiceMod;
      const service = await Service.findById(serviceId)
        .select("deliveryTime")
        .lean();
      const fromDb = Number(service?.deliveryTime);
      if (Number.isFinite(fromDb) && fromDb >= 1) return Math.floor(fromDb);
    } catch {
      /* optional */
    }
  }
  if (Number.isFinite(fromBody) && fromBody >= 1) return Math.floor(fromBody);
  return 3;
}

function computeDueAt(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + Math.max(1, days));
  return d;
}

/** Apply coupon discount against subtotal (mirrors /api/coupons/validate rules lightly) */
async function applyCouponDiscount(
  code: string | null | undefined,
  serviceId: string,
  orderAmount: number,
  userId: string | null
): Promise<{ discount: number; code: string | null }> {
  if (!code || mongoose.connection.readyState !== 1) {
    return { discount: 0, code: null };
  }
  try {
    const CouponMod = await import("@/thick-nine-backend/models/Coupon");
    const Coupon = (CouponMod as any).default || CouponMod;
    const coupon = await Coupon.findOne({
      code: String(code).trim().toUpperCase(),
      isActive: true,
    });
    if (!coupon) return { discount: 0, code: null };

    const now = new Date();
    if (coupon.endDate && now > new Date(coupon.endDate)) {
      return { discount: 0, code: null };
    }
    if (coupon.minimumSpend && orderAmount < coupon.minimumSpend) {
      return { discount: 0, code: null };
    }
    if (
      coupon.serviceId &&
      serviceId &&
      String(coupon.serviceId) !== String(serviceId)
    ) {
      return { discount: 0, code: null };
    }

    let discount = 0;
    if (coupon.discountType === "percentage") {
      discount = (orderAmount * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount != null) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    } else {
      discount = coupon.discountValue;
    }
    discount = Math.min(discount, orderAmount);
    discount = Math.round(discount * 100) / 100;

    // increment usage
    coupon.usedCount = (coupon.usedCount || 0) + 1;
    if (userId) {
      const redemptions = coupon.redemptions || [];
      const entry = redemptions.find(
        (r: any) => String(r.userId) === String(userId)
      );
      if (entry) entry.count = (entry.count || 0) + 1;
      else redemptions.push({ userId, count: 1 });
      coupon.redemptions = redemptions;
    }
    await coupon.save();

    return { discount, code: coupon.code };
  } catch (e) {
    console.error("checkout coupon apply error:", e);
    return { discount: 0, code: null };
  }
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
      offerId = null,
      couponCode = null,
    } = body;

    if (!serviceId || !sellerId || basePackagePrice === undefined) {
      return NextResponse.json(
        { error: "Missing required checkout information." },
        { status: 400 }
      );
    }

    // Prefer auth-derived client if body clientId is missing/invalid
    let resolvedClientId = clientId;
    if (!resolvedClientId || !isValidObjectId(String(resolvedClientId))) {
      // leave as-is; will generate if still invalid (legacy)
      resolvedClientId = clientId;
    }

    const validClientId = isValidObjectId(String(resolvedClientId || ""))
      ? resolvedClientId
      : new mongoose.Types.ObjectId();
    const validServiceId = isValidObjectId(String(serviceId))
      ? serviceId
      : new mongoose.Types.ObjectId();
    const validSellerId = isValidObjectId(String(sellerId))
      ? sellerId
      : new mongoose.Types.ObjectId();

    const days = await resolveDeliveryDays(
      String(serviceId),
      deliveryTimeDays
    );
    const dueAt = computeDueAt(days);

    // If paying a custom offer, prefer offer price/days when available
    let offerPrice: number | null = null;
    let offerDays: number | null = null;
    if (offerId && isValidObjectId(String(offerId)) && mongoose.connection.readyState === 1) {
      try {
        const OfferMod = await import("@/thick-nine-backend/models/CustomOffer");
        const CustomOffer = (OfferMod as any).default || OfferMod;
        const offer = await CustomOffer.findById(offerId);
        if (offer && (offer.status === "accepted" || offer.status === "pending")) {
          offerPrice = Number(offer.price) || null;
          offerDays = Number(offer.deliveryDays) || null;
        }
      } catch {
        /* optional */
      }
    }

    const base =
      offerPrice != null ? offerPrice : Number(basePackagePrice) || 0;
    const addonsTotal =
      offerPrice != null
        ? 0
        : selectedAddons.reduce(
            (sum: number, addon: { price: number }) =>
              sum + Number(addon.price || 0),
            0
          );
    let subtotal = base + addonsTotal;

    const { discount, code: appliedCode } = await applyCouponDiscount(
      couponCode,
      String(serviceId),
      subtotal,
      isValidObjectId(String(validClientId)) ? String(validClientId) : null
    );
    subtotal = Math.max(0, subtotal - discount);

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

    let affiliateUserId = null;
    if (affiliateCode && mongoose.connection.readyState === 1) {
      const affiliate = await User.findOne({
        $or: [
          { referralCode: String(affiliateCode).trim() },
          { affiliateCode: String(affiliateCode).trim() },
        ],
      });
      if (affiliate) affiliateUserId = affiliate._id;
    }

    const fees = calculateOrderFees(
      subtotal,
      buyerFeeRate,
      affiliateUserId ? affiliateCutRate : 0,
      sellerFeeRate
    );

    const finalDueAt =
      offerDays != null ? computeDueAt(offerDays) : dueAt;

    if (mongoose.connection.readyState !== 1) {
      const mockOrderId = new mongoose.Types.ObjectId().toString();
      return NextResponse.json({
        success: true,
        message: "Order created successfully (Sandbox Mode).",
        orderId: mockOrderId,
        grandTotal: fees.grandTotal,
        dueAt: finalDueAt.toISOString(),
        discount,
        couponCode: appliedCode,
      });
    }

    const newOrder = new Order({
      clientId: validClientId,
      serviceId: validServiceId,
      sellerId: validSellerId,
      affiliateId: affiliateUserId,
      affiliateCode: affiliateCode || null,
      requirements,
      basePackagePrice: base,
      selectedAddons: offerPrice != null ? [] : selectedAddons,
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
      dueAt: finalDueAt,
      // optional fields if schema allows
      couponCode: appliedCode || undefined,
      discountAmount: discount || undefined,
      offerId:
        offerId && isValidObjectId(String(offerId)) ? offerId : undefined,
    });

    await newOrder.save();

    // Mark offer accepted/paid if linked
    if (offerId && isValidObjectId(String(offerId))) {
      try {
        const OfferMod = await import("@/thick-nine-backend/models/CustomOffer");
        const CustomOffer = (OfferMod as any).default || OfferMod;
        await CustomOffer.findByIdAndUpdate(offerId, {
          status: "accepted",
          orderId: newOrder._id,
        });
      } catch {
        /* optional orderId field on offer */
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order created successfully.",
      orderId: newOrder._id,
      grandTotal: newOrder.grandTotal,
      dueAt: newOrder.dueAt,
      discount,
      couponCode: appliedCode,
    });
  } catch (error: any) {
    console.error("Service Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process checkout." },
      { status: 500 }
    );
  }
}
