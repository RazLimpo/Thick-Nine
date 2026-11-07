// app/api/checkout/service/route.ts
// Snapshots solo rate (seller-fee base) + optional group tg fields. Does NOT credit wallet.
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

/** 90-day attributed completed subtotals for tier rate */
async function getAffiliateSales90d(affiliateId: string): Promise<number> {
  if (!isValidObjectId(affiliateId) || mongoose.connection.readyState !== 1) {
    return 0;
  }
  try {
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const rows = await Order.aggregate([
      {
        $match: {
          affiliateId: new mongoose.Types.ObjectId(affiliateId),
          status: "completed",
          updatedAt: { $gte: since },
        },
      },
      { $group: { _id: null, total: { $sum: "$subtotal" } } },
    ]);
    return Number(rows[0]?.total) || 0;
  } catch (e) {
    console.error("getAffiliateSales90d:", e);
    return 0;
  }
}

/** Tier rate 25%–50% from sales volume (mirrors utils/affiliateRewards.js) */
function rateFromSales90d(sales90d: number): {
  rate: number;
  tierId: string;
  tierLabel: string;
} {
  const tiers = [
    { id: "starter", label: "Starter", min: 0, rate: 0.25 },
    { id: "growth", label: "Growth", min: 500, rate: 0.3 },
    { id: "pro", label: "Pro", min: 2000, rate: 0.35 },
    { id: "elite", label: "Elite", min: 5000, rate: 0.4 },
    { id: "top", label: "Top", min: 15000, rate: 0.5 },
  ];
  let tier = tiers[0];
  for (let i = tiers.length - 1; i >= 0; i--) {
    if (sales90d >= tiers[i].min) {
      tier = tiers[i];
      break;
    }
  }
  return { rate: tier.rate, tierId: tier.id, tierLabel: tier.label };
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

/** Resolve group tracking code → snapshots if partnership/member active */
async function resolveGroupTracking(tg: string | null | undefined): Promise<{
  teamTrackingCode: string | null;
  teamId: string | null;
  teamMemberUserId: string | null;
  partnershipId: string | null;
  groupPromoRate: number | null;
  groupPromoPool: number;
  affiliateUserIdFromTg: string | null;
} | null> {
  const code = String(tg || "").trim();
  if (!code || mongoose.connection.readyState !== 1) return null;

  try {
    const LinkMod = await import(
      "@/thick-nine-backend/models/AffiliateTeamTrackingLink"
    );
    const AffiliateTeamTrackingLink =
      (LinkMod as any).default || LinkMod;
    const PartnershipMod = await import(
      "@/thick-nine-backend/models/FreelancerTeamPartnership"
    );
    const FreelancerTeamPartnership =
      (PartnershipMod as any).default || PartnershipMod;

    const link = await AffiliateTeamTrackingLink.findOne({
      code,
      status: "active",
    }).lean();
    if (!link) return null;

    const partnership = await FreelancerTeamPartnership.findById(
      link.partnershipId
    ).lean();
    if (!partnership || partnership.status !== "active") return null;

    let promoRate = 0.08;
    if (partnership.promoRate != null) {
      let r = Number(partnership.promoRate);
      if (r > 1) r = r / 100;
      promoRate = Math.min(0.1, Math.max(0.05, r));
    }

    return {
      teamTrackingCode: link.code,
      teamId: link.teamId ? String(link.teamId) : null,
      teamMemberUserId: link.memberUserId
        ? String(link.memberUserId)
        : null,
      partnershipId: link.partnershipId
        ? String(link.partnershipId)
        : null,
      groupPromoRate: promoRate,
      groupPromoPool: 0, // filled after subtotal known
      affiliateUserIdFromTg: link.memberUserId
        ? String(link.memberUserId)
        : null,
    };
  } catch (e) {
    console.error("resolveGroupTracking:", e);
    return null;
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
      teamTrackingCode = null,
      tg = null,
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

    let resolvedClientId = clientId;
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

    let offerPrice: number | null = null;
    let offerDays: number | null = null;
    if (
      offerId &&
      isValidObjectId(String(offerId)) &&
      mongoose.connection.readyState === 1
    ) {
      try {
        const OfferMod = await import(
          "@/thick-nine-backend/models/CustomOffer"
        );
        const CustomOffer = (OfferMod as any).default || OfferMod;
        const offer = await CustomOffer.findById(offerId);
        if (
          offer &&
          (offer.status === "accepted" || offer.status === "pending")
        ) {
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
    let sellerFeeRate = 0.15;
    let useTiered = true;
    let fallbackCut = 0.25;

    if (mongoose.connection.readyState === 1) {
      const config = await AffiliateCommissionConfig.findOne({
        isActive: true,
      });
      if (config) {
        buyerFeeRate = config.buyerFeePercentage ?? 0.05;
        sellerFeeRate = config.platformFeePercentage ?? 0.15;
        useTiered = config.useTieredAffiliateRates !== false;
        fallbackCut = config.defaultAffiliateCutRate ?? 0.25;
      }
    }

    // Group tracking (tg) may also identify the promoting affiliate
    const tgCode = teamTrackingCode || tg || null;
    const group = await resolveGroupTracking(tgCode);

    let affiliateUserId: string | null = null;
    if (affiliateCode && mongoose.connection.readyState === 1) {
      const affiliate = await User.findOne({
        $or: [
          { referralCode: String(affiliateCode).trim() },
          { affiliateCode: String(affiliateCode).trim() },
        ],
      });
      if (affiliate) affiliateUserId = String(affiliate._id);
    }
    // Prefer explicit ref; else member from tg
    if (!affiliateUserId && group?.affiliateUserIdFromTg) {
      affiliateUserId = group.affiliateUserIdFromTg;
    }

    let affiliateCutRate = 0;
    let tierId: string | null = null;
    let tierLabel: string | null = null;
    let sales90d = 0;

    if (affiliateUserId) {
      sales90d = await getAffiliateSales90d(affiliateUserId);
      if (useTiered) {
        const t = rateFromSales90d(sales90d);
        affiliateCutRate = t.rate;
        tierId = t.tierId;
        tierLabel = t.tierLabel;
      } else {
        affiliateCutRate = fallbackCut;
        tierId = "legacy";
        tierLabel = "Legacy";
      }
    }

    const fees = calculateOrderFees(
      subtotal,
      buyerFeeRate,
      affiliateUserId ? affiliateCutRate : 0,
      sellerFeeRate
    );

    let groupPromoPool = 0;
    let groupPromoRate: number | null = null;
    if (group?.groupPromoRate != null) {
      groupPromoRate = group.groupPromoRate;
      groupPromoPool =
        Math.round(subtotal * group.groupPromoRate * 100) / 100;
    }

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
        commissionRate: fees.commissionRate,
        affiliateCommission: fees.affiliateCommission,
      });
    }

    const newOrder = new Order({
      clientId: validClientId,
      serviceId: validServiceId,
      sellerId: validSellerId,
      affiliateId: affiliateUserId || null,
      affiliateCode: affiliateCode || group?.teamTrackingCode || null,
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
      commissionRate: fees.commissionRate,
      commissionableFee: fees.commissionableFee,
      commissionTierId: tierId,
      commissionTierLabel: tierLabel,
      teamTrackingCode: group?.teamTrackingCode || null,
      teamId: group?.teamId || null,
      teamMemberUserId: group?.teamMemberUserId || null,
      partnershipId: group?.partnershipId || null,
      groupPromoRate,
      groupPromoPool,
      paymentMethod,
      status: "pending",
      dueAt: finalDueAt,
      couponCode: appliedCode || undefined,
      discountAmount: discount || undefined,
      offerId:
        offerId && isValidObjectId(String(offerId)) ? offerId : undefined,
    });

    await newOrder.save();

    if (offerId && isValidObjectId(String(offerId))) {
      try {
        const OfferMod = await import(
          "@/thick-nine-backend/models/CustomOffer"
        );
        const CustomOffer = (OfferMod as any).default || OfferMod;
        await CustomOffer.findByIdAndUpdate(offerId, {
          status: "accepted",
          orderId: newOrder._id,
        });
      } catch {
        /* optional */
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
      commissionRate: newOrder.commissionRate,
      affiliateCommission: newOrder.affiliateCommission,
      teamTrackingCode: newOrder.teamTrackingCode,
      groupPromoPool: newOrder.groupPromoPool,
    });
  } catch (error: any) {
    console.error("Service Checkout Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process checkout." },
      { status: 500 }
    );
  }
}
