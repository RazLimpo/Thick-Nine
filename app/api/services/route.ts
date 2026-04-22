import { NextResponse } from 'next/server';
import mongoose from 'mongoose';

export async function GET() {
  try {
    // 1. Connect to MongoDB using your environment variable
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI);
    }

    // 2. Fetch data (Replace 'Service' with your actual model name)
    // For a quick test, we can just return a success message
    return NextResponse.json({ 
      status: "Connected", 
      message: "Database is live!",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}