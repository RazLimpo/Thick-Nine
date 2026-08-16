import { NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";
import jwt from "jsonwebtoken";


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

/* ---------- Schemas & Models ---------- */
const UserSchema = new Schema(
  {
    name: { type: String, default: "" },
    email: { type: String, required: true, unique: true },
    role: { type: String, default: "user" },
    status: { type: String, default: "active" },
    wallet: {
      availableBalance: { type: Number, default: 0 },
      pendingBalance: { type: Number, default: 0 },
      lifetimeWithdrawals: { type: Number, default: 0 },
    },
  },
  { timestamps: true, collection: "users" }
);

const User = models.User || model("User", UserSchema);

/* ---------- Auth & Admin Verification Helper ---------- */
async function verifyAdminFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authHeader) {
    const e: any = new Error("No Authorization header");
    e.status = 401;
    throw e;
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;
  if (!token) {
    const e: any = new Error("No token provided");
    e.status = 401;
    throw e;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const e: any = new Error("JWT_SECRET not configured");
    e.status = 500;
    throw e;
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, secret);
  } catch (err) {
    const e: any = new Error("Invalid or expired token");
    e.status = 401;
    throw e;
  }

  if (!decoded || !decoded.id) {
    const e: any = new Error("Invalid token payload");
    e.status = 401;
    throw e;
  }

  const adminUser = await User.findById(decoded.id).select("role");
  if (!adminUser || adminUser.role !== "admin") {
    const e: any = new Error("Forbidden: Admin privileges required");
    e.status = 403;
    throw e;
  }

  return decoded;
}

/* ---------- GET: Fetch All Clients & Wallet Stats ---------- */
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    await verifyAdminFromRequest(req);

    // Fetch users (excluding password/sensitive hashes) sorted by newest first
    const clients = await User.find({})
      .select("name email role status wallet createdAt updatedAt")
      .sort({ createdAt: -1 });

    return NextResponse.json(
      {
        success: true,
        count: clients.length,
        clients,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error fetching client accounts";
    return NextResponse.json({ success: false, message }, { status });
  }
}