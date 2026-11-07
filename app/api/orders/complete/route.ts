// app/api/orders/complete/route.ts
// Moves paid order into escrow / in_progress.
// Affiliate commission is NOT credited here — only when status becomes "completed"
// via Express POST /api/orders/:id/complete (buyer accept) or rate-to-complete.

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Order from "@/thick-nine-backend/models/Order";
import User from "@/thick-nine-backend/models/User";

const MONGODB_URI = process.env.MONGODB_URI || "";

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  if (!MONGODB_URI) return;
  await mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 }
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    // Already past pending — idempotent for payment webhook retries
    if (order.status === "completed") {
      return NextResponse.json({
        success: true,
        message: "Order already completed.",
        status: order.status,
        escrowReleaseDate: order.escrowReleaseDate,
      });
    }

    if (order.status === "in_escrow" || order.status === "revision_requested") {
      return NextResponse.json({
        success: true,
        message: "Order already in progress / escrow.",
        status: order.status,
        escrowReleaseDate: order.escrowReleaseDate,
      });
    }

    if (order.status !== "pending") {
      return NextResponse.json(
        {
          error: `Cannot move order with status "${order.status}" into escrow.`,
        },
        { status: 400 }
      );
    }

    const escrowDays = 14;
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + escrowDays);

    order.status = "in_escrow";
    order.escrowReleaseDate = releaseDate;
    await order.save();

    // Seller earnings held as pending until completion / release policy
    if (order.sellerId && Number(order.sellerEarnings) > 0) {
      await User.findByIdAndUpdate(order.sellerId, {
        $inc: { "wallet.pendingBalance": order.sellerEarnings },
      });
    }

    // NOTE: Affiliate commission is intentionally NOT credited here.
    // Credit runs on true completion: Express POST /api/orders/:id/complete
    // (utils/creditAffiliateForOrder.js) — solo rate + optional group pool.

    return NextResponse.json({
      success: true,
      message:
        "Order moved to escrow. Affiliate commission will credit when the order is completed.",
      status: order.status,
      escrowReleaseDate: releaseDate,
    });
  } catch (error: any) {
    console.error("Order escrow/complete Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process order." },
      { status: 500 }
    );
  }
}
