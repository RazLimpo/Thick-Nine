import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Order from '@/thick-nine-backend/models/Order';

const MONGODB_URI = process.env.MONGODB_URI || '';

async function connectDB() {
  if (process.env.NEXT_PUBLIC_IS_STACKBLITZ === 'true' || !MONGODB_URI) return;
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI);
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // In StackBlitz / Local Sandbox Mode without live DB:
    if (mongoose.connection.readyState !== 1) {
      return NextResponse.json({
        success: true,
        summary: {
          totalOrders: 2,
          totalVolume: 350.00,
          grossAdminProfit: 70.00,
          inEscrow: 280.00,
        },
        orders: [
          {
            _id: '64f1a2b3c4d5e6f7a8b9c0d1',
            clientId: { name: 'Alex Johnson', email: 'alex@example.com' },
            sellerId: { name: 'Sarah Dev', email: 'sarah@example.com' },
            subtotal: 200,
            buyerServiceFee: 10,
            sellerPlatformFee: 30,
            grandTotal: 210,
            sellerEarnings: 170,
            netAdminProfit: 40,
            status: 'pending',
            createdAt: new Date().toISOString(),
          },
          {
            _id: '64f1a2b3c4d5e6f7a8b9c0d2',
            clientId: { name: 'Mark Davis', email: 'mark@example.com' },
            sellerId: { name: 'John Designer', email: 'john@example.com' },
            subtotal: 133.33,
            buyerServiceFee: 6.67,
            sellerPlatformFee: 20.00,
            grandTotal: 140,
            sellerEarnings: 113.33,
            netAdminProfit: 26.67,
            status: 'completed',
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    // Live MongoDB Query
    const orders = await Order.find({})
      .populate('clientId', 'name email')
      .populate('sellerId', 'name email')
      .sort({ createdAt: -1 });

    const totalOrders = orders.length;
    let totalVolume = 0;
    let grossAdminProfit = 0;
    let inEscrow = 0;

    orders.forEach((ord: any) => {
      totalVolume += ord.grandTotal || 0;
      grossAdminProfit += (ord.buyerServiceFee || 0) + (ord.sellerPlatformFee || 0);
      if (ord.status === 'pending' || ord.status === 'in_progress') {
        inEscrow += ord.sellerEarnings || 0;
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        totalOrders,
        totalVolume,
        grossAdminProfit,
        inEscrow,
      },
      orders,
    });
  } catch (error: any) {
    console.error('Admin Orders Fetch Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch admin orders.' },
      { status: 500 }
    );
  }
}