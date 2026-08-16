import { NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";
import jwt from "jsonwebtoken";

/* ---------- Config / DB Connection ---------- */
const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;

async function connectToDatabase() {
  if (!MONGODB_URI) {
    const e: any = new Error("MONGODB_URI environment variable is missing");
    e.status = 500;
    throw e;
  }

  const g = global as any;
  if (g._mongoosePromise) return g._mongoosePromise;

  // Added 5-second connection timeout to prevent hanging requests in Webcontainers
  g._mongoosePromise = mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });

  return g._mongoosePromise;
}

/* ---------- Schemas & Models ---------- */
const UserSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true },
    role: { type: String, default: "user" },
    notificationsEnabled: { type: Boolean, default: true },
    twoFactorEnabled: { type: Boolean, default: false },
  },
  { timestamps: true, collection: "users", strict: false }
);

const User = models.User || model("User", UserSchema);

/* ---------- Auth & Admin Verification Helper ---------- */
async function verifyAdminFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) {
    const e: any = new Error("No Authorization header provided");
    e.status = 401;
    throw e;
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  if (!token || token.trim() === "" || token === "null" || token === "undefined") {
    const e: any = new Error("No valid token found in Authorization header");
    e.status = 401;
    throw e;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const e: any = new Error("JWT_SECRET environment variable is not configured");
    e.status = 500;
    throw e;
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    const e: any = new Error("Invalid or expired authentication token");
    e.status = 401;
    throw e;
  }

  if (!decoded || !decoded.id) {
    const e: any = new Error("Invalid token payload structure");
    e.status = 401;
    throw e;
  }

  const adminUser = await User.findById(decoded.id).select("role");
  if (!adminUser || adminUser.role !== "admin") {
    const e: any = new Error("Forbidden: Admin privileges required");
    e.status = 403;
    throw e;
  }

  return { decoded, adminUser };
}

/* ---------- GET: Fetch Admin Profile ---------- */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { decoded } = await verifyAdminFromRequest(req);

    const user = await User.findById(decoded.id).select(
      "name email role notificationsEnabled twoFactorEnabled"
    );

    if (!user) {
      return NextResponse.json({ success: false, message: "Admin account not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, user }, { status: 200 });
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error fetching admin profile";
    return NextResponse.json({ success: false, message }, { status });
  }
}

/* ---------- PUT: Update Admin Profile Details ---------- */
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const { decoded } = await verifyAdminFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { name, email, notificationsEnabled, twoFactorEnabled } = body;

    if (!name || !email) {
      return NextResponse.json(
        { success: false, message: "Name and email are required" },
        { status: 400 }
      );
    }

    // Check email availability if changing email address
    const existingUser = await User.findOne({ email, _id: { $ne: decoded.id } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Email is already in use by another account" },
        { status: 400 }
      );
    }

    const updatedUser = await User.findByIdAndUpdate(
      decoded.id,
      {
        name,
        email,
        ...(typeof notificationsEnabled === "boolean" && { notificationsEnabled }),
        ...(typeof twoFactorEnabled === "boolean" && { twoFactorEnabled }),
      },
      { new: true, runValidators: true }
    ).select("name email role notificationsEnabled twoFactorEnabled");

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully",
        user: updatedUser,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error updating admin profile";
    return NextResponse.json({ success: false, message }, { status });
  }
}