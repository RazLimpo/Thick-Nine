import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/db'; // 1. Uses your centralized connection tool

export async function GET() {
  try {
    // 2. Safely connect using our optimized production pool settings
    await connectDB();

    // 3. Return a clean, successful live connection ping
    return NextResponse.json({ 
      status: "Connected", 
      message: "Database is live using optimized pool configs!",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}