// app/api/orders/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/thick-nine-backend/models/Order';
import User from '@/thick-nine-backend/models/User';
import Transaction from '@/thick-nine-backend/models/Transaction';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID is required.' },
        { status: 400 }
      );
    }

    // 1. Fetch Order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
    }

    if (order.status === 'completed' || order.status === 'in_escrow') {
      return NextResponse.json(
        { error: 'Order has already been processed.' },
        { status: 400 }
      );
    }

    // 2. Calculate 14-Day Escrow Release Date
    const escrowDays = 14;
    const releaseDate = new Date();
    releaseDate.setDate(releaseDate.getDate() + escrowDays);

    // 3. Update Order Status to Escrow
    order.status = 'in_escrow';
    order.escrowReleaseDate = releaseDate;
    await order.save();

    // 4. Update Seller Wallet (Funds held in pending balance for 14 days)
    await User.findByIdAndUpdate(order.sellerId, {
      $inc: { 'wallet.pendingBalance': order.sellerEarnings },
    });

    // 5. Credit Affiliate Commission & Create Transaction Record (if referred)
    if (order.affiliateId && order.affiliateCommission > 0) {
      // Credit affiliate available balance immediately
      await User.findByIdAndUpdate(order.affiliateId, {
        $inc: { 'wallet.availableBalance': order.affiliateCommission },
      });

      // Log Transaction for Affiliate Dashboard Analytics
      const commissionTransaction = new Transaction({
        affiliateId: order.affiliateId,
        orderId: order._id,
        type: 'commission',
        amount: order.affiliateCommission,
        orderTotal: order.grandTotal,
        commissionRate: order.grossAdminRevenue > 0 
          ? Number((order.affiliateCommission / order.grossAdminRevenue).toFixed(2)) 
          : 0,
        status: 'completed',
        description: `Affiliate commission from Order #${order._id}`,
        referenceId: order._id.toString(),
      });

      await commissionTransaction.save();
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated to escrow. Affiliate commission credited.',
      escrowReleaseDate: releaseDate,
    });
  } catch (error: any) {
    console.error('Order Completion Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete order.' },
      { status: 500 }
    );
  }
}