import { NextResponse } from "next/server";
import mongoose, { Schema, model, models } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

/* ---------- Config / DB Connection ---------- */
const MONGODB_URI = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}

async function connectToDatabase() {
  const g = global as any;
  if (g._mongoosePromise) return g._mongoosePromise;
  g._mongoosePromise = mongoose.connect(MONGODB_URI, {});
  return g._mongoosePromise;
}

/* ---------- Schemas & Models ---------- */
const UserSchema = new Schema(
  {
    role: { type: String, default: "user" },
    password: { type: String, required: true },
  },
  { timestamps: true, collection: "users" }
);

const User = models.User || model("User", UserSchema);

/* ---------- Auth Helper ---------- */
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

  const adminUser = await User.findById(decoded.id).select("role password");
  if (!adminUser || adminUser.role !== "admin") {
    const e: any = new Error("Forbidden: Admin privileges required");
    e.status = 403;
    throw e;
  }

  return { decoded, adminUser };
}

/* ---------- PUT: Change Admin Password ---------- */
export async function PUT(req: Request) {
  try {
    await connectToDatabase();
    const { adminUser } = await verifyAdminFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, message: "Current password and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: "New password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Verify current password against stored hash
    const isMatch = await bcrypt.compare(currentPassword, adminUser.password);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, message: "Incorrect current password" },
        { status: 400 }
      );
    }

    // Hash and save new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    adminUser.password = hashedPassword;
    await adminUser.save();

    return NextResponse.json(
      { success: true, message: "Password updated successfully" },
      { status: 200 }
    );
  } catch (err: any) {
    const status = err?.status || 500;
    const message = err?.message || "Server error updating password";
    return NextResponse.json({ success: false, message }, { status });
  }
}