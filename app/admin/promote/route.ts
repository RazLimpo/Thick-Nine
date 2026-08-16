import { NextResponse } from "next/server";
import mongoose from "mongoose";

/* ---------- Config / DB Connection ---------- */
const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI || "";

async function connectToDatabase() {
  if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env");
  }

  const g = global as any;
  if (g._mongoosePromise) return g._mongoosePromise;
  g._mongoosePromise = mongoose.connect(MONGODB_URI, {});
  return g._mongoosePromise;
}

/* ---------- User Model ---------- */
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    role: { type: String, default: "client" },
  },
  { timestamps: true, collection: "users", strict: false }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);

/* ---------- POST: Promote User to Admin ---------- */
export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json().catch(() => ({}));
    const { email, secretKey } = body;

    if (!email || !secretKey) {
      return NextResponse.json(
        { success: false, message: "Email and secretKey are required" },
        { status: 400 }
      );
    }

    // Verify secret key
    const configuredKey = process.env.ADMIN_SECRET_KEY;
    if (!configuredKey || secretKey !== configuredKey) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Invalid secret key" },
        { status: 403 }
      );
    }

    // Find and update user role
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      { role: "admin" },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User with this email was not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: `User ${email} has been successfully promoted to admin!`,
        user: { id: user._id, email: user.email, role: user.role },
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err?.message || "Server error" },
      { status: 500 }
    );
  }
}